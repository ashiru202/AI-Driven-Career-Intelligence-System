const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const {
  uploadResume,
  getUserResumes,
  getResumeDetails,
  deleteResume
} = require('../controllers/resumeController');

// All routes require USER authentication
router.use(requireAuth, requireRole('USER'));

// Upload and analyze resume (upload limiter: 10/hour)
router.post('/upload', uploadLimiter, upload.single('resume'), uploadResume);

// Get user's resumes
router.get('/', getUserResumes);

// Get specific resume details
router.get('/:id', getResumeDetails);

// Delete resume
router.delete('/:id', deleteResume);

module.exports = router;
