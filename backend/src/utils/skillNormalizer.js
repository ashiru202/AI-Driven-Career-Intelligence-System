// Skill normalization utilities for consistent comparison

// Common skill aliases
const skillAliases = {
  'javascript': ['js', 'javascript', 'ecmascript'],
  'typescript': ['ts', 'typescript'],
  'python': ['python', 'python3', 'py'],
  'react': ['react', 'reactjs', 'react.js'],
  'node.js': ['node', 'nodejs', 'node.js'],
  'mongodb': ['mongo', 'mongodb'],
  'postgresql': ['postgres', 'postgresql', 'psql'],
  'docker': ['docker', 'containerization'],
  'kubernetes': ['k8s', 'kubernetes', 'kube'],
  'aws': ['aws', 'amazon web services'],
  'machine learning': ['ml', 'machine learning'],
  'artificial intelligence': ['ai', 'artificial intelligence'],
  'nlp': ['nlp', 'natural language processing', 'nlp preprocessing'],
  'sql': ['sql', 'structured query language'],
  'html': ['html', 'html5'],
  'css': ['css', 'css3'],
  'git': ['git', 'version control'],
  'rest api': ['rest', 'restful', 'rest api', 'rest apis', 'restful api', 'restful apis'],
  'graphql': ['graphql', 'gql'],
};

// Build reverse lookup map
const aliasMap = {};
Object.entries(skillAliases).forEach(([canonical, variants]) => {
  variants.forEach(variant => {
    aliasMap[variant.toLowerCase()] = canonical;
  });
});

/**
 * Normalize a single skill string
 * @param {string} skill - Raw skill string
 * @returns {string} - Normalized skill
 */
function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  
  const cleaned = skill.trim().toLowerCase();
  
  // Check if it's a known alias
  if (aliasMap[cleaned]) {
    return aliasMap[cleaned];
  }
  
  return cleaned;
}

/**
 * Normalize a list of skills and remove duplicates
 * @param {Array<string>} skills - Array of skill strings
 * @returns {Array<string>} - Normalized and deduplicated skills
 */
function normalizeSkillList(skills) {
  if (!Array.isArray(skills)) return [];
  
  const normalized = skills
    .map(skill => normalizeSkill(skill))
    .filter(skill => skill.length > 0);
  
  // Remove duplicates while preserving order
  return [...new Set(normalized)];
}

/**
 * Compare two skill lists and return common and missing skills
 * @param {Array<string>} userSkills - User's skills
 * @param {Array<string>} jobSkills - Job requirements
 * @returns {Object} - { common, missing, matchScore }
 */
function compareSkills(userSkills, jobSkills) {
  const normalizedUser = normalizeSkillList(userSkills);
  const normalizedJob = normalizeSkillList(jobSkills);
  
  const userSet = new Set(normalizedUser);
  const jobSet = new Set(normalizedJob);
  
  const common = normalizedJob.filter(skill => userSet.has(skill));
  const missing = normalizedJob.filter(skill => !userSet.has(skill));
  
  // Calculate match score (0-100)
  const matchScore = jobSet.size > 0 
    ? Math.round((common.length / jobSet.size) * 100)
    : 0;
  
  return {
    common,
    missing,
    matchScore
  };
}

module.exports = {
  normalizeSkill,
  normalizeSkillList,
  compareSkills
};
