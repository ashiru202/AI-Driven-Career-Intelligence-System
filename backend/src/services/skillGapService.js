const { compareSkills, normalizeSkillList } = require('../utils/skillNormalizer');

function computeSkillGap(resumeSkills, jobSkills) {
  const normalizedResumeSkills = normalizeSkillList(resumeSkills);
  const normalizedJobSkills = normalizeSkillList(jobSkills);

  const result = compareSkills(normalizedResumeSkills, normalizedJobSkills);

  return {
    resumeSkills: normalizedResumeSkills,
    jobSkills: normalizedJobSkills,
    commonSkills: result.common,
    missingSkills: result.missing,
    matchScore: result.matchScore,
  };
}

module.exports = { computeSkillGap };
