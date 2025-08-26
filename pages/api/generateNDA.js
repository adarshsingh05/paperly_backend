import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import axios from "axios";

const router = express.Router();

// POST route to generate NDA using Gemini AI
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const employeeData = req.body;

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

    // NDA specific details
    const ndaDuration = employeeData.ndaDuration || "5 years";
    const jurisdiction = employeeData.jurisdiction || "State of California";
    const effectiveDate = employeeData.effectiveDate || joiningDate;

    // Create the prompt for Gemini
    const prompt = `Create a professional Non-Disclosure Agreement (NDA) for the following employee:

Employee Details:
- Full Name: ${employeeData.fullName}
- Email Address: ${employeeData.emailAddress}
- Employee Type: ${employeeData.employeeType}
- Role/Position: ${employeeData.role}
- Joining Date: ${joiningDate}
- Address: ${employeeData.address}
- Payment Method: ${employeeData.paymentMethod}
- Tenure: ${employeeData.tenure}
- Salary: $${employeeData.salary.toLocaleString()}

NDA Details:
- Duration: ${ndaDuration}
- Jurisdiction: ${jurisdiction}
- Effective Date: ${effectiveDate}

Company Details:
- Company Name: ${companyName}
- Company Address: ${companyAddress}
- Company Phone: ${companyPhone}
- Company Website: ${companyWebsite}
- Company Email: ${companyEmail}
- HR Name: ${hrName}
- HR Title: ${hrTitle}

Please create a formal, professional Non-Disclosure Agreement that includes:
1. Company letterhead with the provided company details
2. Agreement title and date
3. Parties involved (Company and Employee)
4. Definition of confidential information
5. Employee's obligations and responsibilities
6. Duration of confidentiality obligations
7. Exclusions from confidentiality
8. Return of confidential materials
9. Remedies for breach
10. Governing law and jurisdiction
11. Severability clause
12. Entire agreement clause
13. Signature blocks for both parties
14. Witness signatures (if applicable)

IMPORTANT: Return ONLY the NDA content without any markdown formatting, code blocks, or special characters. Make it ready to copy and paste directly into a document. Use proper formatting with line breaks and spacing. Make it legally comprehensive and professional.`;

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
      message: "NDA generated successfully",
      data: {
        nda: generatedContent,
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
        ndaDetails: {
          ndaDuration,
          jurisdiction,
          effectiveDate
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
    console.error("Error generating NDA:", error);
    
    // Handle Gemini API specific errors
    if (error.response && error.response.data) {
      return res.status(400).json({
        success: false,
        error: "Failed to generate NDA",
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
      error: "Failed to generate NDA. Please try again later." 
    });
  }
});

export default router;
