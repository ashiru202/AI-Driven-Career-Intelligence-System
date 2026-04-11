import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Users,
  AlertTriangle,
  PenLine,
  ArrowRight,
  Lightbulb,
  Check,
  Map,
  Download,
  Sparkles,
  Activity,
  Target,
  UserCircle2,
} from "lucide-react";

function ScoreRing({ score, size = 82 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "center",
          fill: color,
          fontSize: size * 0.22,
          fontWeight: 700,
        }}
      >
        {score}%
      </text>
    </svg>
  );
}

function ProgressTrack({ pct, color = "#0ea5e9" }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 7, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

function UserAvatar({ name, size = 38 }) {
  const initials = name
    ? name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "?";
  const colors = ["#0ea5e9", "#22c55e", "#f59e0b", "#f97316", "#14b8a6", "#3b82f6"];
  const bg = colors[name ? name.charCodeAt(0) % colors.length : 0];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function MetricTile({ label, value, sublabel, Icon, accent }) {
  return (
    <Card
      className="border-white/10"
      style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.95), rgba(12,15,28,0.95))" }}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
          </div>
          <div
            className="rounded-lg p-2"
            style={{ background: `${accent}22`, border: `1px solid ${accent}55`, color: accent }}
          >
            <Icon size={16} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffDashboard() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [report, setReport] = useState(null);
  const [cvData, setCvData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingUsers(true);
    api
      .get("/api/analytics/users?role=USER")
      .then((res) => {
        if (res.data.ok) setUsers(res.data.data.users || []);
      })
      .catch((e) => setError(e.response?.data?.error?.message || "Failed to load users"))
      .finally(() => setLoadingUsers(false));
  }, []);

  const selectUser = useCallback(async (user) => {
    setSelectedUser(user);
    setReport(null);
    setCvData(null);
    setInsightsData(null);
    setLoadingAnalysis(true);
    setError("");

    try {
      const [cvRes, insightsRes, reportRes] = await Promise.all([
        api.get(`/api/analytics/cv-completeness/${user._id}`),
        api.get(`/api/analytics/user-insights/${user._id}`),
        api.get(`/api/analytics/user-report/${user._id}`),
      ]);
      if (cvRes.data.ok) setCvData(cvRes.data.data);
      if (insightsRes.data.ok) setInsightsData(insightsRes.data.data);
      if (reportRes.data.ok) setReport(reportRes.data.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || "Failed to load user analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  useEffect(() => {
    if (!users.length) return;

    const selectedStillExists = selectedUser && users.some((u) => u._id === selectedUser._id);
    if (!selectedStillExists) {
      selectUser(users[0]);
    }
  }, [users, selectedUser, selectUser]);

  const downloadPDF = async () => {
    if (!selectedUser?._id) return;

    try {
      const res = await api.get(`/api/reports/user/${selectedUser._id}/pdf`, {
        responseType: "blob",
      });
      const contentType = res.headers?.["content-type"] || "application/pdf";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-report-${selectedUser.email}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download user report PDF", err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const activeUsers = useMemo(() => users.filter((u) => u.active).length, [users]);

  const scoreLabel = (s) => (s >= 75 ? "Strong" : s >= 45 ? "Needs Work" : "Incomplete");
  const scoreColor = (s) => (s >= 75 ? "#22c55e" : s >= 45 ? "#eab308" : "#ef4444");
  const scoreBarColor = (s) => (s >= 75 ? "#22c55e" : s >= 45 ? "#eab308" : "#ef4444");

  const roadmaps = useMemo(
    () => (Array.isArray(report?.roadmaps) ? report.roadmaps : []),
    [report]
  );

  const roadmapSummary = useMemo(() => {
    if (!roadmaps.length) {
      return { count: 0, avgProgress: 0, completed: 0 };
    }

    const progressValues = roadmaps.map((rm) => {
      if (!rm.totalSkills) return 0;
      return Math.round((Number(rm.skillsCompleted || 0) / Number(rm.totalSkills || 1)) * 100);
    });

    const completed = progressValues.filter((value) => value === 100).length;
    const avgProgress = Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length);

    return { count: roadmaps.length, avgProgress, completed };
  }, [roadmaps]);

  const summaryTiles = [
    {
      label: "CV Quality",
      value: cvData ? `${cvData.score}%` : "-",
      sublabel: cvData ? scoreLabel(cvData.score) : "Select a user",
      Icon: PenLine,
      accent: "#f59e0b",
    },
    {
      label: "Critical Gaps",
      value: String(cvData?.missingSections?.length || 0),
      sublabel: "Missing CV sections",
      Icon: AlertTriangle,
      accent: "#ef4444",
    },
    {
      label: "Priority Skills",
      value: String(insightsData?.prioritySkills?.length || 0),
      sublabel: "Suggested skills to learn",
      Icon: Target,
      accent: "#0ea5e9",
    },
    {
      label: "Roadmap Progress",
      value: `${roadmapSummary.avgProgress}%`,
      sublabel: `${roadmapSummary.completed}/${roadmapSummary.count} completed`,
      Icon: Map,
      accent: "#22c55e",
    },
  ];

  const card = {
    background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "20px 22px",
  };

  const sectionTitle = {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 12,
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">User Reports</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-2xl">
              Explore each candidate profile with CV quality, skill-gap diagnostics, and action-ready guidance in one clean view.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.35)" }}
            >
              <Users size={13} /> {users.length} users
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.16)", color: "#bbf7d0", border: "1px solid rgba(34,197,94,0.35)" }}
            >
              <Activity size={13} /> {activeUsers} active
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(245,158,11,0.18)", color: "#fde68a", border: "1px solid rgba(245,158,11,0.35)" }}
            >
              <Sparkles size={13} /> {selectedUser ? "Profile Selected" : "Awaiting Selection"}
            </span>
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

        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
          <Card
            className="border-white/10"
            style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.95), rgba(12,15,28,0.95))" }}
          >
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Users size={16} className="text-cyan-300" /> User Directory
              </CardTitle>
              <p className="text-xs text-slate-400">Select a profile to open complete diagnostics</p>
            </CardHeader>
            <CardContent className="pt-4">
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
                }}
              />

              <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflowY: "auto" }}>
                {loadingUsers ? (
                  <div className="text-sm text-slate-400 py-6 text-center">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-slate-400 py-6 text-center">No users found.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const active = selectedUser?._id === u._id;
                    return (
                      <button
                        key={u._id}
                        onClick={() => selectUser(u)}
                        className="w-full text-left rounded-xl px-3 py-2 transition-all"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: active ? "rgba(14,165,233,0.14)" : "rgba(255,255,255,0.01)",
                          border: active ? "1px solid rgba(14,165,233,0.45)" : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <UserAvatar name={u.name} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-full"
                          style={{
                            background: u.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: u.active ? "#4ade80" : "#f87171",
                            border: u.active ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(239,68,68,0.35)",
                          }}
                        >
                          {u.active ? "Active" : "Offline"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!selectedUser && (
              <Card
                className="border-white/10"
                style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.95), rgba(12,15,28,0.95))" }}
              >
                <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="rounded-full p-4 mb-4" style={{ background: "rgba(14,165,233,0.16)", border: "1px solid rgba(14,165,233,0.35)" }}>
                    <UserCircle2 size={34} className="text-cyan-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Pick a user to start analysis</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-md">
                    You will get CV completeness scoring, career insights, and roadmap progression for the selected profile.
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedUser && loadingAnalysis && (
              <Card
                className="border-white/10"
                style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.95), rgba(12,15,28,0.95))" }}
              >
                <CardContent className="py-20 flex flex-col items-center justify-center gap-4">
                  <svg className="animate-spin" style={{ width: 36, height: 36, color: "#0ea5e9" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
                    Loading analysis for <strong style={{ color: "#ffffff" }}>{selectedUser.name}</strong>...
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedUser && !loadingAnalysis && (
              <>
                <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <UserAvatar name={selectedUser.name} size={48} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{selectedUser.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{selectedUser.email}</div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: selectedUser.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: selectedUser.active ? "#4ade80" : "#f87171",
                          border: selectedUser.active ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 99,
                          padding: "2px 10px",
                          marginTop: 6,
                          display: "inline-block",
                        }}
                      >
                        {selectedUser.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Download size={14} className="mr-2" /> Download PDF
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {summaryTiles.map((tile) => (
                    <MetricTile key={tile.label} {...tile} />
                  ))}
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  {cvData && (
                    <div style={card}>
                      <p style={sectionTitle} className="flex items-center gap-1"><PenLine size={14} /> CV Completeness</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                        <ScoreRing score={cvData.score} size={90} />
                        <div style={{ flex: 1, minWidth: 190 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(cvData.score) }}>
                            {scoreLabel(cvData.score)}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                            {cvData.score >= 75
                              ? "Profile is well prepared"
                              : cvData.score >= 45
                                ? "Profile needs improvement"
                                : "Profile is currently incomplete"}
                          </div>
                          <ProgressTrack pct={cvData.score} color={scoreBarColor(cvData.score)} />
                        </div>
                      </div>

                      {cvData.missingSections?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ ...sectionTitle, marginBottom: 8 }}>Missing Sections</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {cvData.missingSections.map((s, i) => (
                              <span key={i} style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cvData.suggestions?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ ...sectionTitle, marginBottom: 8 }}>Suggestions</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {cvData.suggestions.map((s, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{ color: "#0ea5e9", fontSize: 14, marginTop: 1, display: "flex" }}><ArrowRight size={14} /></span>
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.68)" }}>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {insightsData && (
                    <div style={card}>
                      <p style={sectionTitle} className="flex items-center gap-1"><Lightbulb size={14} /> Career Insights</p>

                      {insightsData.reasons?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Key Issues</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {insightsData.reasons.map((r, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "8px 12px" }}>
                                <span style={{ color: "#f87171", fontSize: 14, display: "flex" }}><AlertTriangle size={14} /></span>
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.68)" }}>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {insightsData.prioritySkills?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Priority Skills to Learn</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {insightsData.prioritySkills.map((skill, i) => (
                              <span key={i} style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.38)", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {insightsData.actions?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Recommended Actions</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {insightsData.actions.map((a, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(34,197,94,0.08)", borderRadius: 8, padding: "8px 12px" }}>
                                <span style={{ color: "#4ade80", fontSize: 14, display: "flex" }}><Check size={14} /></span>
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.68)" }}>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!cvData && !insightsData && (
                  <div style={{ ...card, textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
                    Insight panels are not available for this user yet.
                  </div>
                )}

                {report && roadmaps.length > 0 && (
                  <div style={card}>
                    <p style={sectionTitle} className="flex items-center gap-1"><Map size={14} /> Learning Roadmaps ({roadmaps.length})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {roadmaps.map((rm) => {
                        const pct = rm.totalSkills ? Math.round((rm.skillsCompleted / rm.totalSkills) * 100) : 0;
                        const barColor = pct === 100 ? "#22c55e" : pct > 0 ? "#0ea5e9" : "rgba(255,255,255,0.15)";
                        const badgeColor = pct === 100 ? "rgba(34,197,94,0.15)" : pct > 0 ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.06)";
                        const badgeText = pct === 100 ? "#4ade80" : pct > 0 ? "#bae6fd" : "rgba(255,255,255,0.35)";
                        const badgeBorder = pct === 100 ? "rgba(34,197,94,0.3)" : pct > 0 ? "rgba(14,165,233,0.35)" : "rgba(255,255,255,0.1)";

                        return (
                          <div key={rm.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.86)" }}>{rm.targetRole}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, background: badgeColor, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 99, padding: "2px 10px" }}>
                                {pct}% done
                              </span>
                            </div>
                            <ProgressTrack pct={pct} color={barColor} />
                            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                              {rm.skillsCompleted}/{rm.totalSkills} skills · {new Date(rm.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {report && roadmaps.length === 0 && (
                  <div style={{ ...card, textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
                    This user has no roadmaps yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}