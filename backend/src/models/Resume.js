const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  extractedSkills: {
    type: [String],
    default: []
  },
  normalizedSkills: {
    type: [String],
    default: []
  },
  skillsSignature: {
    type: String,
    default: ''
  },
  candidateLevel: {
    type: String,
    enum: ['INTERN', 'PROFESSIONAL', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  candidateLevelSource: {
    type: String,
    enum: ['heuristic', 'manual', 'user_profile'],
    default: 'heuristic'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ skillsSignature: 1, createdAt: -1 });
resumeSchema.index({ normalizedSkills: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
