import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input, Label } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function CompareJob() {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  useEffect(() => {
    fetchHistory();
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get("/api/resumes");
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

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get("/api/comparisons");
      if (res.data.ok && res.data.data) {
        setHistory(res.data.data.comparisons || []);
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
        fetchHistory();
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
        });
        setResult(null);
      }
    } catch (e) {
      console.error("Failed to load comparison:", e);
    }
  };

  const activeResult = result || selectedHistory;

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
          <h2 className="text-3xl font-bold text-gray-900">Compare Job</h2>
          <p className="text-gray-600 mt-2">Compare your skills with job requirements</p>
        </div>

        {/* Input Form — full width horizontal */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Enter the job title and description</CardDescription>
          </CardHeader>
          <CardContent>
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
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
                  rows={6}
                  placeholder="Paste the full job description here..."
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

        {/* Comparison History */}
        <div className="mt-10">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Comparison History</h3>
          {historyLoading ? (
            <p className="text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No comparisons yet. Run your first comparison above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <Card
                  key={item._id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-300"
                  onClick={() => viewHistoryItem(item._id)}
                >
                  <CardContent className="pt-4 space-y-2">
                    <p className="font-semibold text-gray-900 truncate">{item.jobTitle}</p>
                    <div className={`text-2xl font-bold ${getMatchColor(item.matchScore)}`}>
                      {item.matchScore}%
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.commonSkills?.length || 0} matched · {item.missingSkills?.length || 0} missing
                    </p>
                    {item.resumeFileName && (
                      <p className="text-xs text-blue-600 truncate" title={item.resumeFileName}>
                        Resume: {item.resumeFileName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Comparison Result — below history */}
        {activeResult && (
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedHistory ? `Result: ${activeResult.jobTitle}` : 'Latest Comparison Result'}
              </h3>
              {activeResult.resumeFileName && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium">
                  Resume: {activeResult.resumeFileName}
                </span>
              )}
              {selectedHistory && (
                <span className="text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded-full px-3 py-1 font-medium">
                  Past comparison
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Match Score</CardTitle>
                  <CardDescription>How well your skills match this job</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getMatchColor(activeResult.matchScore)}`}>
                      {activeResult.matchScore}%
                    </div>
                    <p className="text-gray-600 mt-2">
                      {activeResult.matchedSkills} of {activeResult.totalJobSkills} required skills
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Skills</CardTitle>
                  <CardDescription>Skills you already have</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {activeResult.commonSkills.length > 0 ? (
                      activeResult.commonSkills.map((skill, idx) => (
                        <Badge key={idx} variant="success">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500">No matching skills found</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Missing Skills</CardTitle>
                  <CardDescription>Skills you need to learn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {activeResult.missingSkills.length > 0 ? (
                      activeResult.missingSkills.map((skill, idx) => (
                        <Badge key={idx} variant="destructive">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-green-600">
                        Congratulations! You have all required skills.
                      </p>
                    )}
                  </div>

                  {activeResult.missingSkills.length > 0 && (
                    <Button
                      onClick={generateRoadmap}
                      variant="outline"
                      className="w-full"
                    >
                      Generate Learning Roadmap
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
