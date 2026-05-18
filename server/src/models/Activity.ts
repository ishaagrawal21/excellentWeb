import mongoose, { Document, Schema } from "mongoose";

export interface ActivityDocument extends Document {
  taskId: mongoose.Types.ObjectId;
  taskTitle: string;
  action: string;
  details: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<ActivityDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    taskTitle: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = mongoose.model<ActivityDocument>("Activity", ActivitySchema);
