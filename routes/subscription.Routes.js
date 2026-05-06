
import express from "express";
import validateId from "../middlewares/validateId.js";
import {createSubscription} from "../controllers/subscription.controller.js";

const router = express.Router();

router.post("/create-subscription",createSubscription);

export default router;
