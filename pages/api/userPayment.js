import Razorpay from 'razorpay';
import Payment from '../../models/userpaymentmodel.js';
import User from '../../models/Users.js';
import connectDB from '../../DB/db.js';
import express from 'express';
import crypto from 'crypto';
import { checkSubscription } from '../../middleware/checkPayment.js';


const razorpay = new Razorpay({
    key_id: "rzp_test_RGza9p0QhWmwOL",
    key_secret: "7uBqhSwaUfipfomnu3eA8NE3",
})

const router = express.Router();

// order creation from backend

router.post("/create-order", async (req, res) => {

    try {
        await connectDB();
        const {userId, amount, currency="INR"} = req.body

        const options = {
            amount: amount*100,
            currency,
            receipt: `receipt_${Date.now()}`


        }

        const order = await razorpay.orders.create(options);
    
        const payment =  await UserPayment.create({

            user: userId,
            razorpayOrderId: order.id,
            amount,
            currency,
            status: "Created",
            month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            periodStart: new Date(),
            periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1))

        })

        res.json({order, payment, message: {success: true, message: "Order created successfully"}})
           
    } catch (error) {

        console.log(error);
        res.status(500).json({ error: "Failed to create order" });

        
    }

})

// verify payment from frontend

router.post("/verify-payment", async (req, res) => {

    const {razorpayOrderId, razorpayPaymentId, razorpaySignature} = req.body
     
    try {
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

        if(expectedSignature !== razorpaySignature){
           return res.status(400).json({error: "Invalid signature sent!"})

        }

        const payment = await UserPayment.findOneAndUpdate(
            {razorpayOrderId},
            {
                razorpayPaymentId,
                razorpaySignature,
                status: "PAID",
                paidAt: Date.now()
            },
            {new: true}
        )

        res.json({sucess: true, message: "Payment verified successfully", payment})

        
    } catch (error) {

        console.log(error);
        res.status(500).json({error: "Internal server error"})
        
    }
})

// middleware route for accessing premium content

router.get("/premium-content", checkSubscription, (req, res) => {
  res.json({ message: "Welcome to premium content " });
});


export default router
