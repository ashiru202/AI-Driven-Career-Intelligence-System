import { useEffect, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { Flame, TrendingDown, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/admin/stats")
      .then((res) => setStats(res.data.data))
      .catch(() => setError("Failed to load admin stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading admin dashboard...
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

  const statCards = [
    { label: "Total Job Seekers", value: stats.totalUsers, color: "text-blue-600" },
    { label: "Total Staff", value: stats.totalStaff, color: "text-purple-600" },
    { label: "Total Admins", value: stats.totalAdmins, color: "text-gray-700" },
    { label: "Active Job Seekers", value: stats.activeUsers, color: "text-green-600" },
    { label: "Avg Match Score", value: `${stats.avgMatchScore}%`, color: "text-orange-600" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
            <p className="text-slate-400 mt-1 text-sm">Platform overview and analytics</p>
          </div>
          <Link to="/admin-report">
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              View Platform Report
            </Button>
          </Link>
        </div>

        {/* Stat Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skill Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Flame size={16} className="text-orange-500" /> Top Demanding Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topSkills && stats.topSkills.length > 0 ? (
                <ul className="space-y-2">
                  {stats.topSkills.map((item, i) => (
                    <li key={item.skill} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{item.skill}</span>
                      <Badge className="bg-blue-100 text-blue-700">{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Least Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingDown size={16} className="text-gray-500" /> Least Demanding Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.leastSkills && stats.leastSkills.length > 0 ? (
                <ul className="space-y-2">
                  {stats.leastSkills.map((item) => (
                    <li key={item.skill} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{item.skill}</span>
                      <Badge className="bg-gray-100 text-gray-600">{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Common Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-500" /> Common Missing Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.commonGaps && stats.commonGaps.length > 0 ? (
                <ul className="space-y-2">
                  {stats.commonGaps.map((item) => (
                    <li key={item.skill} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{item.skill}</span>
                      <Badge className="bg-red-100 text-red-600">{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No gap data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/staff-management">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200">
              <CardContent className="pt-4">
                <p className="font-semibold text-purple-700">Staff Management</p>
                <p className="text-sm text-gray-500 mt-1">Create and view staff accounts</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200">
              <CardContent className="pt-4">
                <p className="font-semibold text-blue-700">Job Seekers</p>
                <p className="text-sm text-gray-500 mt-1">View, search and manage users</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin-report">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-200">
              <CardContent className="pt-4">
                <p className="font-semibold text-green-700">Platform Report</p>
                <p className="text-sm text-gray-500 mt-1">View and export full report</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Registered Job Seekers</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentUsers && stats.recentUsers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((u) => (
                    <tr key={u._id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{u.name}</td>
                      <td className="py-2 text-gray-600">{u.email}</td>
                      <td className="py-2">
                        <Badge className={u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}>
                          {u.active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No users registered yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

