import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Health() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/health');
      setHealthData(response.data);
    } catch (err) {
      if (err.response && err.response.data) {
        setHealthData(err.response.data);
      } else {
        setError('Failed to connect to backend service');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const card = (title, ok, desc) => (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</h4>
        <span style={{ fontSize: 12, fontWeight: 700, background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', color: ok ? '#34d399' : '#f87171', border: `1px solid ${ok ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 100, padding: '3px 10px' }}>
          {ok ? 'OK' : 'DOWN'}
        </span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>{desc}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 60%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        {/* Nav back */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 14, marginBottom: 28 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#a5b4fc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
          ← Back to Home
        </Link>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '36px 32px', backdropFilter: 'blur(20px)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>AI</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>CareerIQ</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6, marginTop: 16 }}>System Health</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 }}>Live status of all platform services</p>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 44, height: 44, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Checking services…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {!loading && healthData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Overall */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 22px' }}>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>Overall Status</h3>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                    {healthData.time ? new Date(healthData.time).toLocaleString() : 'Just now'}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, background: healthData.ok ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', color: healthData.ok ? '#34d399' : '#f87171', border: `1px solid ${healthData.ok ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 100, padding: '5px 14px', letterSpacing: '0.5px' }}>
                  {healthData.ok ? '● HEALTHY' : '● UNHEALTHY'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {card('MongoDB', healthData.db?.ok, healthData.db?.ok ? 'Database connection is active' : 'Database connection failed')}
                {card('NLP Service', healthData.nlp?.ok, healthData.nlp?.ok ? 'FastAPI microservice is responding' : 'NLP microservice not responding')}
              </div>
            </div>
          )}

          {/* Retry */}
          {!loading && (
            <button
              onClick={checkHealth}
              style={{ marginTop: 24, width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
            >
              ↺ Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
