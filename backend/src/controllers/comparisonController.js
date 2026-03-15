const Comparison = require('../models/Comparison');
const Resume = require('../models/Resume');
const { successResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { normalizeSkillList, compareSkills } = require('../utils/skillNormalizer');
const { extractSkillsWithAI } = require('../services/aiSkillExtractorService');
const axios = require('axios');

// Compare user's resume with a job description
const compareJob = asyncHandler(async (req, res) => {
  const { jobTitle, jobDescription, jobSkills, resumeId } = req.body;
  const userId = req.user.id;

  // Use the selected resume if provided, otherwise fall back to most recent
  let resume;
  if (resumeId) {
    resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) {
      throw AppError.badRequest('INVALID_RESUME', 'Selected resume not found');
    }
  } else {
    resume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
  }

  if (!resume) {
    throw AppError.badRequest(
      'NO_RESUME',
      'Please upload a resume first before comparing with jobs'
    );
  }

  const resumeSkills = resume.extractedSkills || [];

  // ── Step 1: Extract job skills via AI (Groq → keyword fallback) ──────
  let extractedJobSkills = jobSkills || [];

  if (!extractedJobSkills.length && jobDescription) {
    const { skills: aiJobSkills, source: jdSource } = await extractSkillsWithAI(jobDescription);
    extractedJobSkills = aiJobSkills;
    console.log(`[Compare] JD skill extraction source: ${jdSource}, count: ${extractedJobSkills.length}`);
  }

  // ── Step 2: Normalize both skill lists ──────────────────────────────
  const normalizedResumeSkills = normalizeSkillList(resumeSkills);
  const normalizedJobSkills    = normalizeSkillList(extractedJobSkills);

  // ── Step 3: Semantic matching (NLP service) with keyword fallback ────
  let common, missing, matchScore, semanticMatches = [], matchingMethod = 'keyword';

  try {
    const semResponse = await axios.post(
      `${process.env.NLP_SERVICE_URL}/semantic-match`,
      { resume_skills: normalizedResumeSkills, job_skills: normalizedJobSkills, threshold: 0.50 },
      { timeout: 15000 }
    );
    const sem = semResponse.data;
    common          = sem.commonSkills   || [];
    missing         = sem.missingSkills  || [];
    matchScore      = sem.matchScore     ?? 0;
    semanticMatches = sem.semanticMatches || [];
    matchingMethod  = sem.modelUsed      || 'semantic';
    console.log(`[Compare] Semantic match used model: ${matchingMethod}, score: ${matchScore}%`);
  } catch (semErr) {
    console.warn('[Compare] Semantic match failed, using keyword comparison:', semErr.message);
    const result = compareSkills(normalizedResumeSkills, normalizedJobSkills);
    common     = result.common;
    missing    = result.missing;
    matchScore = result.matchScore;
  }

  // Save comparison to database
  const comparison = await Comparison.create({
    user: userId,
    resume: resume._id,
    resumeFileName: resume.fileName,
    jobTitle,
    jobDescription,
    jobSkills: normalizedJobSkills,
    resumeSkills: normalizedResumeSkills,
    commonSkills: common,
    missingSkills: missing,
    matchScore,
    matchingMethod,
    semanticMatches
  });

  res.json(successResponse({
    comparisonId: comparison._id,
    jobTitle,
    matchScore,
    totalJobSkills: normalizedJobSkills.length,
    matchedSkills: common.length,
    commonSkills: common,
    missingSkills: missing,
    resumeSkills: normalizedResumeSkills,
    resumeFileName: resume.fileName,
    matchingMethod,       // 'all-MiniLM-L6-v2' | 'keyword-fallback'
    semanticMatches       // [{jobSkill, matchedWith, score, isExact}]
  }, 'Job comparison completed successfully'));
});

// Get user's comparison history
const getComparisons = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, skip } = parsePagination(req.query, 9);

  const total = await Comparison.countDocuments({ user: userId });
  const comparisons = await Comparison.find({ user: userId })
    .select('jobTitle matchScore commonSkills missingSkills resumeFileName createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json(successResponse({ comparisons, pagination: paginationMeta(total, page, limit) }));
});

// Get specific comparison details
const getComparisonDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const comparison = await Comparison.findOne({ _id: id, user: userId });

  if (!comparison) {
    throw AppError.notFound('Comparison not found');
  }

  res.json(successResponse({
    comparisonId: comparison._id,
    jobTitle: comparison.jobTitle,
    jobDescription: comparison.jobDescription,
    matchScore: comparison.matchScore,
    commonSkills: comparison.commonSkills,
    missingSkills: comparison.missingSkills,
    jobSkills: comparison.jobSkills,
    resumeSkills: comparison.resumeSkills,
    resumeFileName: comparison.resumeFileName || '',
    createdAt: comparison.createdAt
  }));
});

module.exports = {
  compareJob,
  getComparisons,
  getComparisonDetails
};
