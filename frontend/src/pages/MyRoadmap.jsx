import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { FileText, BookOpen, Video, GraduationCap, Newspaper, Check, Play, X, Link2, CheckCircle2, Clipboard, Trash2, Eye, ExternalLink, Clock } from "lucide-react";

// ─── Resource helpers ────────────────────────────────────────────────────────

const TYPE_META = {
  documentation: { label: 'Docs', Icon: FileText, bg: '#EFF6FF', text: '#1D4ED8' },
  tutorial:      { label: 'Tutorial', Icon: BookOpen, bg: '#F0FDF4', text: '#15803D' },
  video:         { label: 'Video', Icon: Video, bg: '#FEF2F2', text: '#B91C1C' },
  course:        { label: 'Course', Icon: GraduationCap, bg: '#FAF5FF', text: '#7E22CE' },
  article:       { label: 'Article', Icon: Newspaper, bg: '#FFF7ED', text: '#C2410C' },
};

const FREE_DOMAINS = [
  'youtube.com', 'youtu.be', 'freecodecamp.org', 'developer.mozilla.org',
  'javascript.info', 'realpython.com', 'automatetheboringstuff.com',
  'git-scm.com', 'docs.python.org', 'go.dev', 'doc.rust-lang.org',
  'docs.docker.com', 'kubernetes.io', 'react.dev', 'vuejs.org',
  'angular.dev', 'nextjs.org', 'learn.mongodb.com', 'university.redis.com',
  'skillbuilder.aws', 'learn.microsoft.com', 'cloud.google.com',
  'cloudskillsboost.google', 'kaggle.com', 'fast.ai', 'spacy.io',
  'huggingface.co', 'tensorflow.org', 'pytorch.org', 'scikit-learn.org',
  'leetcode.com', 'hackerrank.com', 'theodinproject.com', 'w3schools.com',
  'play-with-docker.com', 'hackingwithswift.com', 'basarat.gitbook.io',
  'linuxcommand.org', 'overthewire.org', 'algorithm-visualizer.org',
  'visualgo.net', 'scrimba.com', 'docs.flutter.dev', 'restfulapi.net',
  'elasticstack.co', 'elastic.co', 'mode.com', 'skillbuilder.aws',
  'developers.google.com', 'github.com', 'gitlab.com',
];

