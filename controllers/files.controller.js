import { createWriteStream } from "fs";
import path from "path";
import { rm } from "fs/promises";
import Files from "../models/files.model.js";
import Directories from "../models/directory.model.js";
import User from "../models/users.model.js";
import {createGetSignedUrl, createUploadSignerUrl, deleteS3File, getS3FileMetaData} from "../S3.js";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {createCloudFrontGetSignedUrl} from "../cloudFront.js";

export async function updateDirectorySize(parentId,deltaSize){
  while(parentId !== null){
    const dir = await Directories.findById(parentId);
    dir.size += deltaSize;
    await dir.save();
    parentId = dir.parentDirId;
  }
}

// =========== CREATE FILE ===============
export const createFile = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  console.log(req.body);

  const parentDirId = req.params.parentDirId || user.parentDirId || user.rootDirId;
  // console.log('parentDirId',parentDirId);
  const parentDirData = await Directories.findOne({
    _id: parentDirId,
    userId: req.user._id,
  }).lean();

  const filename = req.headers.filename || "untitled";
  const size = req.headers.filesize;
  const extension = path.extname(filename);

  const rootDir = await Directories.findById(req.user.rootDirId);

  const remainingSpace = user.maxStorageInBytes - rootDir.size;

  if(size > remainingSpace){
    console.log("File size too large!!");
    return res.destroy();
  }


  // Check if parent directory exists
  if (!parentDirData) {
    return res.status(404).json({ error: "Parent directory not found!" });
  }

  if(size > 50 * 1024 * 1024){
    // res.header("Connection","close");
    return res.socket.destroy();
    // return res.end();
  }


  const insertedFile = new Files({
    extension,
    name: filename,
    parentDirId: parentDirData._id,
    userId: req.user._id,
    size: Number(size),
  });
  await insertedFile.save();  
  const fileId = insertedFile._id;


  const fullFileName = `${fileId}${extension}`;
  const filePath =  `./storage/${fullFileName}`;

  const writeStream = createWriteStream(filePath);
  req.pipe(writeStream);

  let totalFileSize = 0;
  let aborted = false;
  let fileUploadCompleted = false;

  req.on("data",async(chunk) => {
    if(aborted) return;
    totalFileSize += chunk.length;
    if(totalFileSize > size){
      aborted = true;
      writeStream.close();
      await insertedFile.deleteOne();
      await rm(filePath);

      return req.destroy();
    }
    writeStream.write(chunk);
  })

  req.on("end", async () => {
    await Directories.findByIdAndUpdate(parentDirId, {
      $inc: { size: size },
    });

    let parentId = parentDirData.parentDirId;
    while(parentId != null){
      const parentDir = await Directories.findByIdAndUpdate(parentId,{
        $inc:{size: size}
      });
      parentId = parentDir.parentId;
    }

    return res.status(201).json({ message: "File Uploaded Succesfully!" });
  });

  req.on("close",async() => {
    if(!fileUploadCompleted){
      try {
        await insertedFile.deleteOne();
        await rm(filePath);
        console.log("file Cleaned");
      }
      catch(err){
        console.log("Error cleaning up the file",err.message);
      }
    }
  })

  req.on("error", async () => {
    await Files.findByIdAndDelete({ _id: insertedFile.insertedId });
    return res.status(404).json({ message: "Couldn't upload file." });
  });
};

// ========= GET SINGLE FILE ==============
export const getSingleFile = async (req, res) => {
  const { id } = req.params;
  const fileData = await Files.findById({
    _id: id,
    userId: req.user._id,
  }).lean();

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }

  const filePath = `${process.cwd()}/storage/${id}${fileData.extension}`;

  // const fileUrl = await createGetSignedUrl({key: `${id}${fileData.extension}`});
  // return res.redirect(fileUrl);

  // If "download" is requested, set the appropriate headers
  if (req.query.action === "download") {
      const fileUrl = await createGetSignedUrl(
      // const fileUrl = createCloudFrontGetSignedUrl(
        {
          key: `${id}${fileData.extension}`,
          download: true,
          filename: fileData.name,
        });
      console.log(fileUrl);

    // return res.redirect(fileUrl);
    // return res.download(filePath, fileData.name);
  }

  // Send file

    const fileUrl = await createGetSignedUrl(
    // const fileUrl = createCloudFrontGetSignedUrl(
      {
        key: `${id}${fileData.extension}`,
        filename: fileData.name,
      });

  return res.redirect(fileUrl);
  // return res.sendFile(filePath, (err) => {
  //   if (!res.headersSent && err) {
  //     return res.status(404).json({ error: "File not found!" });
  //   }
  // });
};

