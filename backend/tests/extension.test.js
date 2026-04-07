/**
 * Extension API endpoint tests
 *
 * Run with: npm test -- --testPathPattern=extension
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';
process.env.NLP_SERVICE_URL = 'http://localhost:8000';

const request = require('supertest');
const { makeToken, mockUser } = require('./helpers');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../src/config/db', () => jest.fn());
jest.mock('../src/models/User');
jest.mock('../src/models/Resume');
jest.mock('../src/models/Comparison');
jest.mock('../src/services/aiSkillExtractorService');
jest.mock('../src/services/skillGapService');

const User = require('../src/models/User');
const Resume = require('../src/models/Resume');
const Comparison = require('../src/models/Comparison');
const aiSkillExtractorService = require('../src/services/aiSkillExtractorService');
const skillGapService = require('../src/services/skillGapService');

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_TOKEN = makeToken({ id: USER_ID, role: 'USER' });

function setupAuth(userId = USER_ID) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(mockUser({ _id: userId, id: userId }))
  });
}

function setupResume(skills = ['javascript', 'nodejs', 'react']) {
  Resume.findOne = jest.fn().mockImplementation((filter) => {
    return {
      sort: jest.fn().mockResolvedValue({
        _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        fileName: 'Resume_Jan2026.pdf',
        fileSize: 245000,
        extractedSkills: skills
      })
    };
  });
  Resume.countDocuments = jest.fn().mockResolvedValue(1);
}

function setupSkillServices() {
  aiSkillExtractorService.extractSkills = jest.fn().mockResolvedValue({
    skills: ['javascript', 'react', 'nodejs', 'typescript', 'docker']
  });

  skillGapService.computeSkillGap = jest.fn().mockReturnValue({
    commonSkills: ['javascript', 'nodejs'],
    missingSkills: ['typescript', 'docker'],
    resumeSkills: ['javascript', 'nodejs', 'react'],
    jobSkills: ['javascript', 'react', 'nodejs', 'typescript', 'docker'],
    matchScore: 60
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/extension/resumes/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/extension/resumes/list');

    expect(res.status).toBe(401);
  });

  it('returns empty array if user has no resumes', async () => {
    Resume.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      })
    });

    const res = await request(app)
      .get('/api/extension/resumes/list')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns list of resumes with id, name, date, sizeKB', async () => {
    Resume.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'cccccccccccccccccccccccc',
            fileName: 'Resume_Jan2026.pdf',
            createdAt: new Date('2026-01-15'),
            fileSize: 245000
          },
          {
            _id: 'dddddddddddddddddddddddd',
            fileName: 'Resume_Feb2026.pdf',
            createdAt: new Date('2026-02-20'),
            fileSize: 312000
          }
        ])
      })
    });

    const res = await request(app)
      .get('/api/extension/resumes/list')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('date');
    expect(res.body.data[0]).toHaveProperty('sizeKB');
    expect(res.body.data[0].name).toBe('Resume_Jan2026.pdf');
    expect(res.body.data[0].sizeKB).toBe(239); // 245000 / 1024
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/extension/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    setupResume();
    setupSkillServices();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/extension/compare')
      .send({
        jobTitle: 'Developer',
        jobDescription: 'We are looking for a senior developer with 5+ years experience'
      });

    expect(res.status).toBe(401);
  });

  it('returns 400 when job title is missing', async () => {
    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobDescription: 'We are looking for a senior developer'
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 when job description is missing', async () => {
    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Developer'
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 when job title is too short', async () => {
    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'D',
        jobDescription: 'We are looking for a senior developer with 5+ years experience'
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when job description is too short', async () => {
    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Developer',
        jobDescription: 'short'
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when user has no resumes', async () => {
    Resume.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null)
    });

    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer with 5+ years experience in React and Node.js'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_RESUME');
  });

  it('returns 404 when specified resumeId does not belong to user', async () => {
    Resume.findOne = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer with 5+ years experience',
        resumeId: 'eeeeeeeeeeeeeeeeeeeeeeee'
      });

    expect(res.status).toBe(404);
  });

  it('successfully compares job with user resume and saves to DB (no resumeId)', async () => {
    Comparison.prototype.save = jest.fn().mockResolvedValue({
      _id: 'ffffffffffffffffffffffff',
      user: USER_ID,
      resume: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      source: 'extension'
    });

    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Senior React Developer',
        jobDescription: 'We are looking for a senior developer with 5+ years React experience and Node.js backend knowledge'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('comparisonId');
    expect(res.body.data).toHaveProperty('matchScore');
    expect(res.body.data).toHaveProperty('commonSkills');
    expect(res.body.data).toHaveProperty('missingSkills');
    expect(res.body.data).toHaveProperty('resumeFileName');
    expect(res.body.data.resumeFileName).toBe('Resume_Jan2026.pdf');
    expect(res.body.data.commonCount).toBe(2);
    expect(res.body.data.missingCount).toBe(2);
    expect(res.body.data.matchScore).toBe(60);
  });

  it('successfully compares job with specified resume', async () => {
    Resume.findOne = jest.fn().mockResolvedValue({
      _id: 'gggggggggggggggggggggggg',
      fileName: 'Resume_Mar2026.pdf',
      extractedSkills: ['python', 'django', 'react']
    });

    Comparison.prototype.save = jest.fn().mockResolvedValue({
      _id: 'hhhhhhhhhhhhhhhhhhhhhhhh',
      user: USER_ID,
      resume: 'gggggggggggggggggggggggg',
      source: 'extension'
    });

    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Full Stack Developer',
        jobDescription: 'Looking for a full stack developer with Python, React, and Docker skills',
        resumeId: 'gggggggggggggggggggggggg'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.resumeFileName).toBe('Resume_Mar2026.pdf');
  });

  it('returns lightweight response optimized for extension popup', async () => {
    Comparison.prototype.save = jest.fn().mockResolvedValue({
      _id: 'iiiiiiiiiiiiiiiiiiiiiiii'
    });

    const res = await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Developer',
        jobDescription: 'We need a developer with javascript and react knowledge for our project'
      });

    expect(res.status).toBe(200);
    // Response should NOT include full comparison object, only lightweight fields
    expect(res.body.data).toHaveProperty('comparisonId');
    expect(res.body.data).toHaveProperty('matchScore');
    expect(res.body.data).toHaveProperty('commonSkills');
    expect(res.body.data).toHaveProperty('missingSkills');
    expect(res.body.data).toHaveProperty('commonCount');
    expect(res.body.data).toHaveProperty('missingCount');
    expect(res.body.data).toHaveProperty('totalRequired');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('saves comparison with source:extension to database', async () => {
    const savespy = jest.fn().mockResolvedValue({
      _id: 'jjjjjjjjjjjjjjjjjjjjjjjj'
    });

    Comparison.prototype.save = savespy;

    await request(app)
      .post('/api/extension/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Developer',
        jobDescription: 'Looking for a skilled javascript developer with 3+ years experience'
      });

    expect(savespy).toHaveBeenCalled();
    // Check that Comparison was created with source:'extension'
    expect(Comparison).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'extension'
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/extension/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    setupResume();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/extension/health');

    expect(res.status).toBe(401);
  });

  it('returns health status with auth state', async () => {
    const res = await request(app)
      .get('/api/extension/health')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('ok');
    expect(res.body.data).toHaveProperty('authenticated');
    expect(res.body.data).toHaveProperty('hasResumes');
    expect(res.body.data).toHaveProperty('resumeCount');
    expect(res.body.data.authenticated).toBe(true);
  });

  it('returns hasResumes:true when user has resumes', async () => {
    Resume.countDocuments = jest.fn().mockResolvedValue(2);

    const res = await request(app)
      .get('/api/extension/health')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hasResumes).toBe(true);
    expect(res.body.data.resumeCount).toBe(2);
  });

  it('returns hasResumes:false when user has no resumes', async () => {
    Resume.countDocuments = jest.fn().mockResolvedValue(0);

    const res = await request(app)
      .get('/api/extension/health')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hasResumes).toBe(false);
    expect(res.body.data.resumeCount).toBe(0);
  });
});
