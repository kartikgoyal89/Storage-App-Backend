import Razorpay from "razorpay";
import Subscription from "../models/subscription.model.js"

const rzpInstance = new Razorpay({
    // key_id: 'rzp_live_SkAQI7RPmmbM4d',
    key_id: "rzp_test_SkB3lEgxT3bqn9",
    key_secret: "BJzSQpiUGQ539gBX8D3edQSW",
    // key_secret:  'xW3lqk6KhGrZOYZr3RyhZ5oo'
})
export const createSubscription = async(req, res) => {
    // console.log(req.body);
    // console.log(req.user);
    console.log(req.body.planId);
    try{
        const newSubscription = await rzpInstance.subscriptions.create({
            plan_id: req.body.planId,
            total_count: 120,
            notes: {
                userId: req.user._id,
            }
        });
        console.log(newSubscription);
        console.log("req.user",req.user._id);
        const subscription = new Subscription({
            razorpaySubscriptionId: newSubscription.id,
            userId: req.user._id,
        })

        await subscription.save();

        res.json({subscriptionId: newSubscription.id});
    }
    catch(err){
        console.log(err);
     res.json({message: err.message});
    }
}

