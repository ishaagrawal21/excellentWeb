import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { connectDb } from "./config/db";
import { createAuthRouter } from "./routes/auth";
import { createTaskRouter } from "./routes/tasks";
import jwt from "jsonwebtoken";

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task_management";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt";

async function bootstrap(): Promise<void> {
  await connectDb(MONGO_URI);

  const app = express();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ["GET", "POST", "PATCH"],
    },
  });


  io.on("connection", (socket) => {
    // eslint-disable-next-line no-console
    console.log("Socket connected", socket.id);

    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log("Socket disconnected", socket.id);
    });
  });

  app.use(
    cors({
      origin: CLIENT_ORIGIN,
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ message: "Task Management API running" });
  });

  app.use("/api", createAuthRouter());
  app.use("/api", createTaskRouter(io));

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
  });
}

void bootstrap();

