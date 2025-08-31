import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import AdminDocumentDraft from "../../models/AdminDocumentDraft.js";
import supabase from "../../supabaseclient.js";

const router = express.Router();

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Multipart parser for file uploads
const parseMultipart = async (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return reject(new Error("Content-Type must be multipart/form-data"));
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) return reject(new Error("No boundary in Content-Type"));

    const boundary = `--${(boundaryMatch[1] || boundaryMatch[2]).trim()}`;
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        req.destroy();
        return reject(new Error("Payload too large"));
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const str = buffer.toString("binary");
      const parts = str.split(boundary).slice(1, -1);

      const fields = {};
      const files = [];

      for (let part of parts) {
        part = part.replace(/^\r\n/, "");
        const [rawHeaders, ...rest] = part.split("\r\n\r\n");
        if (!rawHeaders || rest.length === 0) continue;
        const bodySection = rest.join("\r\n\r\n");
        const headers = rawHeaders.split("\r\n").reduce((acc, line) => {
          const idx = line.indexOf(":");
          if (idx === -1) return acc;
          const key = line.slice(0, idx).toLowerCase();
          const val = line.slice(idx + 1).trim();
          acc[key] = val;
          return acc;
        }, {});

        const disposition = headers["content-disposition"];
        if (!disposition) continue;

        const nameMatch = disposition.match(/name="([^"]+)"/);
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        const fieldName = nameMatch ? nameMatch[1] : null;

        if (filenameMatch) {
          const filename = filenameMatch[1];
          const contentTypeHeader =
            headers["content-type"] || "application/octet-stream";
          let fileDataBinary = bodySection.replace(/\r\n$/, "");
          const fileBuffer = Buffer.from(fileDataBinary, "binary");
          files.push({
            fieldName,
            filename,
            contentType: contentTypeHeader,
            data: fileBuffer,
          });
        } else if (fieldName) {
          const val = bodySection.replace(/\r\n$/, "");
          fields[fieldName] = val;
        }
      }

      resolve({ fields, files });
    });

    req.on("error", (e) => reject(e));
  });
};

const uploadToSupabase = async ({ buffer, filename, contentType }) => {
  const { error } = await supabase.storage
    .from("documentbyadmin")
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });
  if (error) throw error;

  const { data: publicData } = await supabase.storage
    .from("documentbyadmin")
    .getPublicUrl(filename);

  return {
    publicUrl: publicData.publicUrl,
    storedFilename: filename,
  };
};

const deleteFromSupabase = async (filename) => {
  await supabase.storage.from("documentbyadmin").remove([filename]);
};

