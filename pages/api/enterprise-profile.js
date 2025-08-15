import express from "express";
import EnterpriseProfile from "../../models/enterpriseProfile.js";

const router = express.Router();

// POST or UPDATE route to save enterprise profile data
router.post("/", async (req, res) => {
  try {
    const { email, ...profileData } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ error: "Email is required to identify the profile." });
    }

    // Find existing profile by email
    let profile = await EnterpriseProfile.findOne({ email });

    if (profile) {
      // Update existing profile
      profile = await EnterpriseProfile.findOneAndUpdate(
        { email },
        { $set: profileData },
        { new: true, runValidators: true }
      );
      return res.status(200).json({
        message: "Profile updated successfully",
        profile,
      });
    } else {
      // Create new profile
      const newProfile = new EnterpriseProfile({ email, ...profileData });
      await newProfile.save();
      return res.status(201).json({
        message: "Profile created successfully",
        profile: newProfile,
      });
    }
  } catch (error) {
    console.error("Error saving enterprise profile:", error);
    res
      .status(500)
      .json({ error: "Failed to save profile. Please try again later." });
  }
});

export default router;
