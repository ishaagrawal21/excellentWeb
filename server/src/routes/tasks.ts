import type { Router, Request, Response } from "express";
import { Router as createRouter } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/authorize";
import { Task, type TaskStatus } from "../models/Task";
import type { Server as SocketIOServer } from "socket.io";

export function createTaskRouter(io: SocketIOServer): Router {
  const router = createRouter();

  // All routes below require authentication
  router.use(authMiddleware);

  // POST /tasks – Admin only
  router.post(
    "/tasks",
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const { title, assignedTo, status } = req.body as {
          title?: string;
          assignedTo?: string;
          status?: TaskStatus;
        };

        if (!title || !assignedTo) {
          res
            .status(400)
            .json({ message: "Both title and assignedTo are required" });
          return;
        }

        const newTask = new Task({
          title,
          assignedTo,
          status: status || "todo",
        });

        const saved = await newTask.save();

        // Notify assigned user in real-time
        io.to(`user:${assignedTo}`).emit("task:assigned", saved);

        res.status(201).json(saved);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating task", error);
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  );

  // GET /tasks – Admin gets all, User gets only assigned tasks
  router.get("/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { role, userId } = req.user;

      const query = role === "admin" ? {} : { assignedTo: userId };

      const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
      res.json(tasks);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching tasks", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // PATCH /tasks/:id/status – Assigned user only
  router.patch(
    "/tasks/:id/status",
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }

        const { id } = req.params;
        const { status } = req.body as { status?: TaskStatus };

        if (!status || !["todo", "in-progress", "done"].includes(status)) {
          res
            .status(400)
            .json({ message: "Status must be todo, in-progress, or done" });
          return;
        }

        const task = await Task.findById(id);
        if (!task) {
          res.status(404).json({ message: "Task not found" });
          return;
        }

        if (task.assignedTo !== req.user.userId) {
          res.status(403).json({
            message: "Only the assigned user can update the task status",
          });
          return;
        }

        task.status = status;
        const updated = await task.save();

        res.json(updated);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error updating task status", error);
        res.status(500).json({ message: "Failed to update task status" });
      }
    }
  );

  return router;
}

