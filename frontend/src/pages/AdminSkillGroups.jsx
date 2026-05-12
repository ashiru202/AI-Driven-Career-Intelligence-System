import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import api from "../api/api";
import Layout from "../components/Layout";
import { useSSE } from "../context/SSEContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

const LEVEL_STYLES = {
  INTERN: "bg-blue-100 text-blue-700",
  PROFESSIONAL: "bg-green-100 text-green-700",
  UNKNOWN: "bg-gray-100 text-gray-600",
};

function LevelBadge({ level }) {
  const normalized = level || "UNKNOWN";
  return (
    <Badge className={LEVEL_STYLES[normalized] || LEVEL_STYLES.UNKNOWN}>
      {normalized === "PROFESSIONAL" ? "Professional" : normalized === "INTERN" ? "Intern" : "Unknown"}
    </Badge>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function AdminSkillGroups() {
  const { liveNotifications } = useSSE();
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ totalResumes: 0, groupedResumeCount: 0 });
  const [filters, setFilters] = useState({ minGroupSize: 2, minSkills: 1, limit: 50 });
  const [expanded, setExpanded] = useState({});
  const [updatingLevel, setUpdatingLevel] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("minGroupSize", filters.minGroupSize);
    params.set("minSkills", filters.minSkills);
    params.set("limit", filters.limit);
    return params.toString();
  }, [filters]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/admin/resumes/skill-groups?${queryString}`);
      const data = res.data.data || {};
      setGroups(data.groups || []);
      setSummary({
        totalResumes: data.totalResumes || 0,
        groupedResumeCount: data.groupedResumeCount || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load CV skill groups");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!liveNotifications.length) return;
    const shouldRefresh = liveNotifications.some((notification) =>
      String(notification?.id || "").startsWith("admin_resume_")
    );
    if (shouldRefresh) loadGroups();
  }, [liveNotifications, loadGroups]);

  const updateFilter = (key, value) => {
    const parsed = Number.parseInt(value, 10);
    setFilters((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) && parsed > 0 ? parsed : prev[key],
    }));
  };

  const updateCandidateLevel = async (resumeId, candidateLevel) => {
    setUpdatingLevel((prev) => ({ ...prev, [resumeId]: true }));
    setError("");
    try {
      await api.patch(`/api/admin/resumes/${resumeId}/candidate-level`, { candidateLevel });
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update candidate level");
    } finally {
      setUpdatingLevel((prev) => ({ ...prev, [resumeId]: false }));
    }
  };

  const totalResumes = summary.totalResumes || groups.reduce((sum, group) => sum + Number(group.resumeCount || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">CV Skill Groups</h2>
            <p className="mt-1 text-sm text-slate-400">
              Find candidates with the same normalized skill set and compare their experience level.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              <Users size={13} /> {groups.length} groups
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
              <FileText size={13} /> {totalResumes} resumes
            </span>
            <Button onClick={loadGroups} disabled={loading} className="bg-white/10 text-white hover:bg-white/20">
              <RefreshCw size={15} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="border-white/10 bg-[#101827]">
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Min group size
                </span>
                <input
                  type="number"
                  min="2"
                  value={filters.minGroupSize}
                  onChange={(e) => updateFilter("minGroupSize", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Min skills
                </span>
                <input
                  type="number"
                  min="1"
                  value={filters.minSkills}
                  onChange={(e) => updateFilter("minSkills", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Limit
                </span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={filters.limit}
                  onChange={(e) => updateFilter("limit", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1326] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <Card className="border-white/10 bg-[#0f1726]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <Search size={18} /> Matching Skill Sets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading skill groups...</p>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p>No matching CV skill groups found.</p>
                <p className="mt-1 text-sm">
                  {totalResumes > 0
                    ? `${totalResumes} CV upload${totalResumes === 1 ? "" : "s"} found, but none share enough overlapping skills yet.`
                    : "Upload at least two CVs to compare candidates with similar skills."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.08em] text-white/45">
                    <tr>
                      <th className="px-4 py-3">Skill Set</th>
                      <th className="px-4 py-3">Resumes</th>
                      <th className="px-4 py-3">Intern</th>
                      <th className="px-4 py-3">Professional</th>
                      <th className="px-4 py-3">Unknown</th>
                      <th className="px-4 py-3">Latest Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const isOpen = Boolean(expanded[group.skillsSignature]);
                      return (
                        <Fragment key={group.skillsSignature}>
                          <tr className="border-t border-white/5 align-top transition-colors hover:bg-white/[0.04]">
                            <td className="px-4 py-4">
                              <button
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [group.skillsSignature]: !prev[group.skillsSignature],
                                  }))
                                }
                                className="mb-2 flex items-center gap-2 text-left font-semibold text-white"
                              >
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                {group.skillCount} shared skills
                              </button>
                              {group.matchType === "similar" && (
                                <span className="mb-2 inline-flex rounded-full border border-sky-300/25 bg-sky-400/10 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                                  Similar match
                                </span>
                              )}
                              <div className="flex max-w-[520px] flex-wrap gap-1.5">
                                {(group.normalizedSkills || []).map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/70"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 font-semibold text-white/85">{group.resumeCount}</td>
                            <td className="px-4 py-4 text-sky-200">{group.candidateLevels?.INTERN || 0}</td>
                            <td className="px-4 py-4 text-emerald-200">{group.candidateLevels?.PROFESSIONAL || 0}</td>
                            <td className="px-4 py-4 text-slate-300">{group.candidateLevels?.UNKNOWN || 0}</td>
                            <td className="px-4 py-4 text-white/55">{formatDate(group.latestCreatedAt)}</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-white/5 bg-[#0b1326]">
                              <td colSpan="6" className="px-4 py-4">
                                <div className="overflow-x-auto rounded-lg border border-white/10">
                                  <table className="w-full min-w-[760px] text-sm">
                                    <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.08em] text-white/40">
                                      <tr>
                                        <th className="px-3 py-2">Candidate</th>
                                        <th className="px-3 py-2">Email</th>
                                        <th className="px-3 py-2">Level</th>
                                        <th className="px-3 py-2">Source</th>
                                        <th className="px-3 py-2">Resume</th>
                                        <th className="px-3 py-2">Uploaded</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(group.resumes || []).map((resume) => (
                                        <tr key={resume.id} className="border-t border-white/5">
                                          <td className="px-3 py-2 font-medium text-white/85">
                                            {resume.user?.name || "Unknown user"}
                                          </td>
                                          <td className="px-3 py-2 text-white/55">{resume.user?.email || "-"}</td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                              <LevelBadge level={resume.candidateLevel} />
                                              <select
                                                value={resume.candidateLevel || "UNKNOWN"}
                                                disabled={updatingLevel[resume.id]}
                                                onChange={(e) => updateCandidateLevel(resume.id, e.target.value)}
                                                className="rounded-md border border-white/10 bg-[#101827] px-2 py-1 text-xs text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                                                aria-label="Update candidate level"
                                              >
                                                <option value="INTERN">Intern</option>
                                                <option value="PROFESSIONAL">Professional</option>
                                                <option value="UNKNOWN">Unknown</option>
                                              </select>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-white/50">{resume.candidateLevelSource || "-"}</td>
                                          <td className="px-3 py-2 text-white/70">{resume.fileName}</td>
                                          <td className="px-3 py-2 text-white/50">{formatDate(resume.createdAt)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
