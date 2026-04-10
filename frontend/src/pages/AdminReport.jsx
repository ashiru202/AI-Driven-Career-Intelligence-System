import { useEffect, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Users, Shield, FileText, Map, Search, Settings,
  Target, PenLine, Flame, TrendingDown, AlertTriangle,
  Inbox, CheckCircle2,
} from "lucide-react";

// Mini progress bar used throughout the page
function Bar({ pct, colorClass }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full ${colorClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function AdminReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/reports/summary");
      setReport(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load platform report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

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

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-sm font-medium">Loading user reports…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertTriangle size={48} className="text-yellow-500" />
          <p className="text-red-600 font-semibold">{error}</p>
          <Button onClick={() => fetchReport()}>Try Again</Button>
        </div>
      </Layout>
    );
  }

  const p = report.platform;
  const topMax = report.skillDemand?.top?.[0]?.count || 1;
  const leastMax = report.skillDemand?.least?.[0]?.count || 1;
  const gapMax = report.commonGaps?.[0]?.count || 1;

  const kpiStats = [
    { label: "Total Job Seekers", value: p.totalUsers,        Icon: Users,    color: "text-blue-600",   ring: "ring-blue-100",   bg: "bg-blue-50"   },
    { label: "Staff Members",     value: p.totalStaff,        Icon: Shield,   color: "text-purple-600", ring: "ring-purple-100", bg: "bg-purple-50" },
    { label: "Resumes Uploaded",  value: p.totalResumes,      Icon: FileText, color: "text-indigo-600", ring: "ring-indigo-100", bg: "bg-indigo-50" },
    { label: "Roadmaps Created",  value: p.totalRoadmaps,     Icon: Map,      color: "text-teal-600",   ring: "ring-teal-100",   bg: "bg-teal-50"   },
    { label: "Job Comparisons",   value: p.totalComparisons,  Icon: Search,   color: "text-orange-600", ring: "ring-orange-100", bg: "bg-orange-50" },
    { label: "Admins",            value: p.totalAdmins,       Icon: Settings, color: "text-gray-600",   ring: "ring-gray-100",   bg: "bg-gray-50"   },
  ];

  return (
    <Layout>
      <div className="space-y-8 pb-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Platform Reports</h2>
            <p className="text-slate-400 mt-1 text-sm">Platform-wide insights across all users &amp; activity</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Last updated: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => fetchReport(true)}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
              Download PDF
            </Button>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiStats.map((s) => (
            <Card key={s.label} className={`ring-1 ${s.ring} border-0 ${s.bg}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <s.Icon size={20} className={s.color} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Score Health ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-green-100 bg-green-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Avg Match Score</p>
                  <p className="text-4xl font-extrabold text-green-700 mt-1">{p.avgMatchScore}%</p>
                </div>
                <Target size={36} className="text-green-500" />
              </div>
              <Bar pct={p.avgMatchScore} colorClass="bg-green-500" />
              <p className="text-xs text-green-600 mt-2">How well users match job requirements on average</p>
            </CardContent>
          </Card>

          <Card className="border border-yellow-100 bg-yellow-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Avg CV Completeness</p>
                  <p className="text-4xl font-extrabold text-yellow-700 mt-1">{p.avgCvCompleteness}%</p>
                </div>
                <PenLine size={36} className="text-yellow-500" />
              </div>
              <Bar pct={p.avgCvCompleteness} colorClass="bg-yellow-500" />
              <p className="text-xs text-yellow-600 mt-2">Average completeness of user resumes across the platform</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Skill Demand ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Skills */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base flex items-center gap-2"><Flame size={16} className="text-orange-500" /> Top In-Demand Skills</CardTitle>
              <p className="text-xs text-gray-400">Skills most sought after by job postings</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {report.skillDemand?.top?.length > 0 ? (
                report.skillDemand.top.map((item, i) => (
                  <div key={item.skill} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-bold w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize text-gray-700 truncate">{item.skill}</span>
                        <Badge className="ml-2 shrink-0 bg-blue-100 text-blue-700 border-0 text-xs">{item.count}</Badge>
                      </div>
                      <Bar pct={(item.count / topMax) * 100} colorClass="bg-blue-500" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <Inbox size={30} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-sm">No skill demand data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Least Demanded */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base flex items-center gap-2"><TrendingDown size={16} className="text-gray-500" /> Least Demanded Skills</CardTitle>
              <p className="text-xs text-gray-400">Skills with lower market demand</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {report.skillDemand?.least?.length > 0 ? (
                report.skillDemand.least.map((item, i) => (
                  <div key={item.skill} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-bold w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize text-gray-700 truncate">{item.skill}</span>
                        <Badge className="ml-2 shrink-0 bg-gray-100 text-gray-600 border-0 text-xs">{item.count}</Badge>
                      </div>
                      <Bar pct={(item.count / leastMax) * 100} colorClass="bg-gray-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <Inbox size={30} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-sm">No data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Skill Gaps ── */}
        <Card>
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-500" /> Most Common Skill Gaps</CardTitle>
            <p className="text-xs text-gray-400">Skills that users are most frequently missing</p>
          </CardHeader>
          <CardContent className="pt-5">
            {report.commonGaps?.length > 0 ? (
              <div className="space-y-3">
                {report.commonGaps.map((item, i) => {
                  const pct = Math.round((item.count / gapMax) * 100);
                  const barColor = pct > 66 ? "bg-red-500" : pct > 33 ? "bg-orange-400" : "bg-yellow-400";
                  const badgeClass = pct > 66
                    ? "bg-red-100 text-red-700"
                    : pct > 33
                    ? "bg-orange-100 text-orange-700"
                    : "bg-yellow-100 text-yellow-700";
                  return (
                    <div key={item.skill} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-bold w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize text-gray-700 truncate">{item.skill}</span>
                          <Badge className={`ml-2 shrink-0 border-0 text-xs ${badgeClass}`}>
                            {item.count} users missing
                          </Badge>
                        </div>
                        <Bar pct={pct} colorClass={barColor} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">No significant skill gaps detected</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
