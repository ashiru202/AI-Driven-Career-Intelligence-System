import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { CheckCircle, XCircle } from "lucide-react";

const PAGE_BG = { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 50%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative', overflow: 'hidden' };
const CARD    = { width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '40px 36px', backdropFilter: 'blur(20px)', position: 'relative', textAlign: 'center' };

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const called = useRef(false); // guard against React 18 StrictMode double-invocation

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message || "Email verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error?.message || "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <div style={PAGE_BG}>
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={CARD}>
        <div style={{ marginBottom: 24 }}>
          <span className="brand-text" style={{ fontSize: 20 }}>AptitudeX</span>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 500, letterSpacing: 0.4, marginTop: 3, textTransform: 'uppercase' }}>AI-Driven Career Intelligence System</div>
        </div>

        {status === "verifying" && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <div style={{ width: 24, height: 24, border: '3px solid rgba(99,102,241,0.4)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Verifying your email…</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Please wait a moment.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === "success" && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={26} color="#22c55e" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Email verified!</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>{message}</p>
            <Link to="/login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
              Sign In
            </Link>
          </div>
        )}

        {status === "error" && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <XCircle size={26} color="#ef4444" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Verification failed</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/login" style={{ display: 'block', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
                Back to Sign In
              </Link>
              <ResendSection />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResendSection() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);

  const resend = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/resend-verification", { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) return <p style={{ color: '#86efac', fontSize: 13 }}>Verification email sent - check your inbox.</p>;

  return show ? (
    <form onSubmit={resend} style={{ display: 'flex', gap: 8 }}>
      <input
        type="email" placeholder="your@email.com" value={email} required
        onChange={(e) => setEmail(e.target.value)}
        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
      />
      <button type="submit" disabled={loading} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc', cursor: 'pointer' }}>
        {loading ? '…' : 'Send'}
      </button>
    </form>
  ) : (
    <button onClick={() => setShow(true)} style={{ background: 'none', border: 'none', color: '#a5b4fc', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
      Resend verification email
    </button>
  );
}
