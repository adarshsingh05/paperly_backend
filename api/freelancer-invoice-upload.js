// api/freelancer-invoice-upload.js
import supabase from "../supabaseclient.js"; // expects createClient export
import connectDB from "../DB/db.js"; // your Mongo connection helper
import UserAndFileLink from "../models/UserAndFileLink.js";

// ensure Mongo connection (with caching inside your db.js)
await connectDB();

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Minimal multipart parser for one PDF file + userName field
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
      const parts = str.split(boundary).slice(1, -1); // drop preamble and closing --

      let userName = null;
      let file = null;

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
          file = {
            fieldName,
            filename,
            contentType: contentTypeHeader,
            data: fileBuffer,
          };
        } else if (fieldName === "userName") {
          const val = bodySection.replace(/\r\n$/, "");
          userName = val;
        }
      }

      resolve({ userName, file });
    });

    req.on("error", (e) => reject(e));
  });
};

const uploadToSupabase = async ({ buffer, filename, contentType }) => {
  const { error } = await supabase.storage
    .from("freelancers-invoice")
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    });
  if (error) throw error;

  const { data: publicData } = await supabase.storage
    .from("freelancer-invoice")
    .getPublicUrl(filename);

  return {
    publicUrl: publicData.publicUrl,
    storedFilename: filename,
  };
};

const deleteFromSupabase = async (filename) => {
  await supabase.storage.from("freelancer-invoice").remove([filename]);
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (err) {
    const msg = err.message || "Parse error";
    if (msg.toLowerCase().includes("large"))
      return res.status(413).json({ error: msg });
    return res.status(400).json({ error: msg });
  }

  const { userName, file } = parsed;
  if (!userName) return res.status(400).json({ error: "userName is required" });
  if (!file) return res.status(400).json({ error: "No file received" });
  if (file.contentType !== "application/pdf")
    return res.status(400).json({ error: "Only PDFs allowed" });

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
    await deleteFromSupabase(uploadResult.storedFilename);
    return res.status(500).json({
      error: "Failed to save metadata; uploaded file cleaned up",
    });
  }
}
