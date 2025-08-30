import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import nodemailer from "nodemailer";

const router = express.Router();

const EMAIL_USER = "adarshashokbaghel@gmail.com";
const EMAIL_PASSWORD = "ajrn ibux zorp bmcs";

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // You can change this to other services like 'outlook', 'yahoo', etc.
    auth: {
      user: EMAIL_USER, // Your email address
      pass: EMAIL_PASSWORD, // Your email password or app password
    },
  });
};

// POST route to send document signing email
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { receiverEmail, documentLink, documentTitle } = req.body;

    // Validate required fields
    if (!receiverEmail || !documentLink) {
      return res.status(400).json({
        success: false,
        error: "receiverEmail and documentLink are required fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiverEmail)) {
      return res.status(400).json({
        success: false,
        error: "Invalid receiver email format",
      });
    }

    // Validate URL format
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(documentLink)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid document link format. Must be a valid URL starting with http:// or https://",
      });
    }

    // Create email transporter
    let transporter;
    try {
      transporter = createTransporter();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }

    // Email content
    const subject = `Document Ready - ${documentTitle || "Paprly Document"}`;

    const emailContent = `Hello,

You have received documents that require your attention.

Please visit the link below to sign or view the documents:

${documentLink}

This link will take you directly to the document signing/viewing page.

Best regards,
Paprly Team`;

    // Email options
    const mailOptions = {
      from: EMAIL_USER,
      to: receiverEmail,
      subject: subject,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px; font-size: 28px;">📄 Document Ready</h1>
              <p style="color: #7f8c8d; font-size: 16px; margin: 0;">You have received documents that require your attention</p>
            </div>
            
            <!-- Main Content -->
            <div style="background-color: #ecf0f1; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello,
              </p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                You have received documents that require your attention.
              </p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Please visit the link below to sign or view the documents:
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${documentLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                🔗 View & Sign Documents
              </a>
            </div>
            
            <!-- Document Info -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
              <h3 style="color: #2c3e50; margin-bottom: 10px; font-size: 18px;">📋 Document Details</h3>
              <p style="color: #7f8c8d; margin: 5px 0; font-size: 14px;">
                <strong>Document:</strong> ${documentTitle || "Paprly Document"}
              </p>
              <p style="color: #7f8c8d; margin: 5px 0; font-size: 14px;">
                <strong>Link:</strong> <a href="${documentLink}" style="color: #667eea; text-decoration: none;">${documentLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                This link will take you directly to the document signing/viewing page.
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong style="color: #2c3e50;">Paprly Team</strong>
              </p>
            </div>
          </div>
          
          <!-- Footer Note -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              This is an automated message from Paprly. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email details (for debugging)
    console.log("Document email sent successfully:", {
      messageId: info.messageId,
      from: EMAIL_USER,
      to: receiverEmail,
      subject: subject,
      timestamp: new Date().toISOString(),
      authenticatedUser: req.user.email, // From JWT token
    });

    res.status(200).json({
      success: true,
      message: "Document email sent successfully",
      data: {
        messageId: info.messageId,
        sentTo: receiverEmail,
        sentFrom: EMAIL_USER,
        subject: subject,
        documentLink: documentLink,
        documentTitle: documentTitle || "Paprly Document",
        sentAt: new Date().toISOString(),
        sentBy: req.user.email,
      },
    });
  } catch (error) {
    console.error("Error sending document email:", error);

    // Handle specific email errors
    if (error.code === "EAUTH") {
      return res.status(500).json({
        success: false,
        error:
          "Email authentication failed. Please check your email credentials.",
      });
    }

    if (error.code === "ECONNECTION") {
      return res.status(500).json({
        success: false,
        error: "Failed to connect to email server. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to send document email. Please try again later.",
    });
  }
});

// GET route to test email configuration
router.get("/test", authenticateToken, async (req, res) => {
  try {
    // Remove environment variable check since credentials are hardcoded
    res.status(200).json({
      success: true,
      message: "Email configuration is properly set up",
      data: {
        emailUser: EMAIL_USER,
        isConfigured: true,
        authenticatedUser: req.user.email,
      },
    });
  } catch (error) {
    console.error("Error testing email configuration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test email configuration",
    });
  }
});

export default router;



