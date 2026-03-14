import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import { X, Mail } from "lucide-react";

const PAGE_BG   = { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 50%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative', overflow: 'hidden' };
const CARD      = { width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '40px 36px', backdropFilter: 'blur(20px)', position: 'relative' };
const INPUT_S   = { width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };
const focusOn   = (e) => { e.target.style.borderColor = '#6366f1'; };
const focusOff  = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={PAGE_BG}>
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <button
        onClick={() => navigate('/login')} title="Back to login"
        style={{ position: 'absolute', top: 20, right: 20, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.18s', zIndex: 10 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; e.currentTarget.style.color = '#f87171'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
      >
        <X size={16} />
      </button>

      <div style={CARD}>
        <div style={{ marginBottom: 28 }}>
          <span className="brand-text" style={{ fontSize: 20 }}>AptitudeX</span>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 500, letterSpacing: 0.4, marginTop: 3, textTransform: 'uppercase' }}>AI-Driven Career Intelligence System</div>
        </div>

        {sent ? (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Mail size={26} color="#a5b4fc" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Check your inbox</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              If <strong style={{ color: '#a5b4fc' }}>{email}</strong> is registered, you'll receive a password reset link shortly. The link expires in <strong style={{ color: '#fff' }}>10 minutes</strong>.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Didn't receive it? Check your spam folder or{' '}
              <button onClick={() => { setSent(false); setEmail(""); }} style={{ background: 'none', border: 'none', color: '#a5b4fc', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13 }}>try again</button>.
            </p>
            <Link to="/login" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Forgot password?</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Enter your email and we'll send a reset link.</p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" placeholder="your@email.com" value={email} required onChange={(e) => setEmail(e.target.value)} style={INPUT_S} onFocus={focusOn} onBlur={focusOff} />
              </div>

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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 }}>
                Remembered it?{' '}
                <Link to="/login" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
