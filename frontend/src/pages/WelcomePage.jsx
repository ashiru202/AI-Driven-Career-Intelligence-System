import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Target, Map, TrendingUp, Upload, Search,
  Rocket, Clock, ArrowRight, Brain, LineChart,
  GraduationCap, Briefcase, BarChart3
} from "lucide-react";
import FloatingLines from "../components/FloatingLines";

/* ─────────────────────────────────────────────
   Intersection Observer Hook for scroll animations
───────────────────────────────────────────── */
function useInView(threshold = 0.15, rootMargin = "0px 0px -50px 0px") {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if element is already in view on mount
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < windowHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el); // Stop observing once visible
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}

/* ─── Fade up animation wrapper ─── */
function FadeUp({ children, delay = 0, className = "", distance = 50 }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Scale in animation wrapper ─── */
function ScaleIn({ children, delay = 0, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(30px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        height: "100%",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Slide in from left animation wrapper ─── */
function SlideLeft({ children, delay = 0, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-60px)",
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Slide in from right animation wrapper ─── */
function SlideRight({ children, delay = 0, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(60px)",
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated counter ─── */
function AnimatedCounter({ value, duration = 2000 }) {
  const [ref, visible] = useInView();
  const [count, setCount] = useState(0);
  const numericValue = parseInt(value.replace(/[^0-9]/g, ""), 10);
  const suffix = value.replace(/[0-9]/g, "");

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const end = numericValue;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, numericValue, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ════════════════════════════════════════════
   GLOWING LOGO COMPONENT
════════════════════════════════════════════ */
function GlowingLogo({ size = "normal" }) {
  const isSmall = size === "small";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 8 : 10 }}>
      <span
        className="brand-text"
        style={{
          fontSize: isSmall ? 20 : 26,
        }}
      >
        AptitudeX
      </span>
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
    if (role === "STAFF") return "/staff-home";
    return "/dashboard";
  };

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled ? "rgba(10,10,30,0.95)" : "rgba(7,7,26,0.9)",
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.3)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 32px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        height: 72
      }}>
        {/* Logo - left aligned */}
        <div
          style={{ cursor: "pointer", justifySelf: "start" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <GlowingLogo />
        </div>

        {/* Desktop nav links - centered */}
        <div className="hidden md:flex" style={{
          gap: 4,
          background: "rgba(255,255,255,0.05)",
          padding: "6px 8px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500,
                padding: "8px 16px", borderRadius: 8,
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.color = "#a5b4fc"; e.target.style.background = "rgba(99,102,241,0.15)"; }}
              onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.6)"; e.target.style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons - right aligned */}
        <div className="hidden md:flex" style={{ gap: 12, alignItems: "center", justifySelf: "end" }}>
          {isLoggedIn ? (
            <Link
              to={getDashboardPath()}
              style={{
                padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
                textDecoration: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 20px rgba(99,102,241,0.45)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)"; }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/staff-apply"
                style={{
                  padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: "#93c5fd", textDecoration: "none",
                  border: "1px solid rgba(147,197,253,0.25)",
                  background: "rgba(59,130,246,0.08)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.background = "rgba(59,130,246,0.16)"; }}
                onMouseLeave={(e) => { e.target.style.background = "rgba(59,130,246,0.08)"; }}
              >
                Staff Apply
              </Link>
              <Link
                to="/login"
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: "rgba(255,255,255,0.7)", textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.color = "#a5b4fc"; }}
                onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.7)"; }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 4px 14px rgba(99,102,241,0.35)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 0 30px rgba(99,102,241,0.5), 0 6px 20px rgba(99,102,241,0.45)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 0 20px rgba(99,102,241,0.4), 0 4px 14px rgba(99,102,241,0.35)"; }}
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
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, justifySelf: "end" }}
        >
          <div style={{ width: 22, height: 2, background: "rgba(255,255,255,0.7)", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 22, height: 2, background: "rgba(255,255,255,0.7)", marginBottom: 5, borderRadius: 2 }} />
          <div style={{ width: 16, height: 2, background: "rgba(255,255,255,0.7)", borderRadius: 2 }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "rgba(10,10,30,0.98)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px 20px" }}>
          {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 16, padding: "12px 0", cursor: "pointer" }}>
              {label}
            </button>
          ))}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {isLoggedIn ? (
              <Link to={getDashboardPath()} style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Dashboard</Link>
            ) : (
              <>
                <Link to="/staff-apply" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, border: "1px solid rgba(147,197,253,0.3)", color: "#93c5fd", textDecoration: "none", fontSize: 15, fontWeight: 600, background: "rgba(59,130,246,0.08)" }}>Staff Apply</Link>
                <Link to="/login" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Log In</Link>
                <Link to="/register" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>Get Started</Link>
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
        background: "linear-gradient(180deg, #07071a 0%, #0a0a1e 50%, #0d0d2b 100%)",
      }}
    >
      {/* Decorative gradient orbs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)", backgroundSize: "50px 50px", pointerEvents: "none" }} />

      {/* Floating Lines Background */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.4 }}>
        <FloatingLines
          linesGradient={["#4f46e5", "#6366f1", "#818cf8", "#8b5cf6"]}
          enabledWaves={["middle", "bottom"]}
          lineCount={[3, 3]}
          lineDistance={[8, 8]}
          bendRadius={5}
          bendStrength={-0.3}
          interactive={true}
          parallax={true}
          parallaxStrength={0.1}
          animationSpeed={0.6}
          mixBlendMode="screen"
        />
      </div>

      {/* Badge */}
      <FadeUp>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 100, padding: "8px 18px", marginBottom: 28, position: "relative", zIndex: 1 }}>
          <Rocket size={14} color="#a5b4fc" />
          <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>AI-Powered Career Intelligence</span>
        </div>
      </FadeUp>

      {/* Headline */}
      <FadeUp delay={0.1}>
        <h1 style={{ fontSize: "clamp(2.5rem, 5.5vw, 4rem)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 24, letterSpacing: "-1.5px", maxWidth: 750, position: "relative", zIndex: 1 }}>
          Navigate Your Career<br />
          <span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            With Confidence
          </span>
        </h1>
      </FadeUp>

      {/* Subtitle */}
      <FadeUp delay={0.2}>
        <p style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", color: "rgba(255,255,255,0.55)", marginBottom: 40, maxWidth: 560, lineHeight: 1.7, position: "relative", zIndex: 1 }}>
          Upload your resume, discover skill gaps, and get personalized learning roadmaps to land your dream job faster.
        </p>
      </FadeUp>

      {/* CTA buttons */}
      <FadeUp delay={0.3}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none",
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(99,102,241,0.4), 0 8px 30px rgba(99,102,241,0.3)",
              transition: "transform 0.25s, box-shadow 0.25s",
              display: "flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(99,102,241,0.5), 0 12px 40px rgba(99,102,241,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(99,102,241,0.4), 0 8px 30px rgba(99,102,241,0.3)"; }}
          >
            Get Started Free <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "border-color 0.25s, color 0.25s, background 0.25s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            See How It Works
          </button>
        </div>
      </FadeUp>

      {/* Stats */}
      <FadeUp delay={0.45}>
        <div style={{ display: "flex", gap: 56, marginTop: 64, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          {[
            { value: "10K+", label: "Active Users" },
            { value: "50K+", label: "Resumes Analyzed" },
            { value: "95%", label: "Satisfaction Rate" },
          ].map(({ value, label }, i) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#a5b4fc" }}>
                <AnimatedCounter value={value} duration={2000 + i * 300} />
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</div>
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
    <section id="how" style={{ padding: "100px 24px", background: "#0a0a1e" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 12, letterSpacing: "3px", textTransform: "uppercase" }}>How It Works</span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff", marginTop: 14, marginBottom: 12 }}>
              Four Simple Steps to Career Clarity
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="steps-grid">
          {steps.map(({ step, title, desc, Icon }, i) => (
            <ScaleIn key={step} delay={0.1 + i * 0.12}>
              <StepCard step={step} title={title} desc={desc} Icon={Icon} index={i} />
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, title, desc, Icon, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="step-card"
      style={{
        background: hovered ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
        border: hovered ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "28px 22px",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 50px rgba(99,102,241,0.2)" : "none",
        position: "relative",
        overflow: "hidden",
        height: "100%",
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Animated gradient border on hover */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: 16,
        padding: 1,
        background: hovered ? "linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.5))" : "transparent",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        pointerEvents: "none",
        transition: "all 0.4s ease",
      }} />

      {/* Large step number watermark */}
      <div style={{
        position: "absolute",
        top: 8,
        right: 12,
        fontSize: 64,
        fontWeight: 900,
        color: hovered ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)",
        lineHeight: 1,
        pointerEvents: "none",
        transition: "color 0.4s ease",
      }}>
        {step}
      </div>

      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: hovered ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
        transition: "all 0.4s ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>
        <Icon size={24} color="#a5b4fc" />
      </div>

      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, flex: 1 }}>{desc}</p>
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
    <section id="features" style={{ padding: "100px 24px", background: "#07071a" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff", marginBottom: 14 }}>
              Everything You Need for Career Growth
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              Powerful AI tools designed to accelerate your career journey.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="features-grid">
          {features.map(({ Icon, title, desc }, i) => (
            <ScaleIn key={title} delay={0.05 + i * 0.1}>
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
        background: hovered ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.03)",
        border: hovered ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "26px 24px",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 40px rgba(99,102,241,0.15)" : "none",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        height: "100%",
        minHeight: 130,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: hovered ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.4s ease",
        transform: hovered ? "scale(1.1) rotate(5deg)" : "scale(1) rotate(0deg)",
      }}>
        <Icon size={22} color="#a5b4fc" />
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
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
    <section id="benefits" style={{ padding: "100px 24px", background: "#0a0a1e" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="benefits-grid">
          <SlideLeft>
            <div>
              <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 12, letterSpacing: "3px", textTransform: "uppercase" }}>Benefits</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#fff", marginTop: 14, marginBottom: 20, lineHeight: 1.25 }}>
                Why Choose AptitudeX?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                We built AptitudeX to solve a real problem: job seekers and students know they need to improve, but don't know exactly what skills to focus on. Our AI analyzes the market and creates actionable roadmaps tailored just for you.
              </p>
              <button
                onClick={() => window.location.href = "/register"}
                style={{
                  padding: "13px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 6px 24px rgba(99,102,241,0.3)",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  display: "inline-flex", alignItems: "center", gap: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(99,102,241,0.5), 0 10px 32px rgba(99,102,241,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(99,102,241,0.4), 0 6px 24px rgba(99,102,241,0.3)"; }}
              >
                Start Now <ArrowRight size={18} />
              </button>
            </div>
          </SlideLeft>

          <SlideRight>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {benefits.map(({ Icon, title, desc }, i) => (
                <ScaleIn key={title} delay={i * 0.1}>
                  <BenefitCard Icon={Icon} title={title} desc={desc} />
                </ScaleIn>
              ))}
            </div>
          </SlideRight>
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
        background: hovered ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
        border: hovered ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "22px 18px",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hovered ? "0 16px 40px rgba(99,102,241,0.18)" : "none",
        height: "100%",
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: hovered ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14,
        transition: "all 0.4s ease",
        transform: hovered ? "scale(1.15)" : "scale(1)",
      }}>
        <Icon size={20} color="#a5b4fc" />
      </div>
      <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</h4>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, flex: 1 }}>{desc}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   CTA
════════════════════════════════════════════ */
function CTA() {
  const navigate = useNavigate();
  return (
    <section style={{ padding: "80px 24px 100px", background: "#07071a" }}>
      <FadeUp>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
          borderRadius: 24,
          padding: "56px 40px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", bottom: -80, left: -80, width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
              <Rocket size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: "clamp(1.7rem, 4vw, 2.3rem)", fontWeight: 800, color: "#fff", marginBottom: 14 }}>
              Ready to Accelerate Your Career?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, marginBottom: 32, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px" }}>
              Join thousands of professionals who stopped guessing and started growing with AI-powered career intelligence.
            </p>
            <button
              onClick={() => navigate("/register")}
              style={{
                padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: "#fff", color: "#6366f1", border: "none",
                cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                transition: "transform 0.25s, box-shadow 0.25s",
                display: "inline-flex", alignItems: "center", gap: 10,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 18 }}>No credit card required</p>
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
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 24px 36px", background: "#0a0a1e" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeUp distance={30}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }} className="footer-grid">
            <div>
              <div style={{ marginBottom: 14 }}>
                <GlowingLogo size="small" />
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>
                AI-powered career intelligence platform helping professionals land their dream jobs faster.
              </p>
            </div>
            <div>
              <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Platform</h4>
              {[["Features", "features"], ["How It Works", "how"], ["Benefits", "benefits"]].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, padding: "5px 0", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.target.style.color = "#a5b4fc"; }}
                  onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.5)"; }}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Account</h4>
              {[["Log In", "/login"], ["Sign Up", "/register"]].map(([label, path]) => (
                <Link key={path} to={path} style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 14, textDecoration: "none", padding: "5px 0", transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.target.style.color = "#a5b4fc"; }}
                  onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.5)"; }}>
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Legal</h4>
              {["Privacy Policy", "Terms of Service"].map((label) => (
                <span key={label} style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 14, padding: "5px 0", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.target.style.color = "#a5b4fc"; }}
                  onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.5)"; }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.2} distance={20}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, textAlign: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>© 2026 AptitudeX. All rights reserved.</span>
          </div>
        </FadeUp>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════
   KEYFRAMES & RESPONSIVE STYLES
════════════════════════════════════════════ */
const STYLES = `
html {
  scroll-behavior: smooth;
}

@keyframes logoGlow {
  0% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.3), 0 4px 16px rgba(124, 58, 237, 0.4); }
  100% { box-shadow: 0 0 30px rgba(124, 58, 237, 0.6), 0 0 60px rgba(124, 58, 237, 0.4), 0 4px 20px rgba(124, 58, 237, 0.5); }
}

@keyframes textGlow {
  0%, 100% { background-position: 0% 50%; filter: drop-shadow(0 0 8px rgba(124, 58, 237, 0.4)); }
  50% { background-position: 100% 50%; filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.6)); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.step-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(99,102,241,0.1) 50%, transparent 60%);
  background-size: 200% 200%;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.step-card:hover::before {
  opacity: 1;
  animation: shimmer 1.5s ease infinite;
}

@media (max-width: 1024px) {
  .steps-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 768px) {
  .steps-grid {
    grid-template-columns: 1fr !important;
  }
  .features-grid {
    grid-template-columns: 1fr !important;
  }
  .benefits-grid {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
  }
  .footer-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 28px !important;
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
    if (!document.getElementById("welcome-styles")) {
      const style = document.createElement("style");
      style.id = "welcome-styles";
      style.textContent = STYLES;
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
      <CTA />
      <Footer />
    </div>
  );
}
