import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Target, Map, TrendingUp, Upload, Search,
  Rocket, Zap, Clock, ArrowRight, Brain, LineChart,
  GraduationCap, Briefcase, BarChart3, Users
} from "lucide-react";

/* ─────────────────────────────────────────────
   Intersection Observer Hook for scroll animations
───────────────────────────────────────────── */
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Fade up animation wrapper ─── */
function FadeUp({ children, delay = 0, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s, transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Scale in animation wrapper ─── */
function ScaleIn({ children, delay = 0 }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.9)",
        transition: `opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════ */
function Navbar({ isLoggedIn, role }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const getDashboardPath = () => {
    if (role === "ADMIN") return "/admin";
    if (role === "STAFF") return "/staff";
    return "/dashboard";
  };

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        {/* Logo */}
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Rocket size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.5px" }}>AptitudeX</span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ gap: 8 }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"], ["Testimonials", "testimonials"]].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#64748b", fontSize: 15, fontWeight: 500,
                padding: "10px 18px", borderRadius: 10,
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.color = "#7c3aed"; e.target.style.background = "rgba(124,58,237,0.06)"; }}
              onMouseLeave={(e) => { e.target.style.color = "#64748b"; e.target.style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex" style={{ gap: 12, alignItems: "center" }}>
          {isLoggedIn ? (
            <Link
              to={getDashboardPath()}
              style={{
                padding: "11px 26px", borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", color: "#fff",
                textDecoration: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 20px rgba(124,58,237,0.45)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 14px rgba(124,58,237,0.35)"; }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  padding: "11px 26px", borderRadius: 12, fontSize: 15, fontWeight: 600,
                  color: "#1a1a2e", textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { e.target.style.color = "#1a1a2e"; }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: "11px 26px", borderRadius: 12, fontSize: 15, fontWeight: 600,
                  background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", color: "#fff",
                  textDecoration: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 20px rgba(124,58,237,0.45)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 14px rgba(124,58,237,0.35)"; }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}
        >
          <div style={{ width: 22, height: 2, background: "#1a1a2e", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 22, height: 2, background: "#1a1a2e", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 16, height: 2, background: "#1a1a2e", borderRadius: 2 }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "#fff", borderTop: "1px solid #f1f5f9", padding: "16px 24px 20px" }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"], ["Testimonials", "testimonials"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#1a1a2e", fontSize: 16, padding: "12px 0", cursor: "pointer" }}>
              {label}
            </button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {isLoggedIn ? (
              <Link to={getDashboardPath()} style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, border: "2px solid #e2e8f0", color: "#1a1a2e", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Log In</Link>
                <Link to="/register" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ════════════════════════════════════════════
   HERO
════════════════════════════════════════════ */
function Hero() {
  const navigate = useNavigate();

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 24px 80px", position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, #faf9f7 0%, #f5f3ef 100%)",
      }}
    >
      {/* Decorative elements */}
      <div style={{ position: "absolute", top: "15%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />

      {/* Badge */}
      <FadeUp>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 100, padding: "8px 18px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Zap size={14} color="#7c3aed" />
          <span style={{ color: "#7c3aed", fontSize: 13, fontWeight: 600 }}>AI-Powered Career Intelligence</span>
        </div>
      </FadeUp>

      {/* Headline */}
      <FadeUp delay={0.1}>
        <h1 style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)", fontWeight: 800, color: "#1a1a2e", lineHeight: 1.15, marginBottom: 24, letterSpacing: "-1.5px", maxWidth: 800 }}>
          Navigate Your Career<br />
          <span style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            With Confidence
          </span>
        </h1>
      </FadeUp>

      {/* Subtitle */}
      <FadeUp delay={0.2}>
        <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "#64748b", marginBottom: 40, maxWidth: 580, lineHeight: 1.7 }}>
          Upload your resume, discover skill gaps, and get personalized learning roadmaps to land your dream job faster.
        </p>
      </FadeUp>

      {/* CTA buttons */}
      <FadeUp delay={0.3}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", color: "#fff", border: "none",
              cursor: "pointer", boxShadow: "0 8px 30px rgba(124,58,237,0.4)",
              transition: "transform 0.25s, box-shadow 0.25s",
              display: "flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,58,237,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(124,58,237,0.4)"; }}
          >
            Get Started Free <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 600,
              background: "#fff", color: "#1a1a2e", border: "2px solid #e2e8f0",
              cursor: "pointer",
              transition: "border-color 0.25s, background 0.25s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "rgba(124,58,237,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}
          >
            See How It Works
          </button>
        </div>
      </FadeUp>

      {/* Stats */}
      <FadeUp delay={0.45}>
        <div style={{ display: "flex", gap: 48, marginTop: 64, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { value: "10K+", label: "Active Users" },
            { value: "50K+", label: "Resumes Analyzed" },
            { value: "95%", label: "Satisfaction Rate" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#7c3aed" }}>{value}</div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  );
}

/* ════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════ */
const steps = [
  { step: "01", title: "Upload Resume", desc: "Upload your resume in PDF or DOCX format. Our AI instantly parses and extracts your skills.", Icon: Upload },
  { step: "02", title: "Extract Skills", desc: "Our advanced NLP engine identifies technical skills, soft skills, and experience from your resume.", Icon: Brain },
  { step: "03", title: "Compare with Jobs", desc: "Paste any job description to get a match score and see exactly which skills you're missing.", Icon: Search },
  { step: "04", title: "Get Learning Roadmap", desc: "Receive a personalized learning path with curated resources to bridge your skill gaps.", Icon: Map },
];

function HowItWorks() {
  return (
    <section id="how" style={{ padding: "100px 24px", background: "#faf9f7" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13, letterSpacing: "3px", textTransform: "uppercase" }}>How It Works</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#1a1a2e", marginTop: 16, marginBottom: 16 }}>
              Four Simple Steps to Career Clarity
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {steps.map(({ step, title, desc, Icon }, i) => (
            <ScaleIn key={step} delay={i * 0.1}>
              <StepCard step={step} title={title} desc={desc} Icon={Icon} />
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, title, desc, Icon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: "36px 28px",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 40px rgba(124,58,237,0.12)" : "0 4px 12px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Large step number watermark */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 16,
        fontSize: 72,
        fontWeight: 900,
        color: hovered ? "rgba(124,58,237,0.08)" : "rgba(0,0,0,0.03)",
        lineHeight: 1,
        transition: "color 0.35s ease",
        pointerEvents: "none",
      }}>
        {step}
      </div>

      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: hovered ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" : "rgba(124,58,237,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        transition: "all 0.35s ease",
      }}>
        <Icon size={26} color={hovered ? "#fff" : "#7c3aed"} style={{ transition: "color 0.35s ease" }} />
      </div>

      <h3 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════ */
const features = [
  { Icon: FileText, title: "AI Skill Extraction", desc: "Our NLP engine accurately extracts skills from resumes, identifying both technical and soft skills." },
  { Icon: Target, title: "Smart Job Matching", desc: "Compare your profile against job descriptions to get precise match scores and insights." },
  { Icon: BarChart3, title: "Gap Analysis", desc: "Identify exactly which skills you need to develop to qualify for your target roles." },
  { Icon: Map, title: "Learning Roadmaps", desc: "Get personalized learning paths with curated resources tailored to your career goals." },
  { Icon: LineChart, title: "Progress Tracking", desc: "Monitor your skill development over time with visual analytics and milestones." },
  { Icon: TrendingUp, title: "Career Analytics", desc: "Gain insights into industry trends and see which skills are in highest demand." },
];

function Features() {
  return (
    <section id="features" style={{ padding: "100px 24px", background: "#f5f3ef" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>
              Everything You Need for Career Growth
            </h2>
            <p style={{ color: "#64748b", fontSize: 17, maxWidth: 550, margin: "0 auto" }}>
              Powerful AI tools designed to accelerate your career journey.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {features.map(({ Icon, title, desc }, i) => (
            <ScaleIn key={title} delay={i * 0.08}>
              <FeatureCard Icon={Icon} title={title} desc={desc} />
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ Icon, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: "28px 26px",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 32px rgba(124,58,237,0.1)" : "0 2px 8px rgba(0,0,0,0.03)",
        display: "flex",
        gap: 18,
        alignItems: "flex-start",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: hovered ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" : "rgba(124,58,237,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.35s ease",
      }}>
        <Icon size={24} color={hovered ? "#fff" : "#7c3aed"} style={{ transition: "color 0.35s ease" }} />
      </div>
      <div>
        <h3 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.65 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   BENEFITS
════════════════════════════════════════════ */
const benefits = [
  { Icon: GraduationCap, title: "For Students", desc: "Understand what skills employers want before you graduate and prepare accordingly." },
  { Icon: Briefcase, title: "For Job Seekers", desc: "Identify skill gaps quickly and focus your learning on what matters most." },
  { Icon: BarChart3, title: "Data-Driven Decisions", desc: "Make informed career decisions based on real market data and AI insights." },
  { Icon: Clock, title: "Save Time", desc: "Stop guessing what to learn. Get targeted recommendations instantly." },
];

function Benefits() {
  return (
    <section id="benefits" style={{ padding: "100px 24px", background: "#faf9f7" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 64, alignItems: "center" }} className="benefits-grid">
          <FadeUp>
            <div>
              <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13, letterSpacing: "3px", textTransform: "uppercase" }}>Benefits</span>
              <h2 style={{ fontSize: "clamp(1.9rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#1a1a2e", marginTop: 16, marginBottom: 24, lineHeight: 1.2 }}>
                Why Choose AptitudeX?
              </h2>
              <p style={{ color: "#64748b", fontSize: 17, lineHeight: 1.75, marginBottom: 32 }}>
                We built AptitudeX to solve a real problem: job seekers and students know they need to improve, but don't know exactly what skills to focus on. Our AI analyzes the market and creates actionable roadmaps tailored just for you.
              </p>
              <button
                onClick={() => window.location.href = "/register"}
                style={{
                  padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", color: "#fff", border: "none",
                  cursor: "pointer", boxShadow: "0 6px 24px rgba(124,58,237,0.35)",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  display: "inline-flex", alignItems: "center", gap: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(124,58,237,0.45)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.35)"; }}
              >
                Start Now <ArrowRight size={18} />
              </button>
            </div>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {benefits.map(({ Icon, title, desc }, i) => (
              <ScaleIn key={title} delay={i * 0.1}>
                <BenefitCard Icon={Icon} title={title} desc={desc} />
              </ScaleIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ Icon, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "24px 20px",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 28px rgba(124,58,237,0.1)" : "0 2px 8px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: hovered ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" : "rgba(124,58,237,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
        transition: "all 0.35s ease",
      }}>
        <Icon size={22} color={hovered ? "#fff" : "#7c3aed"} style={{ transition: "color 0.35s ease" }} />
      </div>
      <h4 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h4>
      <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   TESTIMONIALS
════════════════════════════════════════════ */
const testimonials = [
  { name: "Sarah Chen", role: "Software Engineer at Google", quote: "AptitudeX helped me identify the exact skills I needed to transition from frontend to full-stack. Got my dream job within 3 months!", avatar: "SC" },
  { name: "Michael Roberts", role: "Recent Graduate", quote: "As a fresh grad, I had no idea what skills employers actually wanted. This platform gave me clarity and a clear learning path.", avatar: "MR" },
  { name: "Priya Sharma", role: "Product Manager", quote: "The skill gap analysis was eye-opening. I focused on exactly what I needed and landed a senior PM role at a top startup.", avatar: "PS" },
];

function Testimonials() {
  return (
    <section id="testimonials" style={{ padding: "100px 24px", background: "#f5f3ef" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13, letterSpacing: "3px", textTransform: "uppercase" }}>Testimonials</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#1a1a2e", marginTop: 16, marginBottom: 16 }}>
              Loved by Career-Focused Professionals
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {testimonials.map(({ name, role, quote, avatar }, i) => (
            <ScaleIn key={name} delay={i * 0.1}>
              <TestimonialCard name={name} role={role} quote={quote} avatar={avatar} />
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ name, role, quote, avatar }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: "32px 28px",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 32px rgba(124,58,237,0.1)" : "0 2px 8px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ color: "#fbbf24", fontSize: 18 }}>★</div>
        ))}
      </div>
      <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>
        "{quote}"
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 14,
        }}>
          {avatar}
        </div>
        <div>
          <div style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 15 }}>{name}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CTA
════════════════════════════════════════════ */
function CTA() {
  const navigate = useNavigate();
  return (
    <section style={{ padding: "80px 24px 100px", background: "#faf9f7" }}>
      <FadeUp>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)",
          borderRadius: 28,
          padding: "64px 48px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", bottom: -80, left: -80, width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Rocket size={32} color="#fff" />
            </div>
            <h2 style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Ready to Accelerate Your Career?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 17, marginBottom: 36, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 36px" }}>
              Join thousands of professionals who stopped guessing and started growing with AI-powered career intelligence.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/register")}
                style={{
                  padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700,
                  background: "#fff", color: "#7c3aed", border: "none",
                  cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  display: "inline-flex", alignItems: "center", gap: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}
              >
                Get Started Free <ArrowRight size={18} />
              </button>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 20 }}>No credit card required • Free forever for basic features</p>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}

/* ════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════ */
function Footer() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer style={{ borderTop: "1px solid #e2e8f0", padding: "56px 24px 40px", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }} className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Rocket size={20} color="#fff" />
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>AptitudeX</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7, maxWidth: 280 }}>
              AI-powered career intelligence platform helping professionals land their dream jobs faster.
            </p>
          </div>
          <div>
            <h4 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Platform</h4>
            {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"], ["Testimonials", "testimonials"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", color: "#64748b", fontSize: 15, padding: "6px 0", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { e.target.style.color = "#64748b"; }}>
                {label}
              </button>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Account</h4>
            {[["Log In", "/login"], ["Sign Up", "/register"]].map(([label, path]) => (
              <Link key={path} to={path} style={{ display: "block", color: "#64748b", fontSize: 15, textDecoration: "none", padding: "6px 0", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { e.target.style.color = "#64748b"; }}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Connect</h4>
            <div style={{ display: "flex", gap: 12 }}>
              {[Users, Briefcase, GraduationCap].map((Icon, i) => (
                <div key={i} style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}>
                  <Icon size={18} color="#64748b" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>© 2026 AptitudeX. All rights reserved.</span>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Terms of Service"].map(t => (
              <span key={t} style={{ color: "#94a3b8", fontSize: 14, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { e.target.style.color = "#94a3b8"; }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════
   RESPONSIVE STYLES
════════════════════════════════════════════ */
const RESPONSIVE_STYLES = `
@media (max-width: 768px) {
  .benefits-grid {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
  }
  .footer-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 32px !important;
  }
}
@media (max-width: 480px) {
  .footer-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

/* ════════════════════════════════════════════
   ROOT
════════════════════════════════════════════ */
export default function WelcomePage() {
  useEffect(() => {
    if (!document.getElementById("welcome-responsive")) {
      const style = document.createElement("style");
      style.id = "welcome-responsive";
      style.textContent = RESPONSIVE_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  const user = localStorage.getItem("user");
  const role = localStorage.getItem("role");
  const isLoggedIn = !!(user && role);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <Navbar isLoggedIn={isLoggedIn} role={role} />
      <Hero />
      <HowItWorks />
      <Features />
      <Benefits />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
