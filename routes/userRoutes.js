import express from "express";
import checkAuth, { checkAdmin, checkAuthority } from "../middlewares/auth.js";
import {
  getUserDetails,
  login,
  logout,
  logoutFromAllDevices,
  register,
  getAllUsers,
  logoutUsers,
  deleteOtherUser,
  getDriveFiles,
} from "../controllers/users.controller.js";
import { VerifyLoginOTP } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", VerifyLoginOTP, login);

router.get("/", checkAuth, getUserDetails);

router.get("/users", checkAuth, getAllUsers);

router.post("/logout", logout);

router.post("/logout-all", logoutFromAllDevices);

router.post("/:userId/logout", checkAuth, checkAuthority, logoutUsers);

router.delete("/:userId/delete", checkAuth, checkAdmin, deleteOtherUser);

router.get("/all-users", checkAuth, checkAuthority, getAllUsers);

router.get("/drive/files", checkAuth, getDriveFiles);

export default router;


