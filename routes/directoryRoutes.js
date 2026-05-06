import express from "express";
import validateId from "../middlewares/validateId.js";
import {
  createDirectory,
  deleteDirectory,
  getAllDirectories,
  updateDirectory,
} from "../controllers/directory.controller.js";

const router = express.Router();

router.param("parentDirId", validateId);
router.param("id", validateId);

// Serve all the files
router.get("/:id?", getAllDirectories);
// Create Directory
router.post("/:parentDirId?", createDirectory);

// Rename Directory
router.patch("/:id", updateDirectory);

// Delete Directory
router.delete("/:id", deleteDirectory);

export default router;


