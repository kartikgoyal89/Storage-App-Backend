import Razorpay from "razorpay"
import Subscription from "../models/subscription.model.js"
import User from "../models/users.model.js"

const PLANS = {
    "plan_Sjv5exU9L6Yj0Q" : {
        code: "2TB",
        storageQuotaBytes: 2 * 1024 ** 4
    },
    "plan_Sjv6AIhfh9o0cz" : {
        code: "2TB",
        storageQuotaBytes: 2 * 1024 ** 4
    },
    "plan_Sjv6YMdjCAYt0t" : {
        code: "2TB",
        storageQuotaBytes: 5 * 1024 ** 4
    },
    "plan_Sjv6rI4y3WxLxy" : {
        code: "2TB",
        storageQuotaBytes: 2 * 1024 ** 4
    },
    "plan_Sjv7DPkh2dZNxe" : {
        code: "2TB",
        storageQuotaBytes: 5 * 1024 ** 4
    },
    "plan_Sjv7b38nUKeKFk" : {
        code: "2TB",
        storageQuotaBytes: 2 * 1024 ** 4
    },
}


export const handleRazorpayController = async(req,res) => {
    // console.log(req.body);
    // res.json({message: "Webhook Called"})
    const signature = req.headers["x-razorpay-signature"];
    const isSignatureValid = Razorpay.validateWebhookSignature(JSON.stringify(req.body),signature,"kartik@1234");
    if(isSignatureValid){
        console.log("signature valid");
        if(req.body.event == "subscription.activated"){
            const rzpSubscription = req.body.payload.subscription.entity;
            const planId = rzpSubscription.plan_id;
            const subscription = await Subscription.findOne({razorpaySubscriptionId: rzpSubscription.id});
            subscription.status = rzpSubscription.status;
            await Subscription.save();

            const storageQuotaInBytes = PLANS[planId].storageQuotaBytes;

            const user = await User.findById(subscription.userId);
            user.maxStorageInBytes = storageQuotaInBytes;
            await user.save();
            console.log("subscription activated");
        }
    }
    else{
        console.log("signature NOT valid");
    }
    console.log(req.body);
    res.end("OK");
}
//01:36:00