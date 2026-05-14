import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, Save, Workflow } from "lucide-react";

const STATE_OPTIONS = ["NEW", "IN_REVIEW", "FOLLOW_UP_REQUIRED", "RESOLVED"];
const FILTER_STATES = ["ALL", ...STATE_OPTIONS];
const STATE_LABELS = {
  NEW: "New",
  IN_REVIEW: "In Review",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  RESOLVED: "Resolved",
  ALL: "All States",
};

function stateLabel(state) {
  return STATE_LABELS[state] || "New";
}

function stateTone(state) {
  if (state === "RESOLVED") {
    return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#bbf7d0", label: "Resolved" };
  }
  if (state === "FOLLOW_UP_REQUIRED") {
    return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#fecaca", label: "Follow-up Required" };
  }
  if (state === "IN_REVIEW") {
    return { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#fde68a", label: "In Review" };
  }
  return { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.4)", text: "#bae6fd", label: "New" };
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function StaffReportWorkflows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get("userId") || "";

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ NEW: 0, IN_REVIEW: 0, FOLLOW_UP_REQUIRED: 0, RESOLVED: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState(queryUserId);

  const [draftStates, setDraftStates] = useState({});
  const [draftNotes, setDraftNotes] = useState({});

  const [error, setError] = useState("");

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (stateFilter !== "ALL") params.state = stateFilter;
      if (selectedUserId) params.userId = selectedUserId;

      const res = await api.get("/api/staff/report-workflows", { params });
      const nextItems = res.data?.data?.items || [];
      setItems(nextItems);
      setStats(res.data?.data?.stats || { NEW: 0, IN_REVIEW: 0, FOLLOW_UP_REQUIRED: 0, RESOLVED: 0, total: 0 });
      setDraftStates(
        nextItems.reduce((acc, item) => {
          acc[item.user?._id] = item.state || "NEW";
          return acc;
        }, {})
      );
      setDraftNotes(
        nextItems.reduce((acc, item) => {
          acc[item.user?._id] = item.notes || "";
          return acc;
        }, {})
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load workflow states");
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, selectedUserId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    setSelectedUserId(queryUserId);
  }, [queryUserId]);

  const visibleItems = useMemo(() => items, [items]);

  const saveWorkflow = async (userId) => {
    setSavingUserId(userId);
    try {
      const res = await api.patch(`/api/staff/report-workflows/${userId}`, {
        state: draftStates[userId],
        notes: draftNotes[userId] || "",
      });
      const updated = res.data?.data?.item;
      if (updated) {
        setItems((prev) =>
          prev.map((item) => (item.user?._id === userId ? updated : item))
        );
      }
      setError("");
      await fetchWorkflows();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update workflow state");
    } finally {
      setSavingUserId("");
    }
  };

  const setFocusedUser = (userId) => {
    setSelectedUserId(userId);
    const next = new URLSearchParams(searchParams);
    if (userId) next.set("userId", userId);
    else next.delete("userId");
    setSearchParams(next, { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Report Workflow States</h2>
          <p className="text-slate-300 mt-2 text-sm max-w-2xl">
            Track each user report through a simple workflow: New, In Review, Follow-up Required, and Resolved.
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">New</p>
            <p className="text-2xl font-bold text-cyan-200">{stats.NEW || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">In Review</p>
            <p className="text-2xl font-bold text-amber-200">{stats.IN_REVIEW || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Follow-up Required</p>
            <p className="text-2xl font-bold text-red-300">{stats.FOLLOW_UP_REQUIRED || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Resolved</p>
            <p className="text-2xl font-bold text-green-300">{stats.RESOLVED || 0}</p>
          </div>
        </div>

        <Card
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
          }}
        >
          <CardHeader className="pb-3 border-b border-white/10">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Workflow size={16} className="text-cyan-300" /> Workflow Board
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
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
                {FILTER_STATES.map((state) => (
                  <option key={state} value={state}>{stateLabel(state)}</option>
                ))}
              </select>
              <Button
                onClick={() => setFocusedUser("")}
                disabled={!selectedUserId}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Clear User Filter
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loading ? (
              <p className="text-sm text-slate-400">Loading workflow states...</p>
            ) : visibleItems.length === 0 ? (
              <p className="text-sm text-slate-400">No report workflow items found.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {visibleItems.map((item) => {
                  const userId = item.user?._id;
                  const tone = stateTone(item.state);
                  const nextState = draftStates[userId] || "NEW";
                  const nextNotes = draftNotes[userId] || "";
                  const currentState = item.state || "NEW";
                  const currentNotes = item.notes || "";
                  const hasChanges = nextState !== currentState || nextNotes !== currentNotes;

                  return (
                    <div
                      key={userId}
                      style={{
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 12,
                        padding: 12,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="text-white font-semibold">{item.user?.name || "User"}</div>
                          <div className="text-xs text-slate-400">{item.user?.email || "-"}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Last updated: {formatDate(item.lastUpdatedAt)}
                            {item.updatedBy?.name ? ` by ${item.updatedBy.name}` : ""}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <Badge className="border" style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}>
                            {tone.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 mt-3 items-start">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Workflow State</p>
                          <select
                            value={nextState}
                            onChange={(e) =>
                              setDraftStates((prev) => ({
                                ...prev,
                                [userId]: e.target.value,
                              }))
                            }
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
                            {STATE_OPTIONS.map((state) => (
                              <option key={state} value={state}>{stateLabel(state)}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Workflow Note</p>
                          <Textarea
                            value={nextNotes}
                            onChange={(e) =>
                              setDraftNotes((prev) => ({
                                ...prev,
                                [userId]: e.target.value,
                              }))
                            }
                            placeholder="Add a short note about current review status"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff",
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className={`text-xs ${hasChanges ? "text-amber-300" : "text-slate-500"}`}>
                          {hasChanges ? "Unsaved changes" : "No changes"}
                        </p>
                        <Button
                          onClick={() => saveWorkflow(userId)}
                          disabled={savingUserId === userId || !hasChanges}
                          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[110px]"
                        >
                          <Save size={13} className="mr-1" />
                          {savingUserId === userId ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
