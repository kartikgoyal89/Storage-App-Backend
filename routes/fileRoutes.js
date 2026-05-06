import express from "express";
import validateId from "../middlewares/validateId.js";
import {
  createFile,
  deleteFile,
  getSingleFile,
  updateFile, uploadComplete, uploadInitiate,
} from "../controllers/files.controller.js";

const router = express.Router();


router.post('/upload/initiate',uploadInitiate);
router.post('/upload/complete',uploadComplete);

router.param("parentDirId", validateId);
router.param("id", validateId);

// ================================
// CREATE
// ================================
router.post("/:parentDirId?", createFile);

// ================================
// READ
// ================================
router.get("/:id", getSingleFile);

// ================================
// UPDATE
// ================================
router.patch("/:id", updateFile);

// ================================
// DELETE
// ================================
router.delete("/:id", deleteFile);


export default router;


