// api/upload/index.js
import express from "express";
import supabase from "../supabaseclient.js";
import "dotenv/config";
import UserAndFileLink from "../models/UserAndFileLink.js";

const router = express.Router();

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// helper: upload to Supabase
const uploadToSupabase = async ({ buffer, filename, contentType }) => {
  const { error } = await supabase.storage
    .from("freelancers-invoice")
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from("freelancer-invoice")
    .getPublicUrl(filename);

  return {
    publicUrl: publicData.publicUrl,
    storedFilename: filename,
  };
};

// helper: delete if rollback needed
const deleteFromSupabase = async (filename) => {
  const { error } = await supabase.storage
    .from("freelancer-invoice")
    .remove([filename]);
  if (error) {
    console.warn("Cleanup failed for", filename, error);
  }
};

// very minimal multipart parser for one file + fields
const parseMultipart = async (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return reject(new Error("Content-Type must be multipart/form-data"));
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return reject(new Error("No boundary in Content-Type"));
    }
    const boundary = `--${(boundaryMatch[1] || boundaryMatch[2]).trim()}`;
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        req.destroy(); // stop
        return reject(new Error("Payload too large"));
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const str = buffer.toString("binary"); // preserve raw bytes for splitting
      const parts = str.split(boundary).slice(1, -1); // drop preamble and final --

      let userName = null;
      let file = null; // { filename, contentType, data: Buffer }

      for (let part of parts) {
        // Each part starts with \r\n
        part = part.replace(/^\r\n/, "");
        const [rawHeaders, ...rest] = part.split("\r\n\r\n");
        if (!rawHeaders || rest.length === 0) continue;
        const bodySection = rest.join("\r\n\r\n");
        const headers = rawHeaders.split("\r\n").reduce((acc, line) => {
          const [k, v] = line.split(":");
          if (k && v) acc[k.toLowerCase()] = v.trim();
          return acc;
        }, {});

        const disposition = headers["content-disposition"];
        if (!disposition) continue;

        const nameMatch = disposition.match(/name="([^"]+)"/);
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        const fieldName = nameMatch ? nameMatch[1] : null;

        if (filenameMatch) {
          // It's the file
          const filename = filenameMatch[1];
          const contentTypeHeader =
            headers["content-type"] || "application/octet-stream";

          // bodySection ends with trailing \r\n -- remove the final CRLF before boundary
          let fileDataBinary = bodySection.replace(/\r\n$/, "");
          // Convert binary string back to buffer
          const fileBuffer = Buffer.from(fileDataBinary, "binary");

          file = {
            fieldName,
            filename,
            contentType: contentTypeHeader,
            data: fileBuffer,
          };
        } else if (fieldName === "userName") {
          // Text field: bodySection has the value (trim trailing CRLF)
          const val = bodySection.replace(/\r\n$/, "");
          userName = val;
        }
      }

      resolve({ userName, file });
    });

    req.on("error", (e) => {
      reject(e);
    });
  });
};

router.post("/", async (req, res) => {
  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (err) {
    const msg = err.message || "Failed to parse multipart";
    if (msg.includes("Payload too large")) {
      return res.status(413).json({ error: "File too large (max 20MB)" });
    }
    return res.status(400).json({ error: msg });
  }

  const { userName, file } = parsed;

  if (!userName) {
    return res.status(400).json({ error: "userName is required" });
  }
  if (!file) {
    return res.status(400).json({ error: "No file received" });
  }
  if (file.contentType !== "application/pdf") {
    return res.status(400).json({ error: "Only PDFs allowed" });
  }

  const timestamp = Date.now();
  const safeName = file.filename.replace(/\s+/g, "_");
  const storedFilename = `${userName}-${timestamp}-${safeName}`;

  let uploadResult;
  try {
    uploadResult = await uploadToSupabase({
      buffer: file.data,
      filename: storedFilename,
      contentType: file.contentType,
    });
  } catch (err) {
    console.error("Supabase upload error:", err);
    return res.status(500).json({ error: "Failed to upload to Supabase" });
  }

  try {
    const doc = await UserAndFileLink.create({
      userName,
      pdfURL: uploadResult.publicUrl,
    });

    return res.status(201).json({
      message: "Upload successful",
      record: {
        id: doc._id,
        userName: doc.userName,
        pdfURL: doc.pdfURL,
        uploadedAt: doc.uploadedAt,
      },
    });
  } catch (err) {
    console.error("Mongo save error:", err);
    // rollback file
    await deleteFromSupabase(uploadResult.storedFilename);
    return res.status(500).json({
      error: "Failed to save metadata; uploaded file cleaned up",
    });
  }
});

export default router;
