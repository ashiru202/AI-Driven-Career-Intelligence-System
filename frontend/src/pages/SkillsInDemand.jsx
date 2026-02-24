import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/api";

// ─── Bar style per rank ───────────────────────────────────────────────────────
const RANK_STYLE = [
  { icon: "🥇", bar: "rgba(234,179,8,0.82)",   count: "#fde047", track: "rgba(234,179,8,0.08)"   },
  { icon: "🥈", bar: "rgba(180,196,214,0.65)", count: "#cbd5e1", track: "rgba(148,163,184,0.07)" },
  { icon: "🥉", bar: "rgba(194,140,90,0.7)",   count: "#d4a06a", track: "rgba(180,120,70,0.07)"  },
];
function indigoBar(rank) {
  const a = Math.max(0.42, 0.88 - (rank - 4) * 0.04).toFixed(2);
  return `rgba(99,102,241,${a})`;
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────
function HBarChart({ skills }) {
  const maxCount = skills[0]?.count || 1;
  const gridPcts = [25, 50, 75];
  return (
    <div>
      <style>{`
        @keyframes growBar { from { width: 0% } }
        .hbar-row:hover .hbar-track { background: rgba(255,255,255,0.055) !important; }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {skills.map((item, idx) => {
          const rank = idx + 1;
          const rs   = idx < 3 ? RANK_STYLE[idx] : null;
          const barColor   = rs ? rs.bar   : indigoBar(rank);
          const countColor = rs ? rs.count : "rgba(165,180,252,0.7)";
          const pct = Math.max(2, Math.round((item.count / maxCount) * 100));
          const isTop = rank === 1;
          return (
            <div
              key={idx}
              className="hbar-row"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0",
                borderBottom: idx < skills.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
              }}
            >
              {/* Label */}
              <div style={{ width: 170, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {rs ? (
                  <span style={{ fontSize: 17, lineHeight: 1, width: 22, textAlign: "center" }}>{rs.icon}</span>
                ) : (
                  <span style={{ width: 22, textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(165,180,252,0.45)" }}>{rank}</span>
                )}
                <span style={{ fontSize: 13, fontWeight: isTop ? 700 : 500, color: isTop ? "#e0e7ff" : "rgba(241,245,249,0.72)", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.skill}>
                  {item.skill}
                </span>
              </div>
              {/* Track */}
              <div
                className="hbar-track"
                style={{ flex: 1, position: "relative", height: 32, borderRadius: 8, background: rs?.track ?? "rgba(255,255,255,0.04)", overflow: "hidden", transition: "background 0.2s" }}
              >
                {gridPcts.map(g => (
                  <div key={g} style={{ position: "absolute", left: `${g}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
                ))}
                <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: `${pct}%`, borderRadius: 6, background: `linear-gradient(90deg, ${barColor}, ${barColor.replace(/[\d.]+\)$/, "0.45)")})`, boxShadow: isTop ? `0 0 12px ${barColor.replace(/[\d.]+\)$/, "0.3)")}` : "none", animation: "growBar 0.9s cubic-bezier(0.22,1,0.36,1) both" }} />
                {pct > 18 && (
                  <span style={{ position: "absolute", left: `${pct - 2}%`, transform: "translateX(-100%)", top: "50%", marginTop: -9, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", paddingRight: 6, pointerEvents: "none" }}>
                    {item.count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis */}
      <div style={{ display: "flex", marginTop: 10, paddingLeft: 182, paddingRight: 76 }}>
        {[0, 25, 50, 75, 100].map((g, i) => (
          <div key={g} style={{ flex: i === 0 ? 0 : 1, fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center", transform: i > 0 && i < 4 ? "translateX(-50%)" : "none" }}>
            {Math.round((maxCount * g) / 100)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
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
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/analytics/skill-demand");
        setSkillDemand(res.data.data);
      } catch (err) {
        setError(
          err.response?.data?.error?.message ||
            "Failed to load skill demand data."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const topSkills = skillDemand?.top || [];
  const maxCount = topSkills[0]?.count || 1;
  const totalJobs = topSkills.reduce((s, x) => s + x.count, 0);

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            📊 Skills in Demand
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Platform-wide insights into the most sought-after skills based on
            job comparisons
          </p>
        </div>

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
            ⚠️ {error}
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
                icon="🏆"
                label="Top Skill in Demand"
                value={topSkills[0]?.skill || "—"}
                color="#6366f1"
              />
              <StatCard
                icon="🔢"
                label="Unique Skills Tracked"
                value={topSkills.length}
                color="#8b5cf6"
              />
              <StatCard
                icon="💼"
                label="Total Job Comparisons"
                value={totalJobs.toLocaleString()}
                color="#06b6d4"
              />
              <StatCard
                icon="📈"
                label="Leading Count"
                value={`${maxCount} jobs`}
                color="#10b981"
              />
            </div>

            {/* ── Horizontal bar chart ── */}
            <div
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "24px 28px",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                  Top Skills Ranking
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4, marginBottom: 0 }}>
                  Based on recurring skills across all job comparisons on the platform
                </p>
              </div>
              <HBarChart skills={topSkills} />
            </div>

            {/* ── Category breakdown (compact chips) ── */}
            <div
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  margin: "0 0 16px 0",
                }}
              >
                All Tracked Skills
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topSkills.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      borderRadius: 100,
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.18)",
                      padding: "5px 14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "rgba(199,210,254,0.85)",
                        textTransform: "capitalize",
                      }}
                    >
                      {item.skill}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(165,180,252,0.5)",
                        background: "rgba(99,102,241,0.15)",
                        borderRadius: 100,
                        padding: "1px 7px",
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
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
            <p style={{ fontSize: 48, marginBottom: 12 }}>📊</p>
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
