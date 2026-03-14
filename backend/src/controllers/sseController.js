const { addClient, removeClient } = require('../utils/sseManager');

const HEARTBEAT_INTERVAL_MS = 25_000; // 25 s — keeps proxy/load-balancer connections alive

/**
 * GET /api/sse/events
 * Establishes a persistent Server-Sent Events stream for the authenticated
 * user. Authentication is handled by the requireAuth middleware upstream,
 * so by the time this handler runs req.user is guaranteed to be set.
 */
exports.stream = (req, res) => {
  const userId = req.user.id;

  // ── SSE headers ────────────────────────────────────────────────────────────
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache, no-transform',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',   // prevent nginx from buffering the stream
  });
  res.flushHeaders();

  // ── Initial connection confirmation ────────────────────────────────────────
  res.write(
    `event: connected\ndata: ${JSON.stringify({ userId, ts: Date.now() })}\n\n`
  );

  // ── Register this connection ───────────────────────────────────────────────
  addClient(userId, res);

  // ── Heartbeat (keeps ALB / nginx / browser connections alive) ─────────────
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // ── Cleanup on disconnect ─────────────────────────────────────────────────
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};
