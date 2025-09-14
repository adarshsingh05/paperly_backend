// DB/db.js
import mongoose from "mongoose";

// Global connection tracking
const connectionState = {
  isConnected: false,
  promise: null
};

const connectDB = async () => {
  // If already connected, return the existing connection
  if (connectionState.isConnected) {
    console.log("✅ Using existing database connection");
    return mongoose.connection;
  }

  // If connection is in progress, wait for it
  if (connectionState.promise) {
    console.log("🔄 Database connection already in progress, waiting...");
    return await connectionState.promise;
  }

  try {
    console.log("🔄 Attempting to connect to MongoDB...");

    // Store the promise to prevent multiple connection attempts
    connectionState.promise = mongoose.connect(
        "mongodb+srv://adarshsinghunschool:iZ0csyYkrwFPgVDf@cluster0.mtdr5xw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
    );

    const conn = await connectionState.promise;

    connectionState.isConnected = true;
    connectionState.promise = null;

    console.log("✅ MongoDB Connected:", conn.connection.host);
    console.log("📊 Database name:", conn.connection.name);

    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    connectionState.promise = null;
    process.exit(1);
  }
};

export default connectDB;