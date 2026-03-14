const Roadmap = require('../models/Roadmap');
const Comparison = require('../models/Comparison');
const { successResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { generateRoadmap, calculateProgress } = require('../services/roadmapGenerator');
const { sendToUser } = require('../utils/sseManager');

// Create roadmap from comparison or manual input
const createRoadmap = asyncHandler(async (req, res) => {
  const { targetRole, missingSkills, jobTitle, comparisonId } = req.body;
  const userId = req.user.id;
  const operationId = `roadmap_generate_${userId}_${Date.now()}`;

  let skills = missingSkills || [];
  let title = jobTitle || targetRole;
  let jobSkillsList = [];
  let resumeSkillsList = [];

  // If comparisonId provided, get data from comparison
  if (comparisonId) {
    const comparison = await Comparison.findOne({ _id: comparisonId, user: userId });
    if (comparison) {
      skills = comparison.missingSkills || [];
      title = comparison.jobTitle;
      jobSkillsList = comparison.jobSkills || [];
      resumeSkillsList = comparison.resumeSkills || [];
    }
  }

  if (!skills || skills.length === 0) {
    throw AppError.badRequest('NO_MISSING_SKILLS', 'No skills to learn');
  }

  // Step 1: Generating roadmap
  sendToUser(userId, 'progress', {
    operationId,
    operation: 'roadmap_generate',
    step: 'generating',
    progress: 30,
    message: `Building roadmap for "${title}"…`,
  });

  const roadmapSteps = await generateRoadmap(skills, title);

  // Step 2: Saving
  sendToUser(userId, 'progress', {
    operationId,
    operation: 'roadmap_generate',
    step: 'saving',
    progress: 85,
    message: 'Saving your roadmap…',
  });

  const roadmap = await Roadmap.create({
    user: userId,
    targetRole: title,
    skillsToLearn: roadmapSteps,
    missingSkills: skills,
    jobSkills: jobSkillsList,
    resumeSkills: resumeSkillsList,
    jobTitle: title
  });

  // Step 3: Complete
  sendToUser(userId, 'progress', {
    operationId,
    operation: 'roadmap_generate',
    step: 'complete',
    progress: 100,
    message: 'Roadmap created successfully!',
    roadmapId: roadmap._id,
  });

  // Push a fresh notification card for this roadmap
  sendToUser(userId, 'notification', {
    id: `roadmap_${roadmap._id}`,
    icon: '🗺️',
    title: `Roadmap: ${roadmap.targetRole}`,
    body: `${roadmapSteps.length} skill${roadmapSteps.length !== 1 ? 's' : ''} to learn. Start your journey!`,
    link: '/my-roadmap',
    time: 'Just now',
    createdAt: new Date(),
  });

  res.status(201).json(successResponse({
    roadmapId: roadmap._id,
    targetRole: roadmap.targetRole,
    skillCount: roadmap.skillsToLearn.length,
    progress: 0
  }, 'Roadmap created successfully'));
});

// Get user's roadmaps
const getUserRoadmaps = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const roadmaps = await Roadmap.find({ user: userId })
    .sort({ createdAt: -1 })
    .select('targetRole jobTitle skillsToLearn createdAt');

  const roadmapsWithProgress = roadmaps.map(roadmap => ({
    id: roadmap._id,
    targetRole: roadmap.targetRole,
    jobTitle: roadmap.jobTitle,
    skillCount: roadmap.skillsToLearn.length,
    progress: calculateProgress(roadmap.skillsToLearn),
    createdAt: roadmap.createdAt
  }));

  res.json(successResponse({ roadmaps: roadmapsWithProgress }));
});

// Get specific roadmap details
const getRoadmapDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roadmap = await Roadmap.findOne({ _id: id, user: userId });

  if (!roadmap) {
    throw AppError.notFound('Roadmap not found');
  }

  res.json(successResponse({
    roadmapId: roadmap._id,
    targetRole: roadmap.targetRole,
    jobTitle: roadmap.jobTitle,
    skillsToLearn: roadmap.skillsToLearn,
    progress: calculateProgress(roadmap.skillsToLearn),
    createdAt: roadmap.createdAt
  }));
});

// Update skill status in roadmap
const updateSkillStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { skill, status } = req.body;
  const userId = req.user.id;

  const roadmap = await Roadmap.findOne({ _id: id, user: userId });

  if (!roadmap) {
    throw AppError.notFound('Roadmap not found');
  }

  // Find and update the skill
  const skillItem = roadmap.skillsToLearn.find(s => s.skill === skill);
  
  if (!skillItem) {
    throw AppError.notFound('Skill not found in roadmap');
  }

  skillItem.status = status;
  await roadmap.save();

  const progress = calculateProgress(roadmap.skillsToLearn);

  res.json(successResponse({
    roadmapId: roadmap._id,
    skill: skillItem.skill,
    status: skillItem.status,
    progress
  }, 'Skill status updated successfully'));
});

// Refresh resources for an existing roadmap (re-fetches from curated map / AI)
const refreshResources = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roadmap = await Roadmap.findOne({ _id: id, user: userId });
  if (!roadmap) {
    throw AppError.notFound('Roadmap not found');
  }

  const { getResourcesForSkill } = require('../services/resourceEnrichmentService');

  // Re-fetch resources for every skill in parallel
  const updatedSkills = await Promise.all(
    roadmap.skillsToLearn.map(async (skillItem) => {
      const resources = await getResourcesForSkill(skillItem.skill);
      // Use toObject() if available (Mongoose subdoc), otherwise spread plain object
      const base = typeof skillItem.toObject === 'function' ? skillItem.toObject() : { ...skillItem };
      return { ...base, resources };
    })
  );

  roadmap.skillsToLearn = updatedSkills;
  roadmap.markModified('skillsToLearn'); // Required for Mixed type — Mongoose won't detect deep changes otherwise
  await roadmap.save();

  res.json(successResponse({
    roadmapId: roadmap._id,
    skillsToLearn: roadmap.skillsToLearn,
    progress: calculateProgress(roadmap.skillsToLearn)
  }, 'Resources refreshed successfully'));
});

// Delete roadmap
const deleteRoadmap = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roadmap = await Roadmap.findOne({ _id: id, user: userId });

  if (!roadmap) {
    throw AppError.notFound('Roadmap not found');
  }

  await Roadmap.deleteOne({ _id: id });

  res.json(successResponse(null, 'Roadmap deleted successfully'));
});

module.exports = {
  createRoadmap,
  getUserRoadmaps,
  getRoadmapDetails,
  updateSkillStatus,
  refreshResources,
  deleteRoadmap
};
