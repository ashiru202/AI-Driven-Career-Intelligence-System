import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendSent, setResendSent]           = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setResendSent(false);
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", { email, password });

      if (res.data.ok && res.data.data) {
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        localStorage.setItem("role", res.data.data.user.role);

        const role = res.data.data.user.role;
        if (role === 'ADMIN')       navigate('/admin',     { replace: true });
        else if (role === 'STAFF')  navigate('/staff',     { replace: true });
        else                        navigate('/dashboard', { replace: true });
      } else {
        setError("Login response was not successful");
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email);
      } else {
        setError(
          err.response?.data?.error?.message
          || err.response?.data?.message
          || err.message
          || "Login failed. Please check your credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try { await api.post("/api/auth/resend-verification", { email: unverifiedEmail }); } catch {}
    setResendSent(true);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 48px', borderRadius: 12, fontSize: 15,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
  };

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
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
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
              "The future belongs to those who prepare for it today."
            </p>
            <footer style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Malcolm X
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

          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 36 }}>
            Sign in to continue your career journey
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email field */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="email" placeholder="your@email.com" value={email} required
                  onChange={(e) => setEmail(e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'rgba(99,102,241,0.05)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Password</label>
                <Link to="/forgot-password" style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#c4b5fd'}
                  onMouseLeave={e => e.target.style.color = '#a5b4fc'}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="password" placeholder="Enter your password" value={password} required
                  onChange={(e) => setPassword(e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'rgba(99,102,241,0.05)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
              </div>
            </div>

            {/* Email not verified banner */}
            {unverifiedEmail && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#fde68a', fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>
                  Please verify your email before logging in. Check your inbox for the verification link.
                </p>
                {resendSent ? (
                  <p style={{ color: '#86efac', fontSize: 13 }}>Verification email resent check your inbox.</p>
                ) : (
                  <button
                    type="button" onClick={resendVerification}
                    style={{ background: 'none', border: 'none', color: '#a5b4fc', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13 }}
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            {/* Generic error */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>
              </div>
            )}

            {/* Submit button */}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 28 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#c4b5fd'}
              onMouseLeave={e => e.target.style.color = '#a5b4fc'}
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
