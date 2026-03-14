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
  // Cloudinary secure URL for downloading / previewing the file
  fileUrl: {
    type: String,
    default: ''
  },
  // Cloudinary public_id needed to delete the asset via the API
  cloudinaryPublicId: {
    type: String,
    default: ''
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resume', resumeSchema);
