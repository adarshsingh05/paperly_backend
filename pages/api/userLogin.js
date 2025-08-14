import express from "express";
const router = express.Router();
import User from "../../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

router.post("/", async (req, res) => {
    try {
        // Extract email and password from request body
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Email and password are required" 
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                organizationType: user.OrganizationType
            },
            process.env.JWT_SECRET,
            { 
                expiresIn: '21d' // Token expires in 21 days
            }
        );

        // Create user object without password for response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            OrganizationType: user.OrganizationType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        // Return successful login response with token
        res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            user: userResponse,
            expiresIn: '7d'
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
});


export default router;
