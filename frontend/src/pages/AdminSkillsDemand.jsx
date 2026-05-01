import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Briefcase, Database, RefreshCw, TrendingDown, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function titleizeSkill(skill) {
  if (!skill) return "Unknown";
  return String(skill)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  return `${(numeric * 100).toFixed(numeric >= 0.01 ? 1 : 2)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function DemandTable({ rows, metricLabel, metricKey, metricFormatter }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.08em] text-white/45">
          <tr>
            <th className="px-4 py-3">Skill</th>
            <th className="px-4 py-3">{metricLabel}</th>
            <th className="px-4 py-3">Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.skill}-${idx}`} className="border-t border-white/5">
              <td className="px-4 py-3 font-medium text-white/85">{titleizeSkill(row.skill)}</td>
              <td className="px-4 py-3 text-white/65">{metricFormatter(row[metricKey])}</td>
              <td className="px-4 py-3 text-white/45">#{idx + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemandChart({ rows, metricKey, color }) {
  const chartRows = rows.slice(0, 10).map((row) => ({
    skill: titleizeSkill(row.skill),
    shortLabel: titleizeSkill(row.skill).length > 14 ? `${titleizeSkill(row.skill).slice(0, 12)}...` : titleizeSkill(row.skill),
    value: Number(row[metricKey] || 0),
  }));

  if (chartRows.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No data available yet.</p>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartRows} margin={{ top: 8, right: 8, left: -14, bottom: 34 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="shortLabel"
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={58}
          />
          <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            contentStyle={{
              background: "rgba(10,13,24,0.96)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 10,
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminSkillsDemand() {
  const [activeTab, setActiveTab] = useState("platform");
  const [marketScope, setMarketScope] = useState("combined");
  const [platformDemand, setPlatformDemand] = useState({ top: [], least: [] });
  const [industryDemand, setIndustryDemand] = useState({ top: [], least: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDemand = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [platformRes, industryRes] = await Promise.all([
        api.get("/api/analytics/skill-demand"),
        api.get("/api/trends/top-least", { params: { marketScope, limit: 10 } }),
      ]);
      setPlatformDemand(platformRes.data.data || { top: [], least: [] });
      setIndustryDemand(industryRes.data.data || { top: [], least: [] });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load demand insights");
    } finally {
      setLoading(false);
    }
  }, [marketScope]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  const view = useMemo(() => {
    if (activeTab === "industry") {
      return {
        title: "Industry Demand",
        description: "Latest scraped job-market snapshot from the trends module.",
        icon: Database,
        top: industryDemand.top || [],
        least: industryDemand.least || [],
        metricLabel: "Relative Frequency",
        metricKey: "relativeFreq",
        metricFormatter: formatPercent,
        color: "#38bdf8",
      };
    }

    return {
      title: "Platform Demand",
      description: "Demand inferred from user job comparisons and legacy roadmaps.",
      icon: Briefcase,
      top: platformDemand.top || [],
      least: platformDemand.least || [],
      metricLabel: "Mentions",
      metricKey: "count",
      metricFormatter: (value) => Number(value || 0).toLocaleString(),
      color: "#4ade80",
    };
  }, [activeTab, industryDemand, platformDemand]);

  const Icon = view.icon;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Skills Demand</h2>
            <p className="mt-1 text-sm text-slate-400">
              Compare platform behavior with external industry demand from the forecasting module.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={marketScope}
              onChange={(e) => setMarketScope(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="combined">Combined</option>
              <option value="global">Global</option>
              <option value="local-lk">Local LK</option>
            </select>
            <Button onClick={fetchDemand} disabled={loading} className="bg-white/10 text-white hover:bg-white/20">
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
          {[
            { key: "platform", label: "Platform Demand", Icon: Briefcase },
            { key: "industry", label: "Industry Demand", Icon: Database },
          ].map(({ key, label, Icon: TabIcon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                activeTab === key
                  ? "border-indigo-300/40 bg-indigo-500/20 text-indigo-100"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]"
              }`}
            >
              <TabIcon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-[#101827]">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-400/10 text-indigo-200">
                <Icon size={22} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{view.top.length}</p>
                <p className="text-xs text-white/45">Top skills loaded</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#101827]">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                <Trophy size={22} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{titleizeSkill(view.top[0]?.skill || "-")}</p>
                <p className="text-xs text-white/45">Highest demand</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#101827]">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
                <TrendingDown size={22} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{titleizeSkill(view.least[0]?.skill || "-")}</p>
                <p className="text-xs text-white/45">Least demand</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-[#0f1726]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex flex-col gap-1 text-white">
              <span className="flex items-center gap-2">
                <BarChart3 size={18} /> {view.title}
              </span>
              <span className="text-xs font-normal text-white/45">
                {view.description}
                {activeTab === "industry" && industryDemand.periodStart && (
                  <> Snapshot: {formatDate(industryDemand.periodStart)} to {formatDate(industryDemand.periodEnd)}</>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading demand insights...</p>
            ) : (
              <>
                <DemandChart rows={view.top} metricKey={view.metricKey} color={view.color} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">
                      Highest Demand
                    </h3>
                    <DemandTable
                      rows={view.top}
                      metricLabel={view.metricLabel}
                      metricKey={view.metricKey}
                      metricFormatter={view.metricFormatter}
                    />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-200">
                      Least Demand
                    </h3>
                    <DemandTable
                      rows={view.least}
                      metricLabel={view.metricLabel}
                      metricKey={view.metricKey}
                      metricFormatter={view.metricFormatter}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
