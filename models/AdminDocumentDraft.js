import mongoose from "mongoose";

const adminDocumentDraftSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ["Offer Letter", "Salary Letter", "Onboarding Letter", "NDA", "Other"],
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    supabaseLink: {
      type: String,
      required: true,
      trim: true,
    },
    documentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    documentDescription: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Signed", "Archived"],
      default: "Draft",
    },
    sentDate: {
      type: Date,
      default: null,
    },
    signedDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    metadata: {
      employeeType: {
        type: String,
        enum: ["Employee", "Freelancer"],
        required: true,
      },
      role: {
        type: String,
        trim: true,
      },
      salary: {
        type: Number,
      },
      joiningDate: {
        type: Date,
      },
      companyName: {
        type: String,
        trim: true,
      },
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Index for efficient querying
adminDocumentDraftSchema.index({ adminEmail: 1, documentType: 1 });
adminDocumentDraftSchema.index({ adminEmail: 1, status: 1 });
adminDocumentDraftSchema.index({ adminEmail: 1, employeeEmail: 1 });
adminDocumentDraftSchema.index({ adminEmail: 1, createdAt: -1 });

// Virtual for document age
adminDocumentDraftSchema.virtual('documentAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Method to check if document is expired
adminDocumentDraftSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

// Method to mark as sent
adminDocumentDraftSchema.methods.markAsSent = function() {
  this.status = "Sent";
  this.sentDate = new Date();
  return this.save();
};

// Method to mark as signed
adminDocumentDraftSchema.methods.markAsSigned = function() {
  this.status = "Signed";
  this.signedDate = new Date();
  return this.save();
};

// Method to archive document
adminDocumentDraftSchema.methods.archive = function() {
  this.status = "Archived";
  this.isActive = false;
  return this.save();
};

// Static method to get documents by admin email
adminDocumentDraftSchema.statics.getByAdminEmail = function(adminEmail, options = {}) {
  const query = { adminEmail: adminEmail.toLowerCase() };
  
  if (options.status) query.status = options.status;
  if (options.documentType) query.documentType = options.documentType;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get documents by employee email
adminDocumentDraftSchema.statics.getByEmployeeEmail = function(employeeEmail, adminEmail) {
  return this.find({
    employeeEmail: employeeEmail.toLowerCase(),
    adminEmail: adminEmail.toLowerCase(),
    isActive: true
  }).sort({ createdAt: -1 });
};

// Static method to search documents
adminDocumentDraftSchema.statics.searchDocuments = function(adminEmail, searchTerm) {
  return this.find({
    adminEmail: adminEmail.toLowerCase(),
    isActive: true,
    $or: [
      { employeeName: { $regex: searchTerm, $options: 'i' } },
      { employeeEmail: { $regex: searchTerm, $options: 'i' } },
      { documentTitle: { $regex: searchTerm, $options: 'i' } },
      { documentDescription: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ createdAt: -1 });
};

const AdminDocumentDraft = mongoose.model("AdminDocumentDraft", adminDocumentDraftSchema);

export default AdminDocumentDraft;



