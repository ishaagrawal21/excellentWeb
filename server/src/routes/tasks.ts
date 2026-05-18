import type { Router, Request, Response } from "express";
import { Router as createRouter } from "express";
import { Task, type TaskStatus } from "../models/Task";
import { Activity } from "../models/Activity";
import type { Server as SocketIOServer } from "socket.io";

export function createTaskRouter(io: SocketIOServer): Router {
  const router = createRouter();

  // GET /tasks - Get all tasks
  router.get("/tasks", async (_req: Request, res: Response) => {
    try {
      const tasks = await Task.find().sort({ createdAt: -1 }).lean();
      res.json(tasks);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // GET /stats - Get task stats
  router.get("/stats", async (_req: Request, res: Response) => {
    try {
      const totalTasks = await Task.countDocuments();
      const todo = await Task.countDocuments({ status: "todo" });
      const inProgress = await Task.countDocuments({ status: "in-progress" });
      const done = await Task.countDocuments({ status: "done" });

      const tagStats = await Task.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]);
      const mostCommonTag = tagStats.length > 0 ? (tagStats[0]._id as string) : null;

      res.json({
        totalTasks,
        countByStatus: {
          todo,
          "in-progress": inProgress,
          done
        },
        mostCommonTag
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching stats", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // GET /activities - Get recent activities
  router.get("/activities", async (_req: Request, res: Response) => {
    try {
      const activities = await Activity.find()
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      res.json(activities);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching activities", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // POST /tasks - Create task
  router.post("/tasks", async (req: Request, res: Response) => {
    try {
      const { title, description, status, tags } = req.body as {
        title?: string;
        description?: string;
        status?: TaskStatus;
        tags?: string[];
      };

      if (!title) {
        res.status(400).json({ message: "Title is required" });
        return;
      }

      const newTask = new Task({
        title,
        description: description || "",
        status: status || "todo",
        tags: tags || [],
      });

      const savedTask = await newTask.save();

      // Create activity
      const activity = new Activity({
        taskId: savedTask._id,
        taskTitle: savedTask.title,
        action: "taskCreated",
        details: `Task "${savedTask.title}" was created`,
      });
      const savedActivity = await activity.save();

      // Emit Socket.IO events to all connected clients
      io.emit("taskCreated", savedTask);
      io.emit("activityCreated", savedActivity);

      res.status(201).json(savedTask);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating task", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // PATCH /tasks/:id/status - Update task status
  router.patch("/tasks/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status?: TaskStatus };

      if (!status || !["todo", "in-progress", "done"].includes(status)) {
        res.status(400).json({ message: "Invalid or missing status" });
        return;
      }

      const task = await Task.findById(id);
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      const oldStatus = task.status;
      task.status = status;
      const updatedTask = await task.save();

      // Create activity
      const activity = new Activity({
        taskId: updatedTask._id,
        taskTitle: updatedTask.title,
        action: "taskUpdated",
        details: `Status of "${updatedTask.title}" updated from "${oldStatus}" to "${status}"`,
      });
      const savedActivity = await activity.save();

      // Emit Socket.IO events to all connected clients
      io.emit("taskUpdated", updatedTask);
      io.emit("activityCreated", savedActivity);

      res.json(updatedTask);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating task status", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  return router;
}


