import express from "express";
import { authenticateToken } from "../../middleware/auth";
import EmployeePaymentDetails from "../../models/employeePaymentDetails.js";

const router = express.Router();

// POST route to create employee payment details in the db
router.post("/", authenticateToken, async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const paymentData = req.body;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Validate required fields
    const requiredFields = [
      "employeeEmail",
      "employeeName",
      "paymentAmount",
      "modeOfPayment",
      "dateOfPayment"
    ];
    
    const missingFields = requiredFields.filter(
      (field) => !paymentData[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: `The following fields are required: ${missingFields.join(", ")}`,
      });
    }

    // Validate payment amount
    if (paymentData.paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Payment amount must be greater than 0",
      });
    }

    // Validate date format
    const paymentDate = new Date(paymentData.dateOfPayment);
    if (isNaN(paymentDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format for dateOfPayment",
      });
    }

    // Create new payment details
    const newPaymentDetails = new EmployeePaymentDetails({
      ...paymentData,
      ownerEmail: ownerEmail,
      dateOfPayment: paymentDate,
      lastPaymentDate: paymentData.lastPaymentDate ? new Date(paymentData.lastPaymentDate) : undefined,
      dateOfJoining: paymentData.dateOfJoining ? new Date(paymentData.dateOfJoining) : undefined,
    });

    await newPaymentDetails.save();

    res.status(201).json({
      success: true,
      message: "Employee payment details created successfully",
      data: newPaymentDetails,
    });
  } catch (error) {
    console.error("Error creating employee payment details:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create employee payment details. Please try again later.",
    });
  }
});

// GET route to retrieve employee payment details for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const { employeeEmail, currentMonth, paymentStatus } = req.query;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Build filter object
    const filter = { ownerEmail: ownerEmail };
    
    if (employeeEmail) {
      filter.employeeEmail = employeeEmail;
    }
    
    if (currentMonth) {
      filter.currentMonth = currentMonth;
    }
    
    if (paymentStatus) {
      filter.currentMonthPaymentStatus = paymentStatus;
    }

    // Find payment details by ownerEmail (which should match the authenticated user's email)
    const paymentDetails = await EmployeePaymentDetails.find(filter).sort({ dateOfPayment: -1 });

    if (!paymentDetails || paymentDetails.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No employee payment details found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee payment details retrieved successfully",
      data: paymentDetails,
      count: paymentDetails.length,
    });
  } catch (error) {
    console.error("Error retrieving employee payment details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve employee payment details. Please try again later.",
    });
  }
});

// GET route to retrieve specific employee payment details by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const { id } = req.params;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Find specific payment details by ID and ownerEmail
    const paymentDetails = await EmployeePaymentDetails.findOne({
      _id: id,
      ownerEmail: ownerEmail,
    });

    if (!paymentDetails) {
      return res.status(404).json({
        success: false,
        error: "Employee payment details not found or you don't have permission to view it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee payment details retrieved successfully",
      data: paymentDetails,
    });
  } catch (error) {
    console.error("Error retrieving employee payment details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve employee payment details. Please try again later.",
    });
  }
});

// PUT route to update existing employee payment details
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const { id } = req.params;
    const updateData = req.body;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Validate payment amount if it's being updated
    if (updateData.paymentAmount && updateData.paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Payment amount must be greater than 0",
      });
    }

    // Convert date strings to Date objects if provided
    if (updateData.dateOfPayment) {
      updateData.dateOfPayment = new Date(updateData.dateOfPayment);
    }
    if (updateData.lastPaymentDate) {
      updateData.lastPaymentDate = new Date(updateData.lastPaymentDate);
    }
    if (updateData.dateOfJoining) {
      updateData.dateOfJoining = new Date(updateData.dateOfJoining);
    }

    // Find and update payment details, ensuring it belongs to the authenticated user
    const updatedPaymentDetails = await EmployeePaymentDetails.findOneAndUpdate(
      { _id: id, ownerEmail: ownerEmail },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPaymentDetails) {
      return res.status(404).json({
        success: false,
        error: "Employee payment details not found or you don't have permission to update it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee payment details updated successfully",
      data: updatedPaymentDetails,
    });
  } catch (error) {
    console.error("Error updating employee payment details:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update employee payment details. Please try again later.",
    });
  }
});

// DELETE route to remove employee payment details
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const { id } = req.params;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Find and delete payment details, ensuring it belongs to the authenticated user
    const deletedPaymentDetails = await EmployeePaymentDetails.findOneAndDelete({
      _id: id,
      ownerEmail: ownerEmail,
    });

    if (!deletedPaymentDetails) {
      return res.status(404).json({
        success: false,
        error: "Employee payment details not found or you don't have permission to delete it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee payment details deleted successfully",
      data: deletedPaymentDetails,
    });
  } catch (error) {
    console.error("Error deleting employee payment details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete employee payment details. Please try again later.",
    });
  }
});

export default router;
