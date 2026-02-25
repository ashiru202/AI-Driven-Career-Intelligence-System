import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { FileText, Target, Map, BarChart2, Lock, TrendingUp, User, Upload, Search, Rocket, GraduationCap, Globe, Bot, Unlock, Play, Heart } from "lucide-react";

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

/* ─── animated counter ─── */
function Counter({ target, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
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
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
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
function Navbar() {
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

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "background 0.3s, box-shadow 0.3s",
        background: scrolled ? "rgba(10,10,30,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        {/* Logo */}
        <div style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-text" style={{ fontSize: 20 }}>AptitudeX</span>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10.5, fontWeight: 500, letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" }}>AI-Driven Career Intelligence System</div>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ gap: 8 }}>
          {[["Features", "features"], ["How It Works", "how"], ["About Us", "about"]].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 500,
                padding: "8px 14px", borderRadius: 8,
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.color = "#fff"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.75)"; e.target.style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex" style={{ gap: 10 }}>
          <Link
            to="/login"
            style={{
              padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
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
              padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
              textDecoration: "none", boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
              transition: "opacity 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.opacity = "0.88"; e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }}
          >
            Get Started Free
          </Link>
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
        <div style={{ background: "rgba(10,10,30,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px 20px" }}>
          {[["Features", "features"], ["How It Works", "how"], ["About Us", "about"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#fff", fontSize: 16, padding: "10px 0", cursor: "pointer" }}>
              {label}
            </button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <Link to="/login" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Log In</Link>
            <Link to="/register" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Sign Up</Link>
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
        background: "linear-gradient(135deg, #0a0a1e 0%, #0d0d2b 40%, #130d30 70%, #0f0a25 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "100px 24px 60px", position: "relative", overflow: "hidden",
      }}
    >
      {/* Animated background orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", animation: "float1 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", animation: "float2 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", transform: "translate(-50%,-50%)", animation: "pulse 6s ease-in-out infinite" }} />
      </div>

      {/* Grid lines overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)", backgroundSize: "50px 50px", pointerEvents: "none" }} />


      {/* Headline */}
      <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 5.2rem)", fontWeight: 800, color: "#fff", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-1px", animation: "fadeInUp 0.9s ease 0.1s both" }}>
        Your Career, Powered<br />
        <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          by Intelligence
        </span>
      </h1>

      {/* Typewriter subtitle */}
      <p style={{ fontSize: "clamp(1.1rem,2.5vw,1.4rem)", color: "rgba(255,255,255,0.55)", marginBottom: 14, fontWeight: 400, animation: "fadeInUp 0.9s ease 0.2s both" }}>
        Stop guessing. Start growing.
      </p>
      <p style={{ fontSize: "clamp(1.05rem,2vw,1.25rem)", color: "#a78bfa", fontWeight: 600, marginBottom: 40, minHeight: 36, animation: "fadeInUp 0.9s ease 0.3s both" }}>
        <TypeWriter words={["Analyse your Resume", "Detect Skill Gaps", "Build Learning Roadmaps", "Land Your Dream Job"]} />
      </p>

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 64, animation: "fadeInUp 0.9s ease 0.4s both" }}>
        <button
          onClick={() => navigate("/register")}
          style={{
            padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
            cursor: "pointer", boxShadow: "0 8px 30px rgba(99,102,241,0.5)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.transform = "translateY(-3px)"; e.target.style.boxShadow = "0 14px 40px rgba(99,102,241,0.6)"; }}
          onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 8px 30px rgba(99,102,241,0.5)"; }}
        >
          Get Started Free 
        </button>
        <button
          onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          style={{
            padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.15)",
            cursor: "pointer", backdropFilter: "blur(10px)",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
          onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
        >
          <Play size={14} className="inline mr-1" /> See How It Works
        </button>
      </div>

      {/* Hero visual card */}
      <div style={{ animation: "fadeInUp 1s ease 0.5s both", maxWidth: 680, width: "100%" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 28px", backdropFilter: "blur(20px)", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { label: "Skill Match", value: "87%", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
              { label: "Gaps Found", value: "5", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
              { label: "Roadmap Steps", value: "12", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 100, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ width: "87%", height: "100%", borderRadius: 100, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", animation: "growBar 1.5s ease 1.2s both" }} />
            </div>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>Profile Strength</span>
          </div>
        </div>
      </div>

    </section>
  );
}

/* ════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════ */
const features = [
  {
    Icon: FileText,
    title: "Smart Resume Analysis",
    desc: "Upload your PDF or DOCX resume. Our NLP engine instantly extracts your skills, qualifications, and experience with high accuracy.",
    color: "#6366f1",
  },
  {
    Icon: Target,
    title: "Skill Gap Detection",
    desc: "Paste any job description and instantly discover your match score, existing strengths, and the exact skills holding you back.",
    color: "#8b5cf6",
  },
  {
    Icon: Map,
    title: "Personalized Roadmaps",
    desc: "Get a curated, step-by-step learning roadmap built from your specific skill gaps. Track progress as you grow.",
    color: "#a78bfa",
  },
  {
    Icon: BarChart2,
    title: "Analytics & Insights",
    desc: "See which skills are in highest demand on the market and understand why candidates get overlooked for roles.",
    color: "#60a5fa",
  },
  {
    Icon: Lock,
    title: "Role-Based Access",
    desc: "Designed for everyone: job seekers get personal insights, staff monitor users, and admins manage the full platform.",
    color: "#34d399",
  },
  {
    Icon: TrendingUp,
    title: "CV Completeness Score",
    desc: "Receive an actionable completeness score for your CV with specific tips on what to add to stand out to recruiters.",
    color: "#f59e0b",
  },
];

function Features() {
  return (
    <section id="features" style={{ background: "#07071a", padding: "100px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>Features</span>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 16 }}>
              Everything You Need to<br />
              <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Accelerate Your Career</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 520, margin: "0 auto" }}>
              One intelligent platform that replaces the guesswork in career planning with clear, data-driven guidance.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 22 }}>
          {features.map(({ Icon, title, desc, color }, i) => (
            <FadeUp key={title} delay={i * 0.08}>
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
        background: hovered ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? color + "50" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18, padding: "28px 26px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        cursor: "default",
      }}
    >
      <div style={{ marginBottom: 16, color }}><Icon size={36} /></div>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14.5, lineHeight: 1.65 }}>{desc}</p>
      <div style={{ marginTop: 18, height: 2, borderRadius: 100, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: hovered ? 1 : 0, transition: "opacity 0.3s" }} />
    </div>
  );
}

/* ════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════ */
const steps = [
  { step: "01", title: "Create Your Account", desc: "Register in seconds. No credit card required. Pick your role — job seeker, staff, or admin.", Icon: User },
  { step: "02", title: "Upload Your Resume", desc: "Upload your resume in PDF or DOCX format. Our AI instantly extracts your skills and experience.", Icon: Upload },
  { step: "03", title: "Compare With Job Descriptions", desc: "Paste a job description to get your match score, common skills, and a full list of what's missing.", Icon: Search },
  { step: "04", title: "Follow Your Roadmap", desc: "Your personalised learning roadmap is generated automatically. Mark steps as complete and track your growth.", Icon: Rocket },
];

function HowItWorks() {
  return (
    <section id="how" style={{ background: "linear-gradient(180deg,#07071a 0%,#0a0a1e 100%)", padding: "100px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>How It Works</span>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 16 }}>
              From Resume to Roadmap<br />
              <span style={{ background: "linear-gradient(135deg,#8b5cf6,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in Minutes</span>
            </h2>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 28, position: "relative" }}>
          {steps.map(({ step, title, desc, Icon }, i) => (
            <FadeUp key={step} delay={i * 0.1}>
              <div style={{ textAlign: "center", padding: "32px 20px", position: "relative" }}>
                {/* connector line */}
                {i < steps.length - 1 && (
                  <div style={{ display: "none" }} className="lg:block" />
                )}
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))", border: "2px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#a5b4fc" }}>
                  <Icon size={28} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6366f1", letterSpacing: "3px", marginBottom: 10 }}>STEP {step}</div>
                <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{title}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   ABOUT US
════════════════════════════════════════════ */
function AboutUs() {
  const pillars = [
    { Icon: GraduationCap, title: "Academic Roots", desc: "Built as a research project combining NLP, machine learning, and software engineering to solve real-world career challenges." },
    { Icon: Globe, title: "Global + Local Focus", desc: "Designed for both local Sri Lankan job markets and international career pathways, with relevant skill benchmarks." },
    { Icon: Bot, title: "AI at the Core", desc: "Our Python NLP microservice (spaCy) powers all skill extraction, normalisation, and matching — no generic keyword lists." },
    { Icon: Unlock, title: "Open & Transparent", desc: "We show you exactly why you match or don't match a role — no black-box scores, full explainability." },
  ];

  return (
    <section id="about" style={{ background: "#0a0a1e", padding: "100px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          {/* Left text */}
          <FadeUp>
            <div>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" }}>About Us</span>
              <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, color: "#fff", marginTop: 12, marginBottom: 20, lineHeight: 1.2 }}>
                Built by Students,<br />
                <span style={{ background: "linear-gradient(135deg,#34d399,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Built for Everyone
                </span>
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.75, marginBottom: 18 }}>
                AptitudeX was born from a frustration shared by thousands of graduates and job seekers: existing platforms tell you <em>what</em> jobs are available, but not <em>why</em> you aren't getting them.
              </p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                We set out to build something different — an intelligent system that analyses your current skills in real-time, maps them against actual job requirements, and gives you a clear, actionable learning path forward. No fluff, no guessing, no wasted time.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["MERN Stack", "FastAPI + spaCy", "RBAC", "JWT Auth", "Real-time NLP"].map(tag => (
                  <span key={tag} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: 100, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Right pillars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {pillars.map(({ Icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.1}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 18px" }}>
                  <div style={{ marginBottom: 10, color: "#a5b4fc" }}><Icon size={26} /></div>
                  <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</h4>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
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
    <section style={{ background: "linear-gradient(135deg,#0a0a1e,#0d0d2b)", padding: "100px 24px", textAlign: "center" }}>
      <FadeUp>
        <div style={{ maxWidth: 680, margin: "0 auto", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 28, padding: "64px 48px" }}>
          <div style={{ marginBottom: 20, color: "#a5b4fc" }}><Rocket size={48} /></div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
            Ready to Take Control of Your Career?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, marginBottom: 36, lineHeight: 1.6 }}>
            Join thousands of professionals who stopped guessing and started growing with AI-powered career intelligence.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/register")}
              style={{
                padding: "16px 40px", borderRadius: 12, fontSize: 16, fontWeight: 700,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
                cursor: "pointer", boxShadow: "0 8px 30px rgba(99,102,241,0.5)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.transform = "translateY(-3px)"; e.target.style.boxShadow = "0 14px 40px rgba(99,102,241,0.65)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 8px 30px rgba(99,102,241,0.5)"; }}
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "16px 40px", borderRadius: 12, fontSize: 16, fontWeight: 600,
                background: "rgba(255,255,255,0.06)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.15)",
                cursor: "pointer", transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.06)"; }}
            >
              Already have an account?
            </button>
          </div>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 24 }}>No credit card required · Free to get started · Cancel anytime</p>
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
    <footer style={{ background: "#05050f", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <span className="brand-text" style={{ fontSize: 17 }}>AptitudeX</span>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, fontWeight: 500, letterSpacing: 0.4, marginTop: 3, textTransform: "uppercase" }}>AI-Driven Career Intelligence System</div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>
              AI-powered career intelligence for the modern job seeker. Analyse, compare, and grow.
            </p>
          </div>
          {/* Platform links */}
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Platform</h4>
            {[["Features", "features"], ["How It Works", "how"], ["About Us", "about"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, padding: "4px 0", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.4)"; }}>
                {label}
              </button>
            ))}
          </div>
          {/* Account */}
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Account</h4>
            {[["Log In", "/login"], ["Sign Up", "/register"]].map(([label, path]) => (
              <Link key={path} to={path} style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: 14, textDecoration: "none", padding: "4px 0", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.target.style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.4)"; }}>
                {label}
              </Link>
            ))}
          </div>
          {/* Tech */}
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Tech Stack</h4>
            {["React", "Node.js", "MongoDB", "FastAPI", "spaCy"].map(t => (
              <div key={t} style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, padding: "4px 0" }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>© 2026 AptitudeX &middot; AI-Driven Career Intelligence System</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Built with <Heart size={13} className="inline text-red-400" /> using MERN + FastAPI</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════
   KEYFRAME STYLES (injected once)
════════════════════════════════════════════ */
const KEYFRAMES = `
@keyframes float1 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(20px,-30px) scale(1.05); }
}
@keyframes float2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-25px,20px) scale(0.95); }
}
@keyframes pulse {
  0%,100% { opacity:1; }
  50% { opacity:0.5; }
}
@keyframes fadeInDown {
  from { opacity:0; transform:translateY(-20px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeInUp {
  from { opacity:0; transform:translateY(30px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes bounce {
  0%,100% { transform:translateX(-50%) translateY(0); }
  50% { transform:translateX(-50%) translateY(-10px); }
}
@keyframes scrollDot {
  0% { transform:translateY(0); opacity:1; }
  100% { transform:translateY(14px); opacity:0; }
}
@keyframes growBar {
  from { width:0; }
}
`;

/* ════════════════════════════════════════════
   ROOT COMPONENT
════════════════════════════════════════════ */
export default function WelcomePage() {
  // Inject keyframes once (hook must be called before any early return)
  useEffect(() => {
    if (!document.getElementById("welcome-keyframes")) {
      const style = document.createElement("style");
      style.id = "welcome-keyframes";
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  // Redirect already-authenticated users to their dashboard
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token && role) {
    if (role === "ADMIN") return <Navigate to="/admin" replace />;
    if (role === "STAFF") return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#0a0a1e" }}>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <AboutUs />
      <CTA />
      <Footer />
    </div>
  );
}
