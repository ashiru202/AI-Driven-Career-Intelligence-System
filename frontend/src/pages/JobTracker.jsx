import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api/api';
import {
  Briefcase, Plus, X, ExternalLink, Trash2, Edit2,
  ChevronRight, Calendar, MapPin, DollarSign, Building2,
} from 'lucide-react';

// ── Stage configuration ───────────────────────────────────────────────────────
const STAGES = [
  { key: 'saved',     label: 'Saved',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)' },
  { key: 'applied',   label: 'Applied',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.35)' },
  { key: 'interview', label: 'Interview', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  { key: 'offer',     label: 'Offer',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)' },
  { key: 'rejected',  label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)' },
];

const EMPTY_FORM = {
  jobTitle: '', company: '', location: '', jobUrl: '',
  salary: '', source: '', jobDescription: '', notes: '',
  status: 'saved', appliedDate: '', interviewDate: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Application Card ─────────────────────────────────────────────────────────
function AppCard({ app, stages, onEdit, onDelete, onMove }) {
  const stage = stages.find((s) => s.key === app.status) || stages[0];
  const nextStages = stages.filter((s) => s.key !== app.status);

  return (
    <div style={{
      background: 'rgba(15,15,40,0.7)',
      border: `1px solid ${stage.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 10,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${stage.border}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {app.jobTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Building2 size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{app.company}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {app.jobUrl && (
            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', textDecoration: 'none', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
            ><ExternalLink size={13} /></a>
          )}
          <button onClick={() => onEdit(app)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          ><Edit2 size={13} /></button>
          <button onClick={() => onDelete(app._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          ><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {app.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>
            <MapPin size={10} />{app.location}
          </span>
        )}
        {app.salary && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>
            <DollarSign size={10} />{app.salary}
          </span>
        )}
        {app.appliedDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>
            <Calendar size={10} />Applied {fmt(app.appliedDate)}
          </span>
        )}
        {app.interviewDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 20 }}>
            <Calendar size={10} />Interview {fmt(app.interviewDate)}
          </span>
        )}
        {app.source && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
            {app.source}
          </span>
        )}
      </div>

      {app.notes && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 8, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {app.notes}
        </p>
      )}

      {/* Move to stage quick-actions */}
      {nextStages.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginRight: 2 }}>Move to:</span>
          {nextStages.map((s) => (
            <button key={s.key} onClick={() => onMove(app._id, s.key)} style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
              background: s.bg, border: `1px solid ${s.border}`, color: s.color, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><ChevronRight size={9} />{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Application Form Modal ─────────────────────────────────────────────────
function AppModal({ initial, onClose, onSave }) {
  const [form, setForm]   = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobTitle.trim()) return setError('Job title is required');
    if (!form.company.trim())  return setError('Company is required');
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.appliedDate)   delete payload.appliedDate;
      if (!payload.interviewDate) delete payload.interviewDate;
      await onSave(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const inp = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(139,92,246,0.85)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 5 }}>{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
      ) : (
        <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      )}
    </div>
  );

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'rgba(13,13,35,0.92)', border: '1px solid rgba(99,102,241,0.35)',
        borderRadius: 20, padding: '32px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
            {initial?._id ? 'Edit Application' : 'Add Application'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {inp('Job Title *', 'jobTitle', 'text', 'e.g. Frontend Engineer')}
          {inp('Company *', 'company', 'text', 'e.g. Acme Corp')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{inp('Location', 'location', 'text', 'e.g. Remote / London')}</div>
            <div>{inp('Salary', 'salary', 'text', 'e.g. £60k–£80k')}</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(139,92,246,0.85)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 5 }}>Stage</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' }}>
              {STAGES.map((s) => <option key={s.key} value={s.key} style={{ background: '#1e1b4b' }}>{s.label}</option>)}
            </select>
          </div>

          {inp('Job URL', 'jobUrl', 'url', 'https://...')}
          {inp('Source', 'source', 'text', 'e.g. LinkedIn, Indeed, Referral')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{inp('Applied Date', 'appliedDate', 'date')}</div>
            <div>{inp('Interview Date', 'interviewDate', 'date')}</div>
          </div>

          {inp('Notes', 'notes', 'textarea', 'Any notes about this application…')}

          <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '12px 0', borderRadius: 12, background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: '1px solid rgba(99,102,241,0.5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 6px 20px rgba(99,102,241,0.45)' }}>
              {saving ? 'Saving…' : (initial?._id ? 'Save Changes' : 'Add Application')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobTracker() {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [modal, setModal]     = useState(null); // null | { mode: 'add' | 'edit', data: {} }

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/job-applications');
      setApps(data.applications || []);
      setError(null);
    } catch {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    if (modal?.data?._id) {
      const { data } = await api.put(`/api/job-applications/${modal.data._id}`, payload);
      setApps((prev) => prev.map((a) => (a._id === modal.data._id ? data.application : a)));
    } else {
      const { data } = await api.post('/api/job-applications', payload);
      setApps((prev) => [data.application, ...prev]);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    await api.delete(`/api/job-applications/${id}`);
    setApps((prev) => prev.filter((a) => a._id !== id));
  };

  const handleMove = async (id, newStatus) => {
    const { data } = await api.put(`/api/job-applications/${id}`, { status: newStatus });
    setApps((prev) => prev.map((a) => (a._id === id ? data.application : a)));
  };

  const byStage = (key) => apps.filter((a) => a.status === key);

  return (
    <Layout>
      <div style={{ padding: '24px 28px', minHeight: '100vh', background: 'linear-gradient(135deg,rgba(6,6,20,0.98),rgba(10,10,35,0.98))' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(99,102,241,0.4)' }}>
                <Briefcase size={18} color="#fff" />
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.4 }}>Job Tracker</h1>
            </div>
            <p style={{ margin: '6px 0 0 48px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Track your applications across every stage — {apps.length} total
            </p>
          </div>
          <button onClick={() => setModal({ mode: 'add', data: null })} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: '1px solid rgba(99,102,241,0.5)', color: '#fff', fontSize: 14, fontWeight: 700,
            boxShadow: '0 6px 20px rgba(99,102,241,0.4)', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.55)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; }}
          >
            <Plus size={16} /> Add Application
          </button>
        </div>

        {/* Stage summary bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {STAGES.map((s) => {
            const count = byStage(s.key).length;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 30, background: s.bg, border: `1px solid ${s.border}` }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{count}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: '#fca5a5', fontSize: 14, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Kanban board */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
            {STAGES.map((stage) => {
              const stageApps = byStage(stage.key);
              return (
                <div key={stage.key} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${stage.border}`,
                  borderTop: `3px solid ${stage.color}`,
                  borderRadius: 16,
                  padding: '14px 12px',
                  minHeight: 120,
                }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{stage.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '1px 8px', borderRadius: 20 }}>{stageApps.length}</span>
                  </div>

                  {/* Cards */}
                  {stageApps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 8px', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                      No applications
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <AppCard
                        key={app._id}
                        app={app}
                        stages={STAGES}
                        onEdit={(a) => setModal({ mode: 'edit', data: { ...a, appliedDate: a.appliedDate ? a.appliedDate.slice(0, 10) : '', interviewDate: a.interviewDate ? a.interviewDate.slice(0, 10) : '' } })}
                        onDelete={handleDelete}
                        onMove={handleMove}
                      />
                    ))
                  )}

                  {/* Quick add button at bottom of each column */}
                  <button onClick={() => setModal({ mode: 'add', data: { ...EMPTY_FORM, status: stage.key } })} style={{
                    width: '100%', padding: '8px', marginTop: 6, borderRadius: 10, cursor: 'pointer',
                    background: 'transparent', border: `1px dashed ${stage.border}`,
                    color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.18s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = stage.bg; e.currentTarget.style.color = stage.color; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}
                  >
                    <Plus size={13} /> Add here
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && apps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Briefcase size={32} color="rgba(99,102,241,0.6)" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0 }}>No applications yet. Click <strong style={{ color: '#818cf8' }}>Add Application</strong> to get started.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <AppModal
          initial={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
