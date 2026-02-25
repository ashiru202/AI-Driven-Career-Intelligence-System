import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import Layout from "../components/Layout";

export default function AllRoadmaps() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [minCompletion, setMinCompletion] = useState(0); // 0-100
  const [sortBy, setSortBy] = useState("LATEST"); // LATEST | COMPLETION_DESC | COMPLETION_ASC

  const load = async () => {
    setErr("");
    try {
      const res = await api.get("/api/roadmaps");
      setRoadmaps(res.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load roadmaps");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const completionOf = (r) => {
    const total = r.skillsToLearn?.length || 0;
    if (!total) return 0;
    const done = r.skillsToLearn.filter((s) => s.status === "COMPLETED").length;
    return Math.round((done / total) * 100);
  };
  const [selected, setSelected] = useState(null); // modal roadmap

const exportCSV = () => {
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const esc = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const statusLabel = (s) => {
    if (s === "COMPLETED") return "Completed";
    if (s === "IN_PROGRESS") return "In Progress";
    return "Pending";
  };

  // ── Section 1: Roadmap Summary ──────────────────────────────────────────
  const summaryHeaders = [
    "#",
    "User Name",
    "User Email",
    "User Role",
    "Target Role",
    "Total Skills",
    "Completed",
    "In Progress",
    "Pending",
    "Completion %",
    "Created Date",
  ];

  const summaryRows = filtered.map((r, i) => {
    const skills = r.skillsToLearn || [];
    const total = skills.length;
    const completed = skills.filter((s) => s.status === "COMPLETED").length;
    const inProgress = skills.filter((s) => s.status === "IN_PROGRESS").length;
    const pending = total - completed - inProgress;
    const pct = total ? Math.round((completed / total) * 100) : 0;

    return [
      i + 1,
      r.user?.name || "",
      r.user?.email || "",
      r.user?.role || "",
      r.targetRole || "",
      total,
      completed,
      inProgress,
      pending,
      `${pct}%`,
      formatDate(r.createdAt),
    ].map(esc);
  });

  // ── Section 2: Skills Detail ────────────────────────────────────────────
  const skillHeaders = [
    "#",
    "User Name",
    "User Email",
    "Target Role",
    "Skill Name",
    "Skill Status",
    "Roadmap Created Date",
  ];

  const skillRows = [];
  let skillIdx = 1;
  filtered.forEach((r) => {
    const skills = r.skillsToLearn || [];
    skills.forEach((s) => {
      skillRows.push(
        [
          skillIdx++,
          r.user?.name || "",
          r.user?.email || "",
          r.targetRole || "",
          s.skill || "",
          statusLabel(s.status),
          formatDate(r.createdAt),
        ].map(esc)
      );
    });
  });

  const exportedOn = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const lines = [
    // Meta
    [esc("AI-Driven Career Intelligence System – Roadmaps Report")],
    [esc(`Exported on: ${exportedOn}`), esc(`Total roadmaps: ${filtered.length}`)],
    [],
    // Summary section
    [esc("SECTION 1: Roadmap Summary")],
    summaryHeaders.map(esc),
    ...summaryRows,
    [],
    // Skills detail section
    [esc("SECTION 2: Skills Detail (one row per skill)")],
    skillHeaders.map(esc),
    ...skillRows,
  ];

  const csv = "\uFEFF" + lines.map((row) => row.join(",")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roadmaps_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
  
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = [...roadmaps];

    // search
    if (q) {
      list = list.filter((r) => {
        const name = r.user?.name?.toLowerCase() || "";
        const email = r.user?.email?.toLowerCase() || "";
        const targetRole = (r.targetRole || "").toLowerCase();
        return name.includes(q) || email.includes(q) || targetRole.includes(q);
      });
    }

    // completion filter
    list = list.filter((r) => completionOf(r) >= Number(minCompletion));

    // sorting
    if (sortBy === "COMPLETION_DESC") {
      list.sort((a, b) => completionOf(b) - completionOf(a));
    } else if (sortBy === "COMPLETION_ASC") {
      list.sort((a, b) => completionOf(a) - completionOf(b));
    } else {
      // latest first
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [roadmaps, search, minCompletion, sortBy]);

  const statusColor = (status) => {
    if (status === "COMPLETED") return { bg: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "rgba(16,185,129,0.3)" };
    if (status === "IN_PROGRESS") return { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "rgba(99,102,241,0.3)" };
    return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.1)" };
  };

  return (
    <Layout>
      <div className="space-y-1" style={{ marginBottom: 20 }}>
        <h2 className="text-3xl font-bold text-white">All Roadmaps</h2>
        <p className="text-slate-400 text-sm">Management - view and filter all user roadmaps</p>
      </div>

      {err && <p style={{ marginTop: 12, color: "#fca5a5" }}>{err}</p>}

      {/* Controls */}
      <div
        style={{
          marginTop: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1fr 160px 180px auto",
          gap: 12,
          alignItems: "end",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div>
          <label style={label}>Search (name / email / target role)</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            style={input}
          />
        </div>

        <div>
          <label style={label}>Min completion</label>
          <select value={minCompletion} onChange={(e) => setMinCompletion(e.target.value)} style={input}>
            <option value={0}>0%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
          </select>
        </div>

        <div>
          <label style={label}>Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input}>
            <option value="LATEST">Latest</option>
            <option value="COMPLETION_DESC">Completion (High → Low)</option>
            <option value="COMPLETION_ASC">Completion (Low → High)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button onClick={load} style={btn}>Refresh</button>
          <button onClick={exportCSV} style={btn}>Export CSV</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 12, opacity: 0.8 }}>
        Showing <b>{filtered.length}</b> of <b>{roadmaps.length}</b> roadmaps
      </div>

      {/* Table */}
      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)" }}>
              <th style={th}>Actions</th>
              <th style={th}>User</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Target Role</th>
              <th style={th}>Skills</th>
              <th style={th}>Completion</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const completion = completionOf(r);
              const skills = r.skillsToLearn?.length || 0;

              return (
                <tr key={r._id}>
                  <td style={td}>
                  <button onClick={() => setSelected(r)} style={btnSmall}>View</button>
                  </td>
                  <td style={td}>{r.user?.name || "N/A"}</td>
                  <td style={td}>{r.user?.email || "N/A"}</td>
                  <td style={td}>{r.user?.role || "N/A"}</td>
                  <td style={td}>{r.targetRole || "N/A"}</td>
                  <td style={td}>{skills}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 120, height: 8, background: "rgba(255,255,255,0.12)", borderRadius: 999 }}>
                        <div
                          style={{
                            width: `${completion}%`,
                            height: 8,
                            background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <span>{completion}%</span>
                    </div>
                  </td>
                  <td style={td}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                </tr>
              );
            })}

            {!err && filtered.length === 0 && (
              <tr>
                <td style={td} colSpan={7}>No roadmaps match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
  <div style={modalOverlay} onClick={() => setSelected(null)}>
    <div style={modalBox} onClick={(e) => e.stopPropagation()}>

      {/* Modal Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Roadmap Details</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Full breakdown of this user's roadmap</p>
        </div>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}
        >✕ Close</button>
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "User", value: selected.user?.name || "N/A" },
          { label: "Email", value: selected.user?.email || "N/A" },
          { label: "Account Role", value: selected.user?.role || "N/A" },
          { label: "Target Role", value: selected.targetRole || "N/A" },
          { label: "Created", value: selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-" },
          { label: "Completion", value: `${completionOf(selected)}%` },
        ].map(({ label: l, value: v }) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          <span>Overall Progress</span>
          <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{completionOf(selected)}%</span>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
          <div style={{ width: `${completionOf(selected)}%`, height: 8, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 999, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Skills */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 }}>
          Skills ({(selected.skillsToLearn || []).length})
        </h4>
        {(selected.skillsToLearn || []).length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selected.skillsToLearn.map((s) => {
              const sc = statusColor(s.status);
              return (
                <div
                  key={s._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span style={{ fontWeight: 500, color: "#e2e8f0", fontSize: 14 }}>{s.skill}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: sc.bg,
                    color: sc.color,
                    border: `1px solid ${sc.border}`,
                    letterSpacing: 0.5,
                  }}>{s.status}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No skills added yet.</p>
        )}
      </div>
    </div>
  </div>
)}
</Layout>
  );
}

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000
};

const modalBox = {
  width: "min(800px, 96vw)",
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 16,
  padding: 24,
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
  maxHeight: "85vh",
  overflow: "auto",
  color: "#fff"
};

const label = { display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6, color: "rgba(255,255,255,0.7)" };
const input = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff" };
const btn = { padding: "10px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 };
const btnSmall = { padding: "6px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 13 };

const th = { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "rgba(255,255,255,0.6)" };
const td = { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14, color: "#e2e8f0" };
