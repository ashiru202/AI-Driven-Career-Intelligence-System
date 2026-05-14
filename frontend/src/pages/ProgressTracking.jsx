import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  CheckCircle2,
  Clock,
  Layers,
  Map,
  ArrowRight,
  Loader2,
  Trophy,
  Lock,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SKILL_PCT = { COMPLETED: 100, IN_PROGRESS: 50, PENDING: 0 };

const STATUS_COLOR = {
  COMPLETED:   { bar: "#4ade80", text: "#4ade80", bg: "rgba(74,222,128,0.15)",  label: "Completed" },
  IN_PROGRESS: { bar: "#fbbf24", text: "#fbbf24", bg: "rgba(251,191,36,0.15)",  label: "In Progress" },
  PENDING:     { bar: "#475569", text: "#94a3b8", bg: "rgba(71,85,105,0.15)",   label: "Pending" },
};

function scoreLabel(p) {
  if (p >= 70) return { text: "#4ade80", label: "On Track" };
  if (p >= 35) return { text: "#fbbf24", label: "In Progress" };
  return { text: "#818cf8", label: "Getting Started" };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub, subColor = "#4ade80" }) {
  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      padding: "20px 22px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      backdropFilter: "blur(8px)",
    }}>
      <div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginBottom: 6 }}>{value}</p>
        <p style={{ fontSize: 12, color: subColor, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <TrendingUp size={11} style={{ display: "inline" }} /> {sub}
        </p>
      </div>
      <div style={{
        width: 50, height: 50, borderRadius: 14,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={24} color={iconColor} />
      </div>
    </div>
  );
}

// ─── Skill Progress Row ───────────────────────────────────────────────────────

function SkillRow({ skill, status, pct }) {
  const col = STATUS_COLOR[status] || STATUS_COLOR.PENDING;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{skill}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: col.text }}>{pct}%</span>
      </div>
      <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 7 }}>
        <div style={{
          width: `${pct}%`,
          height: 7,
          borderRadius: 99,
          background: col.bar,
          transition: "width 0.7s ease",
        }} />
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, marginTop: 3, display: "inline-block",
        color: col.text,
        background: col.bg,
        borderRadius: 99,
        padding: "1px 8px",
      }}>
        {col.label}
      </span>
    </div>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────────

