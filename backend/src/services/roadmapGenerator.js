// AI-enriched roadmap generator
const { getResourcesForSkill } = require('./resourceEnrichmentService');

/**
 * Generate a learning roadmap from missing skills.
 * Resources are fetched from:
 *   1. Curated map (real verified URLs for 80+ skills)
 *   2. Gemini AI (for unknown skills — requires GEMINI_API_KEY in .env)
 *   3. Search URL fallback (YouTube / Google — always works)
 *
 * @param {Array<string>} missingSkills - Skills to learn
 * @param {string} targetRole - Job title/role
 * @returns {Promise<Array>} - Ordered roadmap steps with real resource links
 */
async function generateRoadmap(missingSkills, targetRole = 'Software Developer') {
  if (!Array.isArray(missingSkills) || missingSkills.length === 0) {
    return [];
  }

  // Skill priority levels (foundational skills first)
  const skillPriority = {
    'python': 1, 'javascript': 1, 'java': 1, 'html': 1, 'css': 1, 'sql': 1,
    'react': 2, 'node.js': 2, 'express': 2, 'django': 2, 'flask': 2,
    'typescript': 2, 'git': 2,
    'docker': 3, 'kubernetes': 3, 'aws': 3, 'ci/cd': 3, 'linux': 3,
    'machine learning': 4, 'deep learning': 4, 'artificial intelligence': 4,
    'tensorflow': 4, 'pytorch': 4,
  };

  const timeEstimates = {
    'python': 4, 'javascript': 4, 'typescript': 3, 'java': 5,
    'react': 3, 'node.js': 3, 'express': 2,
    'docker': 2, 'kubernetes': 3, 'aws': 4, 'sql': 2,
    'mongodb': 2, 'git': 1, 'linux': 2, 'bash': 2,
    'machine learning': 6, 'deep learning': 8, 'tensorflow': 4, 'pytorch': 4,
    'default': 2,
  };

  const sortedSkills = missingSkills.map(skill => ({
    skill,
    priority: skillPriority[skill.toLowerCase()] || 5,
  })).sort((a, b) => a.priority - b.priority);

  // Fetch resources in parallel for all skills
  const steps = await Promise.all(
    sortedSkills.map(async ({ skill, priority }) => {
      const skillLower = skill.toLowerCase();
      const resources = await getResourcesForSkill(skill);
      return {
        skill,
        status: 'PENDING',
        estimateWeeks: timeEstimates[skillLower] || timeEstimates.default,
        resources, // Array of { name, url, type } objects
        priority,
      };
    })
  );

  return steps;
}

function calculateProgress(skills) {
  if (!Array.isArray(skills) || skills.length === 0) return 0;
  const completed = skills.filter(s => s.status === 'COMPLETED').length;
  return Math.round((completed / skills.length) * 100);
}

module.exports = { generateRoadmap, calculateProgress };
