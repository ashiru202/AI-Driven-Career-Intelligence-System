import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input, Label } from "../components/ui/input";

export default function StaffDashboard() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [report, setReport] = useState(null);
  const [cvData, setCvData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

  // Load user list
  useEffect(() => {
    setLoadingUsers(true);
    api
      .get("/api/analytics/users?role=USER")
      .then((res) => {
        if (res.data.ok) setUsers(res.data.data.users || []);
      })
      .catch((e) => setError(e.response?.data?.error?.message || "Failed to load users"))
      .finally(() => setLoadingUsers(false));
  }, []);

  const selectUser = useCallback(async (user) => {
    setSelectedUser(user);
    setReport(null);
    setCvData(null);
    setInsightsData(null);
    setLoadingAnalysis(true);
    setError("");

    try {
      const [cvRes, insightsRes, reportRes] = await Promise.all([
        api.get(`/api/analytics/cv-completeness/${user._id}`),
        api.get(`/api/analytics/user-insights/${user._id}`),
        api.get(`/api/analytics/user-report/${user._id}`),
      ]);
      if (cvRes.data.ok) setCvData(cvRes.data.data);
      if (insightsRes.data.ok) setInsightsData(insightsRes.data.data);
      if (reportRes.data.ok) setReport(reportRes.data.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || "Failed to load user analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 45) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 45) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Staff Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Select a user to view their skill gap analysis, CV completeness, and
            personalized insights.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── User List Panel ── */}
          <div className="lg:col-span-1 space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Users ({filteredUsers.length})</CardTitle>
                <div className="mt-2">
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingUsers ? (
                  <p className="text-sm text-gray-500 p-4">Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">No users found.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <li
                        key={u._id}
                        onClick={() => selectUser(u)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedUser?._id === u._id
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        <div className="mt-1">
                          <Badge variant={u.active ? "success" : "destructive"}>
                            {u.active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Analysis Panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedUser && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center text-gray-500">
                  <p className="text-lg">← Select a user to view their analysis</p>
                </CardContent>
              </Card>
            )}

            {selectedUser && loadingAnalysis && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center text-gray-500">
                  <p>Loading analysis for <strong>{selectedUser.name}</strong>...</p>
                </CardContent>
              </Card>
            )}

            {selectedUser && !loadingAnalysis && (
              <>
                {/* User Header */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedUser.name}</CardTitle>
                    <CardDescription>{selectedUser.email}</CardDescription>
                  </CardHeader>
                </Card>

                {/* CV Completeness */}
                {cvData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">CV Completeness</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className={`text-5xl font-bold ${getScoreColor(cvData.score)}`}>
                          {cvData.score}%
                        </span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`${getScoreBg(cvData.score)} h-3 rounded-full transition-all`}
                              style={{ width: `${cvData.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {cvData.score >= 75
                              ? "Profile is well set up"
                              : cvData.score >= 45
                              ? "Profile needs some work"
                              : "Profile is incomplete"}
                          </p>
                        </div>
                      </div>

                      {cvData.missingSections && cvData.missingSections.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Missing sections:</p>
                          <div className="flex flex-wrap gap-2">
                            {cvData.missingSections.map((s, i) => (
                              <Badge key={i} variant="destructive">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {cvData.suggestions && cvData.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Suggestions:</p>
                          <ul className="space-y-1">
                            {cvData.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-gray-600 flex gap-2">
                                <span className="text-blue-500 mt-0.5">→</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Insights */}
                {insightsData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Career Insights</CardTitle>
                      <CardDescription>Why this user may not be getting hired</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {insightsData.reasons && insightsData.reasons.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Key Issues:</p>
                          <ul className="space-y-1">
                            {insightsData.reasons.map((r, i) => (
                              <li key={i} className="text-sm text-red-700 flex gap-2">
                                <span className="mt-0.5">⚠</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insightsData.prioritySkills && insightsData.prioritySkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Priority Skills to Learn:</p>
                          <div className="flex flex-wrap gap-2">
                            {insightsData.prioritySkills.map((skill, i) => (
                              <Badge key={i} variant="default">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {insightsData.actions && insightsData.actions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                          <ul className="space-y-1">
                            {insightsData.actions.map((a, i) => (
                              <li key={i} className="text-sm text-green-700 flex gap-2">
                                <span className="mt-0.5">✓</span>
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Roadmap Summary */}
                {report && report.roadmaps && report.roadmaps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Learning Roadmaps ({report.roadmaps.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {report.roadmaps.map((rm) => {
                          const pct = rm.totalSkills
                            ? Math.round((rm.skillsCompleted / rm.totalSkills) * 100)
                            : 0;
                          return (
                            <div key={rm.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="font-medium text-sm">{rm.targetRole}</p>
                                <Badge variant={pct === 100 ? "success" : pct > 0 ? "default" : "secondary"}>
                                  {pct}% done
                                </Badge>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                {rm.skillsCompleted}/{rm.totalSkills} skills completed ·{" "}
                                {new Date(rm.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {report && report.roadmaps && report.roadmaps.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500 text-sm">
                      This user has no roadmaps yet.
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
