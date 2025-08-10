import express from "express";
import nodemailer from "nodemailer";
import axios from "axios";

const router = express.Router();

const EMAIL_USER = "adarshashokbaghel@gmail.com";
const EMAIL_PASS = "ajrn ibux zorp bmcs";

// HTML Email Template
const createEmailHTML = (documentId, clientEmail, senderName, invoiceData = {}) => {
  const {
    invoiceNumber = documentId,
    invoiceDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    invoiceAmount = "To be determined",
    
    dueDate = "Check Pdf"
  } = invoiceData;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Receipt - Paprly</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #F3F4F6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background-color: #FEFCE8;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 2px solid #FEF3C7;
        }
        
        .company-logo {
            font-size: 28px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        
        .invoice-title {
            font-size: 20px;
            color: #374151;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .header-subtitle {
            font-size: 14px;
            color: #6B7280;
            font-weight: 400;
        }
        
        .content {
            padding: 32px 24px;
        }
        
        .greeting {
            font-size: 18px;
            color: #374151;
            margin-bottom: 24px;
            font-weight: 500;
        }
        
        .invoice-summary {
            background-color: #FEFCE8;
            border: 1px solid #FEF3C7;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        
        .summary-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
            text-align: center;
        }
        
        .invoice-details {
            display: table;
            width: 100%;
            margin-bottom: 16px;
        }
        
        .detail-row {
            display: table-row;
        }
        
        .detail-label {
            display: table-cell;
            font-weight: 600;
            color: #6B7280;
            padding: 8px 0;
            width: 40%;
        }
        
        .detail-value {
            display: table-cell;
            color: #374151;
            padding: 8px 0;
            width: 60%;
        }
        
        .amount-highlight {
            background-color: #FEF3C7;
            padding: 16px;
            border-radius: 6px;
            text-align: center;
            margin: 16px 0;
        }
        
        .amount-label {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 4px;
        }
        
        .amount-value {
            font-size: 24px;
            font-weight: 700;
            color: #374151;
        }
        

        
        .professional-message {
            background-color: #F3F4F6;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid #6B7280;
        }
        
        .message-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
        }
        
        .message-text {
            font-size: 14px;
            color: #6B7280;
            line-height: 1.6;
        }
        
        .footer {
            background-color: #F3F4F6;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
        }
        
        .footer-content {
            margin-bottom: 16px;
        }
        
        .footer h3 {
            font-size: 16px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
        }
        
        .footer p {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 4px;
        }
        
        .contact-info {
            background-color: #FEFCE8;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
            color: #6B7280;
        }
        
        .contact-icon {
            color: #6B7280;
            margin-right: 8px;
            font-weight: bold;
            width: 16px;
        }
        
        .divider {
            height: 1px;
            background-color: #E5E7EB;
            margin: 24px 0;
            border: none;
        }
        
        .timestamp {
            color: #9CA3AF;
            font-size: 12px;
            text-align: center;
            margin-top: 16px;
            padding: 16px;
            border-top: 1px solid #E5E7EB;
        }
        
        .sender-info {
            background-color: #FEFCE8;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        
        .sender-label {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 4px;
        }
        
        .sender-name {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .content {
                padding: 24px 20px;
            }
            

            
            .invoice-details {
                display: block;
            }
            
            .detail-row {
                display: block;
                margin-bottom: 12px;
            }
            
            .detail-label,
            .detail-value {
                display: block;
                width: 100%;
                padding: 4px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="company-logo">Paprly</div>
            <div class="invoice-title">Invoice Receipt</div>
            <div class="header-subtitle">Professional Document Management Platform</div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hey There!!
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">
                We hope this message finds you well. An invoice has been prepared and is ready for your review. 
                Please find the invoice details below.
            </p>
            
            <!-- Invoice Summary -->
            <div class="invoice-summary">
                <div class="summary-title">Invoice Summary</div>
                <div class="invoice-details">
                    <div class="detail-row">
                        <div class="detail-label">Invoice Number:</div>
                        <div class="detail-value">${invoiceNumber}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Invoice Date:</div>
                        <div class="detail-value">${invoiceDate}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Due Date:</div>
                        <div class="detail-value">${dueDate}</div>
                    </div>
                </div>
                
                <div class="amount-highlight">
                    <div class="amount-label">Total Amount</div>
                    <div class="amount-value">${invoiceAmount}</div>
                </div>
            </div>
            
            <!-- Sender Information -->
            <div class="sender-info">
                <div class="sender-label">Invoice prepared by</div>
                <div class="sender-name">${senderName || 'Your Service Provider'}</div>
            </div>
            
            <hr class="divider">
            
            <!-- Professional Message -->
            <div class="professional-message">
                <div class="message-title">Thank You</div>
                <div class="message-text">
                    Thank you for choosing our services. If you have any questions about this invoice, 
                    please don't hesitate to reach out to us.
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <h3>Team Paprly</h3>
                <p>Streamlining freelance document management</p>
                <p>Making professional collaboration effortless</p>
            </div>
            
            <div class="contact-info">
                <div class="contact-item">
                    <span class="contact-icon">📧</span>
                    <span>home@paprly.in</span>
                </div>
                <div class="contact-item">
                    <span class="contact-icon">📞</span>
                    <span>+91 7317202906</span>
                </div>
                <div class="contact-item">
                    <span class="contact-icon">🌐</span>
                    <span>www.paprly.in</span>
                </div>
            </div>
            
            <div class="timestamp">
                © 2024 Paprly. All rights reserved.<br>
                This email was sent regarding invoice: ${invoiceNumber}
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

// Email sender function
const sendEmailWithPDF = async (documentId, documentURL, clientEmail, senderName, invoiceData = {}) => {
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
    from: `"Paprly" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `Invoice from ${senderName || 'Paprly'} - ${invoiceData.invoiceNumber || documentId}`,
    html: createEmailHTML(documentId, clientEmail, senderName, invoiceData),
    text: `Hey There!!

You've received an invoice from ${senderName || 'Paprly'}.
The invoice PDF is attached to this email.

Invoice Details:
- Invoice Number: ${invoiceData.invoiceNumber || documentId}
- Date: ${invoiceData.invoiceDate || new Date().toLocaleDateString()}
- Amount: ${invoiceData.invoiceAmount || 'To be determined'}

Thanks,
Team Paprly`,
    attachments: [
      {
        filename: `Invoice-${invoiceData.invoiceNumber || documentId}.pdf`,
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
    const { 
      documentId, 
      documentURL, 
      clientEmail, 
      senderName, 
      invoiceData = {} 
    } = req.body;

    if (!documentId || !documentURL || !clientEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await sendEmailWithPDF(documentId, documentURL, clientEmail, senderName, invoiceData);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
