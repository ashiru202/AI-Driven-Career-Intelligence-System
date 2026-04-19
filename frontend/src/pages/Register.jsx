import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });
  const [error, setError]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      setRegisteredEmail(formData.email);
    } catch (err) {
      console.log("REGISTER ERROR:", err.response?.data);
      setError(err.response?.data?.error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 48px', borderRadius: 12, fontSize: 15,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
  };
  const focusOn  = (e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'rgba(99,102,241,0.05)'; };
  const focusOff = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative' }}>
      {/* Back button - Top left corner of entire page */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 24, left: 24, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(10,10,30,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
          padding: '10px 16px', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(10,10,30,0.8)'; }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Left Panel - Branding */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(135deg, #0a0a1e 0%, #0d0d2b 50%, #130d30 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden',
      }}
        className="hidden lg:flex"
      >
        {/* Background effects */}
        <div style={{ position: 'absolute', top: '15%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 48 }}>
            <span className="brand-text" style={{ fontSize: 32 }}>AptitudeX</span>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, letterSpacing: 0.6, marginTop: 4, textTransform: 'uppercase' }}>Career Intelligence</div>
          </Link>

          {/* Quote */}
          <blockquote style={{ margin: 0, maxWidth: 520 }}>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>
              "Success is not final, failure is not fatal: it is the courage to continue that counts."
            </p>
            <footer style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Winston Churchill
            </footer>
          </blockquote>

        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(180deg, #0f0f23 0%, #0a0a1e 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px 24px', position: 'relative',
      }}>
        {/* Form container */}
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 36 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span className="brand-text" style={{ fontSize: 24 }}>AptitudeX</span>
            </Link>
          </div>

          {registeredEmail ? (
            /* Email-sent confirmation */
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
                <Mail size={32} color="#34d399" />
              </div>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Check your email</h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.65, marginBottom: 10 }}>
                We sent a verification link to
              </p>
              <p style={{ color: '#a5b4fc', fontSize: 16, fontWeight: 600, marginBottom: 24 }}>{registeredEmail}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.65, marginBottom: 32 }}>
                Click the link in the email to activate your account.<br />
                It expires in <strong style={{ color: 'rgba(255,255,255,0.6)' }}>24 hours</strong>.
              </p>
              <Link to="/login" style={{
                display: 'block', textAlign: 'center', padding: '15px',
                borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                textDecoration: 'none', boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                marginBottom: 20, transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.45)'; }}
                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35)'; }}
              >
                Go to Sign In
              </Link>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                Didn't receive it?{' '}
                <button
                  onClick={async () => {
                    try { await api.post("/api/auth/resend-verification", { email: registeredEmail }); } catch {}
                    alert("Verification email resent check your inbox.");
                  }}
                  style={{ background: 'none', border: 'none', color: '#a5b4fc', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13 }}
                >
                  Resend
                </button>
              </p>
            </div>
          ) : (
            /* Registration form */
            <>
              <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Create your account</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>
                Start your AI-powered career journey today
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Name field */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text" name="name" placeholder="John Doe" value={formData.name} required
                      onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>
                </div>

                {/* Role field */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>I am a</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { value: 'USER', label: 'User', hint: 'Job seeker' },
                      { value: 'STAFF', label: 'Staff', hint: 'Support team' }
                    ].map((choice) => {
                      const selected = formData.role === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: choice.value })}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: selected ? '1px solid rgba(99,102,241,0.85)' : '1px solid rgba(255,255,255,0.12)',
                            background: selected ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{choice.label}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{choice.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email field */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="email" name="email" placeholder="your@email.com" value={formData.email} required
                      onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="password" name="password" placeholder="Create a password" value={formData.password} required
                      onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 6 }}>Must be at least 6 characters</p>
                </div>

                {/* Confirm Password field */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="password" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} required
                      onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                    marginTop: 4, transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.45)'; } }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35)'; }}
                >
                  {loading ? 'Creating Account...' : 'Create Free Account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 24 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = '#c4b5fd'}
                  onMouseLeave={e => e.target.style.color = '#a5b4fc'}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
