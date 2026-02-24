import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';

const ROLE_NAV = {
  ADMIN: [
    { path: '/admin',            label: 'Admin Dashboard', icon: '⚡' },
    { path: '/staff-management', label: 'Staff Management', icon: '👥' },
    { path: '/users',            label: 'Job Seekers',      icon: '🧑‍💼' },
    { path: '/admin-report',     label: 'Platform Report',  icon: '📊' },
    { path: '/staff',            label: 'User Reports',     icon: '📋' },
    { path: '/all-roadmaps',     label: 'All Roadmaps',     icon: '🗺️' },
  ],
  STAFF: [
    { path: '/staff',            label: 'User Reports',     icon: '📋' },
    { path: '/all-roadmaps',     label: 'All Roadmaps',     icon: '🗺️' },
  ],
  USER: [
    { path: '/dashboard',          label: 'Dashboard',          icon: '🏠' },
    { path: '/resume-analyze',     label: 'Resume Analyze',     icon: '📄' },
    { path: '/my-resumes',         label: 'My Resumes',         icon: '📁' },
    { path: '/compare-job',        label: 'Compare Job',        icon: '🎯' },
    { path: '/my-roadmap',         label: 'My Roadmaps',        icon: '🗺️' },
    { path: '/analytics',          label: 'Analytics',          icon: '📈' },
    { path: '/job-postings',       label: 'Job Postings',       icon: '💼' },
    { path: '/skills-in-demand',   label: 'Skills in Demand',   icon: '🔥' },
  ],
};

// ── Notification system ─────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000; // refresh every 30 seconds