// ========== UPDATE FILE ============
export const updateFile = async (req, res, next) => {
  const { id } = req.params;
  const fileData = await Files.findById({ _id: id }).lean();

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }

  // Check parent directory ownership
  const parentDir = fileData.parentDirId;

  if (!parentDir) {
    return res.status(404).json({ error: "Parent directory not found!" });
  }
  if (parentDir.userId !== req.user.id) {
    return res
      .status(403)
      .json({ error: "You don't have access to this file." });
  }

  try {
    await Files.findByIdAndUpdate(
      { _id: id },
      { name: req.body.newFilename },
      { new: true }
    );
    // await writeFile("./filesDB.json", JSON.stringify(filesData));
    return res.status(200).json({ message: "Renamed Succesfully!" });
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

// ========== DELETE FILE ========
export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  try {
    const fileData = await Files.findById({
      _id: id,
      userId: req.user._id,
    }).lean();

    if (!fileData) {
      return res.status(404).json({ error: "File Not Found" });
    }

    // Delete File
    await Files.deleteOne({ _id: fileData._id });


      // Update Directory Size
      let parentDirId = fileData.parentDirId;

      await Directories.findByIdAndUpdate(parentDirId, {
          $inc: { size: -fileData.size },
      });

      let parentId = fileData.parentDirId;
      while(parentId != null){
          const parentDir = await Directories.findByIdAndUpdate(parentId,{
              $inc:{size: -fileData.size}
          });
          parentId = parentDir.parentId;
      }

      // Delete From Local Storage
      // await rm(`./storage/${id}${fileData.extension}`);

      await deleteS3File(`${fileData._id}${fileData.extension}`);
      console.log(response);
    return res.status(200).json({ message: "File Deleted Successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};


export const uploadInitiate = async(req,res) => {
   const parentDirId = req.body.parentDirId;
   console.log("parentDirId ", parentDirId);
 try {
   const parentDirData = await Directories.findOne({
     _id: parentDirId,
     userId: req.user._id,
   }).lean();


   // Check if parent directory exists
   if (!parentDirData) {
     return res.status(404).json({ error: "Parent directory not found!" });
   }


   const filename = req.body.name || "untitled";
   const size = req.body.size;
   const extension = path.extname(filename);

   const user = await User.findById(req.user._id);
   const rootDir = await Directories.findById(req.user.rootDirId);
   const remainingSpace = user.maxStorageInBytes - rootDir.size;

   if(size > remainingSpace){
     console.log("File size too large!!");
     // return res.destroy();
     return res.status(507).json({error: "Not enough storage.Please upgrade your plan"});
   }


   if(size > 50 * 1024 * 1024){
     // res.header("Connection","close");
     return res.socket.destroy();
     // return res.end();
   }


   const insertedFile = new Files({
     extension,
     name: filename,
     parentDirId: parentDirData._id,
     userId: req.user._id,
     size: Number(size),
     isUploading: true,
   });
   await insertedFile.save();

   const uploadSignedUrl = await createUploadSignerUrl({key: `${insertedFile.id}${extension}`,contentType: req.body.contentType});
   res.json({uploadSignedUrl,fileId: insertedFile.id});
 }catch(err){
   console.log(err);
 }
}


export const uploadComplete = async(req,res) => {
  console.log(req.body);
  // Now we are getting the File Id, we will fetch file information and check that if the file
  // which user told will upload and actually uploading matches or not.

  // If not then file will not be uploaded..

  const file = await Files.findById(req.body.fileId);

  if(!file){
    return res.status(404).json({error: "File not found in our records.."});
  }
  try {

    // Now we will send a Head request to get file information from S3
    const fileData = await getS3FileMetaData(`${file.id}${file.extension}`);
    if(fileData.ContentLength !== file.size){
      await file.deleteOne();
      return res.status(400).json({error: "File size does not match."})
    }

    file.isUploading = false;
    await file.save();
    await updateDirectorySize(file.parentDirId,file.size);
    return res.json({message: "Upload Completed!!"});

  }
  catch(err){
    console.log(err);
    await file.deleteOne();
    return res.status(404).json({error: "File not found in our records.."});
  }

}