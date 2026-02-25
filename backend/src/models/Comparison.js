const mongoose = require('mongoose');

const comparisonSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    default: null
  },
  resumeFileName: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  jobSkills: {
    type: [String],
    default: []
  },
  resumeSkills: {
    type: [String],
    default: []
  },
  commonSkills: {
    type: [String],
    default: []
  },
  missingSkills: {
    type: [String],
    default: []
  },
  matchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  matchingMethod: {
    type: String,
    default: 'keyword'   // 'all-MiniLM-L6-v2' | 'keyword-fallback'
  },
  semanticMatches: {
    type: [{
      jobSkill:    String,
      matchedWith: String,
      score:       Number,
      isExact:     Boolean
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comparison', comparisonSchema);
