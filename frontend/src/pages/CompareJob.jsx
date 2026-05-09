import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input, Label } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

export default function CompareJob() {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  useEffect(() => {
    fetchHistory(historyPage);
    fetchResumes();
  }, [historyPage]);

  const fetchResumes = async () => {
    try {
      const res = await api.get("/api/resumes", { params: { limit: 100 } });
      if (res.data.ok && res.data.data) {
        const list = res.data.data.resumes || [];
        setResumes(list);
        // Default to the most recent resume
        if (list.length > 0) setSelectedResumeId(list[0]._id);
      }
    } catch (e) {
      console.error("Failed to load resumes:", e);
    }
  };

  const fetchHistory = async (p = 1) => {
    try {
      setHistoryLoading(true);
      const res = await api.get("/api/comparisons", { params: { page: p } });
      if (res.data.ok && res.data.data) {
        setHistory(res.data.data.comparisons || []);
        setHistoryPagination(res.data.data.pagination || null);
      }
    } catch (e) {
      console.error("Failed to load comparison history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!jobTitle.trim()) {
      setError("Please enter a job title");
      return;
    }
    
    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await api.post("/api/comparisons/compare", {
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        ...(selectedResumeId ? { resumeId: selectedResumeId } : {}),
      });

      if (res.data.ok && res.data.data) {
        setResult(res.data.data);
        setSelectedHistory(null);
        setHistoryPage(1);
        fetchHistory(1);
        fetchResumes(); // refresh resume list
      }
    } catch (e) {
      console.error("Compare failed:", e.response?.data || e);
      const errorMsg = e.response?.data?.error?.message || "Comparison failed";
      const errorCode = e.response?.data?.error?.code;
      
      if (errorCode === 'NO_RESUME') {
        setError("Please upload a resume first before comparing with jobs.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const viewHistoryItem = async (id) => {
    try {
      const res = await api.get(`/api/comparisons/${id}`);
      if (res.data.ok && res.data.data) {
        const c = res.data.data;
        setSelectedHistory({
          comparisonId: c.comparisonId,
          jobTitle: c.jobTitle,
          matchScore: c.matchScore,
          totalJobSkills: c.jobSkills?.length || 0,
          matchedSkills: c.commonSkills?.length || 0,
          commonSkills: c.commonSkills || [],
          missingSkills: c.missingSkills || [],
          resumeSkills: c.resumeSkills || [],
          resumeFileName: c.resumeFileName || "",
        });
        setResult(null);
      }
    } catch (e) {
      console.error("Failed to load comparison:", e);
    }
  };

  const activeResult = useMemo(() => {
    const base = result || selectedHistory;
    if (!base) return null;
    const commonSkills = Array.isArray(base.commonSkills) ? base.commonSkills : [];
    const missingSkills = Array.isArray(base.missingSkills) ? base.missingSkills : [];
    const resumeSkills = Array.isArray(base.resumeSkills) ? base.resumeSkills : [];
    const totalJobSkills =
      typeof base.totalJobSkills === "number"
        ? base.totalJobSkills
        : Array.isArray(base.jobSkills)
          ? base.jobSkills.length
          : 0;
    const matchedSkills =
      typeof base.matchedSkills === "number"
        ? base.matchedSkills
        : commonSkills.length;

    return {
      ...base,
      commonSkills,
      missingSkills,
      resumeSkills,
      totalJobSkills,
      matchedSkills,
    };
  }, [result, selectedHistory]);

  const generateRoadmap = async () => {
    if (activeResult && activeResult.missingSkills.length > 0) {
      try {
        const response = await api.post('/api/roadmaps-new', {
          targetRole: activeResult.jobTitle,
          missingSkills: activeResult.missingSkills,
          jobTitle: activeResult.jobTitle,
          comparisonId: activeResult.comparisonId
        });

        if (response.data.ok) {
          navigate('/my-roadmap');
        }
      } catch (error) {
        console.error('Failed to create roadmap:', error);
        setError('Failed to create roadmap. Please try again.');
      }
    }
  };

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white">Compare Job</h2>
          <p className="text-slate-400 mt-1 text-sm">Compare your skills with job requirements</p>
        </div>

        {/* Half/Half layout: left = JD inputs, right = comparison results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Input fields before analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g., Full Stack Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume">Resume to Compare</Label>
                  {resumes.length === 0 ? (
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                      No resumes uploaded yet.{" "}
                      <a href="/resume" className="underline font-medium">Upload one first.</a>
                    </p>
                  ) : (
                    <select
                      id="resume"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: '#fff' }}
                    >
                      {resumes.map((r) => (
                        <option key={r._id} value={r._id} style={{ background: '#1e1e2e', color: '#fff' }}>
                          {r.fileName}{" "}
                          ({new Date(r.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea
                    id="jobDescription"
                    rows={8}
                    placeholder="Paste full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Compare Skills'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Comparison Results</CardTitle>
              <CardDescription>
                {activeResult
                  ? (selectedHistory ? `Result: ${activeResult.jobTitle}` : "Latest result")
                  : "Run a comparison to see match score and skills"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              {activeResult ? (
                <div className="space-y-4 flex-1">
                  <div className="rounded-md border border-white/15 px-4 py-3">
                    <div className="text-sm text-slate-400">match score</div>
                    <div className={`text-5xl font-bold ${getMatchColor(activeResult.matchScore)}`}>
                      {activeResult.matchScore}%
                    </div>
                    <div className="text-xs mt-1 text-slate-400">
                      {activeResult.matchedSkills} of {activeResult.totalJobSkills} required skills
                    </div>
                    {activeResult.resumeFileName ? (
                      <div
                        className="mt-2 inline-flex items-center gap-1 text-xs rounded px-2 py-1 truncate bg-indigo-500/15 text-indigo-200 border border-indigo-400/30"
                        title={activeResult.resumeFileName}
                      >
                        <FileText size={14} />
                        <span className="truncate">{activeResult.resumeFileName}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-200">common skills</div>
                    <div className="flex flex-wrap gap-2">
                      {activeResult.commonSkills.length > 0 ? (
                        activeResult.commonSkills.map((skill, idx) => (
                          <Badge key={idx} variant="success">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">No matching skills found</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-200">missing skills</div>
                    <div className="flex flex-wrap gap-2">
                      {activeResult.missingSkills.length > 0 ? (
                        activeResult.missingSkills.map((skill, idx) => (
                          <Badge key={idx} variant="destructive">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-green-600">Congratulations! You have all required skills.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-md border border-white/15 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-200">No results yet</p>
                  <p className="text-sm mt-2 text-slate-400">
                    Run <span className="font-medium text-slate-300">Compare Skills</span> to see your match score and skill gaps here.
                  </p>
                </div>
              )}

              <Button
                onClick={generateRoadmap}
                className="w-full mt-auto"
                disabled={!activeResult || activeResult.missingSkills.length === 0}
              >
                Generate roadmap
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Comparison History */}
        <div className="mt-10">
          <h3 className="text-xl font-bold text-white mb-4">Comparison History</h3>
          {historyLoading ? (
            <p className="text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-slate-400">No comparisons yet. Run your first comparison above.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <Card
                    key={item._id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-300"
                    onClick={() => viewHistoryItem(item._id)}
                  >
                    <CardContent className="pt-4 space-y-2">
                      <p className="font-semibold truncate" style={{color:'#fff'}}>{item.jobTitle}</p>
                      <div className={`text-2xl font-bold ${getMatchColor(item.matchScore)}`}>
                        {item.matchScore}%
                      </div>
                      <p className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>
                        {item.commonSkills?.length || 0} matched · {item.missingSkills?.length || 0} missing
                      </p>
                      {item.resumeFileName ? (
                        <div
                          className="flex items-center gap-1 text-xs rounded px-2 py-1 truncate"
                          style={{background:'rgba(99,102,241,0.15)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)'}}
                          title={item.resumeFileName}
                        >
                          <FileText size={14} />
                          <span className="truncate">{item.resumeFileName}</span>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 text-xs rounded px-2 py-1"
                          style={{background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.15)'}}
                        >
                          <FileText size={14} />
                          <span>Resume not recorded (old entry)</span>
                        </div>
                      )}
                      <p className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination controls */}
              {historyPagination && historyPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setHistoryPage(p => p - 1)}
                    disabled={historyPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.13)', color:'rgba(255,255,255,0.8)'}}
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>
                  <span className="text-sm" style={{color:'rgba(255,255,255,0.5)'}}>
                    Page <span style={{color:'#fff', fontWeight:600}}>{historyPage}</span> of{" "}
                    <span style={{color:'#fff', fontWeight:600}}>{historyPagination.pages}</span>
                  </span>
                  <button
                    onClick={() => setHistoryPage(p => p + 1)}
                    disabled={historyPage === historyPagination.pages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.13)', color:'rgba(255,255,255,0.8)'}}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}
