const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const mongoose = require('mongoose');
const {
  createRoadmap,
  getUserRoadmaps,
  getProgressSummary,
  getRoadmapDetails,
  updateSkillStatus,
  refreshResources,
  deleteRoadmap
} = require('../controllers/newRoadmapController');

// All routes require USER authentication
router.use(requireAuth, requireRole('USER'));

// Create roadmap
router.post('/', validate(schemas.createRoadmap), createRoadmap);

// Get user's roadmaps
router.get('/', getUserRoadmaps);

// Progress summary (must be BEFORE /:id routes)
router.get('/summary', getProgressSummary);

// Middleware: validate that id param is a valid ObjectId before processing /:id routes
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_ID', message: 'Invalid roadmap ID format' }
    });
  }
  next();
};

// Get specific roadmap details
router.get('/:id', validateObjectId, getRoadmapDetails);

// Update skill status
router.patch('/:id/skills', validateObjectId, validate(schemas.updateRoadmapSkillStatus), updateSkillStatus);

// Refresh AI resources for a roadmap (upgrades old string resources to real links)
router.post('/:id/refresh-resources', validateObjectId, refreshResources);

// Delete roadmap
router.delete('/:id', validateObjectId, deleteRoadmap);

module.exports = router;
