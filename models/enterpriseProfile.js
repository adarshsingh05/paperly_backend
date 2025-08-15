import mongoose from "mongoose";

const enterpriseProfileSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyLogo: {
      type: String, // URL or file path to the logo
      required: false,
    },
    companyType: {
      type: String,
      required: true,
    },
    industry: {
      type: String,
      required: true,
    },
    gstNumber: {
      type: String,
      required: false, // pptional field
    },
    registeredAddress: {
      type: String,
      required: true,
    },
    defaultCurrency: {
      type: String,
      required: true,
    },
    defaultPaymentCycle: {
      type: String,
      required: true,
    },
    preferredLanguage: {
      type: String,
      required: true,
    },
    enableOneClickOnboardingKit: {
      type: Boolean,
      default: false,
    },
    enableDocumentTimestampProof: {
      type: Boolean,
      default: false,
    },
    defaultSignatureStyle: {
      type: String,
      required: false, // Optional field
    },
    companyTypes: {
      type: [String],
      default: [
        "Solo Founder",
        "Partnership",
        "Private Limited",
        "LLP",
        "Public Limited",
        "Proprietorship",
        "Other",
      ],
    },
    industries: {
      type: [String],
      default: [
        "Technology",
        "Healthcare",
        "Finance",
        "Education",
        "Manufacturing",
        "Retail",
        "Consulting",
        "Real Estate",
        "Other",
      ],
    },
    currencies: {
      type: [String],
      default: [
        "INR (₹)",
        "USD ($)",
        "EUR (€)",
        "GBP (£)",
        "CAD ($)",
        "AUD ($)",
      ],
    },
    paymentCycles: {
      type: [String],
      default: ["Weekly", "Bi-weekly", "Monthly", "Quarterly"],
    },
    languages: {
      type: [String],
      default: ["English", "Hindi", "Spanish", "French", "German", "Chinese"],
    },
    signatureStyles: {
      type: [String],
      default: [
        "Professional Cursive",
        "Clean Print",
        "Modern Signature",
        "Classic Script",
      ],
    },
  },
  { timestamps: true }
);

const EnterpriseProfile = mongoose.model(
  "EnterpriseProfile",
  enterpriseProfileSchema
);

export default EnterpriseProfile;
