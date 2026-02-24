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
  const rows = filtered.map((r) => {
    const completion = completionOf(r);
    const totalSkills = r.skillsToLearn?.length || 0;
    const completed = (r.skillsToLearn || []).filter(s => s.status === "COMPLETED").length;

    return {
      user_name: r.user?.name || "",
      user_email: r.user?.email || "",
      user_role: r.user?.role || "",
      target_role: r.targetRole || "",
      total_skills: totalSkills,
      completed_skills: completed,
      completion_percent: completion,
      created_at: r.createdAt || "",
      skills_list: (r.skillsToLearn || []).map(s => `${s.skill}:${s.status}`).join(" | ")
    };
  });

  const headers = Object.keys(rows[0] || { note: "no_data" });
  const csv = [
    headers.join(","),
    ...rows.map(obj =>
      headers.map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roadmaps_report_${new Date().toISOString().slice(0,10)}.csv`;
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

  return (
    <Layout>
      <h2>All Roadmaps (Management)</h2>
      <a href="/dashboard">← Back</a>

      {err && <p style={{ marginTop: 12, color: "red" }}>{err}</p>}

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Roadmap Details</h3>
        <button style={btnSmall} onClick={() => setSelected(null)}>Close</button>
      </div>

      <div style={{ marginTop: 12, lineHeight: 1.8 }}>
        <div><b>User:</b> {selected.user?.name || "N/A"}</div>
        <div><b>Email:</b> {selected.user?.email || "N/A"}</div>
        <div><b>Role:</b> {selected.user?.role || "N/A"}</div>
        <div><b>Target Role:</b> {selected.targetRole || "N/A"}</div>
        <div><b>Created:</b> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}</div>
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>
        <h4 style={{ margin: "0 0 10px" }}>Skills</h4>

        {(selected.skillsToLearn || []).length ? (
          selected.skillsToLearn.map((s) => (
            <div
              key={s._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                marginBottom: 8,
                background: "rgba(255,255,255,0.04)"
              }}
            >
              <span><b>{s.skill}</b></span>
              <span>{s.status}</span>
            </div>
          ))
        ) : (
          <p>No skills.</p>
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
