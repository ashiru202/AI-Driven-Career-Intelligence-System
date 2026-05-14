const AuditLog = require("../models/AuditLog");

/**
 * Log an action with an explicit actor. Fire-and-forget — never throws.
 * @param {import("express").Request} req - Express request
 * @param {{ id?: string, email?: string, name?: string, role?: string }} actor
 * @param {string} action - Action constant e.g. "CREATE_STAFF"
 * @param {{ type?: string, id?: string, email?: string, name?: string }} [target]
 * @param {Object} [metadata] - arbitrary extra context
 */
async function logActivityWithActor(req, actor = {}, action, target = {}, metadata = {}) {
  if (!action) return;

  const actorEmail = actor.email || "unknown@system.local";
  const actorName = actor.name || "Unknown";
  const actorRole = actor.role || "SYSTEM";

  try {
    await AuditLog.create({
      actorId:    actor.id || undefined,
      actorEmail,
      actorName,
      actorRole,
      action,
      targetType:  target.type  || undefined,
      targetId:    target.id    || undefined,
      targetEmail: target.email || undefined,
      targetName:  target.name  || undefined,
      metadata,
      ipAddress: req?.headers?.["x-forwarded-for"] || req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

/**
 * Log an authenticated actor action. Fire-and-forget — never throws.
 * @param {import("express").Request} req - Express request (req.user must be set by requireAuth)
 * @param {string} action - Action constant e.g. "CREATE_STAFF"
 * @param {{ type?: string, id?: string, email?: string, name?: string }} [target]
 * @param {Object} [metadata] - arbitrary extra context
 */
async function logActivity(req, action, target = {}, metadata = {}) {
  if (!req?.user) return;

  return logActivityWithActor(
    req,
    {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
    action,
    target,
    metadata
  );
}

module.exports = { logActivity, logActivityWithActor };
