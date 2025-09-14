// middleware/checkPayment.js
import UserPayment from "../models/userpaymentmodel.js";

export const checkSubscription = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Get the most recent PAID payment
        const payment = await UserPayment.findOne({
            user: userId,
            status: "Paid"
        }).sort({ createdAt: -1 });

        if (!payment) {
            return res.status(403).json({
                message: "No active subscription found. Please subscribe.",
                code: "NO_SUBSCRIPTION"
            });
        }

        const today = new Date();

        // Check if subscription has expired
        if (payment.nextDueDate < today) {
            return res.status(402).json({
                message: "Subscription expired. Please renew.",
                code: "SUBSCRIPTION_EXPIRED",
                nextDueDate: payment.nextDueDate
            });
        }

        // Add subscription info to request for use in routes
        req.subscription = {
            isActive: true,
            nextDueDate: payment.nextDueDate,
            amount: payment.amount,
            paymentDate: payment.paidAt
        };

        next();
    } catch (error) {
        console.error("Subscription check error:", error);
        res.status(500).json({
            message: "Subscription check failed",
            code: "CHECK_ERROR"
        });
    }
};

// Additional middleware to check if user can make payment
export const canMakePayment = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Check for active subscription
        const activeSubscription = await UserPayment.findOne({
            user: userId,
            status: "Paid",
            nextDueDate: { $gt: new Date() } // Subscription is still active
        });

        if (activeSubscription) {
            return res.status(400).json({
                message: "You already have an active subscription",
                code: "ACTIVE_SUBSCRIPTION",
                nextDueDate: activeSubscription.nextDueDate
            });
        }

        next();
    } catch (error) {
        console.error("Payment eligibility check error:", error);
        res.status(500).json({
            message: "Payment eligibility check failed",
            code: "ELIGIBILITY_CHECK_ERROR"
        });
    }
};