const mongoose = require("mongoose");

const skillSnapshotSchema = new mongoose.Schema({
  skill:         { type: String, required: true },
  periodStart:   { type: Date, required: true },
  periodEnd:     { type: Date, required: true },
  count:         { type: Number, required: true },
  totalJobs:     { type: Number, required: true },
  relativeFreq:  { type: Number, required: true },
  marketScope:   {
    type: String,
    enum: ["global", "local-lk", "combined"],
    default: "combined",
  },
  sources:       [{ type: String }],
});

skillSnapshotSchema.index(
  { skill: 1, periodStart: 1, marketScope: 1 },
  { unique: true }
);
skillSnapshotSchema.index({ periodStart: -1 });
skillSnapshotSchema.index({ relativeFreq: -1, periodStart: -1 });

module.exports = mongoose.model("SkillSnapshot", skillSnapshotSchema, "skill_snapshots");
