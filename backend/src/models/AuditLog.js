const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorEmail:  { type: String, required: true },
  actorName:   { type: String, required: true },
  actorRole:   { type: String, required: true },
  action:      { type: String, required: true },
  targetType:  { type: String },
  targetId:    { type: mongoose.Schema.Types.ObjectId },
  targetEmail: { type: String },
  targetName:  { type: String },
  metadata:    { type: mongoose.Schema.Types.Mixed },
  ipAddress:   { type: String },
  userAgent:   { type: String },
  createdAt:   { type: Date, default: Date.now },
});

auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
