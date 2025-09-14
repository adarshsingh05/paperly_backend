// models/userpaymentmodel.js
import mongoose from "mongoose";

const UserPaymentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        razorpayOrderId: {
            type: String,
            required: true,
        },
        razorpayPaymentId: {
            type: String,
        },
        razorpaySignature: {
            type: String,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
            required: true,
        },
        status: {
            type: String,
            enum: ["Created", "Pending", "Paid", "Failed", "Refunded"],
            default: "Created",
        },
        month: {
            type: String, // Store as "YYYY-MM" format for easier comparison
            required: true,
        },
        periodStart: {
            type: Date,
            required: true,
        },
        periodEnd: {
            type: Date,
            required: true,
        },
        nextDueDate: {
            type: Date,
            required: true,
        },
        paidAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Add index to prevent duplicate payments for same user and month
UserPaymentSchema.index({ user: 1, month: 1 }, { unique: true });
UserPaymentSchema.index({ nextDueDate: 1 });


const Payment =
    mongoose.models.Payment || mongoose.model("Payment", UserPaymentSchema);

export default Payment;