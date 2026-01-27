import mongoose, { Document, Schema } from "mongoose";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskDocument extends Document {
  title: string;
  status: TaskStatus;
  assignedTo: string; // stores userId from auth payload
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
      required: true,
    },
    assignedTo: { type: String, required: true },
  },
  { timestamps: true }
);

export const Task = mongoose.model<TaskDocument>("Task", TaskSchema);

