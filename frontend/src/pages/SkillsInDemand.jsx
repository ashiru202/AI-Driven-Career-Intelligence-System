import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import { Trophy, Hash, Briefcase, TrendingUp, AlertTriangle, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function titleizeSkill(skill) {
  if (!skill) return "Unknown";
  return String(skill)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SkillDemandTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload;
  const accent = payload[0]?.color || "#86efac";
  return (
    <div
      style={{
        background: "rgba(10, 13, 24, 0.96)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: "9px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#e2e8f0", marginBottom: 6, fontWeight: 700 }}>{row?.skillLabel || "Skill"}</p>
      <p style={{ color: accent, margin: 0 }}>
        Demand Count: <strong>{payload[0]?.value ?? 0}</strong>
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ Icon, label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}22`,
          border: `1.5px solid ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          {value}
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, marginTop: 2 }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SkillsInDemand() {
  const [skillDemand, setSkillDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSkill, setActiveSkill] = useState("");
  const [hoveredSkill, setHoveredSkill] = useState("");

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get("/api/analytics/skill-demand");
      const next = res.data.data || { top: [], least: [] };
      setSkillDemand(next);
      setActiveSkill((prev) => (next.top?.some((row) => row.skill === prev) ? prev : ""));
      setHoveredSkill("");
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Failed to load skill demand data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second polling for real-time updates
  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const topSkills = skillDemand?.top || [];
  const maxCount = topSkills[0]?.count || 1;
  const totalMentions = topSkills.reduce((s, x) => s + Number(x.count || 0), 0);

  const chartRows = topSkills.slice(0, 10).map((item) => {
    const skillLabel = titleizeSkill(item.skill);
    return {
      skill: item.skill,
      skillLabel,
      shortLabel: skillLabel.length > 14 ? `${skillLabel.slice(0, 12)}...` : skillLabel,
      count: Number(item.count || 0),
    };
  });

  const selectedRow = chartRows.find((row) => row.skill === activeSkill) || null;

  // Time since last update
  const timeSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000)
    : null;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 className="text-3xl font-bold text-white">Skills in Demand</h2>
            <p className="text-slate-400 mt-1 text-sm">
              Platform-wide insights into the most sought-after skills based on
              job comparisons
              {timeSinceUpdate !== null && (
                <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                  • Updated {timeSinceUpdate < 5 ? "just now" : timeSinceUpdate < 60 ? `${timeSinceUpdate}s ago` : `${Math.floor(timeSinceUpdate / 60)}m ago`}
                </span>
              )}
            </p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── Loading ── */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "80px 0",
              color: "rgba(255,255,255,0.4)",
              fontSize: 14,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                border: "2.5px solid #6366f1",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Loading skill demand data…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div
            style={{
              borderRadius: 14,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              padding: "20px 24px",
              color: "#fca5a5",
              fontSize: 14,
            }}
          >
            <AlertTriangle size={16} className="inline mr-1" /> {error}
          </div>
        )}

        {/* ── Stats row ── */}
        {!loading && !error && topSkills.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <StatCard
                Icon={Trophy}
                label="Top Skill in Demand"
                value={topSkills[0]?.skill || "—"}
                color="#6366f1"
              />
              <StatCard
                Icon={Hash}
                label="Unique Skills Tracked"
                value={topSkills.length}
                color="#8b5cf6"
              />
              <StatCard
                Icon={Briefcase}
                label="Total Skill Mentions"
                value={totalMentions.toLocaleString()}
                color="#06b6d4"
              />
              <StatCard
                Icon={TrendingUp}
                label="Leading Count"
                value={`${maxCount} jobs`}
                color="#10b981"
              />
            </div>

            {/* ── Skills Demand Chart ── */}
            <div
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                  Top Skills Demand
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4, marginBottom: 0 }}>
                  Interactive chart of the most in-demand skills (updates every 30s)
                </p>
              </div>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 6, right: 8, left: -16, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={55}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<SkillDemandTooltip />}
                      cursor={{ fill: "rgba(134,239,172,0.08)" }}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Demand Count"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry) => setActiveSkill((prev) => (prev === entry?.skill ? "" : entry?.skill || ""))}
                    >
                      {chartRows.map((row, idx) => {
                        const isActive = activeSkill === row.skill;
                        const isHovered = hoveredSkill === row.skill;
                        return (
                          <Cell
                            key={`${row.skill}-${idx}`}
                            fill={isActive ? "#fbbf24" : isHovered ? "#86efac" : "#4ade80"}
                            opacity={activeSkill && !isActive ? 0.55 : 1}
                            cursor="pointer"
                            onMouseEnter={() => setHoveredSkill(row.skill)}
                            onMouseLeave={() => setHoveredSkill("")}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {selectedRow && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.02)",
                    padding: "12px 14px",
                  }}
                >
                  <p style={{ margin: 0, color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>
                    Focus Skill: {selectedRow.skillLabel}
                  </p>
                  <p style={{ margin: "6px 0 0 0", color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                    Current demand mentions: {selectedRow.count}
                  </p>
                </div>
              )}
            </div>

          </>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && topSkills.length === 0 && (
          <div
            style={{
              borderRadius: 20,
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <BarChart2 size={48} className="mx-auto mb-3 text-gray-400" />
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 6,
              }}
            >
              No skill demand data yet
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                maxWidth: 380,
                margin: "0 auto",
              }}
            >
              Start comparing job descriptions to build platform-wide insights
              on the most in-demand skills.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
