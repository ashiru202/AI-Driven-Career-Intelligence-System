const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getNotifications } = require('../controllers/notificationsController');

// GET /api/notifications  —  any authenticated role
router.get('/', requireAuth, getNotifications);

module.exports = router;
