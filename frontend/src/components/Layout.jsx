import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
        width: '100%', height: 54,
        background: '#0c0c20',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
      }}>
        {/* Left: logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: -0.5 }}>AI</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>
            Career<span style={{ color: '#818cf8' }}>IQ</span>
          </span>
        </Link>

        {/* Right: mobile hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <div style={{ width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <div style={{ width: 14, height: 2, background: '#fff', borderRadius: 2 }} />
          </button>
        </div>
      </div>

      {/* ── Below top bar: sidebar + content ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Desktop sidebar */}
        <div className="hidden md:block" style={{ flexShrink: 0, position: 'sticky', top: 54, height: 'calc(100vh - 54px)', overflowY: 'auto' }}>
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
