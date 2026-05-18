import { useEffect, useState } from "react";
import "./App.css";
import type { Task, TaskStatus, Activity, TaskStats } from "./types";
import { fetchTasks, createTask, updateTaskStatus, fetchStats, fetchActivities } from "./apiClient";
import { createSocket } from "./socket";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [tagsInput, setTagsInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; action: string } | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const toggleHistory = (taskId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchActivities(), fetchStats()])
      .then(([tasksData, activitiesData, statsData]) => {
        setTasks(tasksData);
        setActivities(activitiesData);
        setStats(statsData);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load initial data", err);
        setError("Could not connect to the backend server. Please verify MongoDB and Express are running.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Socket integration
  useEffect(() => {
    const socket = createSocket();

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("taskCreated", (task: Task) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === task._id)) return prev;
        return [task, ...prev];
      });
      // Fetch fresh database stats
      fetchStats().then(setStats).catch(console.error);

      // Trigger a toast notification
      setToast({
        message: `Task "${task.title}" was created!`,
        action: "Created",
      });
      setTimeout(() => setToast(null), 4000);
    });

    socket.on("taskUpdated", (task: Task) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      // Fetch fresh database stats
      fetchStats().then(setStats).catch(console.error);
    });

    socket.on("activityCreated", (activity: Activity) => {
      setActivities((prev) => {
        if (prev.some((a) => a._id === activity._id)) return prev;
        return [activity, ...prev];
      });

      if (activity.action === "taskUpdated") {
        setToast({
          message: activity.details,
          action: "Updated",
        });
        setTimeout(() => setToast(null), 4000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await createTask({
        title: title.trim(),
        description: description.trim(),
        status,
        tags,
      });

      // Clear Form
      setTitle("");
      setDescription("");
      setStatus("todo");
      setTagsInput("");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error creating task", err);
      alert("Failed to create task");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(id, newStatus);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating task status", err);
      alert("Failed to update status");
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  // Groups
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const renderTaskCard = (task: Task) => {
    const taskHistory = activities.filter((act) => act.taskId === task._id);
    const isExpanded = expandedHistory[task._id] || false;

    return (
      <div key={task._id} className={`task-card ${task.status}`}>
        <div className="task-card-header">
          <h3 
            className="task-card-title" 
            style={task.status === "done" ? { textDecoration: "line-through", opacity: 0.75 } : {}}
          >
            {task.title}
          </h3>
        </div>
        
        {task.description && (
          <p 
            className="task-card-desc" 
            style={task.status === "done" ? { opacity: 0.7 } : {}}
          >
            {task.description}
          </p>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <div className="task-card-tags">
            {task.tags.map((tag, idx) => (
              <span key={idx} className="tag-chip">
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Horizontal Status Stepper */}
        <div className="task-stepper-container">
          <div className="task-stepper">
            <div className="stepper-line">
              <div className={`stepper-line-fill ${task.status}`} />
            </div>
            
            <button 
              type="button"
              className={`step-btn todo ${task.status === "todo" || task.status === "in-progress" || task.status === "done" ? "active" : ""}`}
              onClick={() => handleUpdateStatus(task._id, "todo")}
              title="Move to Todo"
            >
              <span className="step-circle">
                {task.status === "in-progress" || task.status === "done" ? "✓" : "1"}
              </span>
              <span className="step-label">Todo</span>
            </button>
            
            <button 
              type="button"
              className={`step-btn in-progress ${task.status === "in-progress" || task.status === "done" ? "active" : ""}`}
              onClick={() => handleUpdateStatus(task._id, "in-progress")}
              title="Move to In Progress"
            >
              <span className="step-circle">
                {task.status === "done" ? "✓" : "2"}
              </span>
              <span className="step-label">Progress</span>
            </button>
            
            <button 
              type="button"
              className={`step-btn done ${task.status === "done" ? "active" : ""}`}
              onClick={() => handleUpdateStatus(task._id, "done")}
              title="Mark as Done"
            >
              <span className="step-circle">
                {task.status === "done" ? "✓" : "3"}
              </span>
              <span className="step-label">Done</span>
            </button>
          </div>
        </div>

        {/* Card Actions / Footer */}
        <div className="task-card-actions">
          <span className="task-card-date">{formatDate(task.createdAt)}</span>
          <button 
            type="button"
            className={`history-toggle-btn ${isExpanded ? "expanded" : ""}`}
            onClick={() => toggleHistory(task._id)}
            title="View Task History Timeline"
          >
            ⏳ Steps Feed <span className="history-badge">{taskHistory.length}</span>
          </button>
        </div>

        {/* Collapsible History Steps Timeline */}
        {isExpanded && (
          <div className="task-history-timeline">
            <div className="timeline-container">
              {taskHistory.map((act) => (
                <div key={act._id} className="timeline-step">
                  <div className="timeline-step-indicator">
                    <div className="timeline-line-connector" />
                    <div className={`timeline-badge ${act.action === "taskCreated" ? "created" : "updated"}`}>
                      {act.action === "taskCreated" ? "+" : "⚙"}
                    </div>
                  </div>
                  <div className="timeline-step-content glass-panel">
                    <p className="timeline-step-details">{act.details}</p>
                    <span className="timeline-step-time">{formatTime(act.createdAt)}</span>
                  </div>
                </div>
              ))}
              {taskHistory.length === 0 && (
                <p className="timeline-empty">No logged steps for this task yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && (
        <div className="notification">
          <div className="notification-badge">
            {toast.action === "Created" ? "+" : "✓"}
          </div>
          <div className="notification-desc">{toast.message}</div>
          <button className="notification-close" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      {/* Header Panel */}
      <header className="app-header glass-panel">
        <div className="brand">
          <div className="brand-logo">T</div>
          <div className="brand-text">
            <span className="brand-title">Taskly</span>
            <span className="brand-subtitle">Real-time collaboration task board</span>
          </div>
        </div>

        <div className="connection-status">
          <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
          <span>{isConnected ? "Live Socket Connected" : "Connecting..."}</span>
        </div>
      </header>

      {/* Connection / Initializing Error */}
      {error && <div className="error">{error}</div>}

      {/* Stats Board */}
      <section className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-label">Total Tasks</span>
            <span className="stat-value">{stats?.totalTasks ?? 0}</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <span className="stat-label">Todo</span>
            <span className="stat-value">{stats?.countByStatus.todo ?? 0}</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats?.countByStatus["in-progress"] ?? 0}</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats?.countByStatus.done ?? 0}</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">🏷️</div>
          <div className="stat-info">
            <span className="stat-label">Top Tag</span>
            <span className="stat-value">
              {stats?.mostCommonTag ? (
                <span className="stat-tag-badge">#{stats.mostCommonTag}</span>
              ) : (
                "None"
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Main Board Layout */}
      <main className="layout">
        {/* Left Side: Create Task Form */}
        <section className="glass-panel form-panel">
          <h2 className="panel-title">Add New Task</h2>
          <form className="form-vertical" onSubmit={handleCreateTask}>
            <div className="field">
              <label htmlFor="task-title">Title</label>
              <input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement WebSocket logic"
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about what needs to be done..."
                disabled={loading}
              />
            </div>

            <div className="field">
              <label htmlFor="task-status">Initial Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={loading}
              >
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="task-tags">Tags (Comma-separated)</label>
              <input
                id="task-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. backend, bug, websocket"
                disabled={loading}
              />
            </div>

            <button className="button" type="submit" disabled={loading || !title.trim()}>
              <span>+</span> Create Task
            </button>
          </form>
        </section>

        {/* Middle Area: Kanban Columns */}
        <section className="kanban-board-container board-panel">
          <div className="kanban-board">
            {/* Column 1: Todo */}
            <div className="kanban-column todo">
              <div className="column-header">
                <span className="column-title">Todo</span>
                <span className="column-count">{todoTasks.length}</span>
              </div>
              <div className="column-cards">
                {todoTasks.map(renderTaskCard)}
                {todoTasks.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                    No tasks in Todo
                  </p>
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="kanban-column in-progress">
              <div className="column-header">
                <span className="column-title">In Progress</span>
                <span className="column-count">{inProgressTasks.length}</span>
              </div>
              <div className="column-cards">
                {inProgressTasks.map(renderTaskCard)}
                {inProgressTasks.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                    No tasks in Progress
                  </p>
                )}
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="kanban-column done">
              <div className="column-header">
                <span className="column-title">Completed</span>
                <span className="column-count">{doneTasks.length}</span>
              </div>
              <div className="column-cards">
                {doneTasks.map(renderTaskCard)}
                {doneTasks.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                    No completed tasks
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Activity Feed */}
        <section className="glass-panel feed-panel">
          <h2 className="panel-title">
            Live Feed <span className="count-badge">{activities.length}</span>
          </h2>
          <div className="activity-list">
            {activities.map((act) => (
              <div key={act._id} className="activity-item">
                <div className={`activity-avatar ${act.action === "taskCreated" ? "created" : "updated"}`}>
                  {act.action === "taskCreated" ? "+" : "⚙"}
                </div>
                <div className="activity-content">
                  <span className="activity-header">{act.details}</span>
                  <span className="activity-time">{formatTime(act.createdAt)}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2rem" }}>
                No recent activity logs
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
