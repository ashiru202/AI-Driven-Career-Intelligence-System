import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import ExtensionController from '../controllers/extensionController.js';

const router = express.Router();

// All extension routes require authentication
router.use(requireAuth);

// List user's resumes (for CV selector in extension)
router.get('/resumes/list', ExtensionController.listResumes);

// Quick comparison without roadmap generation
router.post('/compare', ExtensionController.quickCompare);

// Health check for extension
router.get('/health', ExtensionController.healthCheck);

export default router;
