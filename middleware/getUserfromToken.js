export const getUserFromToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });

        const token = authHeader.split(" ")[1]; // "Bearer <token>"
        if (!token) return res.status(401).json({ error: "Invalid token format" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);

        // Handle different case variations
        const userId = decoded.userId || decoded.userID || decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            console.log("User not found with ID:", userId);
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user; // ✅ attach user to request
        next();
    } catch (err) {
        console.error("JWT middleware error:", err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        } else if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        res.status(401).json({ error: "Unauthorized" });
    }
};