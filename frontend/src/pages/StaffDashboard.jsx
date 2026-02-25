import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Users, AlertTriangle, PenLine, ArrowRight, Lightbulb, Check, Map } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fill: color, fontSize: size * 0.22, fontWeight: 700 }}
      >{score}%</text>
    </svg>
  );
}

function Bar({ pct, color = "#6366f1" }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function UserAvatar({ name, size = 36 }) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
  const bg = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
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

  // Load user list
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

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reports/user/${selectedUser._id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-report-${selectedUser.email}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 45) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 45) return "bg-yellow-500";
    return "bg-red-500";
  };

  // ── score helpers ──────────────────────────────────────────────────────────
  const scoreLabel = (s) => s >= 75 ? "Strong" : s >= 45 ? "Needs Work" : "Incomplete";
  const scoreColor = (s) => s >= 75 ? "#22c55e" : s >= 45 ? "#eab308" : "#ef4444";
  const scoreBarColor = (s) => s >= 75 ? "#22c55e" : s >= 45 ? "#eab308" : "#ef4444";

  const card = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "20px 22px",
  };

  const sectionTitle = {
    fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">User Reports</h2>
            <p className="text-slate-400 mt-1 text-sm">
              Select a user to view their skill gap analysis, CV completeness, and personalized insights.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 99, padding: "4px 14px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Users size={13} /> {filteredUsers.length} users
            </span>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", borderRadius: 12, padding: "12px 18px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── User List ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ marginBottom: 12 }}>
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13 }}
                />
              </div>

              {loadingUsers ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  Loading users…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  No users found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 520, overflowY: "auto" }}>
                  {filteredUsers.map((u) => {
                    const active = selectedUser?._id === u._id;
                    return (
                      <button
                        key={u._id}
                        onClick={() => selectUser(u)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 12px", borderRadius: 12,
                          background: active ? "rgba(99,102,241,0.18)" : "transparent",
                          border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          transition: "background 0.15s",
                        }}
                      >
                        <UserAvatar name={u.name} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, background: u.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: u.active ? "#4ade80" : "#f87171", border: u.active ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
                          {u.active ? "Active" : "Off"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Analysis Panel ── */}
          <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Empty state */}
            {!selectedUser && (
              <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12 }}>
                
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15 }}>Select a user from the list to view their analysis</p>
              </div>
            )}

            {/* Loading state */}
            {selectedUser && loadingAnalysis && (
              <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 14 }}>
                <svg className="animate-spin" style={{ width: 36, height: 36, color: "#6366f1" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading analysis for <strong style={{ color: "rgba(255,255,255,0.7)" }}>{selectedUser.name}</strong>…</p>
              </div>
            )}

            {selectedUser && !loadingAnalysis && (
              <>
                {/* ── User Header Card ── */}
                <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <UserAvatar name={selectedUser.name} size={48} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{selectedUser.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{selectedUser.email}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: selectedUser.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: selectedUser.active ? "#4ade80" : "#f87171", border: selectedUser.active ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)", borderRadius: 99, padding: "2px 10px", marginTop: 6, display: "inline-block" }}>
                        {selectedUser.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={downloadPDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Download PDF
                  </Button>
                </div>

                {/* ── CV Completeness ── */}
                {cvData && (
                  <div style={card}>
                    <p style={sectionTitle} className="flex items-center gap-1"><PenLine size={14} /> CV Completeness</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                      <ScoreRing score={cvData.score} size={90} />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(cvData.score) }}>
                          {scoreLabel(cvData.score)}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                          {cvData.score >= 75 ? "Profile is well set up" : cvData.score >= 45 ? "Profile needs improvement" : "Profile is incomplete"}
                        </div>
                        <Bar pct={cvData.score} color={scoreBarColor(cvData.score)} />
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
                              <span style={{ color: "#6366f1", fontSize: 14, marginTop: 1, display: 'flex' }}><ArrowRight size={14} /></span>
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Career Insights ── */}
                {insightsData && (
                  <div style={card}>
                    <p style={sectionTitle} className="flex items-center gap-1"><Lightbulb size={14} /> Career Insights</p>

                    {insightsData.reasons?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Key Issues</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {insightsData.reasons.map((r, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(239,68,68,0.07)", borderRadius: 8, padding: "8px 12px" }}>
                              <span style={{ color: "#f87171", fontSize: 14, display: 'flex' }}><AlertTriangle size={14} /></span>
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{r}</span>
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
                            <span key={i} style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {insightsData.actions?.length > 0 && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Recommended Actions</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {insightsData.actions.map((a, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(34,197,94,0.07)", borderRadius: 8, padding: "8px 12px" }}>
                              <span style={{ color: "#4ade80", fontSize: 14, display: 'flex' }}><Check size={14} /></span>
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Roadmaps ── */}
                {report && report.roadmaps && report.roadmaps.length > 0 && (
                  <div style={card}>
                    <p style={sectionTitle} className="flex items-center gap-1"><Map size={14} /> Learning Roadmaps ({report.roadmaps.length})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {report.roadmaps.map((rm) => {
                        const pct = rm.totalSkills ? Math.round((rm.skillsCompleted / rm.totalSkills) * 100) : 0;
                        const barColor = pct === 100 ? "#22c55e" : pct > 0 ? "#6366f1" : "rgba(255,255,255,0.15)";
                        const badgeColor = pct === 100 ? "rgba(34,197,94,0.15)" : pct > 0 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)";
                        const badgeText = pct === 100 ? "#4ade80" : pct > 0 ? "#a5b4fc" : "rgba(255,255,255,0.35)";
                        const badgeBorder = pct === 100 ? "rgba(34,197,94,0.3)" : pct > 0 ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)";
                        return (
                          <div key={rm.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{rm.targetRole}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, background: badgeColor, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 99, padding: "2px 10px" }}>
                                {pct}% done
                              </span>
                            </div>
                            <Bar pct={pct} color={barColor} />
                            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                              {rm.skillsCompleted}/{rm.totalSkills} skills · {new Date(rm.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {report && report.roadmaps && report.roadmaps.length === 0 && (
                  <div style={{ ...card, textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
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