function isFree(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return FREE_DOMAINS.some(d => host.includes(d));
  } catch { return false; }
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      // Handle playlist / embed paths already
      if (u.pathname.startsWith('/embed')) return url;
    }
    return null;
  } catch { return null; }
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function ResourcePreviewModal({ resource, onClose }) {
  const [copied, setCopied] = useState(false);

  const isObj = resource && typeof resource === 'object';
  const name = isObj ? resource.name : resource;
  const url  = isObj ? resource.url  : null;
  const type = isObj ? resource.type : null;
  const meta = type && TYPE_META[type] ? TYPE_META[type] : null;
  const embedUrl = getYouTubeEmbedUrl(url);
  const free = isFree(url);

  // Parse domain for display
  let domain = '';
  try { domain = new URL(url).hostname.replace('www.', ''); } catch {}

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 780, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {meta && (
                <span style={{ background: meta.bg, color: meta.text, fontSize: 11,
                  fontWeight: 700, padding: '2px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <meta.Icon size={11} /> {meta.label}
                </span>
              )}
              {free && (
                <span style={{ background: '#F0FDF4', color: '#15803D', fontSize: 11,
                  fontWeight: 700, padding: '2px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={10} /> Free</span>
              )}
              {embedUrl && (
                <span style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 11,
                  fontWeight: 700, padding: '2px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Play size={10} /> YouTube</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{name}</h3>
            {domain && <span className="text-xs text-gray-400">{domain}</span>}
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none shrink-0 mt-0.5"
            aria-label="Close"><X size={18} /></button>
        </div>

        {/* Content area */}
        {embedUrl ? (
          /* ── YouTube: real embed player ── */
          <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={`${embedUrl}?autoplay=0&rel=0`}
              title={name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          /* ── Non-YouTube: info card (no iframe — most sites block it) ── */
          <div className="flex flex-col items-center justify-center gap-6 px-10 py-12 bg-gray-50 flex-1">
            {/* Big type icon */}
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl"
              style={{ background: meta ? meta.bg : '#F3F4F6' }}>
              {meta ? <meta.Icon size={40} color={meta.text} /> : <Link2 size={40} color="#6b7280" />}
            </div>

            <div className="text-center space-y-1 max-w-md">
              <p className="font-semibold text-gray-900 text-lg">{name}</p>
              <p className="text-sm text-gray-500">{domain}</p>
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {meta && (
                <span className="px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1"
                  style={{ background: meta.bg, color: meta.text }}>
                  <meta.Icon size={14} /> {meta.label}
                </span>
              )}
              {free && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 inline-flex items-center gap-1">
                  <Check size={13} /> Free resource
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center max-w-sm">
              Most documentation and tutorial sites block in-app previews for security reasons.
              Click below to open the full resource.
            </p>

            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button className="px-8 py-2 text-base">
                Open {domain} <ExternalLink size={12} className="inline ml-1" />
              </Button>
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-white">
          <button onClick={copyUrl}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
            {copied
              ? <><CheckCircle2 size={14} className="inline mr-1 text-green-500" /> Copied!</>
              : <><Clipboard size={14} className="inline mr-1" /> Copy link</>}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">Open in new tab <ExternalLink size={12} className="inline ml-1" /></Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MyRoadmap() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [refreshing, setRefreshing] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);

  useEffect(() => {
    loadRoadmaps();
  }, []);

  const loadRoadmaps = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/roadmaps-new");
      if (res.data.ok && res.data.data) {
        setRoadmaps(res.data.data.roadmaps || []);
        if (res.data.data.roadmaps.length > 0 && !selectedRoadmap) {
          loadRoadmapDetails(res.data.data.roadmaps[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load roadmaps:", e);
      setError(e.response?.data?.error?.message || "Failed to load roadmaps");
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmapDetails = async (id) => {
    try {
      const res = await api.get(`/api/roadmaps-new/${id}`);
      if (res.data.ok && res.data.data) {
        const data = res.data.data;
        setSelectedRoadmap(data);

        // Auto-refresh if any skill still has old plain-string resources
        const hasOldResources = (data.skillsToLearn || []).some(
          (s) => Array.isArray(s.resources) && s.resources.length > 0 && typeof s.resources[0] === 'string'
        );
        if (hasOldResources) {
          try {
            setRefreshing(true);
            const refreshRes = await api.post(`/api/roadmaps-new/${id}/refresh-resources`);
            if (refreshRes.data.ok) {
              setSelectedRoadmap((prev) => ({
                ...prev,
                skillsToLearn: refreshRes.data.data.skillsToLearn,
              }));
            }
          } catch (e) {
            console.warn('Auto-refresh resources failed:', e);
          } finally {
            setRefreshing(false);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load roadmap details:", e);
      setError("Failed to load roadmap details");
    }
  };

  const updateSkillStatus = async (skill, newStatus) => {
    if (!selectedRoadmap) return;

    try {
      const res = await api.patch(`/api/roadmaps-new/${selectedRoadmap.roadmapId}/skills`, {
        skill,
        status: newStatus
      });

      if (res.data.ok) {
        await loadRoadmapDetails(selectedRoadmap.roadmapId);
      }
    } catch (e) {
      console.error("Failed to update skill status:", e);
      setError("Failed to update skill status");
    }
  };

  const refreshResources = async () => {
    if (!selectedRoadmap) return;
    setRefreshing(true);
    setError("");
    try {
      const res = await api.post(`/api/roadmaps-new/${selectedRoadmap.roadmapId}/refresh-resources`);
      if (res.data.ok) {
        await loadRoadmapDetails(selectedRoadmap.roadmapId);
      }
    } catch (e) {
      console.error("Failed to refresh resources:", e);
      setError("Failed to refresh resources");
    } finally {
      setRefreshing(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);

  const deleteRoadmap = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this roadmap? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/roadmaps-new/${id}`);
      // If the deleted one was selected, clear it
      if (selectedRoadmap?.roadmapId === id) setSelectedRoadmap(null);
      setRoadmaps((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('Failed to delete roadmap:', e);
      setError('Failed to delete roadmap. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'default';
      case 'PENDING': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusOptions = (currentStatus) => {
    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    return statuses.filter(s => s !== currentStatus);
  };

  const progress = useMemo(() => {
    const total = selectedRoadmap?.skillsToLearn?.length || 0;
    if (!total) return 0;
    const done = selectedRoadmap.skillsToLearn.filter((s) => s.status === "COMPLETED").length;
    return Math.round((done / total) * 100);
  }, [selectedRoadmap]);

  const filteredSkills = useMemo(() => {
    const list = selectedRoadmap?.skillsToLearn || [];
    if (statusFilter === "ALL") return list;
    return list.filter((x) => x.status === statusFilter);
  }, [selectedRoadmap, statusFilter]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">My Learning Roadmaps</h2>
          <Button onClick={loadRoadmaps} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {roadmaps.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600 text-center">No roadmaps found. Create one from the Compare Job page!</p>
            </CardContent>
          </Card>
        )}

        {roadmaps.length > 0 && (
          <div className="space-y-6">
            {/* Horizontal roadmap cards */}
            <div>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'rgba(255,255,255,0.75)' }}>Your Roadmaps</h3>
              <div className="flex flex-wrap gap-3">
                {roadmaps.map((roadmap) => {
                  const isActive = selectedRoadmap?.roadmapId === roadmap.id;
                  const isDeleting = deletingId === roadmap.id;
                  return (
                    <div key={roadmap.id} style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        onClick={() => loadRoadmapDetails(roadmap.id)}
                        style={{
                          padding: '12px 40px 12px 20px',
                          borderRadius: 12,
                          border: isActive ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.08)',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))'
                            : 'rgba(255,255,255,0.04)',
                          color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.55)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                          minWidth: 160,
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.border = '2px solid rgba(99,102,241,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)'; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.border = '2px solid rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
                        disabled={isDeleting}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{roadmap.targetRole}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{new Date(roadmap.createdAt).toLocaleDateString()}</div>
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => deleteRoadmap(roadmap.id, e)}
                        disabled={isDeleting}
                        title="Delete roadmap"
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: 'none',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          lineHeight: 1,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                      >
                        {isDeleting ? '…' : <Trash2 size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail section — below cards */}
            {selectedRoadmap && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedRoadmap.targetRole}</CardTitle>
                    <CardDescription>
                      Created on {new Date(selectedRoadmap.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Skills to Learn ({filteredSkills.length})</CardTitle>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={refreshResources}
                          disabled={refreshing}
                          title="Fetch real documentation and tutorial links for all skills"
                        >
                          {refreshing ? 'Fetching resources...' : <><Link2 size={13} className="inline mr-1" /> Refresh Resources</>}
                        </Button>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-3 py-1 border rounded-md text-sm"
                          style={{ color: '#111827', backgroundColor: '#ffffff' }}
                        >
                          <option value="ALL" style={{ color: '#111827', backgroundColor: '#ffffff' }}>All</option>
                          <option value="PENDING" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Pending</option>
                          <option value="IN_PROGRESS" style={{ color: '#111827', backgroundColor: '#ffffff' }}>In Progress</option>
                          <option value="COMPLETED" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Completed</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredSkills.map((skillItem, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                        >
                          {/* Header: skill name + status badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-base leading-tight">{skillItem.skill}</h4>
                            <Badge variant={getStatusColor(skillItem.status)} className="shrink-0">
                              {skillItem.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          {skillItem.estimateWeeks && (
                            <p className="text-xs text-gray-500">
                              <Clock size={12} className="inline mr-1" /> Est. {skillItem.estimateWeeks} {skillItem.estimateWeeks === 1 ? 'week' : 'weeks'}
                            </p>
                          )}

                          {/* Resources */}
                          {skillItem.resources && skillItem.resources.length > 0 && (
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 font-medium mb-2">Learning Resources:</p>
                              <ul className="space-y-2">
                                {skillItem.resources.map((resource, ridx) => {
                                  const isObj = resource && typeof resource === 'object';
                                  const name = isObj ? resource.name : resource;
                                  const url  = isObj ? resource.url  : null;
                                  const type = isObj ? resource.type : null;
                                  const meta = type && TYPE_META[type] ? TYPE_META[type] : null;
                                  const free = isFree(url);
                                  const isYT = !!getYouTubeEmbedUrl(url);

                                  return (
                                    <li key={ridx}
                                      className="rounded-lg border bg-white hover:shadow-sm transition-shadow p-2 flex flex-col gap-1.5"
                                    >
                                      {/* Top row: badges + link */}
                                      <div className="flex items-start gap-1.5 flex-wrap">
                                        {meta && (
                                          <span style={{ background: meta.bg, color: meta.text,
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                            borderRadius: 9999, whiteSpace: 'nowrap', letterSpacing: '0.03em',
                                            marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                            <meta.Icon size={9} /> {meta.label}
                                          </span>
                                        )}
                                        {free && (
                                          <span style={{ background: '#F0FDF4', color: '#15803D',
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                            borderRadius: 9999, whiteSpace: 'nowrap', marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                            <Check size={9} /> Free
                                          </span>
                                        )}
                                        {isYT && (
                                          <span style={{ background: '#FEF2F2', color: '#B91C1C',
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                            borderRadius: 9999, whiteSpace: 'nowrap', marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                            <Play size={9} /> YouTube
                                          </span>
                                        )}
                                      </div>

                                      {/* Resource name (link) */}
                                      {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline leading-snug font-medium">
                                          {name}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-700 leading-snug">{name}</span>
                                      )}

                                      {/* Action row */}
                                      {url && (
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <button
                                            onClick={() => setPreviewResource(resource)}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                          >
                                            {isYT
                                              ? <><Play size={11} className="inline mr-1" /> Watch preview</>
                                              : <><Eye size={11} className="inline mr-1" /> Preview</>}
                                          </button>
                                          <span className="text-gray-300">|</span>
                                          <a href={url} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-gray-500 hover:text-gray-700">
                                            Open <ExternalLink size={11} className="inline ml-0.5" />
                                          </a>
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Status buttons pinned to bottom */}
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t mt-auto">
                            {getStatusOptions(skillItem.status).map((status) => (
                              <Button
                                key={status}
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2"
                                onClick={() => updateSkillStatus(skillItem.skill, status)}
                              >
                                {status.replace('_', ' ')}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Resource preview modal */}
      {previewResource && (
        <ResourcePreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </Layout>
  );
}
