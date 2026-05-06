import { model, Schema } from "mongoose";
const fileSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        extension: {
            type: String,
            required: true,
        },
        parentDirId: {
            type: Schema.Types.ObjectId,
            ref: "Directory",
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        isUploading: {
            type: Schema.Types.Boolean,
        }
    },
    {
        timestamps: true,
        strict: "throw",
    }
);

const File = model("File", fileSchema);
export default File;
