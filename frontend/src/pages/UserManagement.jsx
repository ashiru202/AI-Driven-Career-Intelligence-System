import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {message}
      <button className="ml-2 opacity-70 hover:opacity-100" onClick={onClose}>×</button>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      role: "USER",
      page,
      limit: PAGE_SIZE,
    });
    if (search) params.append("search", search);

    api
      .get(`/api/admin/users?${params.toString()}`)
      .then((res) => {
        const d = res.data.data;
        setUsers(d.users || []);
        setTotal(d.pagination?.total || 0);
      })
      .catch(() => showToast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const toggleStatus = async (user) => {
    setToggling((prev) => ({ ...prev, [user._id]: true }));
    try {
      await api.patch(`/api/admin/users/${user._id}/status`, { active: !user.active });
      showToast(
        `${user.name} has been ${!user.active ? "enabled" : "disabled"}`,
        "success"
      );
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to update status", "error");
    } finally {
      setToggling((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Registered Job Seekers</h2>
          <p className="text-gray-500 mt-1">
            {total} user{total !== 1 ? "s" : ""} registered
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job Seekers (Page {page}/{totalPages || 1})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No users found{search ? ` matching "${search}"` : ""}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.06] transition-colors">
                        <td className="py-3 font-medium text-white/90">{u.name}</td>
                        <td className="py-3 text-white/55">{u.email}</td>
                        <td className="py-3">
                          <Badge
                            className={
                              u.active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }
                          >
                            {u.active ? "Active" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="py-3 text-white/45">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <Button
                            size="sm"
                            disabled={toggling[u._id]}
                            onClick={() => toggleStatus(u)}
                            className={
                              u.active
                                ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                                : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                            }
                          >
                            {toggling[u._id]
                              ? "..."
                              : u.active
                              ? "Disable"
                              : "Enable"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
