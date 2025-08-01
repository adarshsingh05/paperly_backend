import express from "express";
import nodemailer from "nodemailer";
import axios from "axios";

const router = express.Router();

const EMAIL_USER = "adarshashokbaghel@gmail.com";
const EMAIL_PASS = "ajrn ibux zorp bmcs";

// HTML Email Template
const createEmailHTML = (documentId, clientEmail) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Shared - Trim Work</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        
        .document-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            color: white;
            text-align: center;
        }
        
        .document-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .document-id {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .document-description {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .action-section {
            text-align: center;
            margin: 30px 0;
        }
        
        .action-title {
            font-size: 20px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .button-group {
            display: inline-block;
            margin: 10px 0;
        }
        
        .btn {
            display: inline-block;
            padding: 14px 28px;
            margin: 8px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .features {
            background-color: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .features h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 14px;
            color: #555;
        }
        
        .feature-icon {
            color: #28a745;
            margin-right: 10px;
            font-weight: bold;
        }
        
        .footer {
            background-color: #2c3e50;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .footer-content {
            margin-bottom: 20px;
        }
        
        .footer h3 {
            font-size: 20px;
            margin-bottom: 10px;
        }
        
        .footer p {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        
        .social-links {
            margin-top: 20px;
        }
        
        .social-links a {
            color: white;
            text-decoration: none;
            margin: 0 10px;
            font-size: 18px;
        }
        
        .divider {
            height: 2px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            margin: 20px 0;
            border: none;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .content {
                padding: 25px 20px;
            }
            
            .btn {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>📄 Paprly</h1>
            <p>Professional Document Management</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hello! 👋
            </div>
            
            <p>You've received an important document that requires your attention. Our freelancer has prepared and shared this document with you for review, approval, or signature.</p>
            
            <!-- Document Card -->
            <div class="document-card">
                <div class="document-icon">📋</div>
                <div class="document-id">Document ID: ${documentId}</div>
                <div class="document-description">Invoice/Document ready for your review</div>
            </div>
            
            <hr class="divider">
            
            <!-- Action Section -->
            <div class="action-section">
                <div class="action-title">📥 Document Actions</div>
                <div class="button-group">
                    <a href="#" class="btn btn-primary">
                        📖 View Document
                    </a>
                    <a href="#" class="btn btn-secondary">
                        ✍️ Sign Document
                    </a>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 15px;">
                    💡 The document is also attached to this email for your convenience
                </p>
            </div>
            
            <!-- Features -->
            <div class="features">
                <h3>🚀 What you can do:</h3>
                <ul class="feature-list">
                    <li class="feature-item">
                        <span class="feature-icon">✓</span>
                        View and download the document instantly
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">✓</span>
                        Add digital signatures securely
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">✓</span>
                        Leave comments and feedback
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">✓</span>
                        Track document status in real-time
                    </li>
                    <li class="feature-item">
                        <span class="feature-icon">✓</span>
                        Receive notifications for updates
                    </li>
                </ul>
            </div>
            
            <hr class="divider">
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 25px;">
                📧 Sent to: <strong>${clientEmail}</strong><br>
                🕒 ${new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <h3>Team Paprly</h3>
                <p>Streamlining freelance document management</p>
                <p>Making professional collaboration effortless</p>
            </div>
            
            <div class="social-links">
                <a href="#">📧</a>
                <a href="#">🌐</a>
                <a href="#">📱</a>
                <a href="#">💼</a>
            </div>
            
            <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">
                © 2024 Trim Work. All rights reserved.<br>
                This email was sent regarding document ID: ${documentId}
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

// Email sender function
const sendEmailWithPDF = async (documentId, documentURL, clientEmail) => {
  // Fetch the PDF as a buffer
  const response = await axios.get(documentURL, {
    responseType: "arraybuffer",
  });
  const pdfBuffer = Buffer.from(response.data, "binary");

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Email content with HTML
  const mailOptions = {
    from: `"Team Paprly" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `📄 Document Ready for Review - ID: ${documentId}`,
    html: createEmailHTML(documentId, clientEmail),
    text: `Hello,

You've received a document (ID: ${documentId}) shared with you.
You can view and download it using the attached PDF.

Thanks & Regards,
Team Paprly`,
    attachments: [
      {
        filename: `Document-${documentId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

// POST route to handle the API
router.post("/", async (req, res) => {
  try {
    const { documentId, documentURL, clientEmail } = req.body;

    if (!documentId || !documentURL || !clientEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await sendEmailWithPDF(documentId, documentURL, clientEmail);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
