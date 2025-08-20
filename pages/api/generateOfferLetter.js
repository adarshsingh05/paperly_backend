import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import axios from "axios";

const router = express.Router();

// POST route to generate offer letter using Gemini AI
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const employeeData = req.body;

    // Debug: Check if GEMINI_API is set
    console.log("GEMINI_API key exists:", !!process.env.GEMINI_API);
    console.log("GEMINI_API key length:", process.env.GEMINI_API ? process.env.GEMINI_API.length : 0);

    if (!userEmail) {
      return res.status(400).json({ 
        success: false,
        error: "User email not found in authentication token." 
      });
    }

    // Check for GEMINI_API key first
    if (!process.env.GEMINI_API) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key not configured",
        details: "Please add GEMINI_API to your environment variables"
      });
    }

    // Validate required fields
    const requiredFields = ['fullName', 'emailAddress', 'employeeType', 'role', 'joiningDate', 'address', 'paymentMethod', 'tenure', 'salary'];
    const missingFields = requiredFields.filter(field => !employeeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: `The following fields are required: ${missingFields.join(', ')}`
      });
    }

    // Validate employeeType enum values
    if (!['Employee', 'Freelancer'].includes(employeeData.employeeType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee type",
        details: "employeeType must be either 'Employee' or 'Freelancer'"
      });
    }

    // Format the joining date
    const joiningDate = new Date(employeeData.joiningDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Company details from request (with defaults)
    const companyName = employeeData.companyName || "Your Company Name";
    const companyAddress = employeeData.companyAddress || "Your Company Address";
    const companyPhone = employeeData.companyPhone || "Your Company Phone";
    const companyWebsite = employeeData.companyWebsite || "Your Company Website";
    const companyEmail = employeeData.companyEmail || userEmail;
    const hrName = employeeData.hrName || "HR Manager";
    const hrTitle = employeeData.hrTitle || "Human Resources Manager";

    // Create the prompt for Gemini
    const prompt = `Create a professional offer letter for the following candidate:

Candidate Details:
- Full Name: ${employeeData.fullName}
- Email Address: ${employeeData.emailAddress}
- Employee Type: ${employeeData.employeeType}
- Role/Position: ${employeeData.role}
- Joining Date: ${joiningDate}
- Address: ${employeeData.address}
- Payment Method: ${employeeData.paymentMethod}
- Tenure: ${employeeData.tenure}
- Salary: $${employeeData.salary.toLocaleString()}

Company Details:
- Company Name: ${companyName}
- Company Address: ${companyAddress}
- Company Phone: ${companyPhone}
- Company Website: ${companyWebsite}
- Company Email: ${companyEmail}
- HR Name: ${hrName}
- HR Title: ${hrTitle}

Please create a formal, professional offer letter that includes:
1. Company letterhead with the provided company details
2. Current date
3. Candidate's full name and address
4. Position title
5. Joining date
6. Salary details
7. Payment terms
8. Employment terms and conditions
9. Contact information
10. Professional closing with HR signature

IMPORTANT: Return ONLY the offer letter content without any markdown formatting, code blocks, or special characters. Make it ready to copy and paste directly into a document. Use proper formatting with line breaks and spacing.`;

    // Call Gemini API
    const geminiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API
        }
      }
    );

    // Extract the generated content and clean it
    let generatedContent = geminiResponse.data.candidates[0].content.parts[0].text;
    
    // Remove markdown formatting if present
    generatedContent = generatedContent
      .replace(/```/g, '') // Remove code blocks
      .replace(/^\s*\[/gm, '') // Remove opening brackets at start of lines
      .replace(/\]\s*$/gm, '') // Remove closing brackets at end of lines
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .trim();

    res.status(200).json({
      success: true,
      message: "Offer letter generated successfully",
      data: {
        offerLetter: generatedContent,
        employeeDetails: {
          fullName: employeeData.fullName,
          emailAddress: employeeData.emailAddress,
          employeeType: employeeData.employeeType,
          role: employeeData.role,
          joiningDate: joiningDate,
          address: employeeData.address,
          paymentMethod: employeeData.paymentMethod,
          tenure: employeeData.tenure,
          salary: employeeData.salary
        },
        companyDetails: {
          companyName,
          companyAddress,
          companyPhone,
          companyWebsite,
          companyEmail,
          hrName,
          hrTitle
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error generating offer letter:", error);
    
    // Handle Gemini API specific errors
    if (error.response && error.response.data) {
      return res.status(400).json({
        success: false,
        error: "Failed to generate offer letter",
        details: error.response.data.error?.message || "Gemini API error"
      });
    }

    // Handle missing API key
    if (!process.env.GEMINI_API) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key not configured",
        details: "Please add GEMINI_API to your environment variables"
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Failed to generate offer letter. Please try again later." 
    });
  }
});

// GET route to check if Gemini API is configured
router.get("/status", authenticateToken, async (req, res) => {
  try {
    if (!process.env.GEMINI_API) {
      return res.status(200).json({
        success: false,
        message: "Gemini API key not configured",
        configured: false
      });
    }

    res.status(200).json({
      success: true,
      message: "Gemini API is configured",
      configured: true
    });
  } catch (error) {
    console.error("Error checking Gemini API status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check API status"
    });
  }
});

export default router;
