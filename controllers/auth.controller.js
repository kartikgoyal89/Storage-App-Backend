import OTP from "../models/otp.model.js";
import User from "../models/users.model.js";
import { verifyIdToken } from "../services/googleAuthService.js";
import { sendOtp } from "../utils/sendOtp.js";
import mongoose, { Types } from "mongoose";
import Directory from "../models/directory.model.js";
import Session from "../models/session.model.js";

import redisClient from "../config/practice_redis.js";
import { otpSchema } from "../validators/authSchema.js";

const clientID = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;

export const sendOtpController = async (req, res, next) => {
  console.log("API RUNNING");
  const { email } = req.body;
  console.log("Backend",req.body);
  console.log(email);
  try {
    const otp = await sendOtp(email);
    res.status(201).json({ message: `OTP Sent on ${email}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

export const VerifyOTP = async (req, res, next) => {
  const { data, success, error } = otpSchema.safeParse(req.body);

  if (!success) {
    return res
      .status(500)
      .json({ message: "Invalid Input, Please enter valid details!" });
  }

  const { email, otp } = data;

  try {
    const findOtp = await OTP.findOne({ email, otp });
    if (!findOtp) {
      return res.status(404).json({ error: "Invalid or Expired OTP" });
    }
    // console.log(findOtp);

    res.json({ message: "otp verified" });
    next();
  } catch (err) {
    console.log(err);
  }
};

export const VerifyLoginOTP = async (req, res, next) => {
  const { email, otp } = req.body;
  try {
    const findOtp = await OTP.findOne({ email, otp });
    if (!findOtp) {
      return res.status(404).json({ error: "Invalid or Expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User does not exist" });
    }

    // req.user = { _id: user.id, rootDirId: user.rootDirId };
    req.user = {
      _id: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
    };

    await findOtp.deleteOne();
    next(); // Move to login
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server Error" });
  }
};

export const loginWithGoogle = async (req, res, next) => {
  const { idToken } = req.body;
  const userData = await verifyIdToken(idToken);
  const { name, email, picture, sub } = userData;
  const user = await User.findOne({ email }).lean();
  if (user) {
    if (user.deleted) {
      return res.status(401).json({
        error: "Your account has been deleted. Contact Admin to recover.",
      });
    }
    // const allSessions = await Session.find({ userId: user._id });

    // if (allSessions.length >= 2) {
    //   await allSessions[0].deleteOne();
    // }

    if (!user.picture.includes("googleusercontent.com")) {
      user.picture = picture;
      await user.save();
    }

    // const session = await Session.create({
    //   userId: user._id,
    //   loginVia: "google",
    // });

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
      loginVia: "google",
    });
    await redisClient.expire(redisKey, 60 * 60 * 24);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      maxAge: 60 * 1000 * 24 * 7,
      signed: true,
    });

    return res.json({ message: "Logged in!" });
  }
  const mongooseSession = await mongoose.startSession();
  try {
    mongooseSession.startTransaction();
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const newUser = await User.insertOne(
      {
        _id: userId,
        name,
        email,
        picture,
        rootDirId: rootDirId,
      },
      { mongooseSession },
    );

    const newDirectory = await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      {
        mongooseSession,
      },
    );

    // const session = await Session.create({
    //   userId: userId,
    //   loginVia: "google",
    // });
    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
      loginVia: "google",
    });
    await redisClient.expire(redisKey, 60 * 60 * 24);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      maxAge: 60 * 1000 * 24 * 7,
      signed: true,
    });
    mongooseSession.commitTransaction();

    res.status(201).json(newUser.toJSON());
  } catch (err) {
    mongooseSession.abortTransaction();
    console.log(err);
  } finally {
    mongooseSession.endSession();
  }
};

export const loginWithGithub = async (req, res) => {
  const code = req.query.code;
  // console.log(req.query);
  // console.log(code);
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code,
    }),
  });
  const { access_token } = await response.json();
  // console.log(access_token);

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const emailResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const emailData = await emailResponse.json();
  const userData = await userResponse.json();
  // console.log(userData);

  const email = emailData[0]?.email;
  const { avatar_url, name } = userData;

  // console.log(email, avatar_url, name);

  const user = await User.findOne({ email }).lean();
  if (user) {
    if (user.deleted) {
      return res.status(401).json({
        error: "Your account has been deleted. Contact Admin to recover.",
      });
    }
    // const allSessions = await Session.find({
    //   userId: user._id,
    // });

    // if (allSessions.length >= 2) {
    //   await allSessions[0].deleteOne();
    // }

    user.picture = avatar_url;

    // const session = await Session.create({
    //   userId: user._id,
    //   loginVia: "github",
    // });

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
      loginVia: "github",
    });
    await redisClient.expire(redisKey, 60 * 60 * 24);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      maxAge: 60 * 1000 * 24 * 7,
      signed: true,
    });

    return res.redirect("http://localhost:5173/");
  }
  const mongooseSession = await mongoose.startSession();
  try {
    mongooseSession.startTransaction();
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const newUser = await User.insertOne(
      {
        _id: userId,
        name,
        email,
        picture,
        rootDirId: rootDirId,
      },
      { mongooseSession },
    );

    const newDirectory = await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      {
        mongooseSession,
      },
    );

    // const session = await Session.create({
    //   userId: userId,
    //   loginVia: "github",
    // });

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id.toString(),
      rootDirId: user.rootDirId.toString(),
      loginVia: "github",
    });
    await redisClient.expire(redisKey, 60 * 60 * 24);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      maxAge: 60 * 1000 * 24 * 7,
      signed: true,
    });

    res.cookie("sid", session.id, {
      httpOnly: true,
      maxAge: 60 * 1000 * 24 * 7,
      signed: true,
    });
    mongooseSession.commitTransaction();

    return res.redirect("http://localhost:5173/");
  } catch (err) {
    mongooseSession.abortTransaction();
    console.log(err);
  } finally {
    mongooseSession.endSession();
  }
};

export const getGithubURL = (req, res) => {
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${clientID}`,
  );
};