import { useSSE } from '../context/SSEContext';

const OPERATION_LABELS = {
  resume_upload:    'Resume Analysis',
  roadmap_generate: 'Roadmap Generation',
};

const STEP_LABELS = {
  extracting_text:  'Extracting text…',
  analyzing_skills: 'Analysing skills with AI…',
  saving:           'Saving…',
  generating:       'Generating roadmap…',
  fetching_resources: 'Fetching learning resources…',
  complete:         'Done!',
  error:            'Failed',
};

function ProgressBar({ value, isError, isDone }) {
  const color = isError ? '#ef4444' : isDone ? '#22c55e' : '#6366f1';
  return (
    <div style={{
      height: 4, borderRadius: 2,
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden', marginTop: 8,
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: color,
        borderRadius: 2,
        transition: 'width 0.4s ease, background 0.3s',
      }} />
    </div>
  );
}

function ToastItem({ item }) {
  const isDone  = item.step === 'complete';
  const isError = item.step === 'error';
  const label   = OPERATION_LABELS[item.operation] || item.operation;
  const stepMsg = item.message || STEP_LABELS[item.step] || item.step;

  const borderColor = isError
    ? 'rgba(239,68,68,0.4)'
    : isDone
    ? 'rgba(34,197,94,0.35)'
    : 'rgba(99,102,241,0.35)';

  const glowColor = isError
    ? 'rgba(239,68,68,0.15)'
    : isDone
    ? 'rgba(34,197,94,0.12)'
    : 'rgba(99,102,241,0.12)';

  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(10,10,28,0.92)',
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset`,
      background: `linear-gradient(135deg, rgba(10,10,28,0.95), ${glowColor})`,
      minWidth: 260,
      maxWidth: 320,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {/* Spinner or icon */}
        {!isDone && !isError && (
          <span style={{
            display: 'inline-block',
            width: 14, height: 14,
            border: '2px solid rgba(99,102,241,0.3)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'sseSpinAnim 0.7s linear infinite',
            flexShrink: 0,
          }} />
        )}
        {isDone  && <span style={{ fontSize: 14 }}>✅</span>}
        {isError && <span style={{ fontSize: 14 }}>❌</span>}
        <span style={{
          color: '#fff', fontWeight: 700, fontSize: 13,
          letterSpacing: -0.2,
        }}>{label}</span>
        {!isDone && !isError && (
          <span style={{
            marginLeft: 'auto',
            color: '#818cf8', fontSize: 11, fontWeight: 700,
          }}>{item.progress}%</span>
        )}
      </div>

      <div style={{
        color: isError ? '#f87171' : isDone ? '#4ade80' : 'rgba(255,255,255,0.5)',
        fontSize: 12, lineHeight: 1.4,
      }}>
        {stepMsg}
      </div>

      <ProgressBar value={item.progress} isError={isError} isDone={isDone} />
    </div>
  );
}

/**
 * ProgressToast — fixed bottom-right overlay showing active SSE progress events.
 * Renders nothing when there are no active operations.
 */
export default function ProgressToast() {
  const { progressEvents } = useSSE();
  const items = Object.values(progressEvents);

  if (items.length === 0) return null;

  return (
    <>
      {/* Keyframe for the spinner */}
      <style>{`@keyframes sseSpinAnim { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {items.map((item) => (
          <div key={item.operationId} style={{
            animation: 'sseFadeSlide 0.25s ease',
            pointerEvents: 'auto',
          }}>
            <style>{`@keyframes sseFadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <ToastItem item={item} />
          </div>
        ))}
      </div>
    </>
  );
}
