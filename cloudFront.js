import {getSignedUrl} from "@aws-sdk/cloudfront-signer";
import dotenv from "dotenv";


dotenv.config();
import {readFile} from "fs/promises";


// const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
const keyPairId = "K1QQIZB4QI2SZI"
const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
const dateLessThan = new Date(Date.now() + 1000 * 60 * 60).toISOString();


const distributionName = `https://d2hqgo1h8inb1o.cloudfront.net`;

export const createCloudFrontGetSignedUrl = ({key}) => {
    try{
        const url = `${distributionName}/${key}`;
        console.log("url",url);
        const signedUrl = getSignedUrl({
            url,
            key:keyPairId,
            dateLessThan,
            privateKey,
        })
        console.log("signedUrl",signedUrl);
        return signedUrl;
    }
    catch(err){
        console.log(err.message);
    }
}



