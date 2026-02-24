import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// ── Mini progress bar ─────────────────────────────────────────────────────────
function Bar({ pct, color = "#6366f1" }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
      <div
        style={{ width: `${Math.min(pct, 100)}%`, background: color, transition: "width 0.6s ease" }}
        className="h-full rounded-full"
      />
    </div>
  );
}

// ── User avatar initials ──────────────────────────────────────────────────────
function UserAvatar({ name, size = 34 }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const palette = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
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

// ── Main component ────────────────────────────────────────────────────────────
export default function StaffHome() {
  const [users, setUsers]           = useState([]);
  const [gaps, setGaps]             = useState([]);
  const [skillDemand, setSkillDemand] = useState({ topSkills: [], bottomSkills: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/analytics/users?role=USER"),
      api.get("/api/analytics/common-gaps?limit=8"),
      api.get("/api/analytics/skill-demand"),
    ])
      .then(([usersRes, gapsRes, demandRes]) => {
        if (usersRes.data.ok)  setUsers(usersRes.data.data.users || []);
        if (gapsRes.data.ok)   setGaps(gapsRes.data.data || []);
        if (demandRes.data.ok) {
          const d = demandRes.data.data;
          setSkillDemand({ topSkills: d.top || [], bottomSkills: d.least || [] });
        }
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  const staffUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();

  const totalUsers  = users.length;
  const activeUsers = users.filter((u) => u.active).length;
  const recentUsers = users.slice(0, 6);

  const maxGapCount   = gaps[0]?.count   || 1;
  const maxSkillCount = skillDemand.topSkills[0]?.count || 1;

  const statCards = [
    { label: "Total Job Seekers",  value: totalUsers,                              color: "text-blue-400"   },
    { label: "Active Users",       value: activeUsers,                             color: "text-green-400"  },
    { label: "Inactive Users",     value: totalUsers - activeUsers,                color: "text-yellow-400" },
    { label: "Top Demanded Skill", value: skillDemand.topSkills[0]?.skill ?? "—", color: "text-orange-400" },
    { label: "Top Skill Gap",      value: gaps[0]?.skill ?? "—",                  color: "text-red-400"    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading staff dashboard…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <h2 className="text-3xl font-bold text-white">Staff Dashboard</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Welcome back{staffUser.name ? `, ${staffUser.name}` : ""}! Here's your platform overview.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 capitalize truncate ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Skill demand + Common gaps ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Top Skills in Demand */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🔥 Top Skills in Demand</CardTitle>
            </CardHeader>
            <CardContent>
              {skillDemand.topSkills.length === 0 ? (
                <p className="text-sm text-gray-400">No data yet</p>
              ) : (
                <ul className="space-y-3">
                  {skillDemand.topSkills.slice(0, 8).map((item, i) => (
                    <li key={item.skill}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize">
                          {i + 1}. {item.skill}
                        </span>
                        <Badge className="bg-blue-100 text-blue-700">{item.count}</Badge>
                      </div>
                      <Bar pct={(item.count / maxSkillCount) * 100} color="#6366f1" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Common Skill Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚠️ Common Skill Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              {gaps.length === 0 ? (
                <p className="text-sm text-gray-400">No gap data yet</p>
              ) : (
                <ul className="space-y-3">
                  {gaps.slice(0, 8).map((item, i) => (
                    <li key={item.skill}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize">
                          {i + 1}. {item.skill}
                        </span>
                        <Badge className="bg-red-100 text-red-600">{item.count}</Badge>
                      </div>
                      <Bar pct={(item.count / maxGapCount) * 100} color="#ef4444" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Links ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/staff">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-indigo-200">
              <CardContent className="pt-4">
                <p className="font-semibold text-indigo-400">📋 User Reports</p>
                <p className="text-sm text-gray-500 mt-1">View skill gaps & CV scores per user</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/all-roadmaps">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200">
              <CardContent className="pt-4">
                <p className="font-semibold text-purple-400">🗺️ All Roadmaps</p>
                <p className="text-sm text-gray-500 mt-1">Browse all user learning roadmaps</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ── Recent Job Seekers ── */}
        <Card>
          <CardHeader>
            <CardTitle>🕒 Recently Registered Job Seekers</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-400">No users registered yet.</p>
            ) : (
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
                  {recentUsers.map((u) => (
                    <tr key={u._id} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={u.name} size={28} />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
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
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
