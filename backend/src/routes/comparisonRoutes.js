const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const {
  compareJob,
  getComparisons,
  getComparisonDetails
} = require('../controllers/comparisonController');

// All routes require USER authentication
router.use(requireAuth, requireRole('USER'));

// Compare job
router.post('/compare', validate(schemas.compareJob), compareJob);

// Get comparison history
router.get('/', getComparisons);

// Get specific comparison details
router.get('/:id', getComparisonDetails);

module.exports = router;
