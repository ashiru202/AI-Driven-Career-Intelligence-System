import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (res.data.ok && res.data.data) {
        // Store token and user info
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        localStorage.setItem("role", res.data.data.user.role);

        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.log("REGISTER ERROR:", err.response?.data);
      const errorMsg = err.response?.data?.error?.message || "Registration failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const focusOn  = (e) => { e.target.style.borderColor = '#6366f1'; };
  const focusOff = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 50%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '8%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '40px 36px', backdropFilter: 'blur(20px)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>AI</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>CareerIQ</span>
        </div>

        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Start your AI-powered career journey today — free</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
            <input type="text" name="name" placeholder="John Doe" value={formData.name} required onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" name="email" placeholder="your@email.com" value={formData.email} required onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" name="password" placeholder="••••••••" value={formData.password} required onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 5 }}>Minimum 6 characters</p>
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} required onChange={handleChange} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
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
            {loading ? 'Creating Account…' : 'Create Free Account'}
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
