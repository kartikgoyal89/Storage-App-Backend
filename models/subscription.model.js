

import mongoose,{model,Schema} from "mongoose"

const subscriptionSchema = new Schema(
    {
        razorpaySubscriptionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: [
                "created",
                "active",
                "pending",
                "past_due",
                "paused",
                "canceled",
                "in_grace"
            ],
            default: "created",
        },
    },
    {
        timestamps: true
    }
)

const Subscription = model("Subscription",subscriptionSchema);

export default Subscription;
