import { model, Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600,
    },
    loginVia: {
      type: String,
      default: "password",
      enum: ["password", "google", "github"],
    },
  },
  {
    strict: "throw",
  }
);

const Session = model("session", sessionSchema);
export default Session;
