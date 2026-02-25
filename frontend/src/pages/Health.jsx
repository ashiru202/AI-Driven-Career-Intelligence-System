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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1e 0%,#0d0d2b 60%,#130d30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI',system-ui,sans-serif", position: 'relative' }}>
      {/* Close button — top-right corner */}
      <Link
        to="/"
        title="Close"
        style={{
          position: 'fixed', top: 20, right: 20,
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%',
          color: 'rgba(255,255,255,0.55)', fontSize: 18, lineHeight: 1,
          textDecoration: 'none',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.18s', zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; e.currentTarget.style.color = '#f87171'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
      >
        ✕
      </Link>
      <div style={{ width: '100%', maxWidth: 580 }}>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '36px 32px', backdropFilter: 'blur(20px)' }}>
          {/* Header */}
          <div style={{ marginBottom: 8 }}>
            <span className="brand-text" style={{ fontSize: 18 }}>AptitudeX</span>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10.5, fontWeight: 500, letterSpacing: 0.4, marginTop: 3, textTransform: 'uppercase' }}>AI-Driven Career Intelligence System</div>
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
              Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
