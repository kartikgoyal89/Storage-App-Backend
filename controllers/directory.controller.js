import { rm } from "fs/promises";
import Directories from "../models/directory.model.js";
import File from "../models/files.model.js";
import User from "../models/users.model.js";
import {deleteS3MulitpleFiles} from "../S3.js";

// ======== GET ALL DIRECTORIES ============
export const getAllDirectories = async (req, res) => {
  // const user = req.user;
  const user = await User.findById(req.user._id);
  const _id = req.params.id || user.rootDirId;

  try {
    // Find the directory and verify ownership
    const directoryData = await Directories.findById({ _id: _id }).lean();

    if (!directoryData) {
      return res.status(404).json({
        error: "Directory not found or you do not have access to it!",
      });
    }

    const files = await File.find({
      parentDirId: directoryData._id,
    }).lean();
    const directories = await Directories.find({ parentDirId: _id }).lean();

    return res.status(200).json({
      ...directoryData,
      // files,
      directories: directories.map((dir) => ({ ...dir, id: dir._id })),
      files: files.map((file) => ({ ...file, id: file._id })),
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ error: err });
  }
};

// ========= CREATE DIRECTORY ==============
export const createDirectory = async (req, res, next) => {
  // const user = req.user;
  const user = await User.findById(req.user._id);
  const parentDirId = req.params.parentDirId || user.rootDirId;
  // const parentDirId = req.params.parentDirId || findUser.rootDirId;
  const dirname = req.headers.dirname || "New Folder";

  try {
    const parentDirData = await Directories.findOne({
      _id: parentDirId,
    }).lean();

    if (!parentDirData) {
      return res.status(404).json({ message: "Parent Directory Not Found" });
    }
    const newDirectory = new Directories({
      name: dirname,
      parentDirId: parentDirId,
      userId: user._id,
    });

    await newDirectory.save();

    return res.status(201).json({ message: "Directory Created Succesfully!" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
// ========== UPDATE DIRECTORY ==========
export const updateDirectory = async (req, res, next) => {
  // const user = req.user;
  const user = await User.findById(req.user._id);

  const { id } = req.params;
  const { newDirName } = req.body;

  try {
    await Directories.findOneAndUpdate(
      { _id: id, userId: user._id },
      { name: newDirName },
      { new: true }
    );
    // await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
    return res.status(200).json({ message: "Directory Renamed Succesfully!" });
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

// ============ DELETE DIRECTORY =========
export const deleteDirectory = async (req, res) => {
  const { id } = req.params;

  const directoryData = Directories.findOne({
    _id: id,
    userId: req.user._id,
  }).lean();
  if (!directoryData) {
    return res.status(404).json({ error: "Directory Not Found!!" });
  }

  try {
    // ======== RECURSIVE FUNCTION TO GET THE CONTENT FROM DIRECTORY ========
    async function getDirectoryContents(id) {
      let files = await File.find({ parentDirId: id })
        .lean();
      let directories = await Directories.find({ parentDirId: id })
        .lean();

      for (const { _id, name } of directories) {
        const { files: childFiles, directories: childDirectories } =
          await getDirectoryContents(_id);

        files = [...files, ...childFiles];
        directories = [...directories, ...childDirectories];
      }
      return { files, directories };
    }

    const { files, directories } = await getDirectoryContents(req.params.id);

    const keys = files.map(({_id,extension}) => ({Key: `${_id}${extension}`}));

    console.log(keys);
    await deleteS3MulitpleFiles(keys);
    // Total Size Calculation
    const totalSize = files.reduce((acc,file) => acc + (file.size || 0),0);

    // Update Parent Directories Size
    let parentId = id;
    console.log(parentId);

    while(parentId != null){
      const parentDir = await Directories.findByIdAndUpdate(
          parentId,
          {$inc: {size: -totalSize}},
          {new: true}
      );

      parentId = parentDir?.parentDirId;
    }

    // Delete Files From Storage
    for (const { _id, extension } of files) {
      try {
        await rm(`./storage/${_id.toString()}${extension}`);
      } catch (err) {
        console.log("File delete error:", err.message);
      }
    }


    // Delete From Databse
    await File.deleteMany({
      _id: { $in: files.map(({ _id }) => _id) },
    });
    await Directories.deleteMany({
      _id: { $in: [...directories.map(({ _id }) => _id), req.params.id] },
    });


    return res.json({ message: "Files Deleted Succesfully!" });
  } catch (err) {
    console.log(err);
  }
};
