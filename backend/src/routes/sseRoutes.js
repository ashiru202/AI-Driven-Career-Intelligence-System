const express       = require('express');
const router        = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { stream }    = require('../controllers/sseController');

// GET /api/sse/events — persistent SSE connection (any authenticated role)
router.get('/events', requireAuth, stream);

module.exports = router;
