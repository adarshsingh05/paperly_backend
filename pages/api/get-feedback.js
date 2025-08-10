import express from "express";
import Feedback from "../../models/Feedback.js";
import connectDB from "../../DB/db.js";

const router = express.Router();

// GET route to retrieve all feedbacks
router.get("/", async (req, res) => {
  try {
    // Connect to database
    await connectDB();

    // Get query parameters for pagination and filtering
    const { 
      page = 1, 
      limit = 10, 
      sort = "createdAt", 
      order = "desc",
      search = "",
      minStars,
      maxStars
    } = req.query;

    // Build filter object
    let filter = {};
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { feedback: { $regex: search, $options: 'i' } }
      ];
    }

    // Star rating filter
    if (minStars || maxStars) {
      filter.star = {};
      if (minStars) filter.star.$gte = parseInt(minStars);
      if (maxStars) filter.star.$lte = parseInt(maxStars);
    }

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObject = { [sort]: sortOrder };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get total count for pagination
    const totalFeedbacks = await Feedback.countDocuments(filter);

    // Fetch feedbacks with pagination and sorting
    const feedbacks = await Feedback.find(filter)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'); // Exclude version key

    // Calculate pagination info
    const totalPages = Math.ceil(totalFeedbacks / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      message: "Feedbacks retrieved successfully",
      data: {
        feedbacks: feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalFeedbacks: totalFeedbacks,
          limit: limitNum,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error("Feedback retrieval error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to retrieve feedbacks. Please try again later." 
    });
  }
});

// GET route to get feedback by ID
router.get("/:id", async (req, res) => {
  try {
    // Connect to database
    await connectDB();

    const { id } = req.params;
    
    const feedback = await Feedback.findById(id).select('-__v');
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false,
        error: "Feedback not found." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Feedback retrieved successfully",
      data: {
        feedback: feedback
      }
    });

  } catch (error) {
    console.error("Feedback retrieval error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid feedback ID format." 
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Failed to retrieve feedback." 
    });
  }
});

export default router;