function NotificationDropdown({ userRole }) {
  const STORAGE_KEY = `notif_read_${userRole}`;

  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [readIds,       setReadIds]       = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const ref = useRef(null);

  // Fetch from backend
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 30 s
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Re-sync readIds whenever STORAGE_KEY changes (userRole arrives after null on mount)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setReadIds(new Set(stored));
    } catch {
      setReadIds(new Set());
    }
  }, [STORAGE_KEY]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]));
  };

  const markRead = (id) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        title="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 8, width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', flexShrink: 0,
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 10a6 6 0 1 1 12 0v4l2 2H4l2-2v-4z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M10 20a2 2 0 0 0 4 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#6366f1', border: '2px solid #07071a',
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>{unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 200,
          width: 340, maxHeight: 440, overflowY: 'auto',
          background: '#13132b',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Notifications</span>
              {loading && (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>refreshing…</span>
              )}
              {!loading && unread > 0 && (
                <span style={{
                  background: 'rgba(99,102,241,0.2)',
                  color: '#a5b4fc', fontSize: 11, fontWeight: 700,
                  borderRadius: 10, padding: '2px 7px',
                }}>{unread} new</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: 12, fontWeight: 600 }}
                >Mark all read</button>
              )}
              <button
                onClick={fetchNotifications}
                title="Refresh"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0 }}
              >↻</button>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && notifications.length === 0 && (
            <div style={{ padding: '20px 16px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16, opacity: 0.4 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6, width: '70%' }} />
                    <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '90%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>{error}</div>
              <button
                onClick={fetchNotifications}
                style={{
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8, color: '#a5b4fc', fontSize: 12, fontWeight: 600,
                  padding: '6px 14px', cursor: 'pointer',
                }}
              >Retry</button>
            </div>
          )}

          {/* List */}
          {!error && notifications.map(n => {
            const isRead = readIds.has(n.id);
            return (
              <Link
                key={n.id}
                to={n.link}
                onClick={() => { markRead(n.id); setOpen(false); }}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  textDecoration: 'none',
                  background: isRead ? 'transparent' : 'rgba(99,102,241,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(99,102,241,0.06)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17,
                }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: isRead ? 'rgba(255,255,255,0.65)' : '#fff', fontWeight: isRead ? 500 : 700, fontSize: 13 }}>{n.title}</span>
                    {!isRead && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>{n.time}</div>
                </div>
              </Link>
            );
          })}

          {/* All-read footer */}
          {!loading && !error && notifications.length > 0 && unread === 0 && (
            <div style={{ padding: '18px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
              ✓ All caught up
            </div>
          )}

          {/* Refresh timestamp */}
          {!loading && !error && notifications.length > 0 && (
            <div style={{ padding: '8px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.18)', fontSize: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              Auto-refreshes every 30s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ROLE_COLOR = {
  ADMIN: { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  STAFF: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  USER:  { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
};

function SidebarContent({ location, navigate, userRole, userName, setSidebarOpen }) {
  const navItems = ROLE_NAV[userRole] || [];
  const rc       = ROLE_COLOR[userRole] || ROLE_COLOR.USER;
  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{
      width: 256, height: '100%', background: '#0c0c20',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {navItems.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen && setSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 10, marginBottom: 3,
                textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 500,
                background: active
                  ? 'linear-gradient(90deg,rgba(99,102,241,0.22),rgba(139,92,246,0.1))'
                  : 'transparent',
                color: active ? '#a5b4fc' : 'rgba(255,255,255,0.48)',
                borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
                transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)'; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.48)'; } }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User card — above System Health */}
      {userName && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            borderRadius: 12,
            background: rc.bg,
            border: `1px solid ${rc.border}`,
            overflow: 'hidden',
          }}>
            {/* "Logged in as" header strip */}
            <div style={{
              padding: '6px 12px',
              borderBottom: `1px solid ${rc.border}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Logged in as
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 800,
                color: rc.text, letterSpacing: 0.5,
              }}>
                {userRole}
              </span>
            </div>
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom links */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          to="/health"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 13, color: 'rgba(255,255,255,0.32)', marginBottom: 3, transition: 'all 0.18s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.32)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span>💚</span> System Health
        </Link>
        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', fontSize: 13, color: 'rgba(239,68,68,0.55)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.55)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(u.role || null);
      setUserName(u.name || '');
    } catch {}
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07071a', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

      {/* ── Full-width top bar (spans sidebar + content) ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
        width: '100%', height: 58,
        background: 'linear-gradient(90deg, #0c0c20 0%, #0e0e25 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 24px rgba(0,0,0,0.45)',
      }}>
        {/* Left: logo + brand */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* SVG Logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 14px rgba(99,102,241,0.45)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.5 2 6 4.5 6 7.5c0 1.5.5 2.8 1.4 3.8C6.5 12 6 12.9 6 14c0 2.2 1.8 4 4 4h.2c.5 1.2 1.6 2 2.8 2s2.3-.8 2.8-2H16c2.2 0 4-1.8 4-4 0-1.1-.5-2-1.4-2.7.9-1 1.4-2.3 1.4-3.8C20 4.5 17.5 2 14 2h-2z" fill="rgba(255,255,255,0.15)"/>
              <circle cx="10" cy="9" r="1.5" fill="#fff"/>
              <circle cx="14" cy="9" r="1.5" fill="#fff"/>
              <path d="M9 13c0 0 1 2 3 2s3-2 3-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 2v2M8 3.5l1 1.7M16 3.5l-1 1.7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          {/* Brand text + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>
              Career<span style={{ color: '#818cf8' }}>IQ</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 500, letterSpacing: 0.3, marginTop: 2 }}>
              AI-Driven Career Intelligence System
            </span>
          </div>
        </Link>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Notification bell — only mount once role is known so storage key is correct */}
          {userRole && <NotificationDropdown userRole={userRole} />}

          {/* Desktop user avatar pill */}
          {userName && (
            <div className="hidden md:flex" style={{
              alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20, padding: '4px 12px 4px 4px',
              cursor: 'default',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>
                {userName.split(' ')[0]}
              </span>
            </div>
          )}


        </div>
      </div>

      {/* ── Below top bar: sidebar + content ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Desktop sidebar */}
        <div className="hidden md:block" style={{ flexShrink: 0, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
          <SidebarContent location={location} navigate={navigate} userRole={userRole} userName={userName} />
        </div>

        {/* Mobile drawer overlay */}
        {sidebarOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SidebarContent location={location} navigate={navigate} userRole={userRole} userName={userName} setSidebarOpen={setSidebarOpen} />
            </div>
          </div>
        )}

        {/* Main content area */}
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <div style={{ padding: '32px' }}>
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
