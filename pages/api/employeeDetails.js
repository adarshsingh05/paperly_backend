import express from "express";
import EmployeeDetail from "../../models/employeeDetails.js";
import { authenticateToken } from "../../middleware/auth.js";
import mongoose from "mongoose"; // Add this import

const router = express.Router();

// GET route to retrieve employee details for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Find employee details by ownerEmail (which should match the authenticated user's email)
    const employeeDetails = await EmployeeDetail.find({
      ownerEmail: userEmail,
    });

    if (!employeeDetails || employeeDetails.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No employee details found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee details retrieved successfully",
      data: employeeDetails,
      count: employeeDetails.length,
    });
  } catch (error) {
    console.error("Error retrieving employee details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve employee details. Please try again later.",
    });
  }
});

// POST route to create new employee details for the authenticated user
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Get email from authenticated user
    const employeeData = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Validate required fields including employeeType
    const requiredFields = [
      "fullName",
      "emailAddress",
      "employeeType",
      "role",
      "joiningDate",
      "address",
      "paymentMethod",
      "tenure",
      "salary",
    ];
    const missingFields = requiredFields.filter(
      (field) => !employeeData[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: `The following fields are required: ${missingFields.join(
          ", "
        )}`,
      });
    }

    // Validate employeeType enum values
    if (!["Employee", "Freelancer"].includes(employeeData.employeeType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee type",
        details: "employeeType must be either 'Employee' or 'Freelancer'",
      });
    }

    // Add the ownerEmail to the employee data
    const newEmployeeDetail = new EmployeeDetail({
      ...employeeData,
      ownerEmail: userEmail,
    });

    await newEmployeeDetail.save();

    res.status(201).json({
      success: true,
      message: "Employee details created successfully",
      data: newEmployeeDetail,
    });
  } catch (error) {
    console.error("Error creating employee details:", error);

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
      error: "Failed to create employee details. Please try again later.",
    });
  }
});

// PUT route to update existing employee details
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { id } = req.params;
    const updateData = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Validate employeeType if it's being updated
    if (
      updateData.employeeType &&
      !["Employee", "Freelancer"].includes(updateData.employeeType)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee type",
        details: "employeeType must be either 'Employee' or 'Freelancer'",
      });
    }

    // Find and update employee details, ensuring it belongs to the authenticated user
    const updatedEmployee = await EmployeeDetail.findOneAndUpdate(
      { _id: id, ownerEmail: userEmail },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        error:
          "Employee details not found or you don't have permission to update it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee details updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee details:", error);

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
      error: "Failed to update employee details. Please try again later.",
    });
  }
});

// DELETE route to remove employee details
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { id } = req.params;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Find and delete employee details, ensuring it belongs to the authenticated user
    const deletedEmployee = await EmployeeDetail.findOneAndDelete({
      _id: id,
      ownerEmail: userEmail,
    });

    if (!deletedEmployee) {
      return res.status(404).json({
        success: false,
        error:
          "Employee details not found or you don't have permission to delete it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee details deleted successfully",
      data: deletedEmployee,
    });
  } catch (error) {
    console.error("Error deleting employee details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete employee details. Please try again later.",
    });
  }
});

// PATCH route to update only the status field of employee details
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { id } = req.params;
    const { status } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email not found in authentication token.",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee ID format.",
      });
    }

    if (typeof status === "undefined") {
      return res.status(400).json({
        success: false,
        error: "Missing status field in request body.",
      });
    }

    // Debug log to help trace 404 issues
    console.log("PATCH /:id/status", { id, userEmail, status });

    // Update only the status field
    const updatedEmployee = await EmployeeDetail.findOneAndUpdate(
      { _id: id, ownerEmail: userEmail },
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        error:
          "Employee details not found or you don't have permission to update it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee status updated successfully",
      status: updatedEmployee.status,
    });
  } catch (error) {
    console.error("Error updating employee status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update employee status. Please try again later.",
    });
  }
});

// PATCH route to update employee status by email (no authentication required)
router.patch("/status-by-email", async (req, res) => {
  try {
    const { emailAddress, status } = req.body;

    if (!emailAddress || !status) {
      return res.status(400).json({
        success: false,
        error: "Email address and status are required",
      });
    }

    const updatedEmployee = await EmployeeDetail.findOneAndUpdate(
      { emailAddress: emailAddress },
      { status: status },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee status updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update employee status",
    });
  }
});

export default router;
