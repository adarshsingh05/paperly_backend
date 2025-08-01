// at top for sanity
console.log(
  "Process starting. PID:",
  process.pid,
  "Node version:",
  process.version
);

import sendPdfRoute from "./pages/api/shareInvoiceWithClient.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";
import connectDB from "./DB/db.js";
import freelancerInvoiceUpload from "./pages/api/freelancer-invoice-upload.js";

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

// my routes for the api
app.get("/", (req, res) => res.send("OK"));
app.use("/api/freelancer-invoice-upload", freelancerInvoiceUpload);
app.use("/api/shareInvoiceWithClient", sendPdfRoute);

// This is the correct way to export the Express app in an ES Module environment.
// It will be used by Vercel as the request handler.
export default app;

// This block will ONLY run in the local environment,
// because process.env.VERCEL_ENV is not set.
// On Vercel, this part is skipped.
if (!process.env.VERCEL_ENV) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Listen error:", err);
  });
}
