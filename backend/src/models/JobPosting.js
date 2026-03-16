const mongoose = require("mongoose");

const jobPostingSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  company:         { type: String },
  location:        { type: String },
  description:     { type: String, required: true },
  extractedSkills: [{ type: String }],
  source:          {
    type: String,
    enum: ["adzuna", "remotive", "topjobs_lk", "xpressjobs_lk", "mock"],
    required: true,
  },
  sourceId:        { type: String, required: true },
  marketScope:     {
    type: String,
    enum: ["global", "local-lk"],
    default: "global",
  },
  postedAt:        { type: Date },
  scrapedAt:       { type: Date, default: Date.now },
  processed:       { type: Boolean, default: false },
});

jobPostingSchema.index({ sourceId: 1, source: 1 }, { unique: true });
jobPostingSchema.index({ scrapedAt: -1 });
jobPostingSchema.index({ processed: 1 });
jobPostingSchema.index({ marketScope: 1, scrapedAt: -1 });

module.exports = mongoose.model("JobPosting", jobPostingSchema);
