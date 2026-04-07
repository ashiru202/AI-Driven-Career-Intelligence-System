const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const ExtensionController = require('../controllers/extensionController');

// All extension routes require authentication
router.use(requireAuth);

// List user's resumes (for CV selector in extension)
router.get('/resumes/list', ExtensionController.listResumes);

// Quick comparison without roadmap generation
router.post('/compare', validate(schemas.extensionQuickCompare), ExtensionController.quickCompare);

// Health check for extension
router.get('/health', ExtensionController.healthCheck);

module.exports = router;
