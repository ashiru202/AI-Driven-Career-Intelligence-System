const crypto = require('crypto');
const { normalizeSkillList } = require('./skillNormalizer');

const CANDIDATE_LEVELS = {
  INTERN: 'INTERN',
  PROFESSIONAL: 'PROFESSIONAL',
  UNKNOWN: 'UNKNOWN',
};

function normalizeResumeSkills(skills) {
  return normalizeSkillList(skills).sort((a, b) => a.localeCompare(b));
}

function computeSkillsSignature(normalizedSkills) {
  const skills = Array.isArray(normalizedSkills) ? normalizedSkills : [];

  return crypto
    .createHash('sha256')
    .update(skills.join('|'))
    .digest('hex');
}

function parseYearsExperience(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();
  const patterns = [
    /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience/g,
    /experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/g,
  ];

  let maxYears = null;
  for (const pattern of patterns) {
    let match = pattern.exec(lower);
    while (match) {
      const years = Number.parseFloat(match[1]);
      if (Number.isFinite(years)) {
        maxYears = maxYears === null ? years : Math.max(maxYears, years);
      }
      match = pattern.exec(lower);
    }
  }

  return maxYears;
}

function classifyCandidateLevel(text, options = {}) {
  const profileLevel = options.careerLevel;
  if (profileLevel === CANDIDATE_LEVELS.INTERN || profileLevel === CANDIDATE_LEVELS.PROFESSIONAL) {
    return {
      candidateLevel: profileLevel,
      candidateLevelSource: 'user_profile',
    };
  }

  const lower = typeof text === 'string' ? text.toLowerCase() : '';
  const internPattern = /\b(intern|internship|trainee|junior|undergraduate|student)\b/;
  const professionalPattern = /\b(senior|lead|manager|principal|architect|consultant)\b/;
  const yearsExperience = parseYearsExperience(lower);

  if (yearsExperience !== null && yearsExperience >= 2) {
    return {
      candidateLevel: CANDIDATE_LEVELS.PROFESSIONAL,
      candidateLevelSource: 'heuristic',
    };
  }

  if (internPattern.test(lower)) {
    return {
      candidateLevel: CANDIDATE_LEVELS.INTERN,
      candidateLevelSource: 'heuristic',
    };
  }

  if (professionalPattern.test(lower)) {
    return {
      candidateLevel: CANDIDATE_LEVELS.PROFESSIONAL,
      candidateLevelSource: 'heuristic',
    };
  }

  return {
    candidateLevel: CANDIDATE_LEVELS.UNKNOWN,
    candidateLevelSource: 'heuristic',
  };
}

function buildResumeDerivedFields(skills, text, options = {}) {
  const normalizedSkills = normalizeResumeSkills(skills);
  const skillsSignature = computeSkillsSignature(normalizedSkills);
  const classification = classifyCandidateLevel(text, options);

  return {
    normalizedSkills,
    skillsSignature,
    ...classification,
  };
}

module.exports = {
  CANDIDATE_LEVELS,
  normalizeResumeSkills,
  computeSkillsSignature,
  parseYearsExperience,
  classifyCandidateLevel,
  buildResumeDerivedFields,
};
