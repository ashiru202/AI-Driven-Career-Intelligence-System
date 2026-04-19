import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { X, AlertTriangle, Trash2, ArrowLeft, ArrowRight, Users, Activity } from "lucide-react";

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
      <button className="ml-2 opacity-70 hover:opacity-100" onClick={onClose}><X size={14} /></button>
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
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // user object to delete
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

  const deleteUser = async (user) => {
    setDeleting((prev) => ({ ...prev, [user._id]: true }));
    try {
      await api.delete(`/api/admin/users/${user._id}`);
      showToast(`${user.name}'s account has been permanently deleted`, "success");
      setConfirmDelete(null);
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to delete user", "error");
    } finally {
      setDeleting((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeUsers = users.filter((u) => u.active).length;

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#13132b] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Account?</h3>
            <p className="text-white/60 text-sm mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-white font-semibold mb-1">{confirmDelete.name}</p>
            <p className="text-white/50 text-xs mb-5">{confirmDelete.email}</p>
            <p className="text-red-400 text-xs mb-5">
              <AlertTriangle size={16} className="inline mr-1 text-red-400" /> This action cannot be undone. All data associated with this account will be lost.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={deleting[confirmDelete._id]}
                onClick={() => deleteUser(confirmDelete)}
              >
                {deleting[confirmDelete._id] ? "Deleting..." : "Yes, Delete"}
              </Button>
              <Button
                className="flex-1 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Registered Job Seekers</h2>
            <p className="text-slate-400 mt-1 text-sm">
              {total} user{total !== 1 ? "s" : ""} registered
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.35)" }}
            >
              <Users size={13} /> {users.length} listed
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.16)", color: "#bbf7d0", border: "1px solid rgba(34,197,94,0.35)" }}
            >
              <Activity size={13} /> {activeUsers} active
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-white/10 p-3" style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))" }}>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="sm:max-w-md"
            />
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                className="bg-slate-700 text-white hover:bg-slate-600 border border-white/10"
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
        </div>

        {/* Table */}
        <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))" }}>
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white">Job Seekers (Page {page}/{totalPages || 1})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No users found{search ? ` matching "${search}"` : ""}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3" colSpan={2}>Actions</th>
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
                                ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 !shadow-none hover:!shadow-none"
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
                        <td className="py-3">
                          <Button
                            size="sm"
                            disabled={deleting[u._id]}
                            onClick={() => setConfirmDelete(u)}
                            className="bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/60"
                          >
                            <Trash2 size={14} className="inline mr-1" /> Delete
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
                  <ArrowLeft size={14} className="inline mr-1" /> Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ArrowRight size={14} className="inline ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
