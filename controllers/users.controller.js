import mongoose from "mongoose";
import User from "../models/users.model.js";
import Directories from "../models/directory.model.js";
import Session from "../models/session.model.js";
import OTP from "../models/otp.model.js";
import redisClient from "../config/practice_redis.js";
import { z } from "zod";
import { loginSchema, registerSchema } from "../validators/authSchema.js";

// ======= REGISTER =========
export const register = async (req, res, next) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) {
    console.log(error.issues);
    return res
      .status(500)
      .json({ message: "Invalid input, please enter valid details!" });
  }
  const { name, email, password, otp } = data;

  const findOtp = await OTP.findOne({ email, otp });
  if (!findOtp) {
    return res.status(404).json({ error: "Invalid or Expired OTP" });
  }
  await findOtp.deleteOne();

  // const findUser = await User.findOne({ email }).lean();
  // if (findUser) {

  // }
  const session = await mongoose.startSession();

  // const hashedPassword = await bcrypt.hash(password, 12);
  // const hashedPassword = crypto
  // .createHash("sha256")
  // .update(password)
  // .digest("hex");

  try {
    const rootDirId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // Start Transaction()
    session.startTransaction();
    const newDirectory = new Directories(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId: userId,
      },
      { session },
    );

    const newUser = new User(
      {
        _id: userId,
        name,
        email,
        password,
        rootDirId: rootDirId,
      },
      { session },
    );

    await newDirectory.save();
    await newUser.save();

    session.commitTransaction();
    // End Transaction

    res.status(201).json({ message: "User Registered" });
  } catch (err) {
    console.log(err);
    session.abortTransaction();
    console.log(err?.details);
    if (err.code === 121) {
      res
        .status(400)
        .json({ error: "Invalid Fields, please enter valid input" });
    } else if (err.code === 11000 && err.keyValue.email) {
      return res.status(409).json({
        error: "This user is already registered.",
        message:
          "A user with this email address already exists. Please try logging in or use a different email.",
      });
    } else {
      next(err);
    }
  }
};

// ===== LOGIN =========
/*export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "Invalid Credentials" });
    }

    // const enteredPasswordHash = crypto
    // .createHash("sha256")
    // .update(password)
    // .digest("hex");

    const [salt, savedHashedPassword] = user.password.split(".");

    // const isPasswordValid = await bcrypt.compare(password, user.password);
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(404).json({ error: "Invalid Credentials" });
    }

    const findAllSessions = await Session.find({ userId: user._id });

    if (findAllSessions.length >= 2) {
      await findAllSessions[0].deleteOne();
    }

    const session = await Session.create({ userId: user._id });

    const cookiePayload = JSON.stringify({
      id: user._id.toString(),
      expiry: Math.round(Date.now() / 1000 + 1000000),
    });

    // const signature = crypto
    //   .createHash("sha256")
    //   .update(mySecretKey)
    //   .update(cookiePayload)
    //   .update(mySecretKey)
    //   .digest("base64url");

    // const signedCookiePayload = `${Buffer.from(cookiePayload).toString(
    // "base64url"
    // )}.${signature}`;

    res.cookie(
      "sid",
      // Buffer.from(JSON.stringify(cookiePayload)).toString("base64url"),
      // Buffer.from(cookiePayload).toString("base64url"),
      session.id,
      {
        httpOnly: true,
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      }
    );
    res.json({ message: "logged in Succesfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
};*/

export const login = async (req, res, next) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  console.log(req.body);

  // if (!success) {
  //   return res
  //     .status(500)
  //     .json({ message: "Invalid Input, Please enter valid details!" });
  // }

  try {
    const user = req.user;
    console.log(user);

    console.log("Querying Redis with:", `@userId:{${user._id.toString()}}`);
    const allSessions = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${user._id.toString()}}`,
      {
        RETURN: [],
      },
    );
    console.log(allSessions);
    // const findAllSessions = await Session.find({ userId: user._id });

    if (allSessions.total >= 2) {
      // await findAllSessions[0].deleteOne();
      await redisClient.DEL(allSessions.documents[0].id);
    }
    // Instead we are currently using Redis

    // const session = await Session.create({ userId: user._id });

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId.toString()}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
      loginVia: "password",
    });
    await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    res.json({ message: "Logged in Successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server Error" });
  }
};
// ======== GET USER DETAILS ========
export const getUserDetails = async (req, res) => {
  const user = await User.findById(req.user._id).lean();

  const rootDir = await Directories.findById(user.rootDirId).lean();

  res.status(200).json({
    name: user.name,
    email: user.email,
    picture: user.picture,
    role: user.role,
    maxStorageInBytes: user.maxStorageInBytes,
    usedStorage: rootDir.size,
  });
};

// ======== LOGOUT =========
export const logout = async (req, res) => {
  const { sid } = req.signedCookies;
  try {
    await redisClient.del(`session:${sid}`);
    // const session = await Session.findByIdAndDelete(sid);
    res.clearCookie("sid");
    res.status(204).json({ message: "User Logged Out Succesfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======== LOGOUT FROM ALL DEVICES ===========
export const logoutFromAllDevices = async (req, res) => {
  const { sid } = req.signedCookies;
  try {
    const session = await Session.findById(sid);
    const user = session.userId;

    const allSessions = await Session.deleteMany({ userId: user });
    res.clearCookie("sid");
    return res
      .status(200)
      .json({ message: "User logged out of all devices sucesfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// ========= GET ALL USERS ========
export const getAllUsers = async (req, res) => {
  const allUsers = await User.find().lean();
  const allSessions = await Session.find().lean();
  const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());

  const allSessionSets = new Set(allSessionsUserId);

  const formattedUsers = allUsers.map(({ _id, name, email }) => ({
    id: _id,
    name,
    email,
    isLoggedIn: allSessionSets.has(_id.toString()),
  }));
  res.status(200).json(formattedUsers);
};

// ======== LOGOUT OTHER USERS ========
export const logoutUsers = async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.params.userId });
    res.status(204).end();
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
};

// ======== DELETE OTHER USER ============
export const deleteOtherUser = async (req, res) => {
  try {
    const findUser = await User.findById(req.params.userId);
    if (req.user._id.toString() === req.params.userId) {
      return res.status(403).json({ error: "Operation Not Allowed!" });
    }
    await Session.deleteMany({ userId: findUser._id });
    await User.findByIdAndUpdate({ _id: findUser._id }, { deleted: true });
    // await User.findByIdAndDelete(findUser._id);
    // await Files.deleteMany({ userId: findUser._id });
    // await Directories.deleteMany({ userId: findUser._id });
    res.status(200).json({ message: "User Deleted Succesfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
};

// ====== HARD DELETE OTHER USERS =========
export const hardDeleteOtherUser = async (req, res) => {
  try {
    const findUser = await User.findById(req.params.id);
    if (req.user._id.toString() === req.params.userId) {
      return res.status(403).json({ message: "Operation Not Allowed" });
    }
    await Session.deleteMany({ userId: findUser._id });
    await User.findByIdAndDelete({ _id: findUser._id });

    res.status(200).json({ message: "User Deleted Succesfully!" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(err);
  }
};

// ===== GET DRIVE FILES =========

export const getDriveFiles = async (req, res) => {
  const user = req.user;
  console.log(user);
  try {
    const findSession = await Session.findOne({ userId: user._id });
    if (findSession.loginVia !== "password") {
      const driveFiles = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=10",
      );

      const driveData = await driveFiles.json();
      res.status(200).end();
    }
    res.status(200).end();
  } catch (err) {
    console.log(err);
  }
};
