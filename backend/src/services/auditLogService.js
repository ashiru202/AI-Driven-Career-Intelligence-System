const AuditLog = require("../models/AuditLog");

/**
 * Log an admin action. Fire-and-forget — never throws.
 * @param {import("express").Request} req - Express request (req.user must be set by requireAuth)
 * @param {string} action - Action constant e.g. "CREATE_STAFF"
 * @param {{ type?: string, id?: string, email?: string, name?: string }} [target]
 * @param {Object} [metadata] - arbitrary extra context
 */
async function logActivity(req, action, target = {}, metadata = {}) {
  try {
    await AuditLog.create({
      actorId:    req.user.id,
      actorEmail: req.user.email,
      actorName:  req.user.name,
      actorRole:  req.user.role,
      action,
      targetType:  target.type  || undefined,
      targetId:    target.id    || undefined,
      targetEmail: target.email || undefined,
      targetName:  target.name  || undefined,
      metadata,
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

module.exports = { logActivity };
