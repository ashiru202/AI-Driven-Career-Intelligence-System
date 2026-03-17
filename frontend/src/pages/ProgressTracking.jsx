import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import api from "../api/api";
import {
  CheckCircle2,
  Clock,
  Layers,
  Map,
  ArrowRight,
  TrendingUp,
  Loader2,
  Circle,
  PlayCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function progressColor(p) {
  if (p >= 70) return { stroke: "#4ade80", text: "text-green-400", bar: "#4ade80", label: "On Track" };
  if (p >= 35) return { stroke: "#fbbf24", text: "text-yellow-400", bar: "#fbbf24", label: "In Progress" };
  return { stroke: "#6366f1", text: "text-indigo-400", bar: "#6366f1", label: "Getting Started" };
}

// ─── Overall Ring ─────────────────────────────────────────────────────────────

function OverallRing({ progress }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  const col = progressColor(progress);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 144, height: 144 }}>
        <svg width="144" height="144" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 144 144">
          <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
          <circle
            cx="72" cy="72" r={r}
            fill="none"
            stroke={col.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span className={`text-3xl font-extrabold ${col.text}`}>{progress}%</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>overall</span>
        </div>
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
        color: col.stroke,
        background: `${col.stroke}18`,
        border: `1px solid ${col.stroke}40`,
        borderRadius: 99, padding: "3px 12px",
      }}>
        {col.label}
      </span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${color}30`,
      background: `${color}0f`,
      padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: `${color}20`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Roadmap Progress Card ────────────────────────────────────────────────────

function RoadmapCard({ roadmap }) {
  const col = progressColor(roadmap.progress);
  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>{roadmap.targetRole}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
            {new Date(roadmap.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 800, color: col.stroke,
          background: `${col.stroke}18`,
          border: `1px solid ${col.stroke}40`,
          borderRadius: 99, padding: "3px 10px",
        }}>
          {roadmap.progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 6 }}>
        <div style={{
          width: `${roadmap.progress}%`,
          height: 6, borderRadius: 99,
          background: col.bar,
          transition: "width 0.7s ease",
        }} />
      </div>

      {/* Skill counts */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Chip color="#4ade80" label={`${roadmap.completedSkills} done`} />
        <Chip color="#fbbf24" label={`${roadmap.inProgressSkills} in progress`} />
        <Chip color="#94a3b8" label={`${roadmap.pendingSkills} pending`} />
        {roadmap.estimatedWeeksRemaining > 0 && (
          <Chip color="#a78bfa" label={`~${roadmap.estimatedWeeksRemaining}w left`} />
        )}
      </div>

      {/* Link */}
      <Link to="/my-roadmap" style={{ textDecoration: "none" }}>
        <button style={{
          fontSize: 12, fontWeight: 600, color: "#a5b4fc",
          background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)",
          borderRadius: 8, padding: "6px 14px",
          cursor: "pointer", transition: "background 0.15s",
          display: "flex", alignItems: "center", gap: 5,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
        >
          View roadmap <ArrowRight size={12} />
        </button>
      </Link>
    </div>
  );
}

function Chip({ color, label }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color, background: `${color}18`,
      border: `1px solid ${color}35`,
      borderRadius: 99, padding: "2px 9px",
    }}>
      {label}
    </span>
  );
}

// ─── Recently Completed ───────────────────────────────────────────────────────

function CompletedSkillRow({ item, index }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0",
      borderBottom: index !== undefined ? "1px solid rgba(255,255,255,0.05)" : "none",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(74,222,128,0.15)",
        border: "1px solid rgba(74,222,128,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <CheckCircle2 size={15} color="#4ade80" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>{item.skill}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{item.roadmapTitle}</p>
      </div>
    </div>
  );
}

// ─── Status Distribution Bar ──────────────────────────────────────────────────

function DistributionBar({ completed, inProgress, pending }) {
  const total = completed + inProgress + pending;
  if (!total) return null;
  const cPct = pct(completed, total);
  const iPct = pct(inProgress, total);
  const pPct = 100 - cPct - iPct;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height: 10 }}>
        {cPct > 0 && <div style={{ width: `${cPct}%`, background: "#4ade80", transition: "width 0.7s" }} />}
        {iPct > 0 && <div style={{ width: `${iPct}%`, background: "#fbbf24", transition: "width 0.7s" }} />}
        {pPct > 0 && <div style={{ width: `${pPct}%`, background: "rgba(100,116,139,0.5)", transition: "width 0.7s" }} />}
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <LegendItem color="#4ade80" label="Completed" pct={cPct} />
        <LegendItem color="#fbbf24" label="In Progress" pct={iPct} />
        <LegendItem color="#64748b" label="Pending" pct={pPct} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, pct: p }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{p}%</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressTracking() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/roadmaps-new/summary")
      .then(r => setSummary(r.data.data))
      .catch(err => setError(err.response?.data?.error?.message || "Failed to load progress"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading your progress…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
          <p className="text-red-400 font-semibold">Failed to load progress</p>
          <p className="text-red-400/70 text-sm mt-1">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  const hasRoadmaps = summary && summary.totalRoadmaps > 0;

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <h2 className="text-3xl font-bold text-white">Progress Tracking</h2>
          <p className="text-slate-400 mt-1 text-sm">
            A snapshot of your learning journey across all roadmaps.
          </p>
        </div>

        {!hasRoadmaps ? (
          /* ── Empty state ── */
          <div style={{
            border: "2px dashed rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "64px 32px",
            textAlign: "center",
          }}>
            <Map size={44} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
            <p style={{ color: "rgba(255,255,255,0.65)", fontWeight: 700, fontSize: 17 }}>
              No roadmaps yet
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 6 }}>
              Compare a job and generate your first roadmap to start tracking progress.
            </p>
            <Link to="/compare-job" style={{ textDecoration: "none" }}>
              <Button className="mt-6">
                Compare a Job <ArrowRight size={14} className="inline ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Hero: ring + stats ── */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={18} /> Overall Progress
                </CardTitle>
                <CardDescription>
                  Across {summary.totalRoadmaps} roadmap{summary.totalRoadmaps !== 1 ? "s" : ""} ·{" "}
                  {summary.totalSkills} total skill{summary.totalSkills !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center" }}>
                  <OverallRing progress={summary.overallProgress} />
                  <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                    <DistributionBar
                      completed={summary.completedSkills}
                      inProgress={summary.inProgressSkills}
                      pending={summary.pendingSkills}
                    />
                    {summary.estimatedWeeksRemaining > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Clock size={14} color="#a78bfa" />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                          Est.{" "}
                          <span style={{ color: "#c4b5fd", fontWeight: 700 }}>
                            {summary.estimatedWeeksRemaining} week{summary.estimatedWeeksRemaining !== 1 ? "s" : ""}
                          </span>{" "}
                          remaining across all roadmaps
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Layers}       label="Total Skills"    value={summary.totalSkills}       color="#6366f1" />
              <StatCard icon={CheckCircle2} label="Completed"       value={summary.completedSkills}   color="#4ade80" />
              <StatCard icon={PlayCircle}   label="In Progress"     value={summary.inProgressSkills}  color="#fbbf24" />
              <StatCard icon={Circle}       label="Pending"         value={summary.pendingSkills}     color="#64748b" />
            </div>

            {/* ── Per-Roadmap Breakdown ── */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 14 }}>
                Roadmap Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {summary.roadmaps.map(r => (
                  <RoadmapCard key={r.id} roadmap={r} />
                ))}
              </div>
            </section>

            {/* ── Recently Completed Skills ── */}
            {summary.recentlyCompleted.length > 0 && (
              <section>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-400" />
                      Completed Skills
                    </CardTitle>
                    <CardDescription>
                      {summary.recentlyCompleted.length} skill{summary.recentlyCompleted.length !== 1 ? "s" : ""} marked as done
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      {summary.recentlyCompleted.map((item, i) => (
                        <CompletedSkillRow
                          key={`${item.roadmapId}-${item.skill}`}
                          item={item}
                          index={i < summary.recentlyCompleted.length - 1 ? i : undefined}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
