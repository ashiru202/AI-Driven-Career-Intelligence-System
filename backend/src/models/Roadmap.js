const mongoose = require("mongoose");

const roadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    targetRole: { type: String, required: true },

    resumeSkills: { type: [String], default: [] },

    skillsToLearn: [
      {
        skill: { type: String, default: "" },
        status: {
          type: String,
          enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
          default: "PENDING",
        },
        estimateWeeks: { type: Number, default: 2 },
        // Mixed type supports both legacy strings and new { name, url, type } objects
        resources: { type: [mongoose.Schema.Types.Mixed], default: [] },
        priority: { type: Number, default: 5 },
      },
    ],

    jobSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    commonSkills: { type: [String], default: [] },
    matchScore: { type: Number, default: 0 },
    jobTitle: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
