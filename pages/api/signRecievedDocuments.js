import express from "express";
import AdminDocumentDraft from "../../models/AdminDocumentDraft.js";
import mongoose from "mongoose";

const router = express.Router();

// POST /api/signRecievedDocuments
router.post("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No IDs provided in the request body.",
      });
    }

    // Filter valid ObjectIds
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid document IDs found.",
      });
    }

    // Find documents by IDs
    const documents = await AdminDocumentDraft.find(
      { _id: { $in: validIds } },
      "_id supabaseLink"
    );
    const result = documents.map((doc) => ({
      id: doc._id,
      supabaseLink: doc.supabaseLink,
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching supabase links:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch supabase links. Please try again later.",
    });
  }
});

export default router;
