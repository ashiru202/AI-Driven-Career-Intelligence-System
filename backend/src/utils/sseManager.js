/**
 * SSE Manager — manages Server-Sent Events connections keyed by userId.
 * A single user can have multiple simultaneous connections (e.g. multiple
 * browser tabs), so we store a Set of response objects per userId.
 */

/** @type {Map<string, Set<import('express').Response>>} */
const clients = new Map();

/**
 * Register a new SSE client connection.
 * @param {string} userId
 * @param {import('express').Response} res
 */
function addClient(userId, res) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
}

/**
 * Remove a client connection (called on request close/error).
 * @param {string} userId
 * @param {import('express').Response} res
 */
function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

/**
 * Write a raw SSE frame string to a single response, catching write errors.
 * @param {import('express').Response} res
 * @param {string} payload
 * @returns {boolean} false if the write failed (connection dead)
 */
function writeFrame(res, payload) {
  try {
    res.write(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a named SSE event to all connections belonging to a specific user.
 * Dead connections are pruned automatically.
 * @param {string} userId
 * @param {string} event - SSE event name
 * @param {object} data  - will be JSON-stringified into the `data:` field
 */
function sendToUser(userId, event, data) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  set.forEach((res) => {
    if (!writeFrame(res, payload)) {
      set.delete(res);
    }
  });
}

/**
 * Broadcast a named SSE event to ALL connected clients across all users.
 * @param {string} event
 * @param {object} data
 */
function sendToAll(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((set) => {
    set.forEach((res) => {
      if (!writeFrame(res, payload)) {
        set.delete(res);
      }
    });
  });
}

/**
 * Return the total number of active SSE connections across all users.
 * @returns {number}
 */
function getConnectionCount() {
  let count = 0;
  clients.forEach((set) => { count += set.size; });
  return count;
}

module.exports = { addClient, removeClient, sendToUser, sendToAll, getConnectionCount };
