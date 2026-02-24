import { useEffect, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

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
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/reports/summary/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Generating platform report...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </Layout>
    );
  }

  const p = report.platform;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Platform Summary Report</h2>
            <p className="text-gray-500 mt-1">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => fetchReport(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              onClick={downloadPDF}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {/* Platform Overview */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Platform Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Job Seekers", value: p.totalUsers, color: "text-blue-600" },
              { label: "Total Staff", value: p.totalStaff, color: "text-purple-600" },
              { label: "Total Resumes", value: p.totalResumes, color: "text-indigo-600" },
              { label: "Total Roadmaps", value: p.totalRoadmaps, color: "text-teal-600" },
              { label: "Total Comparisons", value: p.totalComparisons, color: "text-orange-600" },
              { label: "Avg Match Score", value: `${p.avgMatchScore}%`, color: "text-green-600" },
              { label: "Avg CV Completeness", value: `${p.avgCvCompleteness}%`, color: "text-yellow-600" },
              { label: "Total Admins", value: p.totalAdmins, color: "text-gray-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Skill Demand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🔥 Top Demanding Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {report.skillDemand?.top?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Skill</th>
                      <th className="pb-2">Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.skillDemand.top.map((item, i) => (
                      <tr key={item.skill} className="border-b last:border-0">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 font-medium capitalize">{item.skill}</td>
                        <td className="py-2">
                          <Badge className="bg-blue-100 text-blue-700">{item.count}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400">No skill demand data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📉 Least Demanding Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {report.skillDemand?.least?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Skill</th>
                      <th className="pb-2">Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.skillDemand.least.map((item, i) => (
                      <tr key={item.skill} className="border-b last:border-0">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 font-medium capitalize">{item.skill}</td>
                        <td className="py-2">
                          <Badge className="bg-gray-100 text-gray-600">{item.count}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Common Gaps */}
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Most Common Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            {report.commonGaps?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {report.commonGaps.map((item, i) => (
                  <div
                    key={item.skill}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">{i + 1}.</span>
                      <span className="font-medium capitalize text-sm">{item.skill}</span>
                    </div>
                    <Badge className="bg-red-100 text-red-600">
                      {item.count} users missing
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No gap data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
