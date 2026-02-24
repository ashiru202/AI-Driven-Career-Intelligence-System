import { useEffect, useState, useCallback } from "react";
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

function scoreColor(score) {
  if (score >= 71) return { text: "text-green-600", bar: "bg-green-500", label: "Strong" };
  if (score >= 41) return { text: "text-yellow-600", bar: "bg-yellow-500", label: "Fair" };
  return { text: "text-red-500", bar: "bg-red-500", label: "Needs Work" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function CVScoreRing({ score }) {
  const colors = scoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const strokeClass =
    score >= 71 ? "stroke-green-500" : score >= 41 ? "stroke-yellow-500" : "stroke-red-500";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-700 ${strokeClass}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>{score}%</span>
        </div>
      </div>
      <span className={`mt-1 text-sm font-semibold ${colors.text}`}>{colors.label}</span>
    </div>
  );
}

function SectionCheck({ label, detected }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: detected ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
        {detected ? "✓" : "○"}
      </span>
      <span style={{ color: detected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>{label}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  const [cvCompleteness, setCvCompleteness] = useState(null);
  const [insights, setInsights] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadResumeAnalytics = useCallback(async (resume) => {
    setSelectedResume(resume);
    setResumeLoading(true);
    setCvCompleteness(null);
    setInsights(null);
    setAiSuggestions(null);

    try {
      const [cvRes, insightsRes] = await Promise.all([
        api.get(`/api/analytics/cv-completeness?resumeId=${resume._id}`),
        api.get(`/api/analytics/user-insights?resumeId=${resume._id}`),
      ]);
      setCvCompleteness(cvRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (err) {
      console.error("Resume analytics error:", err);
    } finally {
      setResumeLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setPageLoading(true);
        const resumesRes = await api.get("/api/analytics/my-resumes");
        const fetchedResumes = resumesRes.data.data?.resumes || [];
        setResumes(fetchedResumes);
        if (fetchedResumes.length > 0) {
          await loadResumeAnalytics(fetchedResumes[0]);
        }
      } catch (err) {
        console.error("Analytics init error:", err);
        setError(
          err.response?.data?.error?.message ||
            err.response?.data?.message ||
            "Failed to load analytics. Please make sure you're logged in."
        );
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, [loadResumeAnalytics]);


  const handleResumeSelect = (resume) => {
    if (resume._id === selectedResume?._id) return;
    loadResumeAnalytics(resume);
  };

  const fetchAISuggestions = useCallback(async () => {
    if (!selectedResume) return;
    setAiLoading(true);
    try {
      const res = await api.get(`/api/analytics/cv-ai-suggestions?resumeId=${selectedResume._id}`);
      setAiSuggestions(res.data.data);
    } catch (err) {
      console.error("AI suggestions error:", err);
      setAiSuggestions({ suggestions: ["Failed to generate suggestions. Please try again."], model: "error" });
    } finally {
      setAiLoading(false);
    }
  }, [selectedResume]);

  if (pageLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your analytics…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-1">Error Loading Analytics</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  const cvColors = cvCompleteness ? scoreColor(cvCompleteness.score) : null;

  return (
    <Layout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div>
          <h2 className="text-3xl font-bold text-white">Career Analytics</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Select a resume to see your personalised completeness score and career insights.
          </p>
        </div>

        {/* ── Resume Grid ── */}
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>Your Uploaded Resumes</h3>
          {resumes.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-600 font-medium">No resumes uploaded yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Upload a resume from your Dashboard to get started.
              </p>
              <a href="/dashboard">
                <Button className="mt-4" size="sm">Go to Dashboard →</Button>
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

        {/* ── Per-resume analytics (shown once a CV is selected) ── */}
        {selectedResume && (
          <>
            {resumeLoading ? (
              <div className="flex items-center gap-3 py-6 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Analysing{" "}
                <span className="font-medium text-gray-600">{selectedResume.fileName}</span>…
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── CV Completeness ── */}
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle>📋 CV Completeness Score</CardTitle>
                    <CardDescription>
                      Sections detected in{" "}
                      <span className="font-medium text-gray-700">
                        {cvCompleteness?.fileName || selectedResume.fileName}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {cvCompleteness ? (
                      <>
                        {/* Score ring + section checklist */}
                        <div className="flex items-center gap-6">
                          <CVScoreRing score={cvCompleteness.score} />
                          <div className="space-y-1.5">
                            <SectionCheck label="Work Experience" detected={cvCompleteness.sectionsDetected?.workExperience} />
                            <SectionCheck label="Education" detected={cvCompleteness.sectionsDetected?.education} />
                            <SectionCheck label="Skills" detected={cvCompleteness.sectionsDetected?.skills} />
                            <SectionCheck label="Projects" detected={cvCompleteness.sectionsDetected?.projects} />
                            <SectionCheck label="Profile Summary" detected={cvCompleteness.sectionsDetected?.summary} />
                            <SectionCheck label="Certifications" detected={cvCompleteness.sectionsDetected?.certifications} />
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                            <span>Overall Score</span>
                            <span style={{ fontWeight: 700, color: cvCompleteness.score >= 71 ? '#4ade80' : cvCompleteness.score >= 41 ? '#fbbf24' : '#f87171' }}>
                              {cvCompleteness.score}/100
                            </span>
                          </div>
                          <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8 }}>
                            <div
                              style={{
                                width: `${cvCompleteness.score}%`,
                                height: 8, borderRadius: 99,
                                background: cvCompleteness.score >= 71 ? '#4ade80' : cvCompleteness.score >= 41 ? '#fbbf24' : '#f87171',
                                transition: 'width 0.7s',
                              }}
                            />
                          </div>
                        </div>

                        {/* Missing sections */}
                        {cvCompleteness.missingSections?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                              Missing Sections:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {cvCompleteness.missingSections.map((section) => (
                                <span key={section} style={{ fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, padding: '2px 10px' }}>
                                  {section}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {cvCompleteness.suggestions?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                              💡 Suggestions:
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {cvCompleteness.suggestions.map((s, i) => (
                                <li key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', display: 'flex', gap: 8 }}>
                                  <span style={{ color: '#60a5fa', flexShrink: 0 }}>•</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* AI Suggestions */}
                        <div className="border-t border-purple-100 pt-4 mt-2">
                          <div className="flex items-center justify-between mb-3">
                            {aiSuggestions && aiSuggestions.model !== "quota-exceeded" && (
                              <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                {aiSuggestions.model === "groq" ? "Groq · Llama 3.3" : "rule-based fallback"}
                              </span>
                            )}
                          </div>
                          {!aiSuggestions && !aiLoading && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                              onClick={fetchAISuggestions}
                            >
                              ✨ Generate AI Suggestions
                            </Button>
                          )}
                          {aiLoading && (
                            <div className="flex items-center gap-2 text-purple-600 text-xs py-2 bg-purple-50 rounded-lg px-3">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              Analysing your CV with Groq AI…
                            </div>
                          )}
                          {aiSuggestions && !aiLoading && (
                            <>
                              {aiSuggestions.model === "quota-exceeded" ? (
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-2">
                                  <p className="font-semibold">⚠️ Groq API rate limit hit</p>
                                  <p>{aiSuggestions.error}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <a
                                      href="https://console.groq.com"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline text-amber-700 hover:text-amber-900"
                                    >
                                      Manage at console.groq.com →
                                    </a>
                                    <button
                                      className="text-gray-400 hover:text-gray-600 underline underline-offset-2"
                                      onClick={() => setAiSuggestions(null)}
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <ul className="space-y-2">
                                    {aiSuggestions.suggestions.map((s, i) => (
                                      <li key={i} style={{backgroundColor:"#ede9fe",borderColor:"#a78bfa"}} className="text-xs text-purple-900 border rounded-lg px-3 py-2.5 flex gap-2.5 items-start">
                                        <span style={{backgroundColor:"#7c3aed"}} className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold text-[9px] flex-shrink-0 mt-0.5">{i + 1}</span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    className="text-[10px] text-purple-400 hover:text-purple-700 mt-2.5 flex items-center gap-1"
                                    onClick={() => { setAiSuggestions(null); }}
                                  >
                                    ↻ Regenerate suggestions
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm">No data available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* ── Career Insights ── */}
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle>🎯 Career Insights</CardTitle>
                    <CardDescription>
                      Why you might not get the job - and what to do
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {insights ? (
                      <>
                        {insights.reasons?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>⚠️ Reasons:</p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {insights.reasons.map((reason, idx) => (
                                <li
                                  key={idx}
                                  style={{ fontSize: 11, color: '#fde68a', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '6px 12px' }}
                                >
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {insights.prioritySkills?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                              🚀 Priority Skills to Learn:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {insights.prioritySkills.map((skill, idx) => (
                                <span key={idx} style={{ fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 100, padding: '2px 10px' }}>
                                  {idx + 1}. {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.resumeSkills?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                              ✅ Skills on this Resume ({insights.resumeSkills.length}):
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {insights.resumeSkills.map((skill, idx) => (
                                <span key={idx} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '2px 10px' }}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {insights.actions?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
                              ✔ Recommended Actions:
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {insights.actions.map((action, idx) => (
                                <li
                                  key={idx}
                                  style={{ fontSize: 11, color: '#86efac', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '6px 12px' }}
                                >
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No insights available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </>
        )}

      </div>
    </Layout>
  );
}
