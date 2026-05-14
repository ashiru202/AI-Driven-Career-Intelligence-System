import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  Database,
  FileText,
  RefreshCw,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api";
import Layout from "../components/Layout";
import { useSSE } from "../context/SSEContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function titleizeSkill(skill) {
  if (!skill) return "Unknown";
  return String(skill)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDemandMetric(row, source) {
  if (source === "industry") {
    return `${(Number(row.relativeFreq || row.demandMetric || 0) * 100).toFixed(1)}%`;
  }
  return formatNumber(row.demandMetric);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shortSkill(skill) {
  const label = titleizeSkill(skill);
  return label.length > 24 ? `${label.slice(0, 22)}...` : label;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#090f1d] px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1 font-semibold text-white/80">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

function contextCopy(source, period) {
  const sourceText = source === "industry"
    ? "Job market demand"
    : "Skills requested inside this platform";
  const periodText = period === "weekly" ? "last 7 days of CV uploads" : "last 30 days of CV uploads";
  return `${sourceText} compared with ${periodText}.`;
}

function MetricTile({ label, value, Icon, tone }) {
  return (
    <Card className="border-white/10 bg-[#101827]">
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/45">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-indigo-300/40 bg-indigo-500/20 text-indigo-100"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

function SupplyTable({ title, rows, source, icon: Icon }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
        <Icon size={16} /> {title}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.08em] text-white/45">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Demand</th>
              <th className="px-4 py-3">CV Uploads</th>
              <th className="px-4 py-3">Users</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={`${row.demandGroup}-${row.skill}`} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white/45">#{row.demandRank}</td>
                  <td className="px-4 py-3 font-medium text-white/85">{titleizeSkill(row.displaySkill || row.skill)}</td>
                  <td className="px-4 py-3 text-white/65">{formatDemandMetric(row, source)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-200">{formatNumber(row.resumeCount)}</td>
                  <td className="px-4 py-3 font-semibold text-sky-200">{formatNumber(row.userCount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-white/45" colSpan="5">
                  No demand data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminSupplyDemand() {
  const { liveNotifications } = useSSE();
  const [source, setSource] = useState("industry");
  const [period, setPeriod] = useState("weekly");
  const [marketScope, setMarketScope] = useState("global");
  const [insights, setInsights] = useState({ top: [], least: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/skills/supply-vs-demand", {
        params: { source, period, marketScope, limit: 10 },
      });
      setInsights(res.data.data || { top: [], least: [], rows: [] });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load supply and demand analytics");
    } finally {
      setLoading(false);
    }
  }, [source, period, marketScope]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    if (!liveNotifications.length) return;
    const shouldRefresh = liveNotifications.some((notification) => {
      const id = String(notification?.id || "");
      return id.startsWith("admin_analytics_") || id.startsWith("admin_resume_");
    });
    if (shouldRefresh) fetchInsights();
  }, [liveNotifications, fetchInsights]);

  const chartRows = useMemo(() => {
    return (insights.rows || []).map((row) => ({
      skill: shortSkill(row.displaySkill || row.skill),
      group: row.demandGroup === "top" ? "High demand" : "Low demand",
      cvUploads: Number(row.resumeCount || 0),
      users: Number(row.userCount || 0),
    }));
  }, [insights]);
  const activeChartRows = useMemo(() => {
    const matched = chartRows.filter((row) => row.cvUploads > 0 || row.users > 0);
    return (matched.length > 0 ? matched : chartRows).slice(0, 10);
  }, [chartRows]);

  const totals = useMemo(() => {
    const rows = insights.rows || [];
    const topResumeCount = (insights.top || []).reduce((sum, row) => sum + Number(row.resumeCount || 0), 0);
    const leastResumeCount = (insights.least || []).reduce((sum, row) => sum + Number(row.resumeCount || 0), 0);
    return {
      skills: rows.length,
      cvUploads: rows.reduce((sum, row) => sum + Number(row.resumeCount || 0), 0),
      users: rows.reduce((sum, row) => sum + Number(row.userCount || 0), 0),
      topResumeCount,
      leastResumeCount,
    };
  }, [insights]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Supply vs Demand</h2>
            <p className="mt-1 text-sm text-slate-400">
              CV uploads mapped against highest and least demanded skills.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={marketScope}
              onChange={(e) => setMarketScope(e.target.value)}
              disabled={source !== "industry"}
              className="rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 disabled:opacity-45"
            >
              <option value="global">Global / Remote</option>
              <option value="local-lk">Sri Lanka</option>
            </select>
            <Button onClick={fetchInsights} disabled={loading} className="bg-white/10 text-white hover:bg-white/20">
              <RefreshCw size={15} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <SegmentButton active={source === "industry"} onClick={() => setSource("industry")}>
            <Database size={16} /> Job Market
          </SegmentButton>
          <SegmentButton active={source === "platform"} onClick={() => setSource("platform")}>
            <Briefcase size={16} /> Platform Requests
          </SegmentButton>
          <SegmentButton active={period === "weekly"} onClick={() => setPeriod("weekly")}>
            <CalendarDays size={16} /> Last 7 Days
          </SegmentButton>
          <SegmentButton active={period === "monthly"} onClick={() => setPeriod("monthly")}>
            <CalendarDays size={16} /> Last 30 Days
          </SegmentButton>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Demanded skills tracked" value={formatNumber(totals.skills)} Icon={BarChart3} tone="bg-indigo-400/10 text-indigo-200" />
          <MetricTile label="Matching CV uploads" value={formatNumber(totals.cvUploads)} Icon={FileText} tone="bg-emerald-400/10 text-emerald-200" />
          <MetricTile label="Matching users" value={formatNumber(totals.users)} Icon={Users} tone="bg-sky-400/10 text-sky-200" />
          <MetricTile
            label={`${period === "weekly" ? "Weekly" : "Monthly"} CV window`}
            value={`${formatDate(insights.supplyWindow?.startDate)} - ${formatDate(insights.supplyWindow?.endDate)}`}
            Icon={CalendarDays}
            tone="bg-amber-400/10 text-amber-200"
          />
        </div>

        <Card className="border-white/10 bg-[#0f1726]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex flex-col gap-1 text-white">
              <span className="flex items-center gap-2">
                <BarChart3 size={18} /> Candidate Coverage by Skill
              </span>
              <span className="text-xs font-normal text-white/45">
                {contextCopy(source, period)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading supply and demand analytics...</p>
            ) : chartRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No matching skill analytics available yet.</p>
            ) : (
              <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-slate-300">
                Green bars count uploaded CVs that contain the skill. Blue bars count unique candidates. Empty demanded skills are kept in the tables below instead of cluttering this chart.
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartRows} layout="vertical" margin={{ top: 8, right: 28, left: 96, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={130}
                      tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="cvUploads" name="CV Uploads" fill="#34d399" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="users" name="Users" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <SupplyTable title={`Highest Demand (${formatNumber(totals.topResumeCount)} CV matches)`} rows={insights.top || []} source={source} icon={Trophy} />
          <SupplyTable title={`Least Demand (${formatNumber(totals.leastResumeCount)} CV matches)`} rows={insights.least || []} source={source} icon={TrendingDown} />
        </div>
      </div>
    </Layout>
  );
}
