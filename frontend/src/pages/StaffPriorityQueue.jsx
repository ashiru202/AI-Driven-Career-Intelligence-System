import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, ClipboardList, RefreshCw, Save, Search, Target } from "lucide-react";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function priorityTone(value) {
  const score = Number(value || 0);
  if (score >= 80) return { bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.35)", text: "#fca5a5", label: "Critical" };
  if (score >= 65) return { bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.35)", text: "#fde68a", label: "High" };
  if (score >= 45) return { bg: "rgba(56,189,248,0.18)", border: "rgba(56,189,248,0.35)", text: "#bae6fd", label: "Medium" };
  return { bg: "rgba(34,197,94,0.18)", border: "rgba(34,197,94,0.35)", text: "#bbf7d0", label: "Low" };
}

export default function StaffPriorityQueue() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");
  const [manualValues, setManualValues] = useState({});
  const [error, setError] = useState("");

  const fetchQueue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const res = await api.get("/api/staff/priority-queue", {
        params: { search, page: 1, limit: 80 },
      });
      const nextItems = res.data?.data?.items || [];
      setItems(nextItems);
      setManualValues(
        nextItems.reduce((acc, item) => {
          acc[item.user._id] = item.manualPriority === null || item.manualPriority === undefined
            ? ""
            : String(item.manualPriority);
          return acc;
        }, {})
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load priority queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const saveManualPriority = async (userId) => {
    const raw = manualValues[userId];
    const manualPriority = raw === "" ? null : Number(raw);

    if (manualPriority !== null && (Number.isNaN(manualPriority) || manualPriority < 0 || manualPriority > 100)) {
      setError("Manual priority must be between 0 and 100.");
      return;
    }

    setSavingUserId(userId);
    try {
      const res = await api.patch(`/api/staff/priority-queue/${userId}/manual-priority`, {
        manualPriority,
      });
      const updated = res.data?.data?.item;
      if (updated) {
        setItems((prev) =>
          prev
            .map((item) => (item.user._id === userId ? updated : item))
            .sort((a, b) => Number(b.effectivePriority || 0) - Number(a.effectivePriority || 0))
        );
      }
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update manual priority");
    } finally {
      setSavingUserId("");
    }
  };

  const criticalCount = useMemo(
    () => items.filter((item) => Number(item.effectivePriority || 0) >= 80).length,
    [items]
  );

  const averagePriority = useMemo(() => {
    if (!items.length) return 0;
    return Math.round(items.reduce((sum, item) => sum + Number(item.effectivePriority || 0), 0) / items.length);
  }, [items]);

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Priority Queue</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-2xl">
              Users are ranked by urgency using CV quality, roadmap progress, inactivity window, and skill-gap load.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.18)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.35)" }}
            >
              <AlertTriangle size={13} /> {criticalCount} critical
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(56,189,248,0.18)", color: "#bae6fd", border: "1px solid rgba(56,189,248,0.35)" }}
            >
              <Target size={13} /> Avg priority {averagePriority}
            </span>
            <Button onClick={() => fetchQueue({ silent: true })} className="bg-slate-700 hover:bg-slate-600 text-white">
              <RefreshCw size={14} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
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

        <Card
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
          }}
        >
          <CardHeader className="pb-3 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ClipboardList size={16} className="text-cyan-300" /> Priority Cases
              </CardTitle>
              <div className="relative w-full md:w-80">
                <Search size={14} style={{ position: "absolute", top: 12, left: 10, color: "#94a3b8" }} />
                <Input
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    paddingLeft: 30,
                  }}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loading ? (
              <p className="text-sm text-slate-400">Loading queue...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400">No users found for this queue filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead>
                    <tr className="text-left border-b border-white/10 text-slate-400">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Priority</th>
                      <th className="pb-3">CV</th>
                      <th className="pb-3">Roadmap</th>
                      <th className="pb-3">Gaps</th>
                      <th className="pb-3">Inactive Days</th>
                      <th className="pb-3">Manual Override</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const tone = priorityTone(item.effectivePriority);
                      return (
                        <tr key={item._id} className="border-b border-white/5 last:border-0">
                          <td className="py-3 text-white">
                            <div className="font-semibold">{item.user.name}</div>
                            <div className="text-xs text-slate-400">{item.user.email}</div>
                            {!!item.tags?.length && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={`${item._id}-${tag}`}
                                    className="border"
                                    style={{
                                      background: "rgba(245,158,11,0.15)",
                                      borderColor: "rgba(245,158,11,0.35)",
                                      color: "#fde68a",
                                    }}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge
                              className="border"
                              style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}
                            >
                              {formatNumber(item.effectivePriority)} ({tone.label})
                            </Badge>
                            {item.reasons?.length > 0 && (
                              <div className="text-xs text-slate-400 mt-1">{item.reasons.slice(0, 2).join(" • ")}</div>
                            )}
                          </td>
                          <td className="py-3 text-slate-200">{formatNumber(item.factors?.cvScore)}</td>
                          <td className="py-3 text-slate-200">{formatNumber(item.factors?.roadmapProgress)}%</td>
                          <td className="py-3 text-slate-200">{formatNumber(item.factors?.gapCount)}</td>
                          <td className="py-3 text-slate-200">{formatNumber(item.factors?.inactiveDays)}</td>
                          <td className="py-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={manualValues[item.user._id] ?? ""}
                              placeholder="auto"
                              onChange={(e) =>
                                setManualValues((prev) => ({
                                  ...prev,
                                  [item.user._id]: e.target.value,
                                }))
                              }
                              style={{
                                width: 110,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                                fontSize: 13,
                              }}
                            />
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => saveManualPriority(item.user._id)}
                                disabled={savingUserId === item.user._id}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Save size={13} className="mr-1" />
                                {savingUserId === item.user._id ? "Saving..." : "Save"}
                              </Button>
                              <Link
                                to={`/staff/case-notes?userId=${item.user._id}`}
                                className="text-amber-300 text-xs hover:text-amber-200"
                              >
                                Case notes
                              </Link>
                              <Link
                                to={`/staff/follow-ups?userId=${item.user._id}`}
                                className="text-indigo-300 text-xs hover:text-indigo-200"
                              >
                                Follow-ups
                              </Link>
                              <Link
                                to={`/staff/report-workflows?userId=${item.user._id}`}
                                className="text-emerald-300 text-xs hover:text-emerald-200"
                              >
                                Workflow
                              </Link>
                              <Link to="/staff" className="text-cyan-300 text-xs hover:text-cyan-200">Open report</Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
