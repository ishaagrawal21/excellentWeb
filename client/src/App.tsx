import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { AuthState, Task, TaskStatus, UserRole } from "./types";
import { login as apiLogin, fetchTasks, createTask, updateTaskStatus } from "./apiClient";
import { createSocket } from "./socket";

function loadAuthFromStorage(): AuthState | null {
  const raw = localStorage.getItem("auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

function saveAuthToStorage(auth: AuthState | null) {
  if (!auth) {
    localStorage.removeItem("auth");
    return;
  }
  localStorage.setItem("auth", JSON.stringify(auth));
}

function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuthFromStorage());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const isAdmin = auth?.user.role === "admin";

  useEffect(() => {
    saveAuthToStorage(auth);
  }, [auth]);

  useEffect(() => {
    if (!auth) return;

    setLoading(true);
    fetchTasks(auth.token)
      .then(setTasks)
      .catch(() => setError("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    const socket = createSocket(auth.token);

    socket.on("connect", () => {
      // console.log("Socket connected");
    });

    socket.on("task:assigned", (task: Task) => {
      setTasks((prev) => {
        const exists = prev.find((t) => t._id === task._id);
        if (exists) {
          return prev.map((t) => (t._id === task._id ? task : t));
        }
        return [task, ...prev];
      });
      setNotification(`New task assigned: ${task.title}`);
      setTimeout(() => setNotification(null), 4000);
    });

    socket.on("disconnect", () => {
      // console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [auth]);

  const handleLogout = () => {
    setAuth(null);
    setTasks([]);
  };

  if (!auth) {
    return (
      <div className="app">
        <LoginForm
          onLoginSuccess={(data) => {
            setAuth({ token: data.token, user: data.user });
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">TM</div>
          <div className="brand-text">
            <span className="brand-title">Task Management</span>
            <span className="brand-subtitle">
              Lightweight MERN stack task manager with real-time updates
            </span>
          </div>
        </div>
        <p>
          Logged in as <strong>{auth.user.username}</strong> ({auth.user.role})
        </p>
        <button className="button secondary" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {notification && (
        <div className="notification">
          <div className="notification-icon">!</div>
          <div className="notification-content">
            <span className="notification-title">Task assigned</span>
            <span className="notification-message">{notification}</span>
          </div>
          <button
            type="button"
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <main className="layout">
        {isAdmin && (
          <section className="panel">
            <h2>Create & Assign Task</h2>
            <CreateTaskForm
              currentUserId={auth.user.id}
              token={auth.token}
              onCreated={(task) => setTasks((prev) => [task, ...prev])}
            />
          </section>
        )}

        <section className="panel">
          <h2>{isAdmin ? "All Tasks" : "My Tasks"}</h2>
          {loading ? (
            <p>Loading tasks...</p>
          ) : (
            <TaskList
              tasks={tasks}
              role={auth.user.role}
              token={auth.token}
              onTaskUpdated={(task) =>
                setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
              }
            />
          )}
        </section>
      </main>
    </div>
  );
}

interface LoginFormProps {
  onLoginSuccess: (data: Awaited<ReturnType<typeof apiLogin>>) => void;
}

function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(username, password);
      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Login</h1>
        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin / alice / bob"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="hint">
          Use <strong>admin</strong> (role: admin) or <strong>alice / bob</strong> (role:
          user), password: <strong>password</strong>.
        </p>
      </form>
    </div>
  );
}

interface CreateTaskFormProps {
  currentUserId: string;
  token: string;
  onCreated: (task: Task) => void;
}

function CreateTaskForm({ token, onCreated }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("user1");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const task = await createTask(token, { title, assignedTo, status });
      onCreated(task);
      setTitle("");
      setStatus("todo");
    } catch (err) {
      console.error(err);
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-vertical" onSubmit={handleSubmit}>
      <div className="field">
        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Implement feature X"
        />
      </div>
      <div className="field">
        <label>Assign To</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="user1">alice (user1)</option>
          <option value="user2">bob (user2)</option>
        </select>
      </div>
      <div className="field">
        <label>Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
        >
          <option value="todo">Todo</option>
          <option value="in-progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      <button className="button primary" type="submit" disabled={loading || !title}>
        {loading ? "Creating..." : "Create Task"}
      </button>
    </form>
  );
}

interface TaskListProps {
  tasks: Task[];
  role: UserRole;
  token: string;
  onTaskUpdated: (task: Task) => void;
}

function TaskList({ tasks, role, token, onTaskUpdated }: TaskListProps) {
  if (tasks.length === 0) {
    return <p>No tasks yet.</p>;
  }

  const canUpdate = role === "user";

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          canUpdate={canUpdate}
          token={token}
          onUpdated={onTaskUpdated}
        />
      ))}
    </ul>
  );
}

interface TaskItemProps {
  task: Task;
  canUpdate: boolean;
  token: string;
  onUpdated: (task: Task) => void;
}

function TaskItem({ task, canUpdate, token, onUpdated }: TaskItemProps) {
  const [saving, setSaving] = useState(false);

  const displayAssignee = useMemo(() => {
    // Map ids user1/user2
    if (task.assignedTo === "user1") return "alice";
    if (task.assignedTo === "user2") return "bob";
    return task.assignedTo;
  }, [task.assignedTo]);

  const handleChangeStatus = async (status: TaskStatus) => {
    try {
      setSaving(true);
      const updated = await updateTaskStatus(token, task._id, status);
      onUpdated(updated);
    } catch (err) {
      console.error(err);
      alert("Failed to update task status");
    } finally {
      setSaving(false);
    }
  };

  const statusClass = useMemo(() => {
    switch (task.status) {
      case "todo":
        return "pill pill-gray";
      case "in-progress":
        return "pill pill-blue";
      case "done":
        return "pill pill-green";
      default:
        return "pill";
    }
  }, [task.status]);

  return (
    <li className="task-item">
      <div className="task-main">
        <h3>{task.title}</h3>
        <p className="meta">
          Assigned to:{" "}
          <span className="avatar-chip">
            <span className="avatar-circle">
              {displayAssignee.charAt(0).toUpperCase()}
            </span>
            <span>{displayAssignee}</span>
          </span>
        </p>
      </div>
      <div className="task-actions">
        <span className={statusClass}>{task.status}</span>
        {canUpdate && (
          <select
            className="status-select"
            disabled={saving}
            value={task.status}
            onChange={(e) => handleChangeStatus(e.target.value as TaskStatus)}
          >
            <option value="todo">Todo</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
        )}
      </div>
    </li>
  );
}

export default App;
