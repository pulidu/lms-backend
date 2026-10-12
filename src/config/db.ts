import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Jayani:Jayani2002%23%23%23@cluster0.rdikvmb.mongodb.net/lms_db?appName=Cluster0";

const DIRECT_MONGODB_URI =
  "mongodb://Jayani:Jayani2002%23%23%23@ac-ko6yqym-shard-00-00.rdikvmb.mongodb.net:27017,ac-ko6yqym-shard-00-01.rdikvmb.mongodb.net:27017,ac-ko6yqym-shard-00-02.rdikvmb.mongodb.net:27017/lms_db?replicaSet=atlas-8tujng-shard-0&authSource=admin&retryWrites=true&w=majority&tls=true";

const getMongoConnectionUri = (): string => {
  if (
    MONGODB_URI.includes("cluster0.rdikvmb.mongodb.net") &&
    MONGODB_URI.startsWith("mongodb+srv://")
  ) {
    return DIRECT_MONGODB_URI;
  }

  return MONGODB_URI;
};

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(getMongoConnectionUri());
    console.log("Successfully connected to MongoDB Atlas database.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
