import mongoose from "mongoose";

const UserPaymentSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    razorpayOrderId: {
        type: String,
        required: true
    },

    razorpayPaymentId: {
        type: String,
        required: true
    },

    razorpaySignature: {
        type: String,
        required: true
    },

    status: {
    type: String,
    enum: ["Created", "Pending", "Paid", "Failed", "Refunded"],
    default: "Created"
    },

    month: {
        type: Date,
        required: true
    },

    periodStart: {
        type: Date,
        required: true
    },

    periodEnd: 
    { type: Date, 
      required: true 
    },

    nextDueDate: { 
        type: Date,
        required: true
    },

    paidAt : {
        type: Date,
        default: null
    }
}, { timestamps: true });


const Payment = mongoose.model("Payment", UserPaymentSchema);
export default Payment;