import axios from "axios";
import type { Task, TaskStatus, Activity, TaskStats } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function fetchTasks(): Promise<Task[]> {
  const res = await axios.get<Task[]>(`${baseUrl}/tasks`);
  return res.data;
}

export async function createTask(payload: {
  title: string;
  description: string;
  status: TaskStatus;
  tags: string[];
}): Promise<Task> {
  const res = await axios.post<Task>(`${baseUrl}/tasks`, payload);
  return res.data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const res = await axios.patch<Task>(`${baseUrl}/tasks/${id}/status`, { status });
  return res.data;
}

export async function fetchStats(): Promise<TaskStats> {
  const res = await axios.get<TaskStats>(`${baseUrl}/stats`);
  return res.data;
}

export async function fetchActivities(): Promise<Activity[]> {
  const res = await axios.get<Activity[]>(`${baseUrl}/activities`);
  return res.data;
}


