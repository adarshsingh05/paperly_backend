import Razorpay from 'razorpay';
import Payment from '../../models/userpaymentmodel.js';
import express from 'express';
import crypto from 'crypto';
import connectDB from '../../DB/db.js';
import { checkSubscription, canMakePayment } from '../../middleware/checkPayment.js';
import { authenticateToken } from "../../middleware/auth.js";
import User from '../../models/users.js';

const router = express.Router();
const SUBSCRIPTION_AMOUNT = 399; // Fixed amount as requested

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: "rzp_test_RGza9p0QhWmwOL",
    key_secret: "7uBqhSwaUfipfomnu3eA8NE3",
});

// ========================
// Create Order
// ========================
// ✅ ADDED canMakePayment middleware
router.post("/create-order", authenticateToken, canMakePayment, async (req, res) => {
    console.log("🔍 CREATE-ORDER ENDPOINT CALLED");

    try {
        const userId = req.user._id;
        const amount = SUBSCRIPTION_AMOUNT; // Use fixed amount

        // Get current month in "YYYY-MM" format
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7); // "YYYY-MM"

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        console.log("✅ Razorpay order created:", order);

        // Calculate dates for subscription period
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        const payment = await Payment.create({
            user: userId,
            razorpayOrderId: order.id,
            amount,
            currency: "INR",
            status: "Created",
            month: currentMonth,
            periodStart,
            periodEnd,
            nextDueDate,
        });

        console.log("✅ Payment record created:", payment);
        res.json({ order, payment });

    } catch (err) {
        console.error("❌ Error in /create-order:", err);

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                error: "You already have a payment record for this month"
            });
        }

        res.status(500).json({ error: "Payment creation failed", details: err.message });
    }
});

// ========================
// Verify Payment (Fixed)
// ========================
// ✅ ADDED canMakePayment middleware
router.post("/verify-payment", authenticateToken, canMakePayment, async (req, res) => {
    console.log("🔍 VERIFY-PAYMENT ENDPOINT CALLED");
    console.log("📦 Request body:", req.body);

    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        // Check if all required fields are present
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            console.log("❌ Missing required fields in request");
            return res.status(400).json({
                error: "Missing required payment verification data",
                details: {
                    hasOrderId: !!razorpayOrderId,
                    hasPaymentId: !!razorpayPaymentId,
                    hasSignature: !!razorpaySignature
                }
            });
        }

        console.log("🔄 Verifying payment signature");

        // Verify signature
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "7uBqhSwaUfipfomnu3eA8NE3")
            .update(body.toString())
            .digest("hex");

        console.log("🔐 Signature comparison:", {
            expected: expectedSignature,
            received: razorpaySignature,
            match: expectedSignature === razorpaySignature
        });

        if (expectedSignature !== razorpaySignature) {
            console.log("❌ Invalid signature!");
            return res.status(400).json({
                error: "Invalid signature sent!",
                details: "Payment verification failed due to security reasons."
            });
        }

        // Find the payment
        const payment = await Payment.findOne({
            razorpayOrderId,
            user: req.user._id
        });

        if (!payment) {
            console.log("❌ Payment record not found for order:", razorpayOrderId);
            return res.status(404).json({
                error: "Payment record not found",
                orderId: razorpayOrderId
            });
        }

        // Check if payment is already completed
        if (payment.status === 'Paid') {
            console.log("ℹ️ Payment already completed:", payment._id);
            return res.status(400).json({
                error: "This payment has already been processed",
                paymentId: payment._id
            });
        }

        // Update payment status
        const updatedPayment = await Payment.findOneAndUpdate(
            { _id: payment._id },
            {
                razorpayPaymentId,
                razorpaySignature,
                status: "Paid",
                paidAt: new Date(),
            },
            { new: true }
        );

        console.log("✅ Payment verified successfully:", updatedPayment._id);

        res.json({
            success: true,
            message: "Payment verified successfully",
            payment: updatedPayment
        });

    } catch (error) {
        console.error("❌ Error in /verify-payment:", error);
        res.status(500).json({
            error: "Internal server error during payment verification",
            details: error.message
        });
    }
});

// ========================
// Get User's Payments
// ========================
router.get("/user-payments", authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;

        const payments = await Payment.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean(); // Convert to plain objects

        // Get current active subscription
        const activeSubscription = await Payment.findOne({
            user: userId,
            status: "Paid",
            nextDueDate: { $gt: new Date() }
        });

        res.json({
            payments,
            activeSubscription,
            subscriptionAmount: SUBSCRIPTION_AMOUNT
        });
    } catch (error) {
        console.error("Error fetching user payments:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});

// ========================
// Check Subscription Status
// ========================
router.get("/subscription-status", authenticateToken, async (req, res) => {
    console.log("🔍 SUBSCRIPTION-STATUS ENDPOINT CALLED");

    try {
        const userId = req.user._id;

        // Get active subscription (paid and not expired)
        const activeSubscription = await Payment.findOne({
            user: userId,
            status: "Paid",
            nextDueDate: { $gt: new Date() }
        });

        res.json({
            hasActiveSubscription: !!activeSubscription,
            activeSubscription: activeSubscription || null,
            canMakePayment: !activeSubscription,
            subscriptionAmount: 399
        });

    } catch (error) {
        console.error("❌ Error in /subscription-status:", error);
        res.status(500).json({
            error: "Failed to check subscription status",
            details: error.message
        });
    }
});
// ========================
// Get Pending Payments
// ========================
router.get("/pending/:userId", authenticateToken, async (req, res) => {
    console.log("🔍 PENDING PAYMENTS ENDPOINT CALLED");

    try {
        const { userId } = req.params;

        // Verify that the authenticated user is accessing their own data
        if (userId !== req.user._id.toString()) {
            console.log("❌ Access denied: User ID mismatch");
            return res.status(403).json({ error: "Access denied" });
        }

        console.log("🔄 Fetching pending payments for user:", userId);
        const pendingPayments = await Payment.find({
            user: userId,
            status: { $in: ["Created", "Pending"] },
        });

        console.log("✅ Found pending payments:", pendingPayments.length);
        res.json({ pendingPayments });

    } catch (error) {
        console.error("❌ Error in /pending:", error);
        res.status(500).json({ error: "Failed to fetch pending payments", details: error.message });
    }
});

// ========================
// Get All Payments
// ========================
router.get("/all-payments/:userId", authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId !== req.user._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 });
        res.json({ payments });
    } catch (error) {
        console.error("Error fetching all payments:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});

// ========================
// Check Monthly Payment
// ========================
router.get("/check-monthly-payment", authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if user has an active subscription (paid and not expired)
        const activeSubscription = await Payment.findOne({
            user: userId,
            status: "Paid",
            nextDueDate: { $gt: new Date() }
        });

        res.json({
            hasActiveSubscription: !!activeSubscription,
            activeSubscription,
            canMakePayment: !activeSubscription
        });
    } catch (error) {
        console.error("Error checking monthly payment:", error);
        res.status(500).json({ error: "Failed to check monthly payment" });
    }
});

// ========================
// Premium Content Route
// ========================
router.get("/premium-content", checkSubscription, (req, res) => {
    res.json({ message: "Welcome to premium content" });
});

export default router;