import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Folder, FileText, X, AlertTriangle, Search, CheckCircle2 } from "lucide-react";

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function validateFile(f) {
  if (!VALID_TYPES.includes(f.type) && !f.name.match(/\.(pdf|docx)$/i))
    return "Please select a PDF or DOCX file";
  if (f.size > 5 * 1024 * 1024)
    return "File size must be less than 5MB";
  return null;
}

export default function ResumeAnalyze() {
  const [file, setFile]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const inputRef = useRef(null);

  const pickFile = useCallback((f) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setFile(f);
    setError("");
    setResult(null);
  }, []);

  const handleFileChange = (e) => pickFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const removeFile = () => {
    setFile(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (!file) { setError("Please select a resume file to upload"); return; }
    const formData = new FormData();
    formData.append("resume", file);
    try {
      setLoading(true);
      setResult(null);
      setError("");
      const res = await api.post("/api/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.ok && res.data.data) setResult(res.data.data);
    } catch (e) {
      console.error("Resume analyze error:", e.response?.data || e);
      const errorCode = e.response?.data?.error?.code;
      if (errorCode === "NLP_DOWN") {
        setError("NLP service is not responding. Please ensure it's running and try again.");
      } else {
        setError(e.response?.data?.error?.message || "Resume analysis failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── shared colour tokens ── */
  const surface  = "rgba(255,255,255,0.04)";
  const border   = "rgba(255,255,255,0.09)";
  const accent   = "#6366f1";
  const textMid  = "rgba(255,255,255,0.55)";
  const textFull = "#fff";

  const fileExt = file ? file.name.split(".").pop().toUpperCase() : null;
  const extColor = fileExt === "PDF" ? "#f87171" : "#60a5fa";

  return (
    <Layout>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="text-3xl font-bold text-white">Resume Analyzer</h2>
            <p className="text-slate-400 mt-1 text-sm">Upload your resume to extract and analyze your skills</p>
          </div>
          <Link
            to="/my-resumes"
            style={{ padding: "9px 18px", borderRadius: 10, background: surface, border: `1px solid ${border}`, color: textFull, textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Folder size={15} /> View My Resumes
          </Link>
        </div>

        {/* ── Upload card ── */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 18, padding: 28 }}>
          <h3 style={{ color: textFull, fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>Upload Resume</h3>
          <p style={{ color: textMid, fontSize: 13, margin: "0 0 22px" }}>Supported formats: PDF, DOCX · Max size: 5 MB</p>

          {/* ── Drop zone ── */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? accent : file ? "rgba(99,102,241,0.45)" : border}`,
              borderRadius: 14,
              padding: "48px 24px",
              textAlign: "center",
              cursor: file ? "default" : "pointer",
              background: dragging
                ? "rgba(99,102,241,0.08)"
                : file
                ? "rgba(99,102,241,0.05)"
                : "rgba(255,255,255,0.02)",
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {file ? (
              /* ── File selected state ── */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                {/* File icon */}
                <div style={{ width: 56, height: 68, borderRadius: 10, background: `${extColor}22`, border: `1.5px solid ${extColor}55`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <FileText size={24} color={extColor} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: extColor, letterSpacing: 0.5 }}>{fileExt}</span>
                </div>
                <div>
                  <p style={{ color: textFull, fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>{file.name}</p>
                  <p style={{ color: textMid, fontSize: 12, margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  style={{ marginTop: 4, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.55)", background: "rgba(220,38,38,0.28)", color: "#fecaca", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              /* ── Empty / dragging state ── */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>

                {/* Illustrated SVG */}
                {dragging ? (
                  /* ── Drop-now illustration ── */
                  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* glow ring */}
                    <circle cx="45" cy="45" r="42" stroke="rgba(99,102,241,0.35)" strokeWidth="2" strokeDasharray="6 4"/>
                    <circle cx="45" cy="45" r="33" fill="rgba(99,102,241,0.12)"/>
                    {/* open folder body */}
                    <rect x="18" y="38" width="54" height="32" rx="5" fill="rgba(99,102,241,0.25)" stroke="#818cf8" strokeWidth="1.5"/>
                    {/* folder tab */}
                    <path d="M18 38 L18 34 Q18 31 21 31 L36 31 Q39 31 40 34 L42 38Z" fill="rgba(99,102,241,0.4)" stroke="#818cf8" strokeWidth="1.2"/>
                    {/* document flying in */}
                    <g transform="rotate(-12, 53, 30)">
                      <rect x="44" y="18" width="18" height="24" rx="3" fill="#1e1e3f" stroke="#6366f1" strokeWidth="1.5"/>
                      <path d="M44 24 L50 18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                      <rect x="44" y="18" width="6" height="6" rx="1" fill="rgba(99,102,241,0.3)"/>
                      <line x1="48" y1="28" x2="58" y2="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="48" y1="32" x2="58" y2="32" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="48" y1="36" x2="55" y2="36" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" strokeLinecap="round"/>
                    </g>
                    {/* arrow down into folder */}
                    <path d="M45 30 L45 46" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M39 41 L45 48 L51 41" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  /* ── Idle upload illustration ── */
                  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* background circle */}
                    <circle cx="45" cy="45" r="38" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.18)" strokeWidth="1.5" strokeDasharray="5 3"/>
                    {/* document body */}
                    <rect x="26" y="22" width="32" height="42" rx="4" fill="#1a1a35" stroke="rgba(99,102,241,0.5)" strokeWidth="1.6"/>
                    {/* dog-ear fold */}
                    <path d="M49 22 L58 31" stroke="rgba(99,102,241,0.5)" strokeWidth="1.4"/>
                    <path d="M49 22 L49 31 L58 31" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.2"/>
                    {/* text lines */}
                    <line x1="32" y1="37" x2="52" y2="37" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" strokeLinecap="round"/>
                    <line x1="32" y1="43" x2="52" y2="43" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" strokeLinecap="round"/>
                    <line x1="32" y1="49" x2="46" y2="49" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" strokeLinecap="round"/>
                    <line x1="32" y1="55" x2="50" y2="55" stroke="rgba(255,255,255,0.10)" strokeWidth="1.4" strokeLinecap="round"/>
                    {/* upload arrow badge */}
                    <circle cx="63" cy="63" r="14" fill="#07071a" stroke="rgba(99,102,241,0.45)" strokeWidth="1.5"/>
                    <circle cx="63" cy="63" r="11" fill="rgba(99,102,241,0.2)"/>
                    {/* up arrow */}
                    <path d="M63 69 L63 57" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M58 62 L63 57 L68 62" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}

                <div>
                  <p style={{ color: textFull, fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>
                    {dragging ? "Drop your file here" : "Drag & drop your resume"}
                  </p>
                  <p style={{ color: textMid, fontSize: 13, margin: 0 }}>
                    or{" "}
                    <span style={{ color: accent, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>
                      browse to upload
                    </span>
                  </p>
                </div>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>PDF or DOCX · up to 5 MB</p>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ marginTop: 14, padding: "11px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p style={{ color: "#f87171", fontSize: 13, margin: 0, display: "flex", alignItems: "center", gap: 5 }}><AlertTriangle size={13} /> {error}</p>
            </div>
          )}

          {/* ── Analyze button ── */}
          <button
            onClick={submit}
            disabled={loading || !file}
            style={{
              marginTop: 18,
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              border: "none",
              background: loading || !file
                ? "rgba(255,255,255,0.07)"
                : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: loading || !file ? "rgba(255,255,255,0.3)" : "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading || !file ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              letterSpacing: 0.3,
            }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Analyzing…
              </span>
            ) : <><Search size={15} className="inline mr-2" /> Analyze Resume</>}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Results ── */}
        {result && (
          <div style={{ marginTop: 24, background: surface, border: `1px solid ${border}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={22} color="#4ade80" /></div>
              <div>
                <h3 style={{ color: textFull, fontWeight: 700, fontSize: 16, margin: 0 }}>Analysis Results</h3>
                <p style={{ color: textMid, fontSize: 13, margin: "3px 0 0" }}>{result.skillCount} skills extracted from your resume</p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: textMid, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Extracted Skills</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.skills && result.skills.length > 0 ? (
                  result.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p style={{ color: textMid, fontSize: 13 }}>No skills found</p>
                )}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16 }}>
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                Resume ID: <span style={{ fontFamily: "monospace" }}>{result.resumeId}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
