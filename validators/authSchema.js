import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Please Enter a valid email"),
  password: z.string().min(4, "Password should be min. 6 characters"),
  otp: z
    .string("Please enter a valid OTP")
    .regex(/^\d{4}$/, "Please enter a Valid OTP"),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .min(3, "Name should be min. 3 characters")
    .max(100, "Name should be max. 100 characters"),
});
export const otpSchema = z.object({
  email: z.string().email("Please enter a valid email"),

  otp: z.string().regex(/^\d{4}$/, "Please enter a valid 4-digit OTP"),
});
