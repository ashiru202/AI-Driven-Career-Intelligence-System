import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Flame,
  Map as MapIcon,
  RefreshCw,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LIVE_INTERVAL_MS = 20000;
const STATUS_COLORS = ["#22c55e", "#f59e0b"];

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function titleizeSkill(skill) {
  if (!skill) return "Unknown";
  return String(skill)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function chartTooltip({ active, payload, label }) {
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
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

function metricCard({ title, value, subtitle, Icon, accent }) {
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
      </CardContent>
    </Card>
  );
}

function UserAvatar({ name, size = 34 }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const palette = ["#0ea5e9", "#22c55e", "#f59e0b", "#f97316", "#14b8a6", "#3b82f6"];
  const bg = palette[name ? name.charCodeAt(0) % palette.length : 0];

  return (
    <div
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
    >
      {initials}
    </div>
  );
}

export default function StaffHome() {
  const [users, setUsers] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [skillDemand, setSkillDemand] = useState({ topSkills: [], bottomSkills: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const [usersRes, gapsRes, demandRes] = await Promise.all([
        api.get("/api/analytics/users?role=USER"),
        api.get("/api/analytics/common-gaps?limit=8"),
        api.get("/api/analytics/skill-demand"),
      ]);

      if (usersRes.data.ok) setUsers(usersRes.data.data.users || []);
      if (gapsRes.data.ok) setGaps(gapsRes.data.data || []);
      if (demandRes.data.ok) {
        const nextDemand = demandRes.data.data || {};
        setSkillDemand({ topSkills: nextDemand.top || [], bottomSkills: nextDemand.least || [] });
      }
      setError("");
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const staffUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.active).length;
  const inactiveUsers = Math.max(0, totalUsers - activeUsers);
  const activationRate = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const signupTrendData = useMemo(() => {
    const dayBuckets = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      dayBuckets.set(key, {
        day: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        signups: 0,
      });
    }

    users.forEach((user) => {
      if (!user.createdAt) return;
      const dayKey = new Date(user.createdAt).toISOString().slice(0, 10);
      if (dayBuckets.has(dayKey)) {
        dayBuckets.get(dayKey).signups += 1;
      }
    });

    return [...dayBuckets.values()];
  }, [users]);

  const topSkillDemandData = useMemo(
    () =>
      (skillDemand.topSkills || []).slice(0, 7).map((item) => ({
        skill: titleizeSkill(item.skill),
        count: Number(item.count || 0),
      })),
    [skillDemand]
  );

  const commonGapsData = useMemo(
    () =>
      (gaps || []).slice(0, 7).map((item) => ({
        skill: titleizeSkill(item.skill),
        count: Number(item.count || 0),
      })),
    [gaps]
  );

  const activitySplit = useMemo(
    () => [
      { name: "Active", value: activeUsers },
      { name: "Inactive", value: inactiveUsers },
    ],
    [activeUsers, inactiveUsers]
  );

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6),
    [users]
  );

  const statCards = [
    {
      title: "Total Job Seekers",
      value: formatNumber(totalUsers),
      subtitle: "Registered user profiles",
      Icon: Users,
      accent: "#38bdf8",
    },
    {
      title: "Active Accounts",
      value: formatNumber(activeUsers),
      subtitle: `${activationRate}% activity rate`,
      Icon: UserCheck,
      accent: "#22c55e",
    },
    {
      title: "Skill Gaps",
      value: formatNumber(commonGapsData.reduce((acc, item) => acc + item.count, 0)),
      subtitle: "Across top gap categories",
      Icon: AlertTriangle,
      accent: "#f59e0b",
    },
    {
      title: "Top Demand Skill",
      value: topSkillDemandData[0]?.skill || "-",
      subtitle: `${formatNumber(topSkillDemandData[0]?.count || 0)} demand mentions`,
      Icon: Flame,
      accent: "#f97316",
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div
          className="rounded-xl border border-white/10 p-10 text-center"
          style={{ background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))" }}
        >
          <p className="text-sm font-semibold text-slate-200">Building your live staff dashboard...</p>
          <p className="text-xs text-slate-400 mt-2">Loading analytics snapshots and trend visuals.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Staff Dashboard</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-2xl">
              Welcome back{staffUser.name ? `, ${staffUser.name}` : ""}. Monitor user growth, skill demand, and platform learning gaps in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.35)" }}
            >
              <Users size={13} /> {formatNumber(totalUsers)} users
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.16)", color: "#bbf7d0", border: "1px solid rgba(34,197,94,0.35)" }}
            >
              <Activity size={13} /> {activationRate}% active
            </span>
            <Button onClick={() => fetchDashboard({ silent: true })} className="bg-slate-700 hover:bg-slate-600 text-white">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((tile) => (
            <div key={tile.title}>{metricCard(tile)}</div>
          ))}
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <Card
            className="2xl:col-span-2"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Activity size={16} className="text-cyan-300" /> New Registrations (14 days)
              </CardTitle>
              <p className="text-xs text-slate-400">Daily user signup trend</p>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={chartTooltip} />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    name="Signups"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#38bdf8" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <UserCheck size={16} className="text-emerald-300" /> Activity Split
              </CardTitle>
              <p className="text-xs text-slate-400">Active vs inactive accounts</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3" style={{ minHeight: 300 }}>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activitySplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="rgba(15,23,42,0.8)"
                      strokeWidth={2}
                    >
                      {activitySplit.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={chartTooltip} />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {activitySplit.map((item, idx) => (
                  <div
                    key={item.name}
                    className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-xs text-slate-400">{item.name}</p>
                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_COLORS[idx] }} />
                      {formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Flame size={16} className="text-orange-300" /> Top Skills In Demand
              </CardTitle>
              <p className="text-xs text-slate-400">Most requested skills in current market analytics</p>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              {topSkillDemandData.length === 0 ? (
                <p className="text-sm text-slate-400">No demand data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkillDemandData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="skill"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={chartTooltip} />
                    <Bar dataKey="count" name="Demand" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Target size={16} className="text-red-300" /> Most Common Skill Gaps
              </CardTitle>
              <p className="text-xs text-slate-400">Frequent skill deficiencies among users</p>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              {commonGapsData.length === 0 ? (
                <p className="text-sm text-slate-400">No skill-gap data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commonGapsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={110}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={chartTooltip} />
                    <Bar dataKey="count" name="Gap Count" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/staff" className="h-full">
            <Card
              className="h-full transition-all hover:-translate-y-0.5"
              style={{
                border: "1px solid rgba(56,189,248,0.25)",
                borderRadius: 14,
                background: "linear-gradient(145deg, rgba(11,20,34,0.95), rgba(8,16,28,0.95))",
              }}
            >
              <CardContent className="pt-4">
                <p className="font-semibold text-sky-300 flex items-center gap-2">
                  <ClipboardList size={14} /> User Reports
                </p>
                <p className="text-sm text-slate-400 mt-1">Open profile-level CV and skill-gap diagnostics</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/all-roadmaps" className="h-full">
            <Card
              className="h-full transition-all hover:-translate-y-0.5"
              style={{
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 14,
                background: "linear-gradient(145deg, rgba(11,20,34,0.95), rgba(8,16,28,0.95))",
              }}
            >
              <CardContent className="pt-4">
                <p className="font-semibold text-emerald-300 flex items-center gap-2">
                  <MapIcon size={14} /> All Roadmaps
                </p>
                <p className="text-sm text-slate-400 mt-1">Browse and track all user learning journeys</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Users size={16} className="text-sky-300" /> Recently Registered Job Seekers
            </CardTitle>
            <p className="text-xs text-slate-400">Latest user accounts across the platform</p>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-400">No users registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-white/10 text-slate-400">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user._id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 text-white">
                          <div className="flex items-center gap-2">
                            <UserAvatar name={user.name} size={30} />
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-300">{user.email}</td>
                        <td className="py-3">
                          <Badge
                            className={
                              user.active
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                            }
                          >
                            {user.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
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
