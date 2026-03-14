const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats,
} = require('../controllers/jobApplicationController');

// All routes require authentication (USER role only)
router.use(requireAuth);

router.get('/stats', getStats);
router.get('/',      getApplications);
router.post('/',     createApplication);
router.put('/:id',   updateApplication);
router.delete('/:id', deleteApplication);

module.exports = router;
