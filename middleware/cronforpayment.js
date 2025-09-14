// middleware/cronforpayment.js
import cron from "node-cron";
import Payment from "../models/userpaymentmodel.js";
import User from "../models/Users.js";
import connectDB from "../DB/db.js";

// Connect to database once
connectDB().then(() => {
    console.log("✅ Cron job connected to database");
});

cron.schedule("0 0 1 * *", async () => {
    console.log("🔄 Running monthly payment check...");

    try {
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7); // "YYYY-MM"
        const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const previousMonthStr = previousMonth.toISOString().slice(0, 7);

        console.log(`📅 Checking payments for month: ${currentMonth}`);

        // Find users who haven't paid for the current month
        const unpaidUsers = await User.aggregate([
            {
                $lookup: {
                    from: "payments",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user", "$$userId"] },
                                        { $eq: ["$month", currentMonth] },
                                        { $eq: ["$status", "Paid"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "currentMonthPayments"
                }
            },
            {
                $match: {
                    "currentMonthPayments.0": { $exists: false } // No paid payments for current month
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    _id: 1
                }
            }
        ]);

        console.log(`👥 Found ${unpaidUsers.length} users who haven't paid for ${currentMonth}`);

        // Create pending payments for unpaid users
        for (const user of unpaidUsers) {
            try {
                // Check if payment already exists for this month
                const existingPayment = await Payment.findOne({
                    user: user._id,
                    month: currentMonth
                });

                if (existingPayment) {
                    console.log(`ℹ️ Payment already exists for ${user.email} for ${currentMonth}`);
                    continue;
                }

                // Create new pending payment with ₹399 amount
                const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 15); // Due on 15th of next month

                const newPayment = new Payment({
                    user: user._id,
                    razorpayOrderId: `pending_${currentMonth}_${user._id}`,
                    amount: 399, // Changed from 100 to 399
                    currency: "INR",
                    status: "Pending",
                    month: currentMonth,
                    periodStart,
                    periodEnd,
                    nextDueDate
                });

                await newPayment.save();
                console.log(`✅ Created pending payment for ${user.email} for ${currentMonth}`);

            } catch (error) {
                console.error(`❌ Error creating payment for ${user.email}:`, error);
            }
        }

        // Check for expired payments (unpaid for previous month)
        const expiredPayments = await Payment.find({
            month: previousMonthStr,
            status: { $in: ["Created", "Pending"] },
            nextDueDate: { $lt: currentDate }
        }).populate("user");

        for (const payment of expiredPayments) {
            try {
                payment.status = "Expired";
                await payment.save();
                console.log(`📛 Marked payment as expired for ${payment.user.email} for ${previousMonthStr}`);
            } catch (error) {
                console.error(`❌ Error updating expired payment:`, error);
            }
        }

    } catch (error) {
        console.error("❌ Cron job error:", error);
    }
});