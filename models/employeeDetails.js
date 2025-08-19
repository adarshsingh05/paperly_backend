import mongoose from "mongoose";

const employeeDetailSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    employeeType: {
      type: String,
      required: true,
      enum: ["Employee", "Freelancer"],
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["bank-transfer", "UPI", "check"],
    },
    tenure: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    documents: {
      offerLetter: {
        type: Boolean,
        default: false,
      },
      nda: {
        type: Boolean,
        default: false,
      },
      salaryCtcLetter: {
        type: Boolean,
        default: false,
      },
      terminationExitAgreement: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ["Employee Added", "Document Sent", "Signed and Received"],
      default: "Employee Added",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const EmployeeDetail = mongoose.model("EmployeeDetail", employeeDetailSchema);

export default EmployeeDetail;
