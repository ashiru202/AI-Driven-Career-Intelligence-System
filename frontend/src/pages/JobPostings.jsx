import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import api from "../api/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Resume Card ───────────────────────────────────────────────────────────────

function ResumeCard({ resume, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(resume)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 14,
        border: selected
          ? '2px solid #6366f1'
          : '2px solid rgba(255,255,255,0.08)',
        padding: 16,
        background: selected
          ? 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.18))'
          : 'rgba(255,255,255,0.04)',
        boxShadow: selected ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        outline: 'none',
      }}
      onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.border = '2px solid rgba(99,102,241,0.45)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; } }}
      onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.border = '2px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            flexShrink: 0,
            width: 40, height: 40,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            background: selected
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : 'rgba(255,255,255,0.08)',
          }}
        >
          {resume.fileType?.includes('pdf') ? '📄' : '📝'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.85)',
              margin: 0,
            }}
            title={resume.fileName}
          >
            {resume.fileName}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>
            {formatDate(resume.createdAt)}
            {resume.fileSize ? ` · ${formatFileSize(resume.fileSize)}` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700,
                background: selected ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)',
                color: selected ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                border: selected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100,
                padding: '2px 10px',
              }}
            >
              {resume.extractedSkills?.length ?? 0} skills
            </span>
            {selected && (
              <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>✓ Selected</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }) {
  const initials = job.company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 16,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.14),rgba(139,92,246,0.08))';
        e.currentTarget.style.border = '1px solid rgba(99,102,241,0.4)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {initials || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{job.company}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>📍 {job.location}</p>
        </div>
      </div>
      {(job.salaryMin || job.salaryMax) && (
        <p style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '4px 10px' }}>
          💰{" "}
          {job.salaryMin && job.salaryMax
            ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
            : job.salaryMax
            ? `Up to $${job.salaryMax.toLocaleString()}`
            : `From $${job.salaryMin.toLocaleString()}`}
        </p>
      )}
      {job.description && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {job.description}
        </p>
      )}
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 'auto', textDecoration: 'none' }}
      >
        <button
          style={{
            width: '100%', padding: '7px 0', borderRadius: 9,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.82'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          View Job 
        </button>
      </a>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

export default function JobPostings() {
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  const [jobPostings, setJobPostings] = useState(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Prevent multiple in-flight requests when switching resumes quickly
  const debounceRef = useRef(null);
  const initDoneRef = useRef(false);

  // ── Initial load: fetch resumes ──
  useEffect(() => {
    const init = async () => {
      try {
        setPageLoading(true);
        const resumesRes = await api.get("/api/analytics/my-resumes");
        const fetchedResumes = resumesRes.data.data?.resumes || [];
        setResumes(fetchedResumes);
        if (fetchedResumes.length > 0 && !initDoneRef.current) {
          initDoneRef.current = true;
          setSelectedResume(fetchedResumes[0]);
          fetchJobsForResume(fetchedResumes[0]);
        }
      } catch (err) {
        console.error("Job postings init error:", err);
        setError(
          err.response?.data?.error?.message ||
            "Failed to load data. Please make sure you're logged in."
        );
      } finally {
        setPageLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobsForResume = useCallback(async (resume) => {
    setJobsLoading(true);
    setJobPostings(null);
    setVisibleCount(PAGE_SIZE);
    try {
      const skills = (resume.extractedSkills || []).slice(0, 5).join(",");
      if (skills) {
        const jobsRes = await api.get(
          `/api/analytics/job-postings?skills=${encodeURIComponent(skills)}`
        );
        setJobPostings(jobsRes.data.data);
      } else {
        setJobPostings({
          available: false,
          jobs: [],
          message: "No skills extracted from this resume yet",
        });
      }
    } catch (err) {
      const isRateLimited =
        err?.response?.status === 429 ||
        err?.response?.data?.error?.code === "RATE_LIMITED";
      setJobPostings({
        available: false,
        jobs: [],
        message: isRateLimited
          ? "You're making requests too quickly. Please wait a moment and try again."
          : "Could not load job postings",
      });
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const handleResumeSelect = (resume) => {
    if (resume._id === selectedResume?._id) return;
    setSelectedResume(resume);
    // Debounce: cancel any pending request fired by rapid clicking
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchJobsForResume(resume);
    }, 300);
  };

  const handleSeeMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    }, 400);
  };

  // ── Loading / Error states ──
  if (pageLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading job postings…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-1">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  const visibleJobs = jobPostings?.jobs?.slice(0, visibleCount) || [];
  const totalJobs = jobPostings?.jobs?.length || 0;
  const hasMore = visibleCount < totalJobs;

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <h2 className="text-3xl font-bold text-white">💼 Job Postings</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Select a resume to see live job postings that match your skills.
          </p>
        </div>

        {/* ── Resume Selector ── */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Your Uploaded Resumes
          </h3>
          {resumes.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-600 font-medium">No resumes uploaded yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Upload a resume to get personalised job matches.
              </p>
              <a href="/resume-analyze">
                <Button className="mt-4" size="sm">
                  Upload Resume →
                </Button>
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume._id}
                  resume={resume}
                  selected={selectedResume?._id === resume._id}
                  onClick={handleResumeSelect}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Live Job Postings ── */}
        {selectedResume && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>🔍 Live Job Postings</CardTitle>
                  <CardDescription className="mt-1">
                    Jobs matching skills from{" "}
                    <span className="font-medium text-gray-700">
                      {selectedResume.fileName}
                    </span>
                  </CardDescription>
                </div>
                {jobPostings?.available && totalJobs > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    background: 'rgba(99,102,241,0.18)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: 100,
                    padding: '4px 14px',
                  }}>
                    {totalJobs} jobs found
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Fetching live jobs for{" "}
                  <span className="font-medium text-gray-600">
                    {selectedResume.fileName}
                  </span>
                  …
                </div>
              ) : jobPostings?.available && jobPostings.jobs.length > 0 ? (
                <div className="space-y-6">
                  {/* Skills used for search */}
                  {selectedResume.extractedSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                      <span className="text-xs text-gray-500 self-center mr-1">
                        Searching by:
                      </span>
                      {selectedResume.extractedSkills.slice(0, 5).map((sk, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs text-gray-600"
                        >
                          {sk}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Job grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>

                  {/* Showing X of Y */}
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <p className="text-xs text-gray-400">
                      Showing{" "}
                      <span className="font-semibold text-gray-600">
                        {Math.min(visibleCount, totalJobs)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-600">
                        {totalJobs}
                      </span>{" "}
                      jobs
                      {jobPostings.total && jobPostings.total > totalJobs
                        ? ` (${jobPostings.total.toLocaleString()} total on platform)`
                        : ""}
                    </p>

                    {hasMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSeeMore}
                        disabled={loadingMore}
                        className="px-8 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Loading…
                          </span>
                        ) : (
                          `See More (${totalJobs - visibleCount} remaining)`
                        )}
                      </Button>
                    )}

                    {!hasMore && totalJobs > PAGE_SIZE && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ All jobs loaded
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-2xl mb-2">🔍</p>
                  {!jobPostings?.available &&
                  jobPostings?.message?.includes("not configured") ? (
                    <>
                      <p className="text-gray-700 font-medium text-sm">
                        Live job postings not configured
                      </p>
                      <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                        Add your free Adzuna API credentials to{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          backend/.env
                        </code>{" "}
                        to enable live job listings.
                      </p>
                      <a
                        href="https://developer.adzuna.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="mt-3">
                          Get Free Adzuna API Key →
                        </Button>
                      </a>
                    </>
                  ) : jobPostings?.message?.includes("No skills") ? (
                    <>
                      <p className="text-gray-600 text-sm font-medium">
                        No skills extracted from this resume
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Re-upload the resume so the NLP service can extract
                        skills, then try again.
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-sm font-medium">
                      {jobPostings?.message || "No jobs found for these skills"}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </Layout>
  );
}
