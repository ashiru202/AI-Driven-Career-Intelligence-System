import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import { Trophy, Hash, Briefcase, TrendingUp, AlertTriangle, BarChart2, RefreshCw } from "lucide-react";

// ─── Bar Chart Component ──────────────────────────────────────────────────────
function BarChart({ data, isFirstRender }) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = 280;
  const chartWidth = 600;
  const barWidth = Math.min(50, (chartWidth - 80) / data.length);
  const gap = Math.min(20, barWidth * 0.4);

  return (
    <div style={{
      width: "100%",
      height: chartHeight + 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 0",
    }}>
      <svg
        width={Math.min(chartWidth, data.length * (barWidth + gap) + 80)}
        height={chartHeight + 60}
        style={{ overflow: "visible" }}
      >
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((tick, i) => {
          const y = chartHeight - (tick / 100) * chartHeight + 10;
          return (
            <text
              key={`y-${i}`}
              x="0"
              y={y}
              fill="rgba(255,255,255,0.3)"
              fontSize="11"
              textAnchor="start"
              dominantBaseline="middle"
            >
              {Math.round((tick / 100) * maxValue)}
            </text>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = 40 + idx * (barWidth + gap);
          const y = chartHeight - barHeight + 10;

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={isFirstRender ? chartHeight + 10 : y}
                width={barWidth}
                height={isFirstRender ? 0 : barHeight}
                rx="4"
                fill="#4169FF"
                style={{
                  animation: isFirstRender ? `growBarHeight-${idx} 0.8s cubic-bezier(0.22,1,0.36,1) ${idx * 0.05}s forwards` : "none",
                  transition: isFirstRender ? "none" : "height 0.5s cubic-bezier(0.22,1,0.36,1), y 0.5s cubic-bezier(0.22,1,0.36,1)",
                }}
              />

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 30}
                fill="rgba(255,255,255,0.4)"
                fontSize="12"
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label}
              </text>

              {/* Value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                fill="rgba(255,255,255,0.6)"
                fontSize="11"
                textAnchor="middle"
                fontWeight="600"
                style={{
                  opacity: isFirstRender ? 0 : 1,
                  animation: isFirstRender ? `fadeIn 0.3s ease-out ${idx * 0.05 + 0.6}s forwards` : "none",
                }}
              >
                {item.value}
              </text>
            </g>
          );
        })}

        <style>{`
          ${data.map((_, idx) => `
            @keyframes growBarHeight-${idx} {
              from {
                height: 0;
                y: ${chartHeight + 10};
              }
              to {
                height: ${(data[idx].value / maxValue) * chartHeight}px;
                y: ${chartHeight - (data[idx].value / maxValue) * chartHeight + 10}px;
              }
            }
          `).join('')}
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </svg>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isFirstRender = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get("/api/analytics/skill-demand");
      setSkillDemand(res.data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Failed to load skill demand data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (isFirstRender.current) isFirstRender.current = false;
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
  const totalJobs = topSkills.reduce((s, x) => s + x.count, 0);

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
          {!loading && (
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                background: refreshing ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc",
                fontSize: 13,
                fontWeight: 600,
                cursor: refreshing ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: refreshing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.background = "rgba(99,102,241,0.2)";
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
              }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
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
                label="Total Job Comparisons"
                value={totalJobs.toLocaleString()}
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
                padding: "24px 28px",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                  Top Skills Demand
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4, marginBottom: 0 }}>
                  Visual representation of the most in-demand skills
                </p>
              </div>

              <BarChart
                data={topSkills.slice(0, 10).map(item => ({
                  label: item.skill.length > 10 ? item.skill.substring(0, 10) + '...' : item.skill,
                  value: item.count,
                }))}
                isFirstRender={isFirstRender.current}
              />
            </div>

            {/* ── Top Skills Ranking ── */}
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
                  Detailed Rankings
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4, marginBottom: 0 }}>
                  Complete breakdown of all tracked skills
                </p>
              </div>

              {/* Skills List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topSkills.map((item, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: isTop3 ? "rgba(65,105,255,0.08)" : "rgba(255,255,255,0.02)",
                        border: isTop3 ? "1px solid rgba(65,105,255,0.2)" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      {/* Rank */}
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isTop3 ? "rgba(65,105,255,0.15)" : "rgba(255,255,255,0.04)",
                        border: isTop3 ? "1.5px solid rgba(65,105,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {isTop3 ? (
                          <Trophy size={16} style={{ color: rank === 1 ? "#fbbf24" : rank === 2 ? "#cbd5e1" : "#d4a06a" }} />
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Skill Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: rank === 1 ? 700 : 500,
                          color: rank === 1 ? "#e0e7ff" : "rgba(241,245,249,0.85)",
                          textTransform: "capitalize",
                        }}>
                          {item.skill}
                        </span>
                      </div>

                      {/* Count Badge */}
                      <span style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        background: isTop3 ? "rgba(65,105,255,0.2)" : "rgba(255,255,255,0.08)",
                        border: isTop3 ? "1px solid rgba(65,105,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                        color: isTop3 ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                        padding: "4px 12px",
                        borderRadius: 9999,
                      }}>
                        {item.count} jobs
                      </span>
                    </div>
                  );
                })}
              </div>
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
