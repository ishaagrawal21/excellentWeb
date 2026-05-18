import mongoose, { Document, Schema } from "mongoose";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskDocument extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
      required: true,
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Task = mongoose.model<TaskDocument>("Task", TaskSchema);


