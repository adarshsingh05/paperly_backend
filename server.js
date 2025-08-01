// at top for sanity
console.log(
  "Process starting. PID:",
  process.pid,
  "Node version:",
  process.version
);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";
import connectDB from "./DB/db.js";
import freelancerInvoiceUpload from "./api/freelancer-invoice-upload.js";

const app = express();

// crash handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

dotenv.config();
connectDB();
app.use(cors());
app.use(express.json());

const PORT = process.env.SERVER_PORT || 4000;
console.log(
  "ENV SERVER_PORT:",
  process.env.SERVER_PORT,
  "=> using port:",
  PORT
);

app.get("/", (req, res) => res.send("OK"));
app.use("/api/freelancer-invoice-upload", freelancerInvoiceUpload);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Listen error:", err);
});
