import UserPayment from "../models/userpayment.js";

export const checkSubscription = async (req, res, next) => {

    try {
        const userId = req.user._id;

        const payment = await UserPayment.findOne({user: userId}).sort({ nextDueDate: -1 })

        if (!payment) {
            return res.status(403).json({ message: "No subscription found. Please subscribe." });

        }

        const today = new Date();

        if(payment.status !== "Paid" || payment.nextDueDate < today){
            return res.status(402).json({ message: "Payment pending. Please pay to continue." });
        }

        if(payment.nextDueDate < today){
            return res.status(402).json({ message: "Subscription expired. Please renew." });
           
        }
        next();

 
    } catch (error) {
        console.error(err);
    res.status(500).json({ message: "Subscription check failed" });
        
    }
}
