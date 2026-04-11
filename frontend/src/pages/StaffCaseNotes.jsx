import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { AlertTriangle, FileText, Save, Search, Tags, Trash2 } from "lucide-react";

function splitTags(input) {
  return [...new Set(
    String(input || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 20);
}

function formatDate(dateLike) {
  if (!dateLike) return "-";
  return new Date(dateLike).toLocaleString();
}

export default function StaffCaseNotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get("userId") || "";

  const [queueItems, setQueueItems] = useState([]);
  const [queueSearch, setQueueSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState(queryUserId);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState([]);
  const [loadingCase, setLoadingCase] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [savingNewNote, setSavingNewNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [savingNoteId, setSavingNoteId] = useState("");

  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/api/staff/priority-queue", {
        params: { search: queueSearch, page: 1, limit: 150 },
      });
      const items = res.data?.data?.items || [];
      setQueueItems(items);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [queueSearch]);

  const fetchCase = useCallback(async (userId) => {
    if (!userId) {
      setSelectedUser(null);
      setNotes([]);
      setTagsInput("");
      return;
    }

    setLoadingCase(true);
    try {
      const res = await api.get(`/api/staff/cases/${userId}/notes`);
      const data = res.data?.data || {};
      setSelectedUser(data.user || null);
      setNotes(data.notes || []);
      setTagsInput((data.tags || []).join(", "));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load case notes");
      setSelectedUser(null);
      setNotes([]);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchCase(selectedUserId);
  }, [selectedUserId, fetchCase]);

  useEffect(() => {
    setSelectedUserId(queryUserId);
  }, [queryUserId]);

  const selectedTags = useMemo(() => splitTags(tagsInput), [tagsInput]);

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    const next = new URLSearchParams(searchParams);
    if (userId) next.set("userId", userId);
    else next.delete("userId");
    setSearchParams(next, { replace: true });
  };

  const handleSaveTags = async () => {
    if (!selectedUserId) return;
    setSavingTags(true);
    try {
      await api.patch(`/api/staff/cases/${selectedUserId}/tags`, { tags: selectedTags });
      setError("");
      await fetchCase(selectedUserId);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update tags");
    } finally {
      setSavingTags(false);
    }
  };

  const handleCreateNote = async () => {
    if (!selectedUserId) {
      setError("Select a user first.");
      return;
    }
    if (!newNote.trim()) {
      setError("Note content is required.");
      return;
    }

    setSavingNewNote(true);
    try {
      const res = await api.post(`/api/staff/cases/${selectedUserId}/notes`, {
        content: newNote,
      });
      const created = res.data?.data?.note;
      if (created) {
        setNotes((prev) => [created, ...prev]);
      }
      setNewNote("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to create note");
    } finally {
      setSavingNewNote(false);
    }
  };

  const handleSaveEditedNote = async (noteId) => {
    if (!editingContent.trim()) {
      setError("Note content cannot be empty.");
      return;
    }

    setSavingNoteId(noteId);
    try {
      const res = await api.patch(`/api/staff/cases/${selectedUserId}/notes/${noteId}`, {
        content: editingContent,
      });
      const updated = res.data?.data?.note;
      if (updated) {
        setNotes((prev) => prev.map((note) => (note._id === noteId ? updated : note)));
      }
      setEditingNoteId("");
      setEditingContent("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update note");
    } finally {
      setSavingNoteId("");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;

    setSavingNoteId(noteId);
    try {
      await api.delete(`/api/staff/cases/${selectedUserId}/notes/${noteId}`);
      setNotes((prev) => prev.filter((note) => note._id !== noteId));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to delete note");
    } finally {
      setSavingNoteId("");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Case Notes & Tags</h2>
          <p className="text-slate-300 mt-2 text-sm max-w-2xl">
            Keep short case notes and labels to track user context between staff follow-ups.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              borderRadius: 12,
              padding: "12px 18px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
            }}
          >
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Search size={15} className="text-cyan-300" /> Select User
              </CardTitle>
              <Input
                placeholder="Search name or email"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                style={{
                  marginTop: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                }}
              />
            </CardHeader>
            <CardContent className="pt-3">
              {loadingUsers ? (
                <p className="text-sm text-slate-400">Loading users...</p>
              ) : queueItems.length === 0 ? (
                <p className="text-sm text-slate-400">No users found.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                  {queueItems.map((item) => {
                    const isActive = item.user?._id === selectedUserId;
                    return (
                      <button
                        key={item.user?._id}
                        onClick={() => handleSelectUser(item.user?._id)}
                        className="w-full text-left rounded-xl px-3 py-2 transition"
                        style={{
                          border: isActive
                            ? "1px solid rgba(56,189,248,0.45)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: isActive
                            ? "rgba(56,189,248,0.16)"
                            : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="text-white text-sm font-semibold">{item.user?.name}</div>
                        <div className="text-xs text-slate-400">{item.user?.email}</div>
                        <div className="mt-1 text-[11px] text-slate-300">
                          Priority {Math.round(Number(item.effectivePriority || 0))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="xl:col-span-2 space-y-6">
            <Card
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
              }}
            >
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Tags size={15} className="text-amber-300" /> Tags
                </CardTitle>
                {selectedUser ? (
                  <p className="text-xs text-slate-400">
                    {selectedUser.name} ({selectedUser.email})
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Select a user to manage tags and notes.</p>
                )}
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={!selectedUserId || loadingCase}
                  placeholder="risk-high, no-response, cv-review-needed"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      className="border"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        borderColor: "rgba(245,158,11,0.4)",
                        color: "#fde68a",
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {!selectedTags.length && <span className="text-xs text-slate-400">No tags yet.</span>}
                </div>
                <Button
                  onClick={handleSaveTags}
                  disabled={!selectedUserId || savingTags || loadingCase}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Save size={13} className="mr-1" />
                  {savingTags ? "Saving..." : "Save Tags"}
                </Button>
              </CardContent>
            </Card>

            <Card
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                background: "linear-gradient(145deg, rgba(18,22,38,0.88), rgba(12,14,27,0.92))",
              }}
            >
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileText size={15} className="text-emerald-300" /> Case Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    disabled={!selectedUserId || loadingCase}
                    placeholder="Write a note about this user's progress, blockers, or next action..."
                    className="text-sm"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                  />
                  <Button
                    onClick={handleCreateNote}
                    disabled={!selectedUserId || savingNewNote || loadingCase}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {savingNewNote ? "Adding..." : "Add Note"}
                  </Button>
                </div>

                {loadingCase ? (
                  <p className="text-sm text-slate-400">Loading case data...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet for this user.</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => {
                      const isEditing = editingNoteId === note._id;
                      const isSaving = savingNoteId === note._id;
                      return (
                        <div
                          key={note._id}
                          style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            padding: 12,
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div className="text-xs text-slate-400 mb-2">
                            {note.author?.name || "Staff"} • {formatDate(note.createdAt)}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="text-sm"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 10,
                                  color: "#fff",
                                }}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleSaveEditedNote(note._id)}
                                  disabled={isSaving}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingNoteId("");
                                    setEditingContent("");
                                  }}
                                  className="bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-slate-100 whitespace-pre-wrap">{note.content}</p>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  onClick={() => {
                                    setEditingNoteId(note._id);
                                    setEditingContent(note.content || "");
                                  }}
                                  className="bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeleteNote(note._id)}
                                  disabled={isSaving}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Trash2 size={13} className="mr-1" /> Delete
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
