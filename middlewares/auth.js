// import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import User from "../models/users.model.js";
import Session from "../models/session.model.js";
// import redisClient from "../config/practice_redis.js";
import redisClient from "../config/redis.js"

export default async function checkAuth(req, res, next) {
  try {
    const { sid } = req.signedCookies;

    if (!sid) {

      res.clearCookie("sid");
      return res.status(401).json({ error: "Not Authorized!!" });
    }

    // const [payload, oldSignature] = token.split(".");

    // const JSONpayload = Buffer.from(payload, "base64url").toString();

    // // Create a new Hash
    // const newSignature = crypto
    //   .createHash("sha256")
    //   .update(mySecretKey)
    //   .update(JSONpayload)
    //   .update(mySecretKey)
    //   .digest("base64url");

    // if (oldSignature !== newSignature) {
    // res.clearCookie("token");
    // return res.status(204).json({ message: "Session Timed Out!!" });
    // }

    // const { id, expiry: ExpiryTimeInseconds } = JSON.parse(
    //   Buffer.from(token, "base64url").toString()
    // );

    // const currTimeInseconds = Math.round(Date.now() / 1000);

    // if (currTimeInseconds > ExpiryTimeInseconds) {
    // res.clearCookie("token");
    // return res.status(204).json({ message: "Session Timed Out!!" });
    // }

    // const session = await Session.findById(sid);
    const session = await redisClient.json.get(`session:${sid}`);
    // console.log(session);
    if (!session) {
      res.clearCookie("sid");
      return res.status(404).json({ message: "Not Logged In" });
    }

    const user = await User.findOne({ _id: session.userId }).lean();
    if (!user) {
      return res.status(401).json({ error: "Not Authorized!!" });
    }
    // req.user = user;
    req.user = { _id: session.userId, rootDirId: session.rootDirId };
    next();
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const checkAuthority = (req, res, next) => {
  if (req.user.role !== "User") return next();
  res.status(401).json({ error: "You cannot access this page!!" });
};

export const checkAdmin = (req, res, next) => {
  if (req.user.role === "Admin") return next();
  res.status(401).json({ error: "Unauthorized for this Action!!!" });
};


