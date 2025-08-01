import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userAndFileLinkSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  pdfURL: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  documentId: {
    type: String,
    default: uuidv4, // Automatically generate unique UUID
    unique: true,
  },
});

const UserAndFileLink = mongoose.model(
  "UserAndFileLink",
  userAndFileLinkSchema
);
export default UserAndFileLink;
