import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  getSnapshotSummary,
  getRisingSkills,
  getFallingSkills,
  getSkillsList,
  getSkillDetail,
} from "../api/trendsApi";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, LineChart,
} from "recharts";
import {
  TrendingUp, TrendingDown, Activity, BarChart2, Briefcase,
  RefreshCw, ChevronLeft, ChevronRight, Search, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Globe, MapPin, Layers,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeek(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPct(val) {
  if (val == null) return "N/A";
  return `${(val * 100).toFixed(2)}%`;
}

function formatSlope(slope) {
  if (slope == null) return "N/A";
  const pct = (slope * 100).toFixed(3);
  return slope >= 0 ? `+${pct}% /wk` : `${pct}% /wk`;
}

function daysAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

function directionColor(dir) {
  if (dir === "rising")  return { text: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)" };
  if (dir === "falling") return { text: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" };
  return { text: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
}

function DirectionBadge({ direction }) {
  const c = directionColor(direction);
  if (direction === "rising")  return (
    <span style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
      ↑ Rising
    </span>
  );
  if (direction === "falling") return (
    <span style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
      ↓ Falling
    </span>
  );
  return (
    <span style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
      Stable
    </span>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ points, direction }) {
  if (!points || points.length === 0) return <div style={{ width: 80, height: 30 }} />;
  const color = direction === "rising" ? "#4ade80" : direction === "falling" ? "#f87171" : "#94a3b8";
  const data = points.map((p, i) => ({ i, v: +(p.predictedFreq * 100).toFixed(3) }));
  return (
    <ResponsiveContainer width={80} height={30}>
      <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Rising / Falling Skill Card ──────────────────────────────────────────────

function SkillRow({ item, direction, onSelect, selected }) {
  const c = directionColor(direction);
  return (
    <button
      onClick={() => onSelect(item.skill)}
      style={{
        width: "100%", textAlign: "left", border: "none",
        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
        background: selected ? "rgba(99,102,241,0.12)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <Sparkline points={item.forecastPoints} direction={direction} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.skill.charAt(0).toUpperCase() + item.skill.slice(1)}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>
              {formatSlope(item.trendSlope)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {direction === "rising"
            ? <ArrowUpRight size={16} style={{ color: c.text }} />
            : <ArrowDownRight size={16} style={{ color: c.text }} />}
          {item.latestSnapshot && (
            <span style={{ color: "#94a3b8", fontSize: 11 }}>
              {formatPct(item.latestSnapshot.relativeFreq)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,17,30,0.95)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color || "#e2e8f0", marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" ? `${p.value.toFixed(2)}%` : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Scope Toggle ─────────────────────────────────────────────────────────────

const SCOPES = [
  { key: "combined",  label: "Combined",       Icon: Layers },
  { key: "global",    label: "Global / Remote", Icon: Globe  },
  { key: "local-lk",  label: "Sri Lanka",       Icon: MapPin },
];

function ScopeToggle({ scope, setScope }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "4px", background: "rgba(255,255,255,0.05)",
      borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", width: "fit-content" }}>
      {SCOPES.map(({ key, label, Icon }) => (
        <button key={key} onClick={() => setScope(key)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
          borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
          background: scope === key ? "rgba(99,102,241,0.7)" : "transparent",
          color: scope === key ? "#fff" : "#94a3b8",
          transition: "all 0.15s",
        }}>
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, color }) {
  return (
    <div style={{ background: "rgba(30,32,48,0.85)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "1.1rem 1.3rem", display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value ?? "N/A"}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Skills Table ─────────────────────────────────────────────────────────────

const SKILL_PAGE_SIZE = 10;

function SkillsTable({ scope, onSelectSkill, selectedSkill }) {
  const [skills, setSkills]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [direction, setDirection]   = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(false);

  const totalPages = Math.ceil(total / SKILL_PAGE_SIZE);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: SKILL_PAGE_SIZE, marketScope: scope };
    if (direction !== "all") params.direction = direction;
    if (search) params.search = search;
    getSkillsList(params)
      .then(res => {
        const d = res.data?.data || {};
        setSkills(d.skills || []);
        setTotal(d.pagination?.total || 0);
      })
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [page, direction, search, scope]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [direction, search, scope]);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }}
          style={{ display: "flex", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search skills…"
              style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", width: 180 }}
            />
          </div>
          <button type="submit" style={{ padding: "6px 12px", background: "rgba(99,102,241,0.5)",
            border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, color: "#e2e8f0",
            cursor: "pointer", fontSize: 13 }}>
            Search
          </button>
        </form>
        {["all", "rising", "falling", "stable"].map(d => (
          <button key={d} onClick={() => setDirection(d)} style={{
            padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", fontSize: 13, fontWeight: direction === d ? 600 : 400,
            background: direction === d ? "rgba(99,102,241,0.4)" : "transparent",
            color: direction === d ? "#e2e8f0" : "#94a3b8",
          }}>
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["Skill", "This Week", "4-Wk Forecast", "Trend", "Confidence", "Direction"].map(h => (
                <th key={h} style={{ padding: "8px 10px", color: "#64748b", fontWeight: 600,
                  textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                Loading…
              </td></tr>
            )}
            {!loading && skills.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                No skills match your filter.
              </td></tr>
            )}
            {!loading && skills.map(s => {
              const freq = s.latestSnapshot?.relativeFreq;
              const fp   = s.forecastPoints || [];
              const forecastFreq = fp.length > 0 ? fp[fp.length - 1].predictedFreq : null;
              const delta = (freq != null && forecastFreq != null)
                ? (forecastFreq - freq) * 100 : null;
              const isSelected = selectedSkill === s.skill;
              return (
                <tr key={s.skill}
                  onClick={() => onSelectSkill(s.skill)}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "9px 10px", color: "#e2e8f0", fontWeight: 600 }}>
                    {s.skill.charAt(0).toUpperCase() + s.skill.slice(1)}
                  </td>
                  <td style={{ padding: "9px 10px", color: "#94a3b8" }}>
                    {formatPct(freq)}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{ color: delta == null ? "#64748b" : delta >= 0 ? "#4ade80" : "#f87171" }}>
                      {delta == null ? "N/A" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`}
                    </span>
                  </td>
                  <td style={{ padding: "9px 10px", color: "#94a3b8" }}>
                    {formatSlope(s.trendSlope)}
                  </td>
                  <td style={{ padding: "9px 10px", color: "#94a3b8" }}>
                    {s.trendConfidence != null
                      ? `R²=${(s.trendConfidence).toFixed(2)}`
                      : "N/A"}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <DirectionBadge direction={s.trendDirection} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 12, color: "#64748b", fontSize: 13 }}>
          <span>Showing {((page - 1) * SKILL_PAGE_SIZE) + 1}–{Math.min(page * SKILL_PAGE_SIZE, total)} of {total}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: page === 1 ? "#374151" : "#94a3b8",
              cursor: page === 1 ? "default" : "pointer",
            }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: "4px 8px", color: "#94a3b8" }}>{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: page === totalPages ? "#374151" : "#94a3b8",
              cursor: page === totalPages ? "default" : "pointer",
            }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CARD = {
  background: "rgba(30,32,48,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "1.5rem",
};

export default function TrendsPage() {
  const [scope,          setScope]          = useState("combined");
  const [summary,        setSummary]        = useState(null);
  const [rising,         setRising]         = useState([]);
  const [falling,        setFalling]        = useState([]);
  const [selectedSkill,  setSelectedSkill]  = useState(null);
  const [skillDetail,    setSkillDetail]    = useState(null);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [loadingMeta,    setLoadingMeta]    = useState(true);
  const [myRisingSkills, setMyRisingSkills] = useState([]);
  const [myFallingSkills,setMyFallingSkills]= useState([]);
  const [hasPersonal,    setHasPersonal]    = useState(false);
  const explorerRef = useRef(null);

  // ── Load summary + rising + falling + personal skills ──────────────────────

  const loadMeta = useCallback(() => {
    setLoadingMeta(true);
    Promise.allSettled([
      getSnapshotSummary(),
      getRisingSkills(8, scope),
      getFallingSkills(8, scope),
      api.get("/api/analytics/my-resumes"),
    ])
      .then(([sumRes, rRes, fRes, resumeRes]) => {
        const sum = sumRes.status === "fulfilled" ? sumRes.value.data?.data || {} : {};
        const r   = rRes.status  === "fulfilled" ? rRes.value.data?.data?.skills  || [] : [];
        const f   = fRes.status  === "fulfilled" ? fRes.value.data?.data?.skills  || [] : [];

        setSummary(sum);
        setRising(r);
        setFalling(f);

        // Set default selected skill to highest-slope rising skill
        if (r.length > 0 && selectedSkill === null) {
          setSelectedSkill(r[0].skill);
        }

        // Personal skills cross-reference (best-effort — skip if resumes unavailable)
        if (resumeRes.status === "fulfilled") {
          const resumes = resumeRes.value.data?.data?.resumes || resumeRes.value.data?.data || [];
          const latest  = Array.isArray(resumes) ? resumes[0] : null;
          if (latest?.extractedSkills?.length) {
            setHasPersonal(true);
            const mySkills = latest.extractedSkills.map(s => s.toLowerCase().trim());
            const matches  = (list) => list.filter(item =>
              mySkills.some(ms =>
                ms.includes(item.skill.toLowerCase()) ||
                item.skill.toLowerCase().includes(ms)
              )
            );
            setMyRisingSkills(matches(r));
            setMyFallingSkills(matches(f));
          }
        }
      })
      .finally(() => setLoadingMeta(false));
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // ── Load skill detail when selectedSkill changes ───────────────────────────

  useEffect(() => {
    if (!selectedSkill) return;
    setDetailLoading(true);
    setSkillDetail(null);
    getSkillDetail(selectedSkill, scope)
      .then(res => setSkillDetail(res.data?.data || null))
      .catch(() => setSkillDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedSkill, scope]);

  // ── Skill select handler (also scrolls to explorer) ───────────────────────

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    setTimeout(() => {
      explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // ── Build chart data ───────────────────────────────────────────────────────

  const chartData = (() => {
    if (!skillDetail) return [];
    const history  = skillDetail.history        || [];
    const forecast = skillDetail.forecast?.forecastPoints || [];

    const hist = history.map(d => ({
      week:        formatWeek(d.periodStart),
      historical:  +(d.relativeFreq * 100).toFixed(3),
    }));

    const fcast = forecast.map(d => ({
      week:         formatWeek(d.periodStart),
      forecastFreq: +(d.predictedFreq * 100).toFixed(3),
      upper:        +(d.upperBound   * 100).toFixed(3),
      lower:        +(d.lowerBound   * 100).toFixed(3),
    }));

    return [...hist, ...fcast];
  })();

  const currentWeekLabel = chartData.length > 0
    ? (skillDetail?.history?.length > 0
        ? formatWeek(skillDetail.history[skillDetail.history.length - 1].periodStart)
        : null)
    : null;

  const forecast = skillDetail?.forecast;
  const latestFreq = skillDetail?.history?.slice(-1)[0]?.relativeFreq;

  // ── No-data notice ─────────────────────────────────────────────────────────

  const insufficient = summary?.weeksCovered != null && summary.weeksCovered < 4;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div>

        {/* ── Market Scope Toggle (Task 6.6) ───────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <ScopeToggle scope={scope} setScope={setScope} />
        </div>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: 0 }}>
              {scope === "local-lk" ? "Sri Lanka Skill Trends" : "Industry Skill Trends"}
            </h1>
            {scope === "local-lk" && (
              <span style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                LK Market
              </span>
            )}
            {summary?.lastScrapedAt && (
              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#64748b", borderRadius: 20, padding: "3px 12px", fontSize: 12 }}>
                Updated {daysAgo(summary.lastScrapedAt)}
              </span>
            )}
          </div>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 14 }}>
            Live analysis of skill demand from thousands of job postings  including{" "}
            {scope === "local-lk"
              ? "Sri Lankan job boards"
              : scope === "global"
              ? "global and remote job listings"
              : "global, remote, and Sri Lankan job boards"}.
          </p>
        </div>

        {/* ── Insufficient data warning ─────────────────────────────────────── */}
        {insufficient && (
          <div style={{ ...CARD, borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.06)",
            marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
            <AlertTriangle size={18} style={{ color: "#fbbf24", flexShrink: 0 }} />
            <p style={{ color: "#d1a800", fontSize: 13, margin: 0 }}>
              Trend analysis improves with more data check back after{" "}
              {4 - (summary?.weeksCovered || 0)} more week(s) of data collection.
            </p>
          </div>
        )}

        {/* ── Summary Stats Bar ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12, marginBottom: "2rem" }}>
          <StatCard label="Jobs Indexed"       value={summary?.totalJobsIndexed?.toLocaleString()}
            sub="total postings analysed" Icon={Briefcase} color="#6366f1" />
          <StatCard label="Skills Tracked"     value={summary?.skillsTracked?.toLocaleString()}
            sub="unique skills observed"  Icon={Activity}  color="#4ade80" />
          <StatCard label="Weeks of Data"      value={summary?.weeksCovered}
            sub="weekly snapshots"         Icon={BarChart2} color="#f59e0b" />
          <StatCard label="Forecasts Generated" value={summary?.forecastsGenerated?.toLocaleString()}
            sub={summary?.lastForecastAt ? `last run ${daysAgo(summary.lastForecastAt)}` : undefined}
            Icon={TrendingUp} color="#a78bfa" />
        </div>

        {/* ── Rising & Falling — 2-column ──────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "2rem" }}>

          {/* Rising */}
          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TrendingUp size={18} style={{ color: "#4ade80" }} />
              <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: 0 }}>Rising Skills</h2>
            </div>
            {rising.length === 0 && !loadingMeta && (
              <p style={{ color: "#64748b", fontSize: 13 }}>No rising skill data yet.</p>
            )}
            {rising.map(item => (
              <SkillRow key={item.skill} item={item} direction="rising"
                onSelect={handleSkillSelect} selected={selectedSkill === item.skill} />
            ))}
          </div>

          {/* Falling */}
          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TrendingDown size={18} style={{ color: "#f87171" }} />
              <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: 0 }}>Falling Skills</h2>
            </div>
            {falling.length === 0 && !loadingMeta && (
              <p style={{ color: "#64748b", fontSize: 13 }}>No falling skill data yet.</p>
            )}
            {falling.map(item => (
              <SkillRow key={item.skill} item={item} direction="falling"
                onSelect={handleSkillSelect} selected={selectedSkill === item.skill} />
            ))}
          </div>
        </div>

        {/* ── Skill Trend Explorer (Task 6.1 / 6.4) ────────────────────────── */}
        <div ref={explorerRef} style={{ ...CARD, marginBottom: "2rem", scrollMarginTop: 80 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: 0 }}>
                Skill Trend Explorer
              </h2>
              {selectedSkill && (
                <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                  Click any skill in the cards or table to update this chart.
                </p>
              )}
            </div>
            {selectedSkill && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>
                  {selectedSkill.charAt(0).toUpperCase() + selectedSkill.slice(1)}
                </span>
                {forecast && <DirectionBadge direction={forecast.trendDirection} />}
                {forecast && (
                  <span style={{ color: "#64748b", fontSize: 12 }}>
                    R²={forecast.trendConfidence?.toFixed(2) ?? "N/A"}  |  {formatSlope(forecast.trendSlope)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stat row */}
          {forecast && latestFreq != null && (
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Appears in <strong style={{ color: "#e2e8f0" }}>{formatPct(latestFreq)}</strong> of job postings this week
              </span>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Model: <strong style={{ color: "#e2e8f0" }}>{forecast.modelUsed || "linear"}</strong>
              </span>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Data points: <strong style={{ color: "#e2e8f0" }}>{forecast.dataPointsUsed}</strong>
              </span>
            </div>
          )}

          {!selectedSkill && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              Select a skill from the rising/falling cards or the table below to see its full trend.
            </div>
          )}

          {selectedSkill && detailLoading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
              <div style={{ marginTop: 8 }}>Loading chart…</div>
            </div>
          )}

          {selectedSkill && !detailLoading && skillDetail?.forecastPending && (
            <div style={{ padding: "20px", background: "rgba(245,158,11,0.08)",
              borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", marginBottom: 12 }}>
              <p style={{ color: "#d1a800", fontSize: 13, margin: 0 }}>
                Forecast is pending not enough weekly data yet. Historical data shown below.
              </p>
            </div>
          )}

          {selectedSkill && !detailLoading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis
                  tickFormatter={v => `${v.toFixed(1)}%`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  width={50}
                />
                <Tooltip content={<ChartTooltip />} />

                {currentWeekLabel && (
                  <ReferenceLine x={currentWeekLabel} stroke="#facc15"
                    strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: "Now", fill: "#facc15", fontSize: 10, position: "insideTopLeft" }} />
                )}

                {/* Historical area */}
                <Area
                  type="monotone"
                  dataKey="historical"
                  name="Historical"
                  fill="#6366f1"
                  fillOpacity={0.18}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />

                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="forecastFreq"
                  name="Forecast"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                />

                {/* Confidence upper bound */}
                <Line
                  type="monotone"
                  dataKey="upper"
                  name="Upper Bound"
                  stroke="#a78bfa"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                  dot={false}
                  connectNulls
                />

                {/* Confidence lower bound */}
                <Line
                  type="monotone"
                  dataKey="lower"
                  name="Lower Bound"
                  stroke="#a78bfa"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Your Skills vs Trends (Task 6.5) ─────────────────────────────── */}
        {hasPersonal && (
          <div style={{ ...CARD, marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={18} style={{ color: "#a78bfa" }} />
              <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: 0 }}>
                Your Skills vs Market Trends
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Rising skills you have */}
              <div>
                <h3 style={{ color: "#4ade80", fontSize: 13, fontWeight: 600,
                  marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ArrowUpRight size={14} /> Skills you have that are rising
                </h3>
                {myRisingSkills.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: 13 }}>None of your skills are in the rising list yet.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {myRisingSkills.map(s => (
                      <button key={s.skill} onClick={() => handleSkillSelect(s.skill)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                          background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
                          borderRadius: 20, color: "#4ade80", fontSize: 12, fontWeight: 500,
                          cursor: "pointer" }}>
                        <TrendingUp size={11} />
                        {s.skill.charAt(0).toUpperCase() + s.skill.slice(1)}
                        <span style={{ color: "#86efac", fontSize: 11 }}>
                          {formatSlope(s.trendSlope)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Falling skills you have */}
              <div>
                <h3 style={{ color: "#f87171", fontSize: 13, fontWeight: 600,
                  marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ArrowDownRight size={14} /> Skills you have that are falling
                </h3>
                {myFallingSkills.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: 13 }}>None of your skills are in the falling list.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {myFallingSkills.map(s => (
                      <button key={s.skill} onClick={() => handleSkillSelect(s.skill)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                          borderRadius: 20, color: "#f87171", fontSize: 12, fontWeight: 500,
                          cursor: "pointer" }}>
                        <TrendingDown size={11} />
                        {s.skill.charAt(0).toUpperCase() + s.skill.slice(1)}
                        <span style={{ color: "#fca5a5", fontSize: 11 }}>
                          {formatSlope(s.trendSlope)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Top Skills Table (Task 6.1) ───────────────────────────────────── */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <BarChart2 size={18} style={{ color: "#6366f1" }} />
            <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: 0 }}>
              All Skills Ranked by Trend
            </h2>
            <span style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>
              Click a row to explore its chart
            </span>
          </div>
          <SkillsTable scope={scope} onSelectSkill={handleSkillSelect} selectedSkill={selectedSkill} />
        </div>

      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
