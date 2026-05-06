import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {mySecretKey} from "./express.js";



export const myS3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_SECRET_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})

export const createUploadSignerUrl = async({key,contentType}) => {
    const command = new PutObjectCommand({
        Bucket: "kartik-storage",
        Key: key,
        ContentType: contentType
    })

    const url = await getSignedUrl(myS3Client,command,{
        expiresIn: 300,
        signableHeaders: new Set(["content-type"])
    })

    return url;
}


export const createGetSignedUrl = async({key,download = false,filename}) => {
    const command = new GetObjectCommand({
        Bucket: "kartik-storage",
        Key: key,
        ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename=${encodeURIComponent(filename)}`
    })

    const url = await getSignedUrl(myS3Client,command,{
        expiresIn: 300,
    });
    return url;
}



export const getS3FileMetaData = async(key) => {
    const command = new HeadObjectCommand({
        Bucket: "kartik-storage",
        Key: key,
    })
    return await myS3Client.send(command);
}

export const deleteS3File = async(key) => {
    const command = new DeleteObjectCommand({
        Bucket: "kartik-storage",
        Key: key
    })

    return await myS3Client.send(command);
}

export const deleteS3MulitpleFiles = async(keys) => {
    const command = new DeleteObjectsCommand({
        Bucket: "kartik-storage",
        Delete: {
            Objects: keys,
            Quiet: false,
        }
    })
    return await myS3Client.send(command);
}