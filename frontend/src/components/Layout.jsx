import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Users, UserCheck, BarChart2, ClipboardList, Map, Home, FileText,
  Folder, Target, TrendingUp, Briefcase, Flame, LogOut, HeartPulse,
  ArrowLeft, RefreshCw, Check, X, ChevronDown, ChevronRight, ClipboardCheck,
  ShieldCheck, ListChecks, Activity,
} from 'lucide-react';
import api from '../api/api';
import { useSSE } from '../context/SSEContext';
import ProgressToast from './ProgressToast';

// ── Profile Edit Modal ───────────────────────────────────────────────────────
function ProfileModal({ onClose, onSave }) {
  const [form, setForm]         = useState({ name: '', phone: '', bio: '', location: '' });
  const [pwSection, setPwSection] = useState(false);
  const [pw, setPw]             = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null); // { type: 'ok'|'err', text }
  const overlayRef              = useRef(null);

  // Load profile on mount
  useEffect(() => {
    api.get('/api/users/me')
      .then(({ data }) => {
        const u = data.user || {};
        setForm({
          name:     u.name     || '',
          phone:    u.phone    || '',
          bio:      u.bio      || '',
          location: u.location || '',
        });
      })
      .catch(() => setMsg({ type: 'err', text: 'Could not load profile' }))
      .finally(() => setLoading(false));
  }, []);

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (pwSection) {
      if (pw.next !== pw.confirm) {
        return setMsg({ type: 'err', text: 'New passwords do not match' });
      }
      if (pw.next && pw.next.length < 6) {
        return setMsg({ type: 'err', text: 'New password must be at least 6 characters' });
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (pwSection && pw.next) {
        payload.currentPassword = pw.current;
        payload.newPassword     = pw.next;
      }
      const { data } = await api.put('/api/users/me', payload);
      // Sync localStorage so the UI updates immediately
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const fresh  = { ...stored, ...data.user };
      localStorage.setItem('user', JSON.stringify(fresh));
      setMsg({ type: 'ok', text: 'Profile saved successfully!' });
      setPw({ current: '', next: '', confirm: '' });
      onSave(data.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile';
      setMsg({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</label>
      {key === 'bio' ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );

  const pwField = (label, key, placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</label>
      <input
        type="password"
        value={pw[key]}
        onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );

  const initials = form.name
    ? form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'pmFadeIn 0.2s ease',
      }}
    >
      <style>{`@keyframes pmFadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(13,13,35,0.82)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(99,102,241,0.32)',
        borderRadius: 22,
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'pmFadeIn 0.24s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'rgba(255,255,255,0.025)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(99,102,241,0.25), 0 0 18px rgba(99,102,241,0.35)',
          }}>{initials}</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>Edit Profile</div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 2 }}>Update your personal information</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1,
              padding: '6px 8px', borderRadius: 8, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          ><X size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading profile…</div>
          ) : (
            <form onSubmit={handleSave} style={{ padding: '20px 24px' }}>

              {/* Success / Error banner */}
              {msg && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  background: msg.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: msg.type === 'ok' ? '#4ade80' : '#f87171',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>{msg.type === 'ok' ? <Check size={14} /> : <X size={14} />}</span> {msg.text}
                </div>
              )}

              {/* Personal info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, color: 'rgba(139,92,246,0.8)', whiteSpace: 'nowrap' }}>Personal Info</div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(99,102,241,0.3),transparent)' }} />
              </div>

              {field('Full Name',  'name',     'text',  'John Doe')}
              {field('Phone',      'phone',    'tel',   '+1 (555) 000-0000')}
              {field('Location',   'location', 'text',  'San Francisco, CA')}
              {field('Bio',        'bio',      'text',  'A short bio about you…')}

              {/* Password section toggle */}
              <button
                type="button"
                onClick={() => { setPwSection(s => !s); setMsg(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#818cf8', fontSize: 13, fontWeight: 600,
                  padding: '4px 0', marginBottom: 14,
                }}
              >
                <span style={{ display: 'flex' }}>{pwSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                Change Password
              </button>

              {pwSection && (
                <div style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.22)',
                  borderRadius: 14, padding: '16px 16px 6px', marginBottom: 16,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset',
                }}>
                  {pwField('Current Password', 'current', '••••••••')}
                  {pwField('New Password',     'next',    '••••••••')}
                  {pwField('Confirm New',      'confirm', '••••••••')}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2, padding: '12px 0', borderRadius: 12,
                    background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: saving ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.5)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 6px 20px rgba(99,102,241,0.45)',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.6)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = saving ? 'none' : '0 6px 20px rgba(99,102,241,0.45)'; }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 13px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: '#fff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
  fontFamily: 'inherit',
  resize: 'vertical',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
};

// ── Logout Confirm Modal (glass style) ──────────────────────────────────────
function LogoutConfirmModal({ onConfirm, onCancel }) {
  const overlayRef = useRef(null);

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === overlayRef.current) onCancel(); };

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(13,13,35,0.85)',
        border: '1px solid rgba(99,102,241,0.35)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset',
        padding: '36px 32px 28px',
        textAlign: 'center',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        animation: 'fadeIn 0.22s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(239,68,68,0.14)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><LogOut size={26} /></div>

        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.3 }}>
          Sign out?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          Do you want to log out of your account?
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
          >
            No, stay
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: 'linear-gradient(135deg,#ef4444,#dc2626)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.48)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.35)'; }}
          >
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_NAV = {
  ADMIN: [
    { path: '/admin',               label: 'Admin Dashboard', Icon: Zap },
    { path: '/staff-management',    label: 'Staff Management', Icon: Users },
    { path: '/users',               label: 'Job Seekers',      Icon: UserCheck },
    { path: '/admin-report',        label: 'Platform Report',  Icon: BarChart2 },
    { path: '/admin/user-reports',  label: 'User Reports',     Icon: ClipboardList },
    { path: '/all-roadmaps',        label: 'All Roadmaps',     Icon: Map },
    { path: '/admin/audit-logs',    label: 'Audit Log',        Icon: ShieldCheck },
  ],
  STAFF: [
    { path: '/staff-home',       label: 'Dashboard',        Icon: Zap },
    { path: '/staff',            label: 'User Reports',     Icon: ClipboardList },
    { path: '/all-roadmaps',     label: 'All Roadmaps',     Icon: Map },
  ],
  USER: [
    { path: '/dashboard',          label: 'Dashboard',          Icon: Home },
    { path: '/resume-analyze',     label: 'Resume Analyze',     Icon: FileText },
    { path: '/my-resumes',         label: 'My Resumes',         Icon: Folder },
    { path: '/compare-job',        label: 'Compare Job',        Icon: Target },
    { path: '/my-roadmap',         label: 'My Roadmaps',        Icon: Map },
    { path: '/analytics',          label: 'Analytics',          Icon: TrendingUp },
    { path: '/trends',             label: 'Industry Trends',    Icon: Activity },
    { path: '/job-postings',       label: 'Job Postings',       Icon: Briefcase },
    { path: '/skills-in-demand',   label: 'Skills in Demand',   Icon: Flame },
    { path: '/job-tracker',        label: 'Job Tracker',        Icon: ClipboardCheck },
    { path: '/progress',           label: 'Progress Tracking',  Icon: ListChecks },
  ],
};

// ── Notification system ─────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60_000; // fallback refresh every 5 minutes (SSE handles real-time)

// Maps the icon string sent by the backend to a Lucide component
const NOTIF_ICONS = {
  FileText,
  Map,
  Target,
  Users,
  ClipboardList,
};

function NotificationDropdown({ userRole }) {
  const STORAGE_KEY = `notif_read_${userRole}`;
  const { liveNotifications } = useSSE();

  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [readIds,       setReadIds]       = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const ref = useRef(null);

  // Fetch full notification list from backend
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

  // Initial fetch + 5-minute fallback poll
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Merge SSE-pushed live notifications (real-time) into the local list
  useEffect(() => {
    if (liveNotifications.length === 0) return;
    setNotifications((prev) => {
      const merged = [
        ...liveNotifications,
        ...prev.filter((n) => !liveNotifications.find((ln) => ln.id === n.id)),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return merged;
    });
  }, [liveNotifications]);

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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}
              ><RefreshCw size={14} /></button>
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
            const NotifIcon = NOTIF_ICONS[n.icon] || FileText;
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
                }}>
                  <NotifIcon size={17} style={{ color: '#a5b4fc' }} />
                </div>
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
              <Check size={14} style={{ display: 'inline', marginRight: 4 }} /> All caught up
            </div>
          )}

          {/* Refresh timestamp */}
          {!loading && !error && notifications.length > 0 && (
            <div style={{ padding: '8px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.18)', fontSize: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              Live via SSE · 5-min backup refresh
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
    api.post('/api/auth/logout').finally(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      navigate('/login');
    });
  };

  return (
    <div style={{
      width: 256, height: '100%', background: '#0c0c20',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {navItems.map(({ path, label, Icon: NavIcon }) => {
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
              {NavIcon && <NavIcon size={16} style={{ flexShrink: 0 }} />}
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
          <HeartPulse size={14} style={{ flexShrink: 0 }} /> System Health
        </Link>
        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', fontSize: 13, color: 'rgba(239,68,68,0.55)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.55)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} /> Logout
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [userRole,       setUserRole]       = useState(null);
  const [userName,       setUserName]       = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(u.role || null);
      setUserName(u.name || '');
    } catch {}
  }, []);

  // Home routes — pressing back here means "leave the app" → show logout modal
  const HOME_ROUTES = ['/dashboard', '/admin', '/staff-home'];
  const isHomePage  = HOME_ROUTES.includes(location.pathname);

  // Handle back button click in the top bar
  const handleBack = () => {
    if (isHomePage) {
      setLogoutModalOpen(true);
    } else {
      navigate(-1);
    }
  };

  // Intercept browser back button ONLY on home pages → show logout modal
  useEffect(() => {
    if (!isHomePage) return;
    window.history.pushState(null, '', window.location.pathname);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      setLogoutModalOpen(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHomePage]);

  const handleLogoutConfirm = () => {
    api.post('/api/auth/logout').finally(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      navigate('/login');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07071a', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

      {/* ── Full-width top bar (spans sidebar + content) ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
        width: '100%', height: 58,
        background: 'linear-gradient(90deg, #0c0c20 0%, #0e0e25 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.18)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 24px rgba(0,0,0,0.45)',
      }}>
        {/* Left: back button — hidden on home/dashboard pages */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!isHomePage && (
            <button
              onClick={handleBack}
              title="Go back"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9, padding: '6px 14px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.18s',
                letterSpacing: 0.2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                e.currentTarget.style.color = '#a5b4fc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
          )}
        </div>

        {/* Center: brand */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'center' }}>
            <span className="brand-text" style={{ fontSize: 17 }}>AptitudeX</span>
            <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9.5, fontWeight: 500, letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' }}>
              AI-Driven Career Intelligence System
            </span>
          </div>
        </Link>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>

          {/* Notification bell — only mount once role is known so storage key is correct */}
          {userRole && <NotificationDropdown userRole={userRole} />}

          {/* Desktop user avatar pill — click to open profile editor */}
          {userName && (
            <button
              onClick={() => setProfileOpen(true)}
              title="Edit profile"
              className="hidden md:flex"
              style={{
                alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 20, padding: '4px 12px 4px 4px',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            >
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
            </button>
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

      {/* Profile edit modal */}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onSave={(updatedUser) => {
            if (updatedUser?.name) setUserName(updatedUser.name);
          }}
        />
      )}

      {/* Logout confirmation modal */}
      {logoutModalOpen && (
        <LogoutConfirmModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setLogoutModalOpen(false)}
        />
      )}

      {/* Real-time operation progress toasts (driven by SSE) */}
      <ProgressToast />
    </div>
  );
}
