import Resume from '../models/Resume.js';
import Comparison from '../models/Comparison.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import { AppError } from '../utils/AppError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import aiSkillExtractorService from '../services/aiSkillExtractorService.js';
import skillGapService from '../services/skillGapService.js';

class ExtensionController {
  /**
   * GET /api/extension/resumes/list
   * Returns lightweight list of user's resumes for UI dropdown
   */
  static listResumes = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const resumes = await Resume.find({ user: userId })
      .select('_id fileName createdAt fileSize')
      .sort({ createdAt: -1 })
      .lean(); // lean() for better performance

    // Transform to match extension UI expectations
    const list = resumes.map(r => ({
      id: r._id.toString(),
      name: r.fileName,
      date: r.createdAt,
      sizeKB: Math.round(r.fileSize / 1024),
    }));

    return res.json(successResponse(list, 'Resumes fetched successfully'));
  });

  /**
   * POST /api/extension/compare
   * Quick comparison: jobDesc → extract skills → compare → return
   * Lightweight response optimized for extension popup
   */
  static quickCompare = asyncHandler(async (req, res) => {
    const { jobDescription, jobTitle, resumeId } = req.body;
    const userId = req.user.id;

    // Validation
    if (!jobDescription || !jobDescription.trim()) {
      throw AppError.badRequest('EMPTY_JOB_DESC', 'Job description is required');
    }
    if (!jobTitle || !jobTitle.trim()) {
      throw AppError.badRequest('EMPTY_JOB_TITLE', 'Job title is required');
    }

    // Fetch resume
    let resume;
    if (resumeId) {
      resume = await Resume.findOne({ _id: resumeId, user: userId });
      if (!resume) {
        throw AppError.notFound('Resume not found or does not belong to you');
      }
    } else {
      // Use most recent resume
      resume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
      if (!resume) {
        throw AppError.badRequest('NO_RESUME', 'You must upload a resume first');
      }
    }

    // Extract skills from job description
    const jobSkillsResult = await aiSkillExtractorService.extractSkills(jobDescription);
    const jobSkills = jobSkillsResult.skills || [];

    // Get resume skills
    const resumeSkills = resume.extractedSkills || [];

    // Compute skill gap
    const gap = skillGapService.computeSkillGap(resumeSkills, jobSkills);

    // Save to Comparison model (for history + audit)
    const comparison = new Comparison({
      user: userId,
      resume: resumeId || resume._id,
      resumeFileName: resume.fileName,
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      jobSkills: gap.jobSkills || jobSkills,
      resumeSkills: gap.resumeSkills || resumeSkills,
      commonSkills: gap.commonSkills,
      missingSkills: gap.missingSkills,
      matchScore: gap.matchScore,
      matchingMethod: 'keyword', // Extension always uses fast keyword method
      source: 'extension', // NEW: Track that this came from extension
    });

    await comparison.save();

    // Return lightweight response for extension popup
    const response = {
      comparisonId: comparison._id.toString(),
      matchScore: gap.matchScore,
      commonSkills: gap.commonSkills,
      missingSkills: gap.missingSkills,
      resumeFileName: resume.fileName,
      timestamp: new Date(),
      // Include counts for UI
      commonCount: gap.commonSkills.length,
      missingCount: gap.missingSkills.length,
      totalRequired: jobSkills.length,
    };

    return res.json(successResponse(response, 'Comparison completed'));
  });

  /**
   * GET /api/extension/health
   * Extension pings this to verify backend is accessible
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const resumeCount = await Resume.countDocuments({ user: userId });

    return res.json(successResponse({
      ok: true,
      authenticated: true,
      hasResumes: resumeCount > 0,
      resumeCount,
    }, 'Extension health check passed'));
  });
}

export default ExtensionController;
