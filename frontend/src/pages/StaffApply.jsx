import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, User, Mail, Phone, Briefcase, FileText, Send } from "lucide-react";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  currentRole: "",
  yearsExperience: "",
  expertiseInput: "",
  motivation: "",
  linkedInUrl: "",
  portfolioUrl: "",
};

export default function StaffApply() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const inputStyle = {
    width: "100%",
    padding: "14px 16px 14px 48px",
    borderRadius: 12,
    fontSize: 15,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, background 0.2s",
  };

  const focusOn = (e) => {
    e.target.style.borderColor = "#6366f1";
    e.target.style.background = "rgba(99,102,241,0.05)";
  };

  const focusOff = (e) => {
    e.target.style.borderColor = "rgba(255,255,255,0.1)";
    e.target.style.background = "rgba(255,255,255,0.04)";
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const expertiseAreas = formData.expertiseInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (expertiseAreas.length === 0) {
      setError("Please add at least one expertise area (comma separated)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        currentRole: formData.currentRole,
        yearsExperience: Number(formData.yearsExperience),
        expertiseAreas,
        motivation: formData.motivation,
        linkedInUrl: formData.linkedInUrl,
        portfolioUrl: formData.portfolioUrl,
      };

      const res = await api.post("/api/auth/staff-applications", payload);

      setSubmitted({
        email: formData.email,
        applicationId: res.data?.data?.applicationId,
      });
      setFormData(initialForm);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to submit staff application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        background: "linear-gradient(180deg, #0f0f23 0%, #0a0a1e 100%)",
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(10,10,30,0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "10px 16px",
          cursor: "pointer",
          color: "rgba(255,255,255,0.7)",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "100px 20px 60px" }}>
        <div
          style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(145deg, rgba(18,24,46,0.94), rgba(10,15,30,0.98))",
            boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
            padding: "28px 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <span className="brand-text" style={{ fontSize: 28 }}>
                AptitudeX
              </span>
            </Link>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginTop: 14, marginBottom: 8 }}>
              Apply As Staff Member
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6 }}>
              Submit your experience profile. An admin will review your request, and approved applicants
              receive a secure email to set their password.
            </p>
          </div>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "8px 0 10px" }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 20,
                  margin: "0 auto 18px",
                  background: "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))",
                  border: "1px solid rgba(16,185,129,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={30} color="#34d399" />
              </div>
              <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
                Application Submitted
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                We received your staff application for
              </p>
              <p style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 18 }}>{submitted.email}</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 24 }}>
                Application ID: {submitted.applicationId}
              </p>
              <Link
                to="/login"
                style={{
                  display: "inline-block",
                  padding: "12px 22px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Go To Login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: 16, top: 16, color: "rgba(255,255,255,0.35)" }} />
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <Mail size={18} style={{ position: "absolute", left: 16, top: 16, color: "rgba(255,255,255,0.35)" }} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <Phone size={18} style={{ position: "absolute", left: 16, top: 16, color: "rgba(255,255,255,0.35)" }} />
                  <input
                    name="phone"
                    type="text"
                    required
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <Briefcase size={18} style={{ position: "absolute", left: 16, top: 16, color: "rgba(255,255,255,0.35)" }} />
                  <input
                    name="currentRole"
                    type="text"
                    required
                    placeholder="Current Role"
                    value={formData.currentRole}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <FileText size={18} style={{ position: "absolute", left: 16, top: 16, color: "rgba(255,255,255,0.35)" }} />
                  <input
                    name="yearsExperience"
                    type="number"
                    required
                    min={0}
                    max={50}
                    placeholder="Years Of Experience"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </div>
              </div>

              <input
                name="expertiseInput"
                type="text"
                required
                placeholder="Expertise Areas (comma separated, e.g. Resume Review, Interview Coaching)"
                value={formData.expertiseInput}
                onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: 16 }}
                onFocus={focusOn}
                onBlur={focusOff}
              />

              <textarea
                name="motivation"
                required
                minLength={30}
                maxLength={2000}
                placeholder="Why do you want to join as staff?"
                value={formData.motivation}
                onChange={handleChange}
                onFocus={focusOn}
                onBlur={focusOff}
                style={{
                  width: "100%",
                  minHeight: 130,
                  padding: "14px 16px",
                  borderRadius: 12,
                  fontSize: 15,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <input
                  name="linkedInUrl"
                  type="url"
                  placeholder="LinkedIn URL (optional)"
                  value={formData.linkedInUrl}
                  onChange={handleChange}
                  style={{ ...inputStyle, paddingLeft: 16 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <input
                  name="portfolioUrl"
                  type="url"
                  placeholder="Portfolio URL (optional)"
                  value={formData.portfolioUrl}
                  onChange={handleChange}
                  style={{ ...inputStyle, paddingLeft: 16 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}
                >
                  <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "15px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                }}
              >
                {loading ? "Submitting..." : "Submit Staff Application"}
              </button>
            </form>
          )}

          {!submitted && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 20 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#a5b4fc", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
