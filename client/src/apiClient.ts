import axios from "axios";
import type { AuthState, Task, TaskStatus } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function login(username: string, password: string) {
  const res = await axios.post<{
    token: string;
    user: AuthState["user"];
  }>(`${baseUrl}/login`, { username, password });
  return res.data;
}

export async function fetchTasks(token: string) {
  const res = await axios.get<Task[]>(`${baseUrl}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function createTask(
  token: string,
  payload: { title: string; assignedTo: string; status?: TaskStatus }
) {
  const res = await axios.post<Task>(`${baseUrl}/tasks`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function updateTaskStatus(
  token: string,
  id: string,
  status: TaskStatus
) {
  const res = await axios.patch<Task>(
    `${baseUrl}/tasks/${id}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
}

