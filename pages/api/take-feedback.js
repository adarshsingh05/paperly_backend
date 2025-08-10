import express from "express";
import Feedback from "../../models/Feedback.js";

const router = express.Router();

// POST route to handle feedback submission
router.post("/", async (req, res) => {
  try {
    const { name, email, feedback, star } = req.body;

    // Validate required fields
    if (!name || !email || !feedback || !star) {
      return res.status(400).json({
        error:
          "Missing required fields. Please provide name, email, feedback, and star rating.",
      });
    }

    // Validate star rating (1-5)
    if (star < 1 || star > 5 || !Number.isInteger(star)) {
      return res.status(400).json({
        error: "Star rating must be a whole number between 1 and 5.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address.",
      });
    }

    // Validate name and feedback length
    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "Name must be at least 2 characters long.",
      });
    }

    if (feedback.trim().length < 10) {
      return res.status(400).json({
        error: "Feedback must be at least 10 characters long.",
      });
    }

    // Create new feedback document
    const newFeedback = new Feedback({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      feedback: feedback.trim(),
      star: star,
    });

    // Save to database
    const savedFeedback = await newFeedback.save();

    // Return success response
    res.status(201).json({
      message: "Feedback submitted successfully!",
      feedback: {
        id: savedFeedback._id,
        name: savedFeedback.name,
        email: savedFeedback.email,
        feedback: savedFeedback.feedback,
        star: savedFeedback.star,
        createdAt: savedFeedback.createdAt,
      },
    });
  } catch (error) {
    console.error("Feedback submission error:", error);

    // Handle duplicate email error (if you want to allow only one feedback per email)
    if (error.code === 11000) {
      return res.status(400).json({
        error: "You have already submitted feedback with this email address.",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      error: "Failed to submit feedback. Please try again later.",
    });
  }
});

// GET route to retrieve all feedback (optional - for admin purposes)
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .sort({ createdAt: -1 }) // Sort by newest first
      .select("-__v"); // Exclude version key

    res.status(200).json({
      message: "Feedbacks retrieved successfully",
      count: feedbacks.length,
      feedbacks: feedbacks,
    });
  } catch (error) {
    console.error("Feedback retrieval error:", error);
    res.status(500).json({
      error: "Failed to retrieve feedbacks.",
    });
  }
});

// GET route to get feedback by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id).select("-__v");

    if (!feedback) {
      return res.status(404).json({
        error: "Feedback not found.",
      });
    }

    res.status(200).json({
      message: "Feedback retrieved successfully",
      feedback: feedback,
    });
  } catch (error) {
    console.error("Feedback retrieval error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid feedback ID format.",
      });
    }

    res.status(500).json({
      error: "Failed to retrieve feedback.",
    });
  }
});

// DELETE route to delete feedback by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFeedback = await Feedback.findByIdAndDelete(id);

    if (!deletedFeedback) {
      return res.status(404).json({
        error: "Feedback not found.",
      });
    }

    res.status(200).json({
      message: "Feedback deleted successfully",
      feedback: deletedFeedback,
    });
  } catch (error) {
    console.error("Feedback deletion error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid feedback ID format.",
      });
    }

    res.status(500).json({
      error: "Failed to delete feedback. Please try again later.",
    });
  }
});

export default router;
