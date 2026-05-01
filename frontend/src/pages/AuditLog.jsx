import { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

const ACTION_LABELS = {
  CREATE_STAFF:        { label: "Create Staff",       color: "bg-green-100 text-green-700" },
  CREATE_STAFF_ACCOUNT:{ label: "Create Staff Account", color: "bg-green-100 text-green-700" },
  INVITE_STAFF_ACCOUNT:{ label: "Invite Staff Account", color: "bg-indigo-600 text-white" },
  TOGGLE_USER_STATUS:  { label: "Toggle Status",      color: "bg-amber-100 text-amber-700" },
  DELETE_USER:         { label: "Delete User",         color: "bg-red-100 text-red-600" },
  SUBMIT_STAFF_APPLICATION: { label: "Staff Application Request", color: "bg-blue-100 text-blue-700" },
  APPROVE_STAFF_APPLICATION: { label: "Approve Staff Application", color: "bg-green-100 text-green-700" },
  REJECT_STAFF_APPLICATION:  { label: "Reject Staff Application",  color: "bg-red-100 text-red-600" },
};

const ACTION_ALIASES = {
  INVITE_STAFF: "INVITE_STAFF_ACCOUNT",
  STAFF_INVITE: "INVITE_STAFF_ACCOUNT",
  CREATE_STAFF_INVITE: "INVITE_STAFF_ACCOUNT",
};

const METADATA_LABELS = {
  inviteExpiresAt: "Invite Expires",
  role: "Role",
  active: "Status",
  reason: "Reason",
  decision: "Decision",
};

function isObjectIdLike(value) {
  return /^[a-f\d]{24}$/i.test(value);
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function prettifyMetadataKey(key) {
  if (METADATA_LABELS[key]) return METADATA_LABELS[key];

  const normalized = String(key)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetadataValue(key, value) {
  if (value == null) return null;

  const lowerKey = String(key).toLowerCase();

  if (typeof value === "boolean") {
    if (lowerKey === "active") return value ? "Enabled" : "Disabled";
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatMetadataValue(key, item))
      .filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    return null;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/(token|password|secret)/i.test(lowerKey)) {
    return null;
  }

  const isIdKey = lowerKey === "id" || lowerKey.endsWith("id") || lowerKey.endsWith("_id");
  if (isIdKey && (isObjectIdLike(text) || isUuidLike(text))) {
    return null;
  }

  if (lowerKey.includes("expires") || lowerKey.endsWith("at") || lowerKey.includes("date") || lowerKey.includes("time")) {
    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString();
    }
  }

  if (lowerKey === "role") {
    return text.toUpperCase();
  }

  return text;
}

function normalizeActionKey(action) {
  return String(action || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getActionMeta(action) {
  const normalized = normalizeActionKey(action);
  const actionKey = ACTION_ALIASES[normalized] || normalized;

  if (ACTION_LABELS[actionKey]) return ACTION_LABELS[actionKey];

  const label = String(actionKey || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return { label, color: "bg-slate-700 text-slate-100" };
}

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
      {message}
      <button className="ml-2 opacity-70 hover:opacity-100" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

function MetadataCell({ metadata }) {
  if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  const parts = Object.entries(metadata)
    .map(([key, value]) => {
      const formattedValue = formatMetadataValue(key, value);
      if (!formattedValue) return null;
      return `${prettifyMetadataKey(key)}: ${formattedValue}`;
    })
    .filter(Boolean);

  if (parts.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return <span className="text-xs text-slate-300">{parts.join(" • ")}</span>;
}

const PAGE_SIZE = 15;

export default function AuditLog() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);

  // filter state (applied on submit)
  const [filters, setFilters]     = useState({ action: "", actorEmail: "", from: "", to: "" });
  const [applied, setApplied]     = useState({ action: "", actorEmail: "", from: "", to: "" });

  const showToast = (message, type = "error") => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (applied.action)      params.append("action", applied.action);
    if (applied.actorEmail)  params.append("actorEmail", applied.actorEmail);
    if (applied.from)        params.append("from", applied.from);
    if (applied.to)          params.append("to", applied.to);

    api
      .get(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => {
        const d = res.data.data;
        setLogs(d.logs || []);
        setTotal(d.pagination?.total || 0);
      })
      .catch(() => showToast("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [page, applied]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const uniqueAdmins = new Set(logs.map((log) => log.actorEmail).filter(Boolean)).size;

  function applyFilters() {
    setPage(1);
    setApplied({ ...filters });
  }

  function resetFilters() {
    const empty = { action: "", actorEmail: "", from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  }

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Activity Audit Log</h2>
            <p className="text-slate-400 text-sm mt-0.5">Admin actions and incoming requests recorded in chronological order</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(14,165,233,0.18)", color: "#bae6fd", border: "1px solid rgba(14,165,233,0.35)" }}
            >
              {total} entries
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.16)", color: "#bbf7d0", border: "1px solid rgba(34,197,94,0.35)" }}
            >
              {uniqueAdmins} admins
            </span>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))" }}>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Action type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Action</label>
                <select
                  className="border border-white/15 rounded-md px-3 py-2 text-sm bg-slate-900/80 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                >
                  <option value="">All actions</option>
                  {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Actor email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Admin email</label>
                <Input
                  placeholder="Search by email..."
                  className="w-52 text-sm"
                  value={filters.actorEmail}
                  onChange={(e) => setFilters((f) => ({ ...f, actorEmail: e.target.value }))}
                />
              </div>

              {/* Date from */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">From</label>
                <Input
                  type="date"
                  className="text-sm"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>

              {/* Date to */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">To</label>
                <Input
                  type="date"
                  className="text-sm"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>

              <Button onClick={applyFilters} className="bg-indigo-600 text-white hover:bg-indigo-700">
                Apply
              </Button>
              <Button className="bg-slate-700 text-white hover:bg-slate-600 border border-white/10" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-white/10" style={{ background: "linear-gradient(145deg, rgba(16,20,34,0.9), rgba(12,15,28,0.95))" }}>
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-base text-white">
              {total} log{total !== 1 ? "s" : ""} found
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No audit log entries match your filters.</div>
            ) : (
              <div className="overflow-x-auto table-unified">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/10">
                      <th className="pb-2 pr-4 whitespace-nowrap">Timestamp</th>
                      <th className="pb-2 pr-4">Admin</th>
                      <th className="pb-2 pr-4">Action</th>
                      <th className="pb-2 pr-4">Target</th>
                      <th className="pb-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const actionMeta = getActionMeta(log.action);
                      return (
                        <tr key={log._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]">
                          <td className="py-2 pr-4 whitespace-nowrap text-slate-400 text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4">
                            <p className="font-medium text-white/90">{log.actorName}</p>
                            <p className="text-xs text-slate-400">{log.actorEmail}</p>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge className={actionMeta.color}>{actionMeta.label}</Badge>
                          </td>
                          <td className="py-2 pr-4">
                            {log.targetEmail ? (
                              <>
                                <p className="font-medium">{log.targetName || "—"}</p>
                                <p className="text-xs text-gray-400">{log.targetEmail}</p>
                              </>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <MetadataCell metadata={log.metadata} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ArrowLeft size={14} className="mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
