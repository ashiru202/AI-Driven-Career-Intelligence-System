import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  AlertTriangle,
  Download,
  Flame,
  Layers3,
  PenLine,
  RefreshCw,
  Search,
  Shield,
  Target,
  Users,
  FileText,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LIVE_INTERVAL_MS = 60000;
const MIX_COLORS = ["#ef4444", "#38bdf8", "#f59e0b", "#22c55e", "#a78bfa", "#06b6d4"];

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function titleizeSkill(skill) {
  if (!skill) return "Unknown";
  return skill
    .toString()
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

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
      <p style={{ color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((entry, idx) => (
        <p key={`${entry.name}-${idx}`} style={{ color: entry.color || "#e2e8f0", marginBottom: 2 }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function MetricCard({ title, value, subtitle, delta, Icon, accent }) {
  const hasDelta = Number.isFinite(delta) && delta !== 0;
  const deltaColor = delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#94a3b8";
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <Card
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
        boxShadow: "0 14px 35px rgba(0,0,0,0.28)",
      }}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
              {title}
            </p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: "#f8fafc" }}>
              {value}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.42)" }}>
              {subtitle}
            </p>
          </div>

          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: `${accent}26`,
              border: `1px solid ${accent}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div
            style={{
              width: "100%",
              height: 5,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(12, Number(value?.toString().replace("%", "")) || 12))}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${accent}, #ffffff22)`,
              }}
            />
          </div>

          {hasDelta && (
            <span className="ml-3 text-xs font-semibold whitespace-nowrap" style={{ color: deltaColor }}>
              {deltaText}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReport() {
  const reportRef = useRef(null);

  const [report, setReport] = useState(null);
  const [previousReport, setPreviousReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [focusedSkill, setFocusedSkill] = useState("");

  const fetchReport = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !reportRef.current) {
      setLoading(true);
    }
    if (silent) {
      setRefreshing(true);
    }

    try {
      const res = await api.get("/api/reports/summary");
      const nextReport = res.data?.data || null;

      setPreviousReport(reportRef.current);
      setReport(nextReport);
      setFocusedSkill(
        (current) => current || nextReport?.skillDemand?.top?.[0]?.skill || nextReport?.commonGaps?.[0]?.skill || ""
      );
      setError("");

      reportRef.current = nextReport;
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load platform report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetchReport({ silent: true });
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchReport]);

  const downloadPDF = async () => {
    try {
      const res = await api.get("/api/reports/summary/pdf", {
        responseType: "blob",
      });
      const contentType = res.headers?.["content-type"] || "application/pdf";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download platform report PDF", err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading && !report) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-sm font-semibold">Loading platform report intelligence...</p>
        </div>
      </Layout>
    );
  }

  if (error && !report) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-200">{error}</div>
          <Button onClick={() => fetchReport()} className="bg-red-600 hover:bg-red-700 text-white">
            Retry
          </Button>
        </div>
      </Layout>
    );
  }

  const platform = report?.platform || {};
  const topSkills = report?.skillDemand?.top || [];
  const leastSkills = report?.skillDemand?.least || [];
  const gaps = report?.commonGaps || [];

  const getDelta = (key) => {
    if (!previousReport?.platform) return null;
    const next = Number(platform[key]);
    const prev = Number(previousReport.platform[key]);
    if (!Number.isFinite(next) || !Number.isFinite(prev)) return null;
    return Math.round((next - prev) * 10) / 10;
  };

  const metrics = [
    {
      title: "Job Seekers",
      value: formatNumber(platform.totalUsers),
      subtitle: "Registered users",
      delta: getDelta("totalUsers"),
      Icon: Users,
      accent: "#ef4444",
    },
    {
      title: "Staff Members",
      value: formatNumber(platform.totalStaff),
      subtitle: "Support and operations",
      delta: getDelta("totalStaff"),
      Icon: Shield,
      accent: "#38bdf8",
    },
    {
      title: "Resumes",
      value: formatNumber(platform.totalResumes),
      subtitle: "Uploaded resumes",
      delta: getDelta("totalResumes"),
      Icon: FileText,
      accent: "#a78bfa",
    },
    {
      title: "Roadmaps",
      value: formatNumber(platform.totalRoadmaps),
      subtitle: "Career roadmaps created",
      delta: getDelta("totalRoadmaps"),
      Icon: Layers3,
      accent: "#22c55e",
    },
    {
      title: "Comparisons",
      value: formatNumber(platform.totalComparisons),
      subtitle: "Job vs resume checks",
      delta: getDelta("totalComparisons"),
      Icon: Search,
      accent: "#f59e0b",
    },
    {
      title: "Avg Match",
      value: `${Number(platform.avgMatchScore || 0).toFixed(1)}%`,
      subtitle: "Across all comparisons",
      delta: getDelta("avgMatchScore"),
      Icon: Target,
      accent: "#fb7185",
    },
  ];

  const skillMatrixData = (() => {
    const bucket = new Map();

    const upsert = (items, key) => {
      (items || []).forEach((item) => {
        const id = String(item?.skill || "unknown").toLowerCase();
        if (!bucket.has(id)) {
          bucket.set(id, {
            skill: titleizeSkill(id),
            demand: 0,
            gaps: 0,
            lowDemand: 0,
          });
        }
        bucket.get(id)[key] = Number(item?.count || 0);
      });
    };

    upsert(topSkills, "demand");
    upsert(gaps, "gaps");
    upsert(leastSkills, "lowDemand");

    return [...bucket.values()]
      .sort((a, b) => b.demand + b.gaps + b.lowDemand - (a.demand + a.gaps + a.lowDemand))
      .slice(0, 10);
  })();

  const focusedSkillData = !focusedSkill
    ? null
    : skillMatrixData.find((item) => item.skill.toLowerCase() === focusedSkill.toLowerCase()) || null;

  const resourceMixData = [
    { name: "Resumes", value: Number(platform.totalResumes || 0) },
    { name: "Roadmaps", value: Number(platform.totalRoadmaps || 0) },
    { name: "Comparisons", value: Number(platform.totalComparisons || 0) },
    { name: "Users", value: Number(platform.totalUsers || 0) },
    { name: "Staff", value: Number(platform.totalStaff || 0) },
    { name: "Admins", value: Number(platform.totalAdmins || 0) },
  ];

  const scoreHealthData = [
    { label: "Avg Match Score", value: Number(platform.avgMatchScore || 0), color: "#22c55e", Icon: Target },
    { label: "Avg CV Completeness", value: Number(platform.avgCvCompleteness || 0), color: "#f59e0b", Icon: PenLine },
  ];

  const gapMax = Number(gaps?.[0]?.count || 1);

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Platform Reports</h2>
            <p className="text-slate-400 mt-1 text-sm">Interactive, real-time insights across users, skills, and outcomes</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => fetchReport({ silent: true })}
              disabled={refreshing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw size={14} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>

            <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download size={14} className="mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="relative z-10 bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-3 text-yellow-100 text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-yellow-300" />
            {error}
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))",
            }}
          >
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame size={16} className="text-red-400" /> Skill Intelligence Matrix
              </CardTitle>
              <p className="text-xs text-slate-400">Demand, common gaps, and low-demand skills in one view</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillMatrixData} margin={{ top: 8, right: 8, left: -16, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="demand" name="In Demand" fill="#ef4444" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="gaps" name="Missing Often" fill="#f59e0b" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="lowDemand" name="Low Demand" fill="#38bdf8" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {skillMatrixData.map((item) => {
                  const active = focusedSkill.toLowerCase() === item.skill.toLowerCase();
                  return (
                    <button
                      key={item.skill}
                      onClick={() => setFocusedSkill(item.skill)}
                      style={{
                        borderRadius: 999,
                        padding: "5px 12px",
                        border: active ? "1px solid rgba(239,68,68,0.7)" : "1px solid rgba(255,255,255,0.16)",
                        background: active ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                        color: active ? "#fca5a5" : "#cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {item.skill}
                    </button>
                  );
                })}
              </div>

              {focusedSkillData && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">Focus: {focusedSkillData.skill}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <p className="text-red-300">Demand: {focusedSkillData.demand}</p>
                    <p className="text-amber-300">Gaps: {focusedSkillData.gaps}</p>
                    <p className="text-sky-300">Low Demand: {focusedSkillData.lowDemand}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))",
            }}
          >
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers3 size={16} className="text-sky-300" /> Platform Mix and Health
              </CardTitle>
              <p className="text-xs text-slate-400">Workload distribution and quality indicators</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resourceMixData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={84}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {resourceMixData.map((entry, idx) => (
                          <Cell key={`${entry.name}-${idx}`} fill={MIX_COLORS[idx % MIX_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="xl:col-span-3 flex flex-col gap-4">
                  <div className="space-y-2">
                    {resourceMixData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: MIX_COLORS[idx] }} />
                          {item.name}
                        </span>
                        <span className="text-white font-semibold">{formatNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {scoreHealthData.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-300 flex items-center gap-1">
                            <item.Icon size={12} /> {item.label}
                          </p>
                          <span className="text-xs font-semibold" style={{ color: item.color }}>
                            {item.value}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, item.value))}%`, background: `linear-gradient(90deg, ${item.color}, #ffffff22)` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          <Card
            className="xl:col-span-2 h-full"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(14,18,33,0.9)" }}
          >
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame size={16} className="text-red-300" /> Top and Least Demanded Skills
              </CardTitle>
              <p className="text-xs text-slate-400">Market demand polarity across the platform</p>
            </CardHeader>

            <CardContent className="pt-4 h-full grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-red-300 mb-3">Top In-Demand</p>
                <div className="space-y-3">
                  {topSkills.length > 0 ? (
                    topSkills.slice(0, 8).map((item, idx) => {
                      const max = Number(topSkills[0]?.count || 1);
                      const pct = Math.round((Number(item.count || 0) / max) * 100);
                      return (
                        <div key={`top-${item.skill}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-slate-100 capitalize">{idx + 1}. {item.skill}</p>
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">{item.count}</Badge>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #ef4444, #fb7185)" }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400">No demand data yet.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-sky-300 mb-3">Least Demanded</p>
                <div className="space-y-3">
                  {leastSkills.length > 0 ? (
                    leastSkills.slice(0, 8).map((item, idx) => {
                      const max = Number(leastSkills[0]?.count || 1);
                      const pct = Math.round((Number(item.count || 0) / max) * 100);
                      return (
                        <div key={`least-${item.skill}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-slate-100 capitalize">{idx + 1}. {item.skill}</p>
                            <Badge className="bg-gray-100 text-gray-700 border-0 text-xs">{item.count}</Badge>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #38bdf8, #60a5fa)" }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400">No low-demand data yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(14,18,33,0.9)" }}>
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-300" /> Common Skill Gaps
              </CardTitle>
              <p className="text-xs text-slate-400">Most frequently missing skills by users</p>
            </CardHeader>

            <CardContent className="pt-4 h-full flex flex-col gap-4">
              <div className="space-y-3">
                {gaps.length > 0 ? (
                  gaps.slice(0, 8).map((item) => {
                    const pct = Math.round((Number(item.count || 0) / gapMax) * 100);
                    return (
                      <div key={`gap-${item.skill}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-slate-100 capitalize">{item.skill}</p>
                          <span className="text-xs text-amber-300 font-semibold">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400">No significant skill gaps detected.</p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
