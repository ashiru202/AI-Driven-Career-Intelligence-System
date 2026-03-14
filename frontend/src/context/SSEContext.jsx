import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const SSE_URL = 'http://localhost:5000/api/sse/events';
const RECONNECT_DELAY_MS = 5_000; // wait 5 s before reconnecting after error

/**
 * SSEContext exposes:
 *   progressEvents     — Map<operationId, progressPayload>  (active progress items)
 *   liveNotifications  — array of notification objects pushed by the server
 *   clearNotification  — (id: string) => void
 */
const SSEContext = createContext({
  progressEvents: {},
  liveNotifications: [],
  clearNotification: () => {},
});

export function SSEProvider({ children }) {
  const [progressEvents,    setProgressEvents]    = useState({});
  const [liveNotifications, setLiveNotifications] = useState([]);
  const esRef             = useRef(null);
  const reconnectTimer    = useRef(null);
  const mountedRef        = useRef(true);

  const clearNotification = useCallback((id) => {
    setLiveNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function isAuthenticated() {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return Boolean(u.role);
      } catch {
        return false;
      }
    }

    function connect() {
      if (!mountedRef.current || !isAuthenticated()) return;

      const es = new EventSource(SSE_URL, { withCredentials: true });
      esRef.current = es;

      // ── connected ───────────────────────────────────────────────────────
      es.addEventListener('connected', () => {
        // Connection confirmed — nothing special needed
      });

      // ── heartbeat ───────────────────────────────────────────────────────
      es.addEventListener('heartbeat', () => {
        // Keep-alive ping from the server — no action needed
      });

      // ── progress ────────────────────────────────────────────────────────
      es.addEventListener('progress', (e) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(e.data);
        setProgressEvents((prev) => ({ ...prev, [data.operationId]: data }));

        // Auto-remove completed / errored items after 5 s
        if (data.step === 'complete' || data.step === 'error') {
          setTimeout(() => {
            if (!mountedRef.current) return;
            setProgressEvents((prev) => {
              const next = { ...prev };
              delete next[data.operationId];
              return next;
            });
          }, 5_000);
        }
      });

      // ── notification ────────────────────────────────────────────────────
      es.addEventListener('notification', (e) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(e.data);
        setLiveNotifications((prev) => {
          // Dedupe by id — newest wins
          return [data, ...prev.filter((n) => n.id !== data.id)];
        });
      });

      // ── error ───────────────────────────────────────────────────────────
      es.onerror = () => {
        es.close();
        esRef.current = null;

        if (!mountedRef.current) return;

        // Don't reconnect if the user is no longer authenticated
        if (!isAuthenticated()) return;

        // Schedule a reconnect attempt
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return (
    <SSEContext.Provider value={{ progressEvents, liveNotifications, clearNotification }}>
      {children}
    </SSEContext.Provider>
  );
}

/** Consume the SSE context inside any component. */
export function useSSE() {
  return useContext(SSEContext);
}
