import { useEffect, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Check,
  X,
  AlertTriangle,
  Trash2,
  Users,
  Activity,
  UserPlus,
  Clock3,
  Briefcase,
} from "lucide-react";

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
      <span>{type === "success" ? <Check size={14} /> : <X size={14} />}</span>
      {message}
      <button className="ml-2 text-white opacity-70 hover:opacity-100" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [reviewing, setReviewing] = useState({});
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const closeToast = () => setToast(null);
  const activeStaff = staff.filter((member) => member.active).length;
  const pendingApplications = applications.filter((application) => application.status === "PENDING");

  const loadStaff = () => {
    setLoading(true);
    api
      .get("/api/admin/users?role=STAFF")
      .then((res) => setStaff(res.data.data?.users || []))
      .catch(() => showToast("Failed to load staff list", "error"))
      .finally(() => setLoading(false));
  };

  const loadApplications = () => {
    setApplicationsLoading(true);
    api
      .get("/api/admin/staff-applications?status=PENDING&limit=100")
      .then((res) => setApplications(res.data.data?.applications || []))
      .catch(() => showToast("Failed to load staff applications", "error"))
      .finally(() => setApplicationsLoading(false));
  };

  useEffect(() => {
    loadStaff();
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReviewModal = (application, decision) => {
    setReviewModal({ application, decision });
    setReviewNotes("");
  };

  const submitApplicationReview = async () => {
    if (!reviewModal?.application?._id) {
      return;
    }

    const isReject = reviewModal.decision === "REJECT";
    const notes = reviewNotes.trim();

    if (isReject && notes.length < 10) {
      showToast("Please provide at least 10 characters for rejection notes", "error");
      return;
    }

    const applicationId = reviewModal.application._id;
    setReviewing((prev) => ({ ...prev, [applicationId]: true }));

    try {
      await api.patch(`/api/admin/staff-applications/${applicationId}/review`, {
        decision: reviewModal.decision,
        reviewNotes: notes,
      });

      if (isReject) {
        showToast("Application rejected", "success");
      } else {
        showToast("Application approved. Staff invite email sent.", "success");
      }

      setReviewModal(null);
      setReviewNotes("");
      loadApplications();
      loadStaff();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to review application", "error");
    } finally {
      setReviewing((prev) => ({ ...prev, [applicationId]: false }));
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

  const inviteStaff = async (e) => {
    e.preventDefault();
    const name = inviteForm.name.trim();
    const email = inviteForm.email.trim();

    if (!name || !email) {
      showToast("Name and email are required", "error");
      return;
    }

    setInviting(true);
    try {
      await api.post("/api/admin/staff", { name, email });
      showToast("Staff invite sent. They will set their own password from email.", "success");
      setInviteForm({ name: "", email: "" });
      loadStaff();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to send staff invite", "error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Review Application Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#13132b] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-white mb-2">
              {reviewModal.decision === "APPROVE" ? "Approve Application?" : "Reject Application?"}
            </h3>
            <p className="text-white/60 text-sm mb-1">Applicant</p>
            <p className="text-white font-semibold mb-1">{reviewModal.application.fullName}</p>
            <p className="text-white/50 text-xs mb-4">{reviewModal.application.email}</p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Current Role</p>
                <p className="text-white/90 mt-0.5">{reviewModal.application.currentRole || "-"}</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Experience</p>
                <p className="text-white/90 mt-0.5">
                  {Number(reviewModal.application.yearsExperience || 0)} years
                </p>
              </div>
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">
              {reviewModal.decision === "APPROVE" ? "Optional review note" : "Rejection reason (required)"}
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewModal.decision === "APPROVE"
                  ? "Optional internal note"
                  : "Explain why this application is being rejected"
              }
              className="min-h-[110px] bg-[#0f1630] border-white/10 text-white placeholder:text-white/40"
              maxLength={1000}
            />

            <div className="flex gap-3 mt-5">
              <Button
                className={`flex-1 text-white ${
                  reviewModal.decision === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={reviewing[reviewModal.application._id]}
                onClick={submitApplicationReview}
              >
                {reviewing[reviewModal.application._id]
                  ? "Processing..."
                  : reviewModal.decision === "APPROVE"
                  ? "Approve & Send Invite"
                  : "Reject Application"}
              </Button>
              <Button
                className="flex-1 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setReviewModal(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#13132b] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Staff Account?</h3>
            <p className="text-white/60 text-sm mb-1">You are about to permanently delete:</p>
            <p className="text-white font-semibold mb-1">{confirmDelete.name}</p>
            <p className="text-white/50 text-xs mb-5">{confirmDelete.email}</p>
            <p className="text-red-400 text-xs mb-5">
              <AlertTriangle size={16} className="inline mr-1 text-red-400" /> This action cannot be undone. The staff account will be permanently removed.
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Staff Management</h2>
            <p className="text-slate-400 mt-1 text-sm">View and manage staff accounts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.35)" }}
            >
              <Users size={13} /> {staff.length} staff
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.16)", color: "#bbf7d0", border: "1px solid rgba(34,197,94,0.35)" }}
            >
              <Activity size={13} /> {activeStaff} active
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(245,158,11,0.16)", color: "#fde68a", border: "1px solid rgba(245,158,11,0.35)" }}
            >
              <Clock3 size={13} /> {pendingApplications.length} pending applications
            </span>
          </div>
        </div>

        <div>
          <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(17,31,48,0.9), rgba(14,22,36,0.95))" }}>
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase size={16} /> Pending Staff Applications ({pendingApplications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <p className="text-sm text-slate-400">Loading applications...</p>
              ) : pendingApplications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No pending staff applications.</p>
                  <p className="text-sm mt-1">When candidates apply, they will appear here for admin review.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/40 border-b border-white/10">
                        <th className="pb-3">Applicant</th>
                        <th className="pb-3">Current Role</th>
                        <th className="pb-3">Experience</th>
                        <th className="pb-3">Expertise</th>
                        <th className="pb-3">Submitted</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApplications.map((application) => (
                        <tr
                          key={application._id}
                          className="border-b border-white/5 last:border-0 hover:bg-white/[0.06] transition-colors"
                        >
                          <td className="py-3">
                            <p className="font-medium text-white/90">{application.fullName}</p>
                            <p className="text-white/55 text-xs mt-0.5">{application.email}</p>
                          </td>
                          <td className="py-3 text-white/70">{application.currentRole || "-"}</td>
                          <td className="py-3 text-white/70">{application.yearsExperience || 0} yrs</td>
                          <td className="py-3 text-white/65 text-xs max-w-[220px]">
                            {(application.expertiseAreas || []).join(", ") || "-"}
                          </td>
                          <td className="py-3 text-white/45">
                            {new Date(application.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={reviewing[application._id]}
                                onClick={() => openReviewModal(application, "APPROVE")}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewing[application._id]}
                                onClick={() => openReviewModal(application, "REJECT")}
                                className="bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/60"
                              >
                                Reject
                              </Button>
                            </div>
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

        <div>
          <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(20,28,48,0.9), rgba(13,18,33,0.95))" }}>
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus size={16} /> Direct Invite (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={inviteStaff} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-white/70 mb-1">Full Name</label>
                  <Input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Staff member name"
                    maxLength={100}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-white/70 mb-1">Email</label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@company.com"
                    maxLength={254}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button type="submit" disabled={inviting} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                    {inviting ? "Sending Invite..." : "Send Invite"}
                  </Button>
                </div>
              </form>
              <p className="text-xs text-slate-400 mt-3">
                Use this only when needed. Preferred flow is application review above. For privacy and security,
                admins never set or see staff passwords. Invited staff set their own password via email.
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))" }}>
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white">Staff Accounts ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-400">Loading staff...</p>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No staff accounts found.</p>
                  <p className="text-sm mt-1">Use the invite form above to onboard staff securely.</p>
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
                              <Trash2 size={14} className="inline mr-1" /> Delete
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
