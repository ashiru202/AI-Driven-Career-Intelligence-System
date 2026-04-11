const mongoose = require("mongoose");

const staffReportWorkflowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: String,
      enum: ["NEW", "IN_REVIEW", "FOLLOW_UP_REQUIRED", "RESOLVED"],
      default: "NEW",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

staffReportWorkflowSchema.index({ state: 1, lastUpdatedAt: -1 });

module.exports = mongoose.model("StaffReportWorkflow", staffReportWorkflowSchema);