// POST route to upload files to Supabase and save links to MongoDB
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Parse multipart form data
    let parsed;
    try {
      parsed = await parseMultipart(req);
    } catch (err) {
      const msg = err.message || "Parse error";
      if (msg.toLowerCase().includes("large")) {
        return res.status(413).json({ success: false, error: msg });
      }
      return res.status(400).json({ success: false, error: msg });
    }

    const { fields, files } = parsed;

    // Validate required fields
    const requiredFields = [
      "documentType",
      "employeeName",
      "employeeEmail",
      "documentTitle",
    ];
    for (const field of requiredFields) {
      if (!fields[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`,
        });
      }
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one file is required",
      });
    }

    // Validate document type
    const allowedDocumentTypes = [
      "Offer Letter",
      "Salary Letter",
      "Onboarding Letter",
      "NDA",
      "Other",
    ];
    if (!allowedDocumentTypes.includes(fields.documentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    // Parse metadata and tags if provided
    let parsedMetadata = {};
    if (fields.metadata) {
      try {
        parsedMetadata =
          typeof fields.metadata === "string"
            ? JSON.parse(fields.metadata)
            : fields.metadata;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: "Invalid metadata format. Must be valid JSON.",
        });
      }
    }

    let parsedTags = [];
    if (fields.tags) {
      try {
        parsedTags =
          typeof fields.tags === "string"
            ? JSON.parse(fields.tags)
            : fields.tags;
        if (!Array.isArray(parsedTags)) {
          throw new Error("Tags must be an array");
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: "Invalid tags format. Must be a valid JSON array.",
        });
      }
    }

    const savedDocuments = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Validate file type (only PDFs allowed)
        if (file.contentType !== "application/pdf") {
          errors.push(`File ${i + 1}: Only PDF files are allowed`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.filename.replace(/\s+/g, "_");
        const storedFilename = `${userEmail}-${fields.employeeEmail}-${timestamp}-${safeName}`;

        // Upload to Supabase
        let uploadResult;
        try {
          uploadResult = await uploadToSupabase({
            buffer: file.data,
            filename: storedFilename,
            contentType: file.contentType,
          });
        } catch (err) {
          console.error("Supabase upload error:", err);
          errors.push(`File ${i + 1}: Failed to upload to Supabase`);
          continue;
        }

        // Create document draft in MongoDB
        const documentDraft = new AdminDocumentDraft({
          adminEmail: userEmail,
          documentType: fields.documentType,
          employeeName: fields.employeeName,
          employeeEmail: fields.employeeEmail.toLowerCase(),
          supabaseLink: uploadResult.publicUrl,
          documentTitle: fields.documentTitle,
          documentDescription: fields.documentDescription || "",
          expiryDate: fields.expiryDate ? new Date(fields.expiryDate) : null,
          metadata: {
            employeeType: parsedMetadata.employeeType || "Employee",
            role: parsedMetadata.role || "",
            salary: parsedMetadata.salary || null,
            joiningDate: parsedMetadata.joiningDate
              ? new Date(parsedMetadata.joiningDate)
              : null,
            companyName: parsedMetadata.companyName || "",
          },
          tags: parsedTags,
          status: "Draft",
          isActive: true,
        });

        await documentDraft.save();

        savedDocuments.push({
          documentId: documentDraft._id,
          supabaseLink: uploadResult.publicUrl,
          documentType: documentDraft.documentType,
          employeeName: documentDraft.employeeName,
          employeeEmail: documentDraft.employeeEmail,
          documentTitle: documentDraft.documentTitle,
          status: documentDraft.status,
          savedAt: documentDraft.createdAt,
          metadata: documentDraft.metadata,
          tags: documentDraft.tags,
          filename: storedFilename,
        });
      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error);

        if (error.name === "ValidationError") {
          const validationErrors = Object.values(error.errors).map(
            (err) => err.message
          );
          errors.push(
            `File ${i + 1}: Validation failed - ${validationErrors.join(", ")}`
          );
        } else {
          errors.push(`File ${i + 1}: Failed to save document`);
        }
      }
    }

    // Prepare response based on results
    if (savedDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No documents were saved successfully",
        details: errors,
      });
    }

    if (errors.length > 0) {
      // Partial success - some documents saved, some failed
      return res.status(207).json({
        success: true,
        message: `Successfully saved ${savedDocuments.length} out of ${files.length} documents`,
        data: {
          savedDocuments,
          totalDocuments: files.length,
          savedCount: savedDocuments.length,
          failedCount: errors.length,
          errors: errors,
        },
      });
    }

    // All documents saved successfully
    res.status(201).json({
      success: true,
      message: `Successfully saved all ${savedDocuments.length} documents`,
      data: {
        savedDocuments,
        totalDocuments: files.length,
        savedCount: savedDocuments.length,
        failedCount: 0,
      },
    });
  } catch (error) {
    console.error("Error processing documents:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process documents. Please try again later.",
    });
  }
});

// POST route for single document (backward compatibility)
router.post("/single", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const {
      documentType,
      employeeName,
      employeeEmail,
      documentTitle,
      documentDescription,
      supabaseLink,
      expiryDate,
      tags,
      metadata,
    } = req.body;

    // Validate required fields
    if (!supabaseLink) {
      return res.status(400).json({
        success: false,
        error: "Supabase link is required",
      });
    }

    if (!documentType || !employeeName || !employeeEmail || !documentTitle) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: documentType, employeeName, employeeEmail, documentTitle",
      });
    }

    // Validate document type
    const allowedDocumentTypes = [
      "Offer Letter",
      "Salary Letter",
      "Onboarding Letter",
      "NDA",
      "Other",
    ];
    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    // Validate Supabase link format
    if (
      !supabaseLink.includes("supabase.com") &&
      !supabaseLink.includes("supabase.co")
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid Supabase link format",
      });
    }

    // Parse metadata if provided
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata =
          typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      } catch (error) {
        console.error("Error parsing metadata:", error);
        return res.status(400).json({
          success: false,
          error: "Invalid metadata format. Must be valid JSON.",
        });
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
        if (!Array.isArray(parsedTags)) {
          throw new Error("Tags must be an array");
        }
      } catch (error) {
        console.error("Error parsing tags:", error);
        return res.status(400).json({
          success: false,
          error: "Invalid tags format. Must be a valid JSON array.",
        });
      }
    }

    // Create document draft in MongoDB
    const documentDraft = new AdminDocumentDraft({
      adminEmail: userEmail,
      documentType,
      employeeName,
      employeeEmail: employeeEmail.toLowerCase(),
      supabaseLink,
      documentTitle,
      documentDescription: documentDescription || "",
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      metadata: {
        employeeType: parsedMetadata.employeeType || "Employee",
        role: parsedMetadata.role || "",
        salary: parsedMetadata.salary || null,
        joiningDate: parsedMetadata.joiningDate
          ? new Date(parsedMetadata.joiningDate)
          : null,
        companyName: parsedMetadata.companyName || "",
      },
      tags: parsedTags,
      status: "Draft",
      isActive: true,
    });

    await documentDraft.save();

    res.status(201).json({
      success: true,
      message: "Document link saved successfully",
      data: {
        documentId: documentDraft._id,
        supabaseLink,
        documentType,
        employeeName,
        employeeEmail,
        documentTitle,
        status: documentDraft.status,
        savedAt: documentDraft.createdAt,
        metadata: documentDraft.metadata,
        tags: documentDraft.tags,
      },
    });
  } catch (error) {
    console.error("Error saving document link:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to save document link. Please try again later.",
    });
  }
});

// GET route to fetch all saved documents for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const {
      page = 1,
      limit = 10,
      status,
      documentType,
      employeeName,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {
      adminEmail: userEmail,
      isActive: true,
    };

    // Add optional filters
    if (status) {
      filter.status = status;
    }
    if (documentType) {
      filter.documentType = documentType;
    }
    if (employeeName) {
      filter.employeeName = { $regex: employeeName, $options: "i" };
    }

    // Validate sort parameters
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "documentTitle",
      "employeeName",
      "documentType",
      "status",
    ];
    const allowedSortOrders = ["asc", "desc"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid sort field. Allowed fields: createdAt, updatedAt, documentTitle, employeeName, documentType, status",
      });
    }

    if (!allowedSortOrders.includes(sortOrder.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid sort order. Use 'asc' or 'desc'",
      });
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === "desc" ? -1 : 1;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100",
      });
    }

    // Get total count for pagination
    const totalDocuments = await AdminDocumentDraft.countDocuments(filter);

    // Fetch documents with pagination and sorting
    const documents = await AdminDocumentDraft.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v")
      .lean();

    // Format documents for frontend
    const formattedDocuments = documents.map((doc) => ({
      id: doc._id,
      documentType: doc.documentType,
      employeeName: doc.employeeName,
      employeeEmail: doc.employeeEmail,
      documentTitle: doc.documentTitle,
      documentDescription: doc.documentDescription,
      supabaseLink: doc.supabaseLink,
      status: doc.status,
      tags: doc.tags || [],
      metadata: {
        employeeType: doc.metadata?.employeeType || "Employee",
        role: doc.metadata?.role || "",
        salary: doc.metadata?.salary || null,
        joiningDate: doc.metadata?.joiningDate || null,
        companyName: doc.metadata?.companyName || "",
      },
      dates: {
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        sentDate: doc.sentDate,
        signedDate: doc.signedDate,
        expiryDate: doc.expiryDate,
      },
      isActive: doc.isActive,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalDocuments / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: "Documents fetched successfully",
      data: {
        documents: formattedDocuments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalDocuments,
          documentsPerPage: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null,
        },
        filters: {
          applied: {
            status: status || null,
            documentType: documentType || null,
            employeeName: employeeName || null,
          },
          available: {
            statuses: ["Draft", "Sent", "Signed", "Archived"],
            documentTypes: [
              "Offer Letter",
              "Salary Letter",
              "Onboarding Letter",
              "NDA",
              "Other",
            ],
          },
        },
        sorting: {
          field: sortBy,
          order: sortOrder,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch documents. Please try again later.",
    });
  }
});

// GET route to fetch signed documents by employee email (no authentication required)
router.get("/signed/:employeeEmail", async (req, res) => {
  try {
    const { employeeEmail } = req.params;

    if (!employeeEmail) {
      return res.status(400).json({
        success: false,
        error: "Employee email is required",
      });
    }

    console.log("Searching for documents for email:", employeeEmail);

    // First, try to find documents with "Signed" status by email
    let signedDocuments = await AdminDocumentDraft.find({
      employeeEmail: employeeEmail.toLowerCase(),
      status: "Signed",
      isActive: true,
    })
      .select("-__v")
      .lean();

    console.log(
      'Documents with "Signed" status by email:',
      signedDocuments.length
    );

    // If no documents found by email, try to find by employee name
    if (signedDocuments.length === 0) {
      // Extract name from email (remove @domain.com)
      const emailName = employeeEmail.split("@")[0];
      console.log("Trying to find documents by name from email:", emailName);

      // Search for documents with similar employee names
      signedDocuments = await AdminDocumentDraft.find({
        employeeName: { $regex: emailName, $options: "i" },
        status: "Signed",
        isActive: true,
      })
        .select("-__v")
        .lean();

      console.log(
        'Documents with "Signed" status by name:',
        signedDocuments.length
      );
    }

    // If still no documents, try with "Signed and Received" status
    if (signedDocuments.length === 0) {
      signedDocuments = await AdminDocumentDraft.find({
        employeeEmail: employeeEmail.toLowerCase(),
        status: "Signed and Received",
        isActive: true,
      })
        .select("-__v")
        .lean();
      console.log(
        'Documents with "Signed and Received" status:',
        signedDocuments.length
      );
    }

    // If still no documents, try with any status that has a signedDate
    if (signedDocuments.length === 0) {
      signedDocuments = await AdminDocumentDraft.find({
        employeeEmail: employeeEmail.toLowerCase(),
        signedDate: { $exists: true, $ne: null },
        isActive: true,
      })
        .select("-__v")
        .lean();
      console.log("Documents with signedDate:", signedDocuments.length);
    }

    // If still no documents, try with any status that has been updated recently (likely signed)
    if (signedDocuments.length === 0) {
      signedDocuments = await AdminDocumentDraft.find({
        employeeEmail: employeeEmail.toLowerCase(),
        isActive: true,
      })
        .select("-__v")
        .lean();
      console.log("All documents for this employee:", signedDocuments.length);

      // Filter to show only documents that seem to be signed (have supabaseLink and are not Draft)
      signedDocuments = signedDocuments.filter(
        (doc) =>
          doc.supabaseLink && doc.status !== "Draft" && doc.status !== "Sent"
      );
      console.log("Filtered documents:", signedDocuments.length);
    }

    // Format documents for frontend
    const formattedDocuments = signedDocuments.map((doc) => ({
      id: doc._id,
      documentType: doc.documentType,
      employeeName: doc.employeeName,
      employeeEmail: doc.employeeEmail,
      documentTitle: doc.documentTitle,
      documentDescription: doc.documentDescription,
      supabaseLink: doc.supabaseLink,
      status: doc.status,
      tags: doc.tags || [],
      metadata: {
        employeeType: doc.metadata?.employeeType || "Employee",
        role: doc.metadata?.role || "",
        salary: doc.metadata?.salary || null,
        joiningDate: doc.metadata?.joiningDate || null,
        companyName: doc.metadata?.companyName || "",
      },
      dates: {
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        sentDate: doc.sentDate,
        signedDate: doc.signedDate,
        expiryDate: doc.expiryDate,
      },
      isActive: doc.isActive,
    }));

    console.log("Final formatted documents:", formattedDocuments.length);

    res.status(200).json({
      success: true,
      message: "Signed documents fetched successfully",
      data: {
        documents: formattedDocuments,
        count: formattedDocuments.length,
        employeeEmail: employeeEmail,
      },
    });
  } catch (error) {
    console.error("Error fetching signed documents:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch signed documents. Please try again later.",
    });
  }
});
// GET route to fetch a single document by ID
router.get("/:documentId", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { documentId } = req.params;

    // Validate document ID format
    if (!documentId || documentId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: "Invalid document ID format",
      });
    }

    // Find document by ID and ensure it belongs to the user
    const document = await AdminDocumentDraft.findOne({
      _id: documentId,
      adminEmail: userEmail,
      isActive: true,
    })
      .select("-__v")
      .lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or access denied",
      });
    }

    // Format document for frontend
    const formattedDocument = {
      id: document._id,
      documentType: document.documentType,
      employeeName: document.employeeName,
      employeeEmail: document.employeeEmail,
      documentTitle: document.documentTitle,
      documentDescription: document.documentDescription,
      supabaseLink: document.supabaseLink,
      status: document.status,
      tags: document.tags || [],
      metadata: {
        employeeType: document.metadata?.employeeType || "Employee",
        role: document.metadata?.role || "",
        salary: document.metadata?.salary || null,
        joiningDate: document.metadata?.joiningDate || null,
        companyName: document.metadata?.companyName || "",
      },
      dates: {
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        sentDate: document.sentDate,
        signedDate: document.signedDate,
        expiryDate: document.expiryDate,
      },
      isActive: document.isActive,
    };

    res.status(200).json({
      success: true,
      message: "Document fetched successfully",
      data: formattedDocument,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch document. Please try again later.",
    });
  }
});

// PATCH route to replace document with signed version (no authentication required)
router.patch("/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    // Validate document ID format
    if (!documentId || documentId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: "Invalid document ID format",
      });
    }

    // Parse multipart form data
    let parsed;
    try {
      parsed = await parseMultipart(req);
    } catch (err) {
      const msg = err.message || "Parse error";
      if (msg.toLowerCase().includes("large")) {
        return res.status(413).json({ success: false, error: msg });
      }
      return res.status(400).json({ success: false, error: msg });
    }

    const { fields, files } = parsed;

    // Check if file is provided
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Signed document file is required",
      });
    }

    if (files.length > 1) {
      return res.status(400).json({
        success: false,
        error: "Only one file can be uploaded at a time",
      });
    }

    const file = files[0];

    // Validate file type (only PDFs allowed)
    if (file.contentType !== "application/pdf") {
      return res.status(400).json({
        success: false,
        error: "Only PDF files are allowed",
      });
    }

    // Find the existing document
    const existingDocument = await AdminDocumentDraft.findById(documentId);
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    // Extract filename from existing Supabase link to maintain consistency
    const existingUrl = existingDocument.supabaseLink;
    const urlParts = existingUrl.split("/");
    const existingFilename = urlParts[urlParts.length - 1];

    // Delete old file from Supabase
    try {
      await deleteFromSupabase(existingFilename);
    } catch (error) {
      console.error("Error deleting old file from Supabase:", error);
      // Continue with upload even if deletion fails
    }

    // Upload new signed document to Supabase with same filename
    let uploadResult;
    try {
      uploadResult = await uploadToSupabase({
        buffer: file.data,
        filename: existingFilename,
        contentType: file.contentType,
      });
    } catch (err) {
      console.error("Supabase upload error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to upload signed document to Supabase",
      });
    }

    // Parse optional fields
    let parsedMetadata = existingDocument.metadata;
    if (fields.metadata) {
      try {
        parsedMetadata =
          typeof fields.metadata === "string"
            ? JSON.parse(fields.metadata)
            : fields.metadata;
      } catch (error) {
        console.error("Error parsing metadata:", error);
        // Keep existing metadata if parsing fails
      }
    }

    let parsedTags = existingDocument.tags || [];
    if (fields.tags) {
      try {
        parsedTags =
          typeof fields.tags === "string"
            ? JSON.parse(fields.tags)
            : fields.tags;
        if (!Array.isArray(parsedTags)) {
          throw new Error("Tags must be an array");
        }
      } catch (error) {
        console.error("Error parsing tags:", error);
        // Keep existing tags if parsing fails
      }
    }

    // Update the document in MongoDB
    const updateData = {
      supabaseLink: uploadResult.publicUrl,
      status: "Signed",
      signedDate: new Date(),
      documentDescription:
        fields.documentDescription || existingDocument.documentDescription,
      metadata: parsedMetadata,
      tags: parsedTags,
    };

    const updatedDocument = await AdminDocumentDraft.findByIdAndUpdate(
      documentId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDocument) {
      return res.status(500).json({
        success: false,
        error: "Failed to update document in database",
      });
    }

    res.status(200).json({
      success: true,
      message: "Document signed and replaced successfully",
      data: {
        documentId: updatedDocument._id,
        supabaseLink: updatedDocument.supabaseLink,
        documentType: updatedDocument.documentType,
        employeeName: updatedDocument.employeeName,
        employeeEmail: updatedDocument.employeeEmail,
        documentTitle: updatedDocument.documentTitle,
        status: updatedDocument.status,
        signedDate: updatedDocument.signedDate,
        updatedAt: updatedDocument.updatedAt,
        metadata: updatedDocument.metadata,
        tags: updatedDocument.tags,
      },
    });
  } catch (error) {
    console.error("Error replacing document:", error);
    res.status(500).json({
      success: false,
      error: "Failed to replace document. Please try again later.",
    });
  }
});

export default router;
