const mongoose = require("mongoose");

const caseNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
  },
  { timestamps: true }
);

caseNoteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("CaseNote", caseNoteSchema);
