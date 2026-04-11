const mongoose = require("mongoose");

const staffCaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    computedPriority: { type: Number, default: 0, min: 0, max: 100 },
    manualPriority: { type: Number, default: null, min: 0, max: 100 },
    effectivePriority: { type: Number, default: 0, min: 0, max: 100 },
    tags: { type: [String], default: [] },
    reasons: { type: [String], default: [] },
    factors: {
      cvScore: { type: Number, default: 0 },
      roadmapProgress: { type: Number, default: 0 },
      gapCount: { type: Number, default: 0 },
      inactiveDays: { type: Number, default: 0 },
      hasRoadmap: { type: Boolean, default: false },
      lastActivityAt: { type: Date, default: null },
    },
    lastScoredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

staffCaseSchema.index({ effectivePriority: -1, updatedAt: -1 });

module.exports = mongoose.model("StaffCase", staffCaseSchema);
