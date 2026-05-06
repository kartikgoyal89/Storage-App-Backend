


import express from "express";
import {handleRazorpayController} from '../controllers/webhook.controller.js';

const router = express.Router();

router.post("/razorpay",handleRazorpayController);

export default router;
