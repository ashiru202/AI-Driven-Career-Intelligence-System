import { useEffect, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { useSSE } from "../context/SSEContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Check,
  X,
  AlertTriangle,
  Trash2,
  Users,
  Activity,
  Clock3,
  Briefcase,
  Eye,
  Link2,
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
  const { liveNotifications } = useSSE();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [reviewing, setReviewing] = useState({});
  const [viewApplication, setViewApplication] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const flatButtonClass = "shadow-none hover:shadow-none";

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

  useEffect(() => {
    if (!liveNotifications.length) {
      return;
    }

    const hasStaffApplicationNotification = liveNotifications.some(
      (notification) => String(notification?.id || "").startsWith("staff_application_")
    );

    if (hasStaffApplicationNotification) {
      loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveNotifications]);

  useEffect(() => {
    const hasOpenModal = Boolean(viewApplication || reviewModal || confirmDelete);
    if (!hasOpenModal) {
      return undefined;
    }

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const mainEl = document.querySelector("main");
    const prevMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow;
      }
    };
  }, [viewApplication, reviewModal, confirmDelete]);

  const openReviewModal = (application, decision) => {
    setViewApplication(null);
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

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* View Application Modal */}
      {viewApplication && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-[1px] overflow-y-auto px-4 py-6 sm:px-6 md:py-10">
          <div className="mx-auto bg-[#13132b] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Staff Application Details</h3>
                <p className="text-white/55 text-xs mt-1">
                  Submitted on {new Date(viewApplication.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                className="text-white/60 hover:text-white"
                onClick={() => setViewApplication(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Full Name</p>
                <p className="text-white/90 mt-0.5">{viewApplication.fullName}</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Email</p>
                <p className="text-white/90 mt-0.5">{viewApplication.email}</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Phone</p>
                <p className="text-white/90 mt-0.5">{viewApplication.phone || "-"}</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Current Role</p>
                <p className="text-white/90 mt-0.5">{viewApplication.currentRole || "-"}</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Years of Experience</p>
                <p className="text-white/90 mt-0.5">{Number(viewApplication.yearsExperience || 0)} years</p>
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Status</p>
                <p className="text-white/90 mt-0.5">{viewApplication.status}</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-md px-3 py-3 border border-white/10 mb-4">
              <p className="text-white/50 text-xs">Expertise Areas</p>
              <p className="text-white/90 text-sm mt-1">
                {(viewApplication.expertiseAreas || []).join(", ") || "-"}
              </p>
            </div>

            <div className="bg-white/5 rounded-md px-3 py-3 border border-white/10 mb-4">
              <p className="text-white/50 text-xs">Motivation</p>
              <p className="text-white/90 text-sm mt-1 whitespace-pre-wrap">
                {viewApplication.motivation || "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">LinkedIn</p>
                {viewApplication.linkedInUrl ? (
                  <a
                    href={viewApplication.linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:text-sky-200 mt-0.5 inline-flex items-center gap-1"
                  >
                    <Link2 size={12} /> Open LinkedIn
                  </a>
                ) : (
                  <p className="text-white/90 mt-0.5">-</p>
                )}
              </div>
              <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                <p className="text-white/50">Portfolio</p>
                {viewApplication.portfolioUrl ? (
                  <a
                    href={viewApplication.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:text-sky-200 mt-0.5 inline-flex items-center gap-1"
                  >
                    <Link2 size={12} /> Open Portfolio
                  </a>
                ) : (
                  <p className="text-white/90 mt-0.5">-</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className={`flex-1 bg-emerald-600 text-white hover:bg-emerald-700 ${flatButtonClass}`}
                onClick={() => openReviewModal(viewApplication, "APPROVE")}
              >
                Approve
              </Button>
              <Button
                className={`flex-1 btn-danger ${flatButtonClass}`}
                onClick={() => openReviewModal(viewApplication, "REJECT")}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Application Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 px-4 py-8 overflow-y-auto">
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
                    : "btn-danger"
                } ${flatButtonClass}`}
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
                className={`flex-1 bg-white/10 text-white hover:bg-white/20 ${flatButtonClass}`}
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
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 px-4 py-8 overflow-y-auto">
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
                className={`flex-1 btn-danger ${flatButtonClass}`}
                disabled={deleting[confirmDelete._id]}
                onClick={() => deleteStaff(confirmDelete)}
              >
                {deleting[confirmDelete._id] ? "Deleting..." : "Yes, Delete"}
              </Button>
              <Button
                className={`flex-1 bg-white/10 text-white hover:bg-white/20 ${flatButtonClass}`}
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
              style={{ background: "rgba(59,130,246,0.18)", color: "#bfdbfe", border: "1px solid rgba(96,165,250,0.35)" }}
            >
              <Users size={13} /> {staff.length} staff
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.12)", color: "#dbeafe", border: "1px solid rgba(96,165,250,0.28)" }}
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
          <Card className="border-white/10 overflow-hidden" style={{ background: "linear-gradient(145deg, rgba(17,31,48,0.9), rgba(14,22,36,0.95))" }}>
            <CardHeader className="border-b border-white/10 bg-white/[0.02]">
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
                <div className="overflow-x-auto table-unified rounded-lg border border-white/10 bg-[#0b1326]/70">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="text-left text-white/50 border-b border-white/10 text-[11px] uppercase tracking-[0.08em]">
                        <th className="px-4 py-3">Applicant</th>
                        <th className="px-4 py-3">Current Role</th>
                        <th className="px-4 py-3">Experience</th>
                        <th className="px-4 py-3">Expertise</th>
                        <th className="px-4 py-3">Submitted</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApplications.map((application, index) => (
                        <tr
                          key={application._id}
                          className={`border-b border-white/5 last:border-0 transition-colors ${
                            index % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"
                          } hover:bg-[#1a2440]/70`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-white/90">{application.fullName}</p>
                            <p className="text-white/55 text-xs mt-0.5">{application.email}</p>
                          </td>
                          <td className="px-4 py-3 text-white/75">{application.currentRole || "-"}</td>
                          <td className="px-4 py-3 text-white/75">{application.yearsExperience || 0} yrs</td>
                          <td className="px-4 py-3 text-white/70 text-xs max-w-[240px]">
                            {(application.expertiseAreas || []).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-white/55">
                            {new Date(application.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setViewApplication(application)}
                                className={`bg-white/10 text-white hover:bg-white/20 border border-white/20 ${flatButtonClass}`}
                              >
                                <Eye size={14} className="inline mr-1" /> View
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewing[application._id]}
                                onClick={() => openReviewModal(application, "APPROVE")}
                                className={`bg-emerald-600 text-white hover:bg-emerald-700 ${flatButtonClass}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewing[application._id]}
                                onClick={() => openReviewModal(application, "REJECT")}
                                className={`btn-danger ${flatButtonClass}`}
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
                  <p className="text-sm mt-1">Approve pending applications above to onboard staff members.</p>
                </div>
              ) : (
                <div className="overflow-x-auto table-unified">
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
                              className={`btn-danger ${flatButtonClass}`}
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
