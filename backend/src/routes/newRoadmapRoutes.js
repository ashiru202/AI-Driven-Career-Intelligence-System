const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
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

// Progress summary (must be before /:id to avoid param clash)
router.get('/summary', getProgressSummary);

// Get specific roadmap details
router.get('/:id', getRoadmapDetails);

// Update skill status
router.patch('/:id/skills', validate(schemas.updateRoadmapSkillStatus), updateSkillStatus);

// Refresh AI resources for a roadmap (upgrades old string resources to real links)
router.post('/:id/refresh-resources', refreshResources);

// Delete roadmap
router.delete('/:id', deleteRoadmap);

module.exports = router;
