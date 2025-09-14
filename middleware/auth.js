import jwt from 'jsonwebtoken';
import User from '../models/Users.js';

export const authenticateToken = async (req, res, next) => {
    console.log("🔍 AUTHENTICATE TOKEN MIDDLEWARE CALLED");

    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        console.log("📨 Authorization header:", authHeader);

        const token = authHeader && authHeader.split(' ')[1];
        console.log("🔑 Extracted token:", token ? "Present" : "Missing");

        if (!token) {
            console.log("❌ No token provided");
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        console.log("🔄 Verifying JWT token");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token decoded successfully:", decoded);

        // Check all available fields in the decoded token
        console.log("📋 All fields in decoded token:", Object.keys(decoded));
        console.log("🔍 userId field value:", decoded.userId);
        console.log("🔍 userID field value:", decoded.userID);
        console.log("🔍 id field value:", decoded.id);

        // Try to find the user ID using various possible field names
        const userId = decoded.userId || decoded.userID || decoded.id;
        console.log("👤 Using user ID:", userId);

        if (!userId) {
            console.log("❌ No user ID found in token");
            return res.status(401).json({
                success: false,
                message: 'Token missing user identifier'
            });
        }

        // Get user from database
        console.log("🔄 Looking up user in database with ID:", userId);
        const user = await User.findById(userId).select('-password');

        if (!user) {
            console.log("❌ User not found in database");
            console.log("🔍 Attempted to find user with ID:", userId);

            // Check if any users exist in the database
            const userCount = await User.countDocuments();
            console.log("📊 Total users in database:", userCount);

            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        console.log("✅ User found:", { id: user._id, email: user.email, name: user.name });

        // Add user to request object
        req.user = user;
        next();

    } catch (error) {
        console.error("❌ Auth middleware error:", error);

        if (error.name === 'JsonWebTokenError') {
            console.log("❌ Invalid JWT token");
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        } else if (error.name === 'TokenExpiredError') {
            console.log("❌ Token expired");
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        } else {
            console.error('❌ Unexpected error in auth middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
};