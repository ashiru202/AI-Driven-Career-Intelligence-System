import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

function ScoreBar({ score, label }) {
  const color =
    score >= 75 ? "bg-green-500" : score >= 45 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function UserReport() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // Load all USER-role accounts
  useEffect(() => {
    setLoadingUsers(true);
    api
      .get("/api/analytics/users?role=USER")
      .then((res) => setUsers(res.data.data?.users || []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  const selectUser = useCallback(async (user) => {
    setSelectedUser(user);
    setReport(null);
    setReportError("");
    setLoadingReport(true);
    try {
      const res = await api.get(`/api/reports/user/${user._id}`);
      setReport(res.data.data);
    } catch (err) {
      setReportError(
        err.response?.data?.error?.message || "Failed to generate user report"
      );
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-report-${selectedUser.email}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/reports/user/${selectedUser._id}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-report-${selectedUser.email}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Reports</h2>
          <p className="text-gray-500 mt-1">
            Select a user to generate their career report
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Select User</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-3"
              />
              {loadingUsers ? (
                <p className="text-sm text-gray-400">Loading users...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-gray-400">No users found</p>
              ) : (
                <ul className="space-y-1 max-h-[500px] overflow-y-auto">
                  {filtered.map((u) => (
                    <li key={u._id}>
                      <button
                        onClick={() => selectUser(u)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedUser?._id === u._id
                            ? "bg-blue-600 text-white"
                            : "hover:bg-white/[0.08] text-white/80"
                        }`}
                      >
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs opacity-60">{u.email}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Report Panel */}
          <div className="lg:col-span-2 space-y-5">
            {!selectedUser && (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                ← Select a user to view their report
              </div>
            )}

            {loadingReport && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Generating report for {selectedUser?.name}...
              </div>
            )}

            {reportError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {reportError}
              </div>
            )}

            {report && !loadingReport && (
              <>
                {/* Report Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Report: {report.user.name}
                    </h3>
                    <p className="text-sm text-gray-500">{report.user.email}</p>
                    <p className="text-xs text-gray-400">
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportJSON}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      size="sm"
                    >
                      Export JSON
                    </Button>
                    <Button
                      onClick={downloadPDF}
                      className="bg-gray-800 text-white hover:bg-gray-900"
                      size="sm"
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* CV Completeness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">CV Completeness</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScoreBar score={report.cvCompleteness?.score ?? 0} label="Overall Score" />

                    {report.cvCompleteness?.missingSections?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Missing Sections</p>
                        <div className="flex flex-wrap gap-2">
                          {report.cvCompleteness.missingSections.map((s) => (
                            <Badge key={s} className="bg-red-100 text-red-600">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.cvCompleteness?.suggestions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Suggestions</p>
                        <ul className="space-y-1">
                          {report.cvCompleteness.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 shrink-0">→</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Career Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.insights?.reasons?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Key Observations</p>
                        <ul className="space-y-1">
                          {report.insights.reasons.map((r, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-yellow-500 shrink-0">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.insights?.prioritySkills?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Priority Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {report.insights.prioritySkills.map((s) => (
                            <Badge key={s} className="bg-orange-100 text-orange-700 capitalize">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.insights?.actions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions</p>
                        <ul className="space-y-1">
                          {report.insights.actions.map((a, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-500 shrink-0">✓</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Roadmap Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Roadmap Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.roadmaps?.length > 0 ? (
                      <div className="space-y-4">
                        {report.roadmaps.map((r) => {
                          const pct =
                            r.totalSkills > 0
                              ? Math.round((r.skillsCompleted / r.totalSkills) * 100)
                              : 0;
                          return (
                            <div key={r.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-medium text-sm">{r.targetRole}</p>
                                <Badge className="bg-blue-100 text-blue-700">
                                  Match: {r.matchScore}%
                                </Badge>
                              </div>
                              <ScoreBar score={pct} label={`${r.skillsCompleted}/${r.totalSkills} skills completed`} />
                              <p className="text-xs text-gray-400 mt-1">
                                Created: {new Date(r.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No roadmaps created yet.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
