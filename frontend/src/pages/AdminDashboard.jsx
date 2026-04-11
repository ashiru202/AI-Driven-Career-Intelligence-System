import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Flame,
  Search,
  Shield,
  Target,
  Users,
  FileText,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LIVE_INTERVAL_MS = 15000;
const ROLE_COLORS = ["#ef4444", "#f59e0b", "#38bdf8"];

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

function formatShortDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function agoLabel(iso) {
  if (!iso) return "-";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
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
                width: `${Math.min(100, Math.max(10, Number(value?.toString().replace("%", "")) || 10))}%`,
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

export default function AdminDashboard() {
  const statsRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [userSample, setUserSample] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedSkill, setFocusedSkill] = useState("");

  const fetchDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !statsRef.current) {
      setLoading(true);
    }

    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users?role=USER&page=1&limit=120"),
      ]);

      const nextStats = statsRes.data?.data || {};
      const users = usersRes.data?.data?.users || [];

      setPreviousStats(statsRef.current);
      setStats(nextStats);
      setUserSample(users);
      setFocusedSkill((current) => current || nextStats.topSkills?.[0]?.skill || "");
      setError("");

      statsRef.current = nextStats;
    } catch (err) {
      const message = err.response?.data?.error?.message || "Failed to load admin dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboard({ silent: true });
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const activeRate = useMemo(() => {
    if (!stats?.totalUsers) return 0;
    return Math.round((stats.activeUsers / stats.totalUsers) * 100);
  }, [stats]);

  const roleDistribution = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Job Seekers", value: Number(stats.totalUsers || 0) },
      { name: "Staff", value: Number(stats.totalStaff || 0) },
      { name: "Admins", value: Number(stats.totalAdmins || 0) },
    ];
  }, [stats]);

  const skillComparisonData = useMemo(() => {
    if (!stats) return [];

    const bucket = new Map();
    const upsert = (items, key) => {
      (items || []).forEach((item) => {
        const skillKey = String(item?.skill || "unknown").toLowerCase();
        if (!bucket.has(skillKey)) {
          bucket.set(skillKey, {
            skill: titleizeSkill(skillKey),
            demand: 0,
            gaps: 0,
            lowDemand: 0,
          });
        }
        bucket.get(skillKey)[key] = Number(item?.count || 0);
      });
    };

    upsert(stats.topSkills, "demand");
    upsert(stats.commonGaps, "gaps");
    upsert(stats.leastSkills, "lowDemand");

    return [...bucket.values()]
      .sort((a, b) => b.demand + b.gaps + b.lowDemand - (a.demand + a.gaps + a.lowDemand))
      .slice(0, 8);
  }, [stats]);

  const focusedSkillData = useMemo(() => {
    if (!focusedSkill) return null;
    return skillComparisonData.find(
      (item) => item.skill.toLowerCase() === focusedSkill.toLowerCase()
    ) || null;
  }, [focusedSkill, skillComparisonData]);

  const registrationTimeline = useMemo(() => {
    const days = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      days.push({
        key: d.toISOString().slice(0, 10),
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        signups: 0,
      });
    }

    const indexByDate = new Map(days.map((item, idx) => [item.key, idx]));
    (userSample || []).forEach((user) => {
      const key = new Date(user.createdAt).toISOString().slice(0, 10);
      if (indexByDate.has(key)) {
        const idx = indexByDate.get(key);
        days[idx].signups += 1;
      }
    });

    let running = 0;
    return days.map((item) => {
      running += item.signups;
      return {
        ...item,
        cumulative: running,
      };
    });
  }, [userSample]);

  const fourteenDaySignups = useMemo(
    () => registrationTimeline.reduce((sum, day) => sum + Number(day.signups || 0), 0),
    [registrationTimeline]
  );

  const todaySignups = registrationTimeline.length
    ? Number(registrationTimeline[registrationTimeline.length - 1].signups || 0)
    : 0;

  const yesterdaySignups = registrationTimeline.length > 1
    ? Number(registrationTimeline[registrationTimeline.length - 2].signups || 0)
    : 0;

  const signupDelta = todaySignups - yesterdaySignups;

  const signupYMax = useMemo(() => {
    const maxVal = registrationTimeline.reduce(
      (currentMax, day) => Math.max(currentMax, Number(day.signups || 0)),
      0
    );
    return Math.max(2, maxVal + 1);
  }, [registrationTimeline]);

  const getDelta = useCallback(
    (key) => {
      if (!stats || !previousStats) return null;
      const next = Number(stats[key]);
      const prev = Number(previousStats[key]);
      if (!Number.isFinite(next) || !Number.isFinite(prev)) return null;
      return Math.round((next - prev) * 10) / 10;
    },
    [previousStats, stats]
  );

  if (loading && !stats) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-sm font-semibold">Building your live admin dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (error && !stats) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-200">{error}</div>
          <Button onClick={() => fetchDashboard()} className="bg-red-600 hover:bg-red-700 text-white">
            Retry
          </Button>
        </div>
      </Layout>
    );
  }

  const metrics = [
    {
      title: "Total Job Seekers",
      value: formatNumber(stats?.totalUsers),
      subtitle: "Registered accounts",
      delta: getDelta("totalUsers"),
      Icon: Users,
      accent: "#ef4444",
    },
    {
      title: "Active Job Seekers",
      value: formatNumber(stats?.activeUsers),
      subtitle: `${activeRate}% currently active`,
      delta: getDelta("activeUsers"),
      Icon: Activity,
      accent: "#22c55e",
    },
    {
      title: "Staff Members",
      value: formatNumber(stats?.totalStaff),
      subtitle: "Operational support team",
      delta: getDelta("totalStaff"),
      Icon: Shield,
      accent: "#38bdf8",
    },
    {
      title: "Avg Match Score",
      value: `${Number(stats?.avgMatchScore || 0).toFixed(1)}%`,
      subtitle: "Across all comparisons",
      delta: getDelta("avgMatchScore"),
      Icon: Target,
      accent: "#f59e0b",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 pb-10">

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
            <p className="text-slate-400 mt-1 text-sm">Real-time platform intelligence with interactive analytics</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/admin-report">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                View Platform Report
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="relative z-10 bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-3 text-yellow-100 text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-yellow-300" />
            {error}
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                <Flame size={16} className="text-red-400" /> Skill Demand Heatmap
              </CardTitle>
              <p className="text-xs text-slate-400">Demand, gaps, and low-demand skills compared side by side</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillComparisonData} margin={{ top: 8, right: 8, left: -16, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="demand" name="In Demand" fill="#ef4444" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="gaps" name="Missing Often" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="lowDemand" name="Low Demand" fill="#38bdf8" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {skillComparisonData.map((item) => {
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
                <div className="px-6 pb-5">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">Focus: {focusedSkillData.skill}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <p className="text-red-300">Demand: {focusedSkillData.demand}</p>
                      <p className="text-amber-300">Gaps: {focusedSkillData.gaps}</p>
                      <p className="text-sky-300">Low Demand: {focusedSkillData.lowDemand}</p>
                    </div>
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
                <Users size={16} className="text-sky-300" /> User Momentum
              </CardTitle>
              <p className="text-xs text-slate-400">14-day signup trend and role distribution</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-3">
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={registrationTimeline} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis domain={[0, signupYMax]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="signups" name="New Users" stroke="#ef4444" fill="url(#signupGradient)" strokeWidth={2.2} />
                        <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>

                    {fourteenDaySignups === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs text-slate-400 bg-slate-900/70 border border-white/10 rounded-md px-3 py-1">
                          No new signups in the last 14 days
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[11px] text-slate-400">Today</p>
                      <p className="text-base font-bold text-white">{todaySignups}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[11px] text-slate-400">14-Day Total</p>
                      <p className="text-base font-bold text-white">{fourteenDaySignups}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[11px] text-slate-400">Day-over-Day</p>
                      <p className={`text-base font-bold ${signupDelta > 0 ? "text-emerald-300" : signupDelta < 0 ? "text-red-300" : "text-slate-200"}`}>
                        {signupDelta > 0 ? `+${signupDelta}` : signupDelta}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-2 flex flex-col gap-3">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                        >
                          {roleDistribution.map((entry, idx) => (
                            <Cell key={`${entry.name}-${idx}`} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1">
                    {roleDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: ROLE_COLORS[idx] }} />
                          {item.name}
                        </span>
                        <span className="text-white font-semibold">{formatNumber(item.value)}</span>
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
                <Users size={16} className="text-white" /> Recent Job Seekers
              </CardTitle>
              <p className="text-xs text-slate-400">Latest registrations and account status</p>
            </CardHeader>
            <CardContent className="pt-3">
              {userSample.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-white/10">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSample.slice(0, 10).map((user) => (
                        <tr key={user._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 font-medium text-slate-100">{user.name}</td>
                          <td className="py-3 text-slate-300">{user.email}</td>
                          <td className="py-3">
                            <Badge className={user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}>
                              {user.active ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-400">
                            {formatShortDate(user.createdAt)} <span className="text-slate-500">({agoLabel(user.createdAt)})</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No recent users found.</p>
              )}
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(14,18,33,0.9)" }}>
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-300" /> Common Skill Gaps
              </CardTitle>
              <p className="text-xs text-slate-400">Most frequently missing skills by users</p>
            </CardHeader>
            <CardContent className="pt-4 h-full flex flex-col gap-4">
              <div className="space-y-3">
                {(stats?.commonGaps || []).length > 0 ? (
                  (stats.commonGaps || []).map((item) => {
                    const max = Number(stats.commonGaps?.[0]?.count || 1);
                    const pct = Math.round((Number(item.count || 0) / max) * 100);
                    return (
                      <div key={item.skill}>
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
                  <p className="text-sm text-slate-400">No gap data available yet.</p>
                )}
              </div>

              <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 mt-auto">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Top Demand</p>
                  <div className="space-y-1 mt-2">
                    {(stats?.topSkills || []).slice(0, 3).map((item) => (
                      <div key={`top-${item.skill}`} className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 capitalize">{item.skill}</span>
                        <span className="text-red-300 font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Low Demand</p>
                  <div className="space-y-1 mt-2">
                    {(stats?.leastSkills || []).slice(0, 3).map((item) => (
                      <div key={`least-${item.skill}`} className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 capitalize">{item.skill}</span>
                        <span className="text-sky-300 font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          <Link to="/staff-management" className="h-full">
            <Card className="h-full hover:shadow-md transition-all cursor-pointer border-white/10 hover:border-sky-400/60 hover:-translate-y-0.5" style={{ background: "rgba(20,26,44,0.88)", minHeight: 170 }}>
              <CardContent className="pt-4 h-full flex flex-col justify-between">
                <p className="font-semibold text-sky-300 flex items-center gap-2"><Shield size={14} /> Staff Management</p>
                <p className="text-sm text-slate-400 mt-1" style={{ minHeight: 56 }}>Create, monitor, and manage staff accounts</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/users" className="h-full">
            <Card className="h-full hover:shadow-md transition-all cursor-pointer border-white/10 hover:border-emerald-400/60 hover:-translate-y-0.5" style={{ background: "rgba(20,26,44,0.88)", minHeight: 170 }}>
              <CardContent className="pt-4 h-full flex flex-col justify-between">
                <p className="font-semibold text-emerald-300 flex items-center gap-2"><Users size={14} /> Job Seekers</p>
                <p className="text-sm text-slate-400 mt-1" style={{ minHeight: 56 }}>Search and manage user accounts</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin-report" className="h-full">
            <Card className="h-full hover:shadow-md transition-all cursor-pointer border-white/10 hover:border-red-400/60 hover:-translate-y-0.5" style={{ background: "rgba(20,26,44,0.88)", minHeight: 170 }}>
              <CardContent className="pt-4 h-full flex flex-col justify-between">
                <p className="font-semibold text-red-300 flex items-center gap-2"><FileText size={14} /> Platform Report</p>
                <p className="text-sm text-slate-400 mt-1" style={{ minHeight: 56 }}>View and export platform-level reports</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/audit-logs" className="h-full">
            <Card className="h-full hover:shadow-md transition-all cursor-pointer border-white/10 hover:border-amber-300/60 hover:-translate-y-0.5" style={{ background: "rgba(20,26,44,0.88)", minHeight: 170 }}>
              <CardContent className="pt-4 h-full flex flex-col justify-between">
                <p className="font-semibold text-amber-200 flex items-center gap-2"><Search size={14} /> Audit Log</p>
                <p className="text-sm text-slate-400 mt-1" style={{ minHeight: 56 }}>Review admin operations and events</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}