function MilestoneCard({ title, description, achieved }) {
  return (
    <div style={{
      borderRadius: 16,
      border: achieved
        ? "1px solid rgba(251,191,36,0.35)"
        : "1px solid rgba(255,255,255,0.07)",
      background: achieved
        ? "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))"
        : "rgba(255,255,255,0.03)",
      padding: "20px 22px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: achieved ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {achieved
          ? <Trophy size={22} color="#fbbf24" />
          : <Lock size={20} color="rgba(255,255,255,0.25)" />}
      </div>
      <div>
        <p style={{
          fontSize: 14, fontWeight: 700, marginBottom: 4,
          color: achieved ? "#fde68a" : "rgba(255,255,255,0.45)",
        }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: achieved ? "rgba(253,230,138,0.65)" : "rgba(255,255,255,0.28)" }}>
          {description}
        </p>
        {achieved && (
          <span style={{
            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700, color: "#fbbf24",
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 99, padding: "2px 10px",
          }}>
            <CheckCircle2 size={11} /> Achieved
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,23,42,0.95)",
      border: "1px solid rgba(99,102,241,0.4)",
      borderRadius: 12,
      padding: "12px 16px",
      fontSize: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{ color: "#e0e7ff", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: "rgba(255,255,255,0.8)", marginBottom: 4, display: "flex", gap: 8 }}>
          <span style={{ color: p.fill, fontWeight: 600 }}>●</span>
          {p.name}: <strong style={{ color: p.fill, fontWeight: 700 }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MILESTONES = [
  {
    key: "first_skill",
    title: "First Skill Completed",
    description: "Complete your first skill on any roadmap.",
    check: s => s.completedSkills >= 1,
  },
  {
    key: "five_skills",
    title: "5 Skills Completed",
    description: "Complete 5 skills across all your roadmaps.",
    check: s => s.completedSkills >= 5,
  },
  {
    key: "half_complete",
    title: "50% Roadmap Complete",
    description: "Reach 50% overall progress across all roadmaps.",
    check: s => s.overallProgress >= 50,
  },
  {
    key: "all_mastered",
    title: "All Skills Mastered",
    description: "Complete every skill on all your roadmaps.",
    check: s => s.totalSkills > 0 && s.completedSkills === s.totalSkills,
  },
];

export default function ProgressTracking() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get("/api/roadmaps-new/summary");
      setSummary(res.data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second polling for real-time updates
  useEffect(() => {
    fetchSummary(false);
    const interval = setInterval(() => fetchSummary(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 256, gap: 12 }}>
          <Loader2 size={28} style={{ color: "#818cf8", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading your progress…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: 20 }}>
          <p style={{ color: "#f87171", fontWeight: 700 }}>Failed to load progress</p>
          <p style={{ color: "rgba(248,113,113,0.7)", fontSize: 13, marginTop: 4 }}>{error}</p>
          <Button style={{ marginTop: 16 }} onClick={() => fetchSummary(false)}>Retry</Button>
        </div>
      </Layout>
    );
  }

  const hasRoadmaps = summary && summary.totalRoadmaps > 0;
  const sc = summary ? scoreLabel(summary.overallProgress) : {};

  // Chart data: per-roadmap stacked bar
  const chartData = (summary?.roadmaps || []).map(r => ({
    name: r.targetRole.length > 18 ? r.targetRole.slice(0, 16) + "…" : r.targetRole,
    Completed: r.completedSkills,
    "In Progress": r.inProgressSkills,
    Pending: r.pendingSkills,
  }));

  // Skill progress: sort — COMPLETED → IN_PROGRESS → PENDING
  const skillOrder = { COMPLETED: 0, IN_PROGRESS: 1, PENDING: 2 };
  const sortedSkills = (summary?.allSkills || [])
    .slice()
    .sort((a, b) => skillOrder[a.status] - skillOrder[b.status])
    .slice(0, 12);

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "#fff", margin: 0 }}>Progress Tracking</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Monitor your learning journey and celebrate milestones.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {!hasRoadmaps ? (
          /* ── Empty state ── */
          <div style={{
            border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 20,
            padding: "64px 32px", textAlign: "center",
          }}>
            <Map size={48} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 18 }}>No roadmaps yet</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 6 }}>
              Compare a job and generate your first roadmap to start tracking.
            </p>
            <Link to="/compare-job" style={{ textDecoration: "none" }}>
              <Button style={{ marginTop: 20 }}>
                Compare a Job <ArrowRight size={14} style={{ display: "inline", marginLeft: 4 }} />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Stat Cards ─────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <StatCard
                icon={CheckCircle2}
                iconColor="#4ade80"
                iconBg="rgba(74,222,128,0.18)"
                label="Skills Completed"
                value={`${summary.completedSkills}/${summary.totalSkills}`}
                sub={`${summary.overallProgress}% complete`}
                subColor="#4ade80"
              />
              <StatCard
                icon={Clock}
                iconColor="#60a5fa"
                iconBg="rgba(96,165,250,0.18)"
                label="Est. Hours Invested"
                value={`${summary.estimatedHoursInvested}h`}
                sub={`~${summary.estimatedWeeksRemaining}w remaining`}
                subColor="#60a5fa"
              />
              <StatCard
                icon={Zap}
                iconColor="#f59e0b"
                iconBg="rgba(245,158,11,0.18)"
                label="Active Roadmaps"
                value={summary.activeRoadmaps}
                sub={`${summary.totalRoadmaps} total`}
                subColor="#f59e0b"
              />
              <StatCard
                icon={Target}
                iconColor={sc.text}
                iconBg={`${sc.text}28`}
                label="Overall Score"
                value={`${summary.overallProgress}%`}
                sub={sc.label}
                subColor={sc.text}
              />
            </div>

            {/* ── Chart + Skill Progress ──────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Left: Roadmap Activity Chart */}
              <div style={{
                borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", padding: "22px 20px",
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Roadmap Activity</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
                  Skills breakdown per roadmap
                </p>
                {chartData.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                    No roadmap data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(99,102,241,0.08)" }}
                        wrapperStyle={{ outline: "none" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)", paddingTop: 8 }}
                      />
                      <Bar dataKey="Completed"   fill="#4ade80" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="In Progress" fill="#fbbf24" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Pending"     fill="#334155" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Right: Skill Progress */}
              <div style={{
                borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", padding: "22px 20px",
                overflowY: "auto", maxHeight: 340,
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Skill Progress</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 18 }}>
                  {summary.totalSkills} skill{summary.totalSkills !== 1 ? "s" : ""} across all roadmaps
                </p>
                {sortedSkills.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                    No skills yet
                  </div>
                ) : (
                  sortedSkills.map(s => (
                    <SkillRow
                      key={`${s.roadmapId}-${s.skill}`}
                      skill={s.skill}
                      status={s.status}
                      pct={SKILL_PCT[s.status] ?? 0}
                    />
                  ))
                )}
                {summary.allSkills.length > 12 && (
                  <Link to="/my-roadmap" style={{ textDecoration: "none" }}>
                    <p style={{ fontSize: 12, color: "#a5b4fc", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <Layers size={12} /> View all {summary.allSkills.length} skills on My Roadmaps
                    </p>
                  </Link>
                )}
              </div>
            </div>

            {/* ── Milestones ─────────────────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Trophy size={18} style={{ color: "#fbbf24" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>Milestones</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {MILESTONES.map(m => (
                  <MilestoneCard
                    key={m.key}
                    title={m.title}
                    description={m.description}
                    achieved={m.check(summary)}
                  />
                ))}
              </div>
            </div>

          </>
        )}
      </div>

      {/* Spin keyframe injected via style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
