import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();
import { connectDB } from "./config/db.js";


import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import checkAuth from "./middlewares/auth.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscription.Routes.js"
import webhookRoutes from "./routes/webhook.Routes.js"


export const mySecretKey = process.env.SESSION_SECRET;
const PORT = process.env.PORT || 4000;

await connectDB();
// console.log(db.namespace);

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(cookieParser(mySecretKey));
//=================================
// It will connect use to Database
// app.use((req, res, next) => {
// req.db = db;
// next();
// });
//=================================

app.use(express.json());

app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/subscription",checkAuth,subscriptionRoutes);
app.use("/user", userRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/auth", authRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({
    error: "Something Went Wrong!",
  });
});

app.listen(PORT, () => {
  console.log("Server is Running on PORT:4000");
});



