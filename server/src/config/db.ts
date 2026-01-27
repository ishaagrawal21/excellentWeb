import mongoose from "mongoose";

export async function connectDb(mongoUri: string): Promise<void> {
  try {
    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error", error);
    process.exit(1);
  }
}

