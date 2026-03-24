import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Target, Map, Shield, TrendingUp,
  User, Upload, Search, Rocket, Zap, Award, Clock,
  CheckCircle, ArrowRight, Sparkles, Brain, LineChart,
  Heart
} from "lucide-react";

/* ─────────────────────────────────────────────
   Tiny hook: returns true once the element enters the viewport
───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
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

/* ─── section wrapper with fade‑up animation ─── */
function FadeUp({ children, delay = 0, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── typing animation ─── */
function TypeWriter({ words, speed = 80, pause = 1800 }) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    let delay = deleting ? speed / 2 : speed;
    if (!deleting && charIdx === current.length) delay = pause;
    if (deleting && charIdx === 0) { setDeleting(false); setWordIdx((i) => (i + 1) % words.length); return; }

    const t = setTimeout(() => {
      if (!deleting && charIdx === current.length) { setDeleting(true); return; }
      setDisplay(current.slice(0, charIdx + (deleting ? -1 : 1)));
      setCharIdx((c) => c + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return (
    <span>
      {display}
      <span className="animate-pulse">|</span>
    </span>
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
        transition: "background 0.3s, box-shadow 0.3s",
        background: scrolled ? "rgba(10,10,30,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.5)" : "none",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        {/* Logo */}
        <div style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-text" style={{ fontSize: 22 }}>AptitudeX</span>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 500, letterSpacing: 0.6, marginTop: 2, textTransform: "uppercase" }}>Career Intelligence</div>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ gap: 8 }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
                padding: "10px 16px", borderRadius: 10,
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.color = "#fff"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.7)"; e.target.style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex" style={{ gap: 12 }}>
          {isLoggedIn ? (
            <Link
              to={getDashboardPath()}
              style={{
                padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(99,102,241,0.55)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(99,102,241,0.45)"; }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff",
                  textDecoration: "none", transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "rgba(255,255,255,0.4)"; }}
                onMouseLeave={(e) => { e.target.style.background = "none"; e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                style={{
                  padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                  textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(99,102,241,0.55)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(99,102,241,0.45)"; }}
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
          <div style={{ width: 22, height: 2, background: "#fff", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 22, height: 2, background: "#fff", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 16, height: 2, background: "#fff", borderRadius: 2 }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "rgba(10,10,30,0.98)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px 20px" }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#fff", fontSize: 16, padding: "10px 0", cursor: "pointer" }}>
              {label}
            </button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {isLoggedIn ? (
              <Link to={getDashboardPath()} style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Log In</Link>
                <Link to="/register" style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Sign Up</Link>
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
      }}
    >
      {/* Animated background orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "float1 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)", animation: "float2 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "45%", left: "50%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", transform: "translate(-50%,-50%)", animation: "pulse 8s ease-in-out infinite" }} />
      </div>

      {/* Badge */}
      <FadeUp>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "8px 18px", marginBottom: 28 }}>
          <Sparkles size={14} color="#a5b4fc" />
          <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>AI-Powered Career Intelligence</span>
        </div>
      </FadeUp>

      {/* Headline */}
      <FadeUp delay={0.1}>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.8rem)", fontWeight: 800, color: "#fff", lineHeight: 1.1, marginBottom: 24, letterSpacing: "-1.5px", maxWidth: 900 }}>
          Transform Your Career<br />
          <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            With AI Intelligence
          </span>
        </h1>
      </FadeUp>

      {/* Subtitle */}
      <FadeUp delay={0.2}>
        <p style={{ fontSize: "clamp(1rem,2vw,1.25rem)", color: "rgba(255,255,255,0.55)", marginBottom: 14, maxWidth: 600, lineHeight: 1.7 }}>
          Upload your resume, discover skill gaps, and get personalized learning roadmaps to land your dream job.
        </p>
      </FadeUp>

      {/* Typewriter */}
      <FadeUp delay={0.25}>
        <p style={{ fontSize: "clamp(1rem,2vw,1.2rem)", color: "#a78bfa", fontWeight: 600, marginBottom: 40, minHeight: 32 }}>
          <TypeWriter words={["Analyse Resume Skills", "Detect Skill Gaps", "Build Learning Roadmaps", "Track Your Progress"]} />
        </p>
      </FadeUp>

      {/* CTA buttons */}
      <FadeUp delay={0.3}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 60 }}>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
              cursor: "pointer", boxShadow: "0 8px 32px rgba(99,102,241,0.5)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(99,102,241,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.5)"; }}
          >
            Get Started Free <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.15)",
              cursor: "pointer", backdropFilter: "blur(10px)",
              transition: "background 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
          >
            Learn More
          </button>
        </div>
      </FadeUp>

      {/* Dashboard Preview Card */}
      <FadeUp delay={0.4}>
        <div style={{ maxWidth: 750, width: "100%" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px 32px", backdropFilter: "blur(20px)", textAlign: "left" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "Skill Match Score", value: "87%", icon: Target, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
                { label: "Skills to Learn", value: "5", icon: Brain, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
                { label: "Roadmap Steps", value: "12", icon: Map, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color={color} />
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ width: "87%", height: "100%", borderRadius: 100, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", animation: "growBar 1.8s ease 1s both" }} />
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600 }}>Profile Strength</span>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}

/* ════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════ */
const steps = [
  { step: "01", title: "Create Account", desc: "Sign up in seconds with just your email. No credit card required.", Icon: User, color: "#6366f1" },
  { step: "02", title: "Upload Resume", desc: "Upload your PDF or DOCX resume. Our AI extracts skills instantly.", Icon: Upload, color: "#8b5cf6" },
  { step: "03", title: "Compare Jobs", desc: "Paste any job description to get your match score and skill gaps.", Icon: Search, color: "#a78bfa" },
  { step: "04", title: "Follow Roadmap", desc: "Get a personalized learning path and track your progress.", Icon: Rocket, color: "#60a5fa" },
];

function HowItWorks() {
  return (
    <section id="how" style={{ padding: "100px 24px", position: "relative" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>How It Works</span>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 16 }}>
              Start in <span style={{ background: "linear-gradient(135deg,#8b5cf6,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>4 Simple Steps</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 550, margin: "0 auto" }}>
              From resume upload to career roadmap in minutes.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {steps.map(({ step, title, desc, Icon, color }, i) => (
            <FadeUp key={step} delay={i * 0.1}>
              <StepCard step={step} title={title} desc={desc} Icon={Icon} color={color} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, title, desc, Icon, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? color + "40" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 20, padding: "32px 24px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        textAlign: "center",
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        border: `2px solid ${color}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 18px",
      }}>
        <Icon size={26} color={color} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: color, letterSpacing: "2px", marginBottom: 10, opacity: 0.9 }}>STEP {step}</div>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════ */
const features = [
  { Icon: FileText, title: "Smart Resume Analysis", desc: "Our NLP engine extracts skills, experience, and qualifications from your PDF or DOCX.", color: "#6366f1" },
  { Icon: Target, title: "Skill Gap Detection", desc: "Compare against any job description to discover match score and missing skills.", color: "#8b5cf6" },
  { Icon: Map, title: "Learning Roadmaps", desc: "Get personalized, step-by-step learning paths built from your skill gaps.", color: "#a78bfa" },
  { Icon: LineChart, title: "Progress Analytics", desc: "Track your skill growth over time with visual analytics and milestones.", color: "#60a5fa" },
  { Icon: TrendingUp, title: "Industry Trends", desc: "See which skills are rising in demand and position yourself for opportunities.", color: "#34d399" },
  { Icon: Shield, title: "Secure & Private", desc: "Your data is encrypted and protected. We never share your information.", color: "#f59e0b" },
];

function Features() {
  return (
    <section id="features" style={{ padding: "100px 24px", position: "relative" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>Features</span>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 16 }}>
              Powerful Tools for <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Career Growth</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 550, margin: "0 auto" }}>
              Everything you need to understand your skills, find gaps, and accelerate your career.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
          {features.map(({ Icon, title, desc, color }, i) => (
            <FadeUp key={title} delay={i * 0.06}>
              <FeatureCard Icon={Icon} title={title} desc={desc} color={color} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ Icon, title, desc, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? color + "40" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 18, padding: "28px 24px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        display: "flex", gap: 18, alignItems: "flex-start",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   BENEFITS
════════════════════════════════════════════ */
const benefits = [
  { Icon: Zap, title: "Instant Analysis", desc: "Get results in seconds", color: "#f59e0b" },
  { Icon: Award, title: "Accurate Matching", desc: "AI-powered extraction", color: "#6366f1" },
  { Icon: Clock, title: "Save Time", desc: "Focus on learning", color: "#8b5cf6" },
  { Icon: CheckCircle, title: "Track Progress", desc: "Visual dashboards", color: "#10b981" },
];

function Benefits() {
  return (
    <section id="benefits" style={{ padding: "100px 24px", position: "relative" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <FadeUp>
            <div>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>Benefits</span>
              <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 20, lineHeight: 1.2 }}>
                Why Choose <span style={{ background: "linear-gradient(135deg,#34d399,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AptitudeX?</span>
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                We built AptitudeX to solve a real problem: job seekers know they need to improve, but don't know exactly what skills to focus on. Our AI creates actionable roadmaps.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["Free to Start", "No Credit Card", "Cancel Anytime"].map(tag => (
                  <span key={tag} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", borderRadius: 100, padding: "6px 16px", fontSize: 13, fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {benefits.map(({ Icon, title, desc, color }, i) => (
              <FadeUp key={title} delay={i * 0.1}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "22px 18px", transition: "border-color 0.2s, background 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "35"; e.currentTarget.style.background = "rgba(99,102,241,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{title}</h4>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   CTA
════════════════════════════════════════════ */
function CTA() {
  const navigate = useNavigate();
  return (
    <section style={{ padding: "80px 24px 100px", textAlign: "center" }}>
      <FadeUp>
        <div style={{ maxWidth: 700, margin: "0 auto", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 24, padding: "56px 40px" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
            <Rocket size={28} color="#a5b4fc" />
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 800, color: "#fff", marginBottom: 14 }}>
            Ready to Accelerate Your Career?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 32, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>
            Join professionals who stopped guessing and started growing with AI-powered career intelligence.
          </p>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "15px 44px", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
              cursor: "pointer", boxShadow: "0 8px 32px rgba(99,102,241,0.5)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "inline-flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(99,102,241,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.5)"; }}
          >
            Create Free Account <ArrowRight size={18} />
          </button>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 20 }}>No credit card required</p>
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
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              <span className="brand-text" style={{ fontSize: 18 }}>AptitudeX</span>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 500, letterSpacing: 0.5, marginTop: 4, textTransform: "uppercase" }}>AI-Driven Career Intelligence</div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
              Transform your career with AI-powered skill analysis and personalized roadmaps.
            </p>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Platform</h4>
            {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, padding: "5px 0", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.4)"; }}>
                {label}
              </button>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Account</h4>
            {[["Log In", "/login"], ["Sign Up", "/register"]].map(([label, path]) => (
              <Link key={path} to={path} style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: 14, textDecoration: "none", padding: "5px 0", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.4)"; }}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Built With</h4>
            {["React", "Node.js", "MongoDB", "FastAPI", "spaCy"].map(t => (
              <div key={t} style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, padding: "5px 0" }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>© 2026 AptitudeX</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Built with <Heart size={12} className="inline text-red-400" style={{ verticalAlign: "middle" }} /> using MERN + FastAPI</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════
   KEYFRAMES
════════════════════════════════════════════ */
const KEYFRAMES = `
@keyframes float1 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(25px,-35px) scale(1.05); }
}
@keyframes float2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-30px,25px) scale(0.95); }
}
@keyframes pulse {
  0%,100% { opacity:1; }
  50% { opacity:0.5; }
}
@keyframes growBar {
  from { width:0; }
}
`;

/* ════════════════════════════════════════════
   ROOT
════════════════════════════════════════════ */
export default function WelcomePage() {
  useEffect(() => {
    if (!document.getElementById("welcome-keyframes")) {
      const style = document.createElement("style");
      style.id = "welcome-keyframes";
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  const user = localStorage.getItem("user");
  const role = localStorage.getItem("role");
  const isLoggedIn = !!(user && role);

  // Unified background - no section breaks
  const bgStyle = {
    background: "linear-gradient(180deg, #0a0a1e 0%, #0d0d2b 25%, #0f0a25 50%, #0a0a1e 75%, #08081a 100%)",
    backgroundAttachment: "fixed",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", ...bgStyle, minHeight: "100vh" }}>
      {/* Subtle grid overlay for entire page */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar isLoggedIn={isLoggedIn} role={role} />
        <Hero />
        <HowItWorks />
        <Features />
        <Benefits />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}
