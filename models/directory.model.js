import { Schema, model } from "mongoose";

const directorySchema = new Schema({
  name: {
    type: String,
    required: [true, "Directory name is Required"],
  },
  size: {
    type: Number,
    required: [true, "Directory size is Required"],
    default: 0,
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  parentDirId: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: "Directory",
  },
},{timestamps: true});

const Directory = model("Directory", directorySchema);

export default Directory;
