import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  FileText, File, Eye, Trash2, Upload,
  Briefcase, Tag, Calendar, ChevronDown, ChevronUp, AlertCircle, Loader2,
  ChevronLeft, ChevronRight,
} from "lucide-react";

function FileIcon({ name }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return (
      <div className="w-12 h-14 rounded-md flex flex-col items-center justify-center bg-red-50 border border-red-200 flex-shrink-0">
        <FileText size={22} className="text-red-500" />
        <span className="text-[9px] font-bold text-red-500 mt-0.5 tracking-wider">PDF</span>
      </div>
    );
  }
  return (
    <div className="w-12 h-14 rounded-md flex flex-col items-center justify-center bg-blue-50 border border-blue-200 flex-shrink-0">
      <File size={22} className="text-blue-500" />
      <span className="text-[9px] font-bold text-blue-500 mt-0.5 tracking-wider">
        {ext?.toUpperCase() || "DOC"}
      </span>
    </div>
  );
}

function ResumeCard({ resume, onDelete, onView, onCompare }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const skills = resume.extractedSkills || [];
  const SHOW = 8;
  const visibleSkills = expanded ? skills : skills.slice(0, SHOW);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(resume._id);
    setDeleting(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex gap-4 items-start">
          <FileIcon name={resume.fileName} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base truncate leading-tight" title={resume.fileName}>
              {resume.fileName}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 text-xs">
              <Calendar size={11} />
              <span>Uploaded {new Date(resume.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete resume"
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>

        {/* Skills section */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={12} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Skills Extracted
            </span>
            <span className="ml-auto text-xs font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">
              {skills.length}
            </span>
          </div>

          {skills.length === 0 ? (
            <p className="text-slate-500 text-xs italic">No skills extracted yet</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {visibleSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {skills.length > SHOW && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {expanded ? (
                    <><ChevronUp size={13} /> Show less</>
                  ) : (
                    <><ChevronDown size={13} /> +{skills.length - SHOW} more skills</>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Preview snippet */}
        {resume.extractedText && (
          <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-3">
              {resume.extractedText.substring(0, 240)}
              {resume.extractedText.length > 240 && "…"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onView(resume._id, resume.fileName)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => onCompare(resume._id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            <Briefcase size={14} />
            Compare Job
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchResumes(page); }, [page]);

  const fetchResumes = async (p = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/resumes", { params: { page: p, limit: 6 } });
      setResumes(response.data.data?.resumes || []);
      setPagination(response.data.data?.pagination || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await api.delete(`/api/resumes/${id}`);
      // If we deleted the last item on a non-first page, go back
      const newCount = resumes.length - 1;
      if (newCount === 0 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchResumes(page);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to delete resume");
    }
  };

  const handleView = async (id, fileName) => {
    try {
      const res = await api.get(`/api/resumes/${id}/download`, { responseType: "blob" });
      const contentType = res.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      if (contentType.includes("pdf")) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      alert("Failed to open resume. The file may have been removed from disk.");
    }
  };

  const handleCompare = (id) => {
    navigate("/compare-job", { state: { resumeId: id } });
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-sm">Loading your resumes…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">My Resumes</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {(pagination?.total ?? resumes.length) === 0
                ? "No resumes uploaded yet"
                : `${pagination?.total ?? resumes.length} resume${(pagination?.total ?? resumes.length) !== 1 ? "s" : ""} on file`}
            </p>
          </div>
          <button
            onClick={() => navigate("/resume-analyze")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/30"
          >
            <Upload size={15} />
            Upload Resume
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {resumes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-5 bg-white/3 border border-white/8 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileText size={30} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">No resumes yet</p>
              <p className="text-slate-400 text-sm mt-1">Upload your first resume to get started</p>
            </div>
            <button
              onClick={() => navigate("/resume-analyze")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              <Upload size={15} />
              Upload Resume
            </button>
          </div>
        )}

        {/* Resume grid */}
        {resumes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume._id}
                  resume={resume}
                  onDelete={handleDelete}
                  onView={handleView}
                  onCompare={handleCompare}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <span className="text-sm text-slate-400">
                  Page <span className="text-white font-semibold">{page}</span> of{" "}
                  <span className="text-white font-semibold">{pagination.pages}</span>
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === pagination.pages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
