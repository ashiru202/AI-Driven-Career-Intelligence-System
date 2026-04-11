import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, Plus, Trash2 } from "lucide-react";

const STATUS_OPTIONS = ["ALL", "PENDING", "COMPLETED"];
const REMINDER_OPTIONS = ["ALL", "UPCOMING", "DUE_SOON", "OVERDUE"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];

function formatDateTime(dateLike) {
  if (!dateLike) return "-";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function reminderTone(reminderState) {
  if (reminderState === "OVERDUE") {
    return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#fecaca", label: "Overdue" };
  }
  if (reminderState === "DUE_SOON") {
    return { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#fde68a", label: "Due Soon" };
  }
  if (reminderState === "UPCOMING") {
    return { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.4)", text: "#bae6fd", label: "Upcoming" };
  }
  return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#bbf7d0", label: "Complete" };
}

export default function StaffFollowUpTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get("userId") || "";

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, dueSoon: 0, overdue: 0 });

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState(queryUserId);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reminderFilter, setReminderFilter] = useState("ALL");

  const [form, setForm] = useState({
    userId: queryUserId,
    title: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM",
  });

  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/api/staff/priority-queue", {
        params: { search: userSearch, page: 1, limit: 150 },
      });
      const items = res.data?.data?.items || [];
      const mapped = items.map((item) => item.user).filter(Boolean);
      setUsers(mapped);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch]);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const params = {};
      if (selectedUserId) params.userId = selectedUserId;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (reminderFilter !== "ALL") params.reminder = reminderFilter;
      if (taskSearch.trim()) params.search = taskSearch.trim();

      const res = await api.get("/api/staff/follow-up-tasks", { params });
      setTasks(res.data?.data?.items || []);
      setStats(res.data?.data?.stats || { total: 0, pending: 0, completed: 0, dueSoon: 0, overdue: 0 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load follow-up tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedUserId, statusFilter, reminderFilter, taskSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setSelectedUserId(queryUserId);
    setForm((prev) => ({ ...prev, userId: queryUserId }));
  }, [queryUserId]);

  const visibleUsers = useMemo(() => users, [users]);

  const setSelectedUser = (userId) => {
    setSelectedUserId(userId);
    setForm((prev) => ({ ...prev, userId }));

    const next = new URLSearchParams(searchParams);
    if (userId) next.set("userId", userId);
    else next.delete("userId");
    setSearchParams(next, { replace: true });
  };

  const handleCreateTask = async () => {
    if (!form.userId) {
      setError("Select a user before creating a task.");
      return;
    }
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!form.dueDate) {
      setError("Due date is required.");
      return;
    }

    setCreating(true);
    try {
      await api.post("/api/staff/follow-up-tasks", {
        userId: form.userId,
        title: form.title,
        description: form.description,
        dueDate: new Date(form.dueDate).toISOString(),
        priority: form.priority,
      });

      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        dueDate: "",
        priority: "MEDIUM",
      }));

      setError("");
      await fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to create follow-up task");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    setUpdatingTaskId(task._id);
    try {
      await api.patch(`/api/staff/follow-up-tasks/${task._id}`, { status: nextStatus });
      setError("");
      await fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update task status");
    } finally {
      setUpdatingTaskId("");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this follow-up task?")) return;

    setUpdatingTaskId(taskId);
    try {
      await api.delete(`/api/staff/follow-up-tasks/${taskId}`);
      setError("");
      await fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to delete task");
    } finally {
      setUpdatingTaskId("");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Follow-up Tasks & Reminders</h2>
          <p className="text-slate-300 mt-2 text-sm max-w-2xl">
            Create coaching follow-up tasks with due dates and keep staff focused on upcoming and overdue actions.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              borderRadius: 12,
              padding: "12px 18px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Pending</p>
            <p className="text-2xl font-bold text-cyan-200">{stats.pending || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Due Soon</p>
            <p className="text-2xl font-bold text-amber-200">{stats.dueSoon || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Overdue</p>
            <p className="text-2xl font-bold text-red-300">{stats.overdue || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-white text-base">Create Follow-up Task</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <label className="text-xs text-slate-400">User</label>
              <select
                value={form.userId}
                onChange={(e) => {
                  const userId = e.target.value;
                  setForm((prev) => ({ ...prev, userId }));
                  setSelectedUser(userId);
                }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  padding: "10px 12px",
                }}
              >
                <option value="">Select user</option>
                {visibleUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>

              <label className="text-xs text-slate-400">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Review CV update progress"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />

              <label className="text-xs text-slate-400">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional note for this follow-up"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Due Date</label>
                  <Input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 13,
                      padding: "10px 12px",
                    }}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button onClick={handleCreateTask} disabled={creating || loadingUsers} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                <Plus size={14} className="mr-1" />
                {creating ? "Creating..." : "Create Task"}
              </Button>
            </CardContent>
          </Card>

          <div className="xl:col-span-2 space-y-6">
            <Card
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
              }}
            >
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <BellRing size={16} className="text-amber-300" /> Reminders
                </CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                  <Input
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search tasks"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 13,
                      padding: "10px 12px",
                    }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    value={reminderFilter}
                    onChange={(e) => setReminderFilter(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 13,
                      padding: "10px 12px",
                    }}
                  >
                    {REMINDER_OPTIONS.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {loadingTasks ? (
                  <p className="text-sm text-slate-400">Loading follow-up tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-slate-400">No follow-up tasks found for this filter.</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const tone = reminderTone(task.reminderState);
                      return (
                        <div
                          key={task._id}
                          style={{
                            border: "1px solid rgba(255,255,255,0.09)",
                            borderRadius: 12,
                            padding: 12,
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <div className="text-white font-semibold">{task.title}</div>
                              <div className="text-xs text-slate-400 mt-1">
                                {task.user?.name || "User"} ({task.user?.email || "-"})
                              </div>
                              {task.description ? (
                                <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{task.description}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              <Badge className="border" style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}>
                                {tone.label}
                              </Badge>
                              <Badge className="border" style={{ background: "rgba(99,102,241,0.2)", borderColor: "rgba(99,102,241,0.4)", color: "#c7d2fe" }}>
                                {task.priority}
                              </Badge>
                              <Badge className="border" style={{ background: "rgba(148,163,184,0.18)", borderColor: "rgba(148,163,184,0.35)", color: "#e2e8f0" }}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <Clock3 size={13} /> Due: {formatDateTime(task.dueDate)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleToggleStatus(task)}
                                disabled={updatingTaskId === task._id}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <CheckCircle2 size={13} className="mr-1" />
                                {task.status === "COMPLETED" ? "Reopen" : "Mark Complete"}
                              </Button>
                              <Button
                                onClick={() => handleDeleteTask(task._id)}
                                disabled={updatingTaskId === task._id}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                <Trash2 size={13} className="mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
