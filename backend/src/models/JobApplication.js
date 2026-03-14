const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    jobTitle:    { type: String, required: true, trim: true },
    company:     { type: String, required: true, trim: true },
    location:    { type: String, default: '', trim: true },
    jobUrl:      { type: String, default: '', trim: true },
    salary:      { type: String, default: '', trim: true },
    source:      { type: String, default: '', trim: true }, // LinkedIn, Indeed, etc.
    jobDescription: { type: String, default: '' },

    status: {
      type: String,
      enum: ['saved', 'applied', 'interview', 'offer', 'rejected'],
      default: 'saved',
    },

    appliedDate:   { type: Date, default: null },
    interviewDate: { type: Date, default: null },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
