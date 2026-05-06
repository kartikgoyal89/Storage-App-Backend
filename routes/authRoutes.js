import express from "express";
import {
  getGithubURL,
  loginWithGithub,
  loginWithGoogle,
  sendOtpController,
  VerifyOTP,
} from "../controllers/auth.controller.js";
import { VerifyLoginOTP } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtpController);

router.post("/verify-otp", VerifyOTP);

router.post("/verify-otp-login", VerifyLoginOTP);

router.post("/google", loginWithGoogle);

router.get("/github", getGithubURL);

router.get("/github/callback", loginWithGithub);

export default router;

