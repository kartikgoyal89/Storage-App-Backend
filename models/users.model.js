import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/,
        "please enter a valid email",
      ],
      unique: true,
    },
    password: {
      type: String,
      minLength: 4,
    },
    picture: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/036/744/532/non_2x/user-profile-icon-symbol-template-free-vector.jpg",
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Manager", "User", "Owner"],
      default: "User",
    },
      maxStorageInBytes: {
        type: Number,
          required: true,
          default: 1 * (1024 ** 3),
      },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    strict: "throw",

    optimisticConcurrency: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model("user", userSchema);
export default User;
