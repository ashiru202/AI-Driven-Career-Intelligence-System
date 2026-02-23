const normalize = (arr) =>
  [...new Set((arr || []).map(s => String(s).trim().toLowerCase()).filter(Boolean))];

function computeSkillGap(resumeSkills, jobSkills) {
  const r = new Set(normalize(resumeSkills));
  const j = normalize(jobSkills);

  const commonSkills = [];
  const missingSkills = [];

  for (const s of j) {
    if (r.has(s)) commonSkills.push(s);
    else missingSkills.push(s);
  }

  const matchScore = j.length ? Math.round((commonSkills.length / j.length) * 100) : 0;

  return { commonSkills, missingSkills, matchScore };
}

module.exports = { computeSkillGap };
