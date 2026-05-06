import nodemailer from "nodemailer";
import OTP from "../models/otp.model.js";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.log(err);
  } else {
    console.log("SMTP READY");
  }
});

// Separated function to generate and store OTP
export async function generateAndSaveOtp(email) {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  await OTP.findOneAndUpdate(
    { email },
    { otp, createdAt: new Date() },
    { upsert: true }
  );
  return otp;
}

// Function to send OTP email
export async function sendOtp(email) {
  const otp = await generateAndSaveOtp(email);

  console.log("GENERATED OTP",otp);

  const info = await transporter.sendMail({
    from: `"Kartik Goyal" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Storage App OTP",
    html: `<h2>Your OTP is: <strong>${otp}</strong></h2> <p>This OTP is valid for 10 minutes.</p>`,
  });

  return otp;
}

