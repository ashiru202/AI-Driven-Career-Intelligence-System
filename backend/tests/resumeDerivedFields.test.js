process.env.NODE_ENV = 'test';

const {
  normalizeResumeSkills,
  computeSkillsSignature,
  classifyCandidateLevel,
  buildResumeDerivedFields,
} = require('../src/utils/resumeDerivedFields');

describe('resume derived fields', () => {
  it('normalizes resume skills to lowercase unique sorted values', () => {
    expect(normalizeResumeSkills(['ReactJS', 'js', 'JavaScript', 'Mongo'])).toEqual([
      'javascript',
      'mongodb',
      'react',
    ]);
  });

  it('computes stable signatures from normalized skills', () => {
    const skillsA = normalizeResumeSkills(['NodeJS', 'React']);
    const skillsB = normalizeResumeSkills(['react.js', 'node']);

    expect(computeSkillsSignature(skillsA)).toBe(computeSkillsSignature(skillsB));
    expect(computeSkillsSignature(skillsA)).toHaveLength(64);
  });

  it('classifies intern resumes from internship signals', () => {
    const result = classifyCandidateLevel('Software engineering intern with React projects');

    expect(result).toEqual({
      candidateLevel: 'INTERN',
      candidateLevelSource: 'heuristic',
    });
  });

  it('classifies professional resumes from years of experience', () => {
    const result = classifyCandidateLevel('Full stack developer with 3 years of experience');

    expect(result).toEqual({
      candidateLevel: 'PROFESSIONAL',
      candidateLevelSource: 'heuristic',
    });
  });

  it('uses explicit user profile career level before heuristics', () => {
    const result = classifyCandidateLevel('Student intern', { careerLevel: 'PROFESSIONAL' });

    expect(result).toEqual({
      candidateLevel: 'PROFESSIONAL',
      candidateLevelSource: 'user_profile',
    });
  });

  it('builds all derived fields together', () => {
    const result = buildResumeDerivedFields(
      ['TS', 'ReactJS', 'React'],
      'Lead engineer with 5 years experience'
    );

    expect(result.normalizedSkills).toEqual(['react', 'typescript']);
    expect(result.skillsSignature).toHaveLength(64);
    expect(result.candidateLevel).toBe('PROFESSIONAL');
    expect(result.candidateLevelSource).toBe('heuristic');
  });
});
