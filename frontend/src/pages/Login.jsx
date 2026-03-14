import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { X } from "lucide-react";

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
        localStorage.setItem("token", res.data.data.token);
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
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 50%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      {/* Close button */}
      <button
        onClick={() => navigate('/')} title="Close"
        style={{ position: 'absolute', top: 20, right: 20, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', color: 'rgba(255,255,255,0.55)', fontSize: 18, lineHeight: 1, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.18s', zIndex: 10 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; e.currentTarget.style.color = '#f87171'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
      >
        <X size={16} />
      </button>

      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '40px 36px', backdropFilter: 'blur(20px)', position: 'relative' }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <span className="brand-text" style={{ fontSize: 20 }}>AptitudeX</span>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 500, letterSpacing: 0.4, marginTop: 3, textTransform: 'uppercase' }}>AI-Driven Career Intelligence System</div>
        </div>

        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Sign in to your Career Intelligence account</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" placeholder="your@email.com" value={email} required
              onChange={(e) => setEmail(e.target.value)} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Password</label>
              <Link to="/forgot-password" style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <input
              type="password" placeholder="••••••••" value={password} required
              onChange={(e) => setPassword(e.target.value)} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          {/* Email not verified banner */}
          {unverifiedEmail && (
            <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ color: '#fde68a', fontSize: 13, marginBottom: 8 }}>
                Please verify your email before logging in. Check your inbox for the verification link.
              </p>
              {resendSent ? (
                <p style={{ color: '#86efac', fontSize: 12 }}>Verification email resent — check your inbox.</p>
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
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 6px 20px rgba(99,102,241,0.4)', marginTop: 4, transition: 'opacity 0.2s,transform 0.2s' }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
