import { useEffect, useState } from "react";
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
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
      <button className="ml-2 text-white opacity-70 hover:opacity-100" onClick={onClose}>×</button>
    </div>
  );
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadStaff = () => {
    setLoading(true);
    api
      .get("/api/admin/users?role=STAFF")
      .then((res) => setStaff(res.data.data?.users || []))
      .catch(() => showToast("Failed to load staff list", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6) errors.password = "Password must be at least 6 characters";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      await api.post("/api/admin/staff", form);
      showToast(`Staff account created for ${form.email}`, "success");
      setForm({ name: "", email: "", password: "" });
      loadStaff();
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to create staff account";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStaff = async (member) => {
    setDeleting((prev) => ({ ...prev, [member._id]: true }));
    try {
      await api.delete(`/api/admin/users/${member._id}`);
      showToast(`${member.name}'s account has been permanently deleted`, "success");
      setConfirmDelete(null);
      loadStaff();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to delete staff account", "error");
    } finally {
      setDeleting((prev) => ({ ...prev, [member._id]: false }));
    }
  };

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#13132b] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Staff Account?</h3>
            <p className="text-white/60 text-sm mb-1">You are about to permanently delete:</p>
            <p className="text-white font-semibold mb-1">{confirmDelete.name}</p>
            <p className="text-white/50 text-xs mb-5">{confirmDelete.email}</p>
            <p className="text-red-400 text-xs mb-5">
              ⚠️ This action cannot be undone. The staff account will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={deleting[confirmDelete._id]}
                onClick={() => deleteStaff(confirmDelete)}
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

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white">Staff Management</h2>
          <p className="text-slate-400 mt-1 text-sm">Create and manage staff accounts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Staff Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Create Staff Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={formErrors.name ? "border-red-400" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="staff@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={formErrors.email ? "border-red-400" : ""}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={formErrors.password ? "border-red-400" : ""}
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 text-white hover:bg-purple-700"
                >
                  {submitting ? "Creating..." : "Create Staff Account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Staff Accounts ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-400">Loading staff...</p>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No staff accounts found.</p>
                  <p className="text-sm mt-1">Use the form to create the first staff account.</p>
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
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.06] transition-colors">
                          <td className="py-3 font-medium text-white/90">{s.name}</td>
                          <td className="py-3 text-white/55">{s.email}</td>
                          <td className="py-3">
                            <Badge
                              className={
                                s.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }
                            >
                              {s.active ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                          <td className="py-3 text-white/45">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <Button
                              size="sm"
                              disabled={deleting[s._id]}
                              onClick={() => setConfirmDelete(s)}
                              className="bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/60"
                            >
                              🗑 Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
