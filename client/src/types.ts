export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthState {
  token: string;
  user: AuthUser;
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

