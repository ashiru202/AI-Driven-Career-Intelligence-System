import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  Database,
  FileText,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMetric(row, source) {
  if (source === "industry") {
    return `${(Number(row.relativeFreq || row.demandMetric || 0) * 100).toFixed(1)}%`;
  }
  return formatNumber(row.demandMetric);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-[#090f1d] px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1 font-semibold text-white/80">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey === "alignmentRatePct" ? `${entry.value}%` : formatNumber(entry.value)}
        </p>
      ))}
    </div>
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

function MetricCard({ label, value, Icon, tone }) {
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

export default function AdminIndustryContribution() {
  const { liveNotifications } = useSSE();
  const [source, setSource] = useState("industry");
  const [period, setPeriod] = useState("weekly");
  const [marketScope, setMarketScope] = useState("combined");
  const [data, setData] = useState({ topSkills: [], dataPoints: [], latest: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchContribution = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/skills/alignment-timeseries", {
        params: { source, period, marketScope, limit: 10, lookback: 12 },
      });
      setData(res.data.data || { topSkills: [], dataPoints: [], latest: {} });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load industry contribution analytics");
    } finally {
      setLoading(false);
    }
  }, [source, period, marketScope]);

  useEffect(() => {
    fetchContribution();
  }, [fetchContribution]);

  useEffect(() => {
    if (!liveNotifications.length) return;
    const shouldRefresh = liveNotifications.some((notification) => {
      const id = String(notification?.id || "");
      return id.startsWith("admin_analytics_") || id.startsWith("admin_resume_");
    });
    if (shouldRefresh) fetchContribution();
  }, [liveNotifications, fetchContribution]);

  const chartRows = useMemo(() => {
    return (data.dataPoints || []).map((point) => ({
      label: `${formatDate(point.periodStart)}-${formatDate(point.periodEnd)}`,
      cvUploads: Number(point.cvUploads || 0),
      cvWithTopSkills: Number(point.cvWithTopSkills || 0),
      alignmentRatePct: Math.round(Number(point.alignmentRate || 0) * 100),
      avgTopSkillsPerCV: Number(point.avgTopSkillsPerCV || 0),
    }));
  }, [data.dataPoints]);

  const latest = data.latest || {};
  const sourceLabel = source === "industry" ? "Industry" : "Platform";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Industry Contribution</h2>
            <p className="mt-1 text-sm text-slate-400">
              Current top skills and CV alignment across weekly or monthly upload windows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={marketScope}
              onChange={(e) => setMarketScope(e.target.value)}
              disabled={source !== "industry"}
              className="rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 disabled:opacity-45"
            >
              <option value="combined">Combined</option>
              <option value="global">Global</option>
              <option value="local-lk">Local LK</option>
            </select>
            <Button onClick={fetchContribution} disabled={loading} className="bg-white/10 text-white hover:bg-white/20">
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
            <Database size={16} /> Industry
          </SegmentButton>
          <SegmentButton active={source === "platform"} onClick={() => setSource("platform")}>
            <Briefcase size={16} /> Platform
          </SegmentButton>
          <SegmentButton active={period === "weekly"} onClick={() => setPeriod("weekly")}>
            <CalendarDays size={16} /> Weekly
          </SegmentButton>
          <SegmentButton active={period === "monthly"} onClick={() => setPeriod("monthly")}>
            <CalendarDays size={16} /> Monthly
          </SegmentButton>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={`${period === "weekly" ? "Latest week" : "Latest month"} CV uploads`}
            value={formatNumber(latest.cvUploads)}
            Icon={FileText}
            tone="bg-emerald-400/10 text-emerald-200"
          />
          <MetricCard
            label="CVs with top skills"
            value={formatNumber(latest.cvWithTopSkills)}
            Icon={Target}
            tone="bg-sky-400/10 text-sky-200"
          />
          <MetricCard
            label="Alignment rate"
            value={formatPercent(latest.alignmentRate)}
            Icon={TrendingUp}
            tone="bg-indigo-400/10 text-indigo-200"
          />
          <MetricCard
            label="Avg top skills per CV"
            value={Number(latest.avgTopSkillsPerCV || 0).toFixed(2)}
            Icon={BarChart3}
            tone="bg-amber-400/10 text-amber-200"
          />
        </div>

        <Card className="border-white/10 bg-[#0f1726]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex flex-col gap-1 text-white">
              <span className="flex items-center gap-2">
                <TrendingUp size={18} /> Top Demanding Skills These Days
              </span>
              <span className="text-xs font-normal text-white/45">
                {sourceLabel} demand period: {formatDate(data.demandPeriod?.startDate)} to {formatDate(data.demandPeriod?.endDate)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading top skills...</p>
            ) : (data.topSkills || []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No current top-demand skills found.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {(data.topSkills || []).slice(0, 10).map((skill, index) => (
                  <div key={`${skill.skill}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white/40">#{index + 1}</span>
                      <span className="text-xs font-semibold text-emerald-200">{formatMetric(skill, source)}</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-white">{titleizeSkill(skill.displaySkill || skill.skill)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0f1726]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 size={18} /> Weekly/Monthly CV Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading alignment chart...</p>
            ) : chartRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No CV uploads found in this lookback window.</p>
            ) : (
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows} margin={{ top: 8, right: 10, left: -14, bottom: 44 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={64}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="cvUploads" name="CV Uploads" fill="#475569" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="left" dataKey="cvWithTopSkills" name="CVs With Top Skills" fill="#34d399" radius={[6, 6, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="alignmentRatePct"
                      name="Alignment Rate"
                      stroke="#818cf8"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
