import mongoose from "mongoose";

const employeePaymentDetailsSchema = new mongoose.Schema({
  ownerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  employeeEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  paymentAmount: {
    type: Number,
    required: true,
  },
  modeOfPayment: {
    type: String,
    required: true,
  },
  dateOfPayment: {
    type: Date,
    required: true,
  },
  lastPaymentDate: {
    type: Date,
    required: false,
  },
  currentMonth: {
    type: String,
    required: false,
  },
  currentMonthPaymentStatus: {
    type: String,
    required: false,
  },
  currentMonthPaymentAmount: {
    type: Number,
    required: false,
  },
  role: {
    type: String,
    required: false,
  },
  dateOfJoining: {
    type: Date,
    required: false,
  },
});

const EmployeePaymentDetails = mongoose.model(
  "EmployeePaymentDetails",
  employeePaymentDetailsSchema
);
export default EmployeePaymentDetails;
