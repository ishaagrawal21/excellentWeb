export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  taskId: string;
  taskTitle: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface TaskStats {
  totalTasks: number;
  countByStatus: {
    todo: number;
    "in-progress": number;
    done: number;
  };
  mostCommonTag: string | null;
}


