import express from "express";
const router = express.Router();
import User from "../../models/Users.js";
import bcrypt from "bcrypt";

router.post("/", async (req, res) => {
    // taking data frin the body
    const { name, email, password, OrganizationType } = req.body;

    // validation of missing fields
    if (!name || !email || !password || !OrganizationType) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // creating the user object
    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //     return res.status(400).json({ message: "User already exists" });
    // }

    // hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // creating the user
    try {
        const user = await User.create({ name, email, password: hashedPassword, OrganizationType });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;