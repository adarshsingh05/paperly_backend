import cron from "node-cron";
import UserPayment from "./models/userpayment.js";
import Razorpay from "razorpay";
import connectDB from "./DB/db.js";


const razorpay = new Razorpay({
  key_id: "rzp_test_RGza9p0QhWmwOL",
  key_secret: "7uBqhSwaUfipfomnu3eA8NE3",
});

cron.schedule("0 0 1 * *", async() =>{

   console.log("Running monthly payment check...");
})

try {
    await connectDB();
    const pendingPayments = await UserPayment.find({
        nextDueDate: { $lte: new Date() },
        status: { $ne: "Paid" }

    }).populate("user");


    for(const payment of pendingPayments){
        
      console.log(`User ${payment.user.email} has pending payment.`);
    }

    const options = {
        amount: payment.amount * 100,
        currency: payment.currency,
        receipt: `renewal_${Date.now()}`
    }

    const newPayment = new UserPayment({

        user: payment.user._id,
        razorpayOrderId: order.id,
        amount: payment.amount,
        currency: payment.currency,
        status: "Created",
        month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // start of month
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1))

    })

    await newPayment.save();

      console.log(`✅ Renewal order created for ${payment.user.email}: ${order.id}`);



} catch (error) {
    console.error("❌ Cron job error:", error);


}


