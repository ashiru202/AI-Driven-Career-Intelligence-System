const mongoose = require("mongoose");

const staffApplicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    currentRole: { type: String, required: true, trim: true },
    yearsExperience: { type: Number, required: true, min: 0, max: 50 },
    expertiseAreas: {
      type: [{ type: String, trim: true }],
      required: true,
      default: [],
    },
    motivation: { type: String, required: true, trim: true },
    linkedInUrl: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reviewNotes: { type: String, default: "" },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

staffApplicationSchema.index({ email: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("StaffApplication", staffApplicationSchema);
