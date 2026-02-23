const Comparison = require('../models/Comparison');
const Resume = require('../models/Resume');
const { successResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { normalizeSkillList, compareSkills } = require('../utils/skillNormalizer');
const axios = require('axios');

// Compare user's resume with a job description
const compareJob = asyncHandler(async (req, res) => {
  const { jobTitle, jobDescription, jobSkills } = req.body;
  const userId = req.user.id;

  // Get user's most recent resume
  const resume = await Resume.findOne({ user: userId })
    .sort({ createdAt: -1 });

  if (!resume) {
    throw AppError.badRequest(
      'NO_RESUME',
      'Please upload a resume first before comparing with jobs'
    );
  }

  const resumeSkills = resume.extractedSkills || [];

  // Extract skills from job description if not provided
  let extractedJobSkills = jobSkills || [];
  
  if (!extractedJobSkills.length && jobDescription) {
    try {
      const nlpResponse = await axios.post(
        `${process.env.NLP_SERVICE_URL}/extract-skills`,
        { text: jobDescription },
        { timeout: 8000 }
      );

      if (nlpResponse.data && Array.isArray(nlpResponse.data.skills)) {
        extractedJobSkills = nlpResponse.data.skills;
      }
    } catch (nlpError) {
      console.error('NLP service error:', nlpError.message);
      // Continue with empty job skills if NLP fails
    }
  }

  // Normalize and compare skills
  const normalizedResumeSkills = normalizeSkillList(resumeSkills);
  const normalizedJobSkills = normalizeSkillList(extractedJobSkills);

  const { common, missing, matchScore } = compareSkills(
    normalizedResumeSkills,
    normalizedJobSkills
  );

  // Save comparison to database
  const comparison = await Comparison.create({
    user: userId,
    jobTitle,
    jobDescription,
    jobSkills: normalizedJobSkills,
    resumeSkills: normalizedResumeSkills,
    commonSkills: common,
    missingSkills: missing,
    matchScore
  });

  res.json(successResponse({
    comparisonId: comparison._id,
    jobTitle,
    matchScore,
    totalJobSkills: normalizedJobSkills.length,
    matchedSkills: common.length,
    commonSkills: common,
    missingSkills: missing,
    resumeSkills: normalizedResumeSkills
  }, 'Job comparison completed successfully'));
});

// Get user's comparison history
const getComparisons = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Comparison.countDocuments({ user: userId });

  const comparisons = await Comparison.find({ user: userId })
    .select('jobTitle matchScore commonSkills missingSkills createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.json(successResponse({
    comparisons,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
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
    createdAt: comparison.createdAt
  }));
});

module.exports = {
  compareJob,
  getComparisons,
  getComparisonDetails
};
