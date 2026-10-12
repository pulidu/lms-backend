import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Jayani:Jayani2002%23%23%23@cluster0.rdikvmb.mongodb.net/lms_db?appName=Cluster0";

const DIRECT_MONGODB_URI =
  "mongodb://Jayani:Jayani2002%23%23%23@ac-ko6yqym-shard-00-00.rdikvmb.mongodb.net:27017,ac-ko6yqym-shard-00-01.rdikvmb.mongodb.net:27017,ac-ko6yqym-shard-00-02.rdikvmb.mongodb.net:27017/lms_db?replicaSet=atlas-8tujng-shard-0&authSource=admin&retryWrites=true&w=majority&tls=true";

export const getMongoConnectionUri = (): string => {
  if (
    MONGODB_URI.includes("cluster0.rdikvmb.mongodb.net") &&
    MONGODB_URI.startsWith("mongodb+srv://")
  ) {
    return DIRECT_MONGODB_URI;
  }

  return MONGODB_URI;
};

// Mask sensitive credentials in logs
export const sanitizeMongoUri = (uri: string): string => {
  return uri.replace(/\/\/[^:]+:([^@]+)@/, "//***:***@");
};

// Global cache for serverless function execution contexts
let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  // 1. If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If already connecting, await the existing pending connection promise
  if (cachedPromise && mongoose.connection.readyState === 2) {
    return cachedPromise;
  }

  const uri = getMongoConnectionUri();
  const dbName = process.env.DB_NAME || "lms_db";

  try {
    cachedPromise = mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      autoIndex: process.env.NODE_ENV !== "production",
    });

    const m = await cachedPromise;
    console.log(
      `Successfully connected to MongoDB Atlas database [${m.connection.name || dbName}].`
    );
    return m;
  } catch (error: any) {
    cachedPromise = null;
    const sanitizedMsg = error?.message
      ? sanitizeMongoUri(error.message)
      : "Unknown MongoDB connection error";
    console.error("Error connecting to MongoDB:", sanitizedMsg);
    throw error;
  }
};

