import mongoose from "mongoose";
const userAndFileLinkSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  pdfURL: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const UserAndFileLink = mongoose.model(
  "UserAndFileLink",
  userAndFileLinkSchema
);
export default UserAndFileLink;
