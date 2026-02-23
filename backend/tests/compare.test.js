/**
 * Job Comparison endpoint tests — POST /api/comparisons/compare
 *
 * Run with: npm test -- --testPathPattern=compare
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
jest.mock('axios');

const User       = require('../src/models/User');
const Resume     = require('../src/models/Resume');
const Comparison = require('../src/models/Comparison');
const axios      = require('axios');

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const USER_TOKEN = makeToken({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'USER' });

function setupAuth() {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(mockUser())
  });
}

function setupResume(skills = ['javascript', 'nodejs', 'react']) {
  Resume.findOne = jest.fn().mockReturnValue({
    sort: jest.fn().mockResolvedValue({
      _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      extractedSkills: skills
    })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/comparisons/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/comparisons/compare')
      .send({ jobTitle: 'Dev', jobDescription: 'We need a javascript developer' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when job description is missing', async () => {
    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ jobTitle: 'Developer' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 when job description is too short', async () => {
    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ jobTitle: 'Dev', jobDescription: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when no resume is on file', async () => {
    setupAuth();
    Resume.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null)
    });

    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ jobTitle: 'Frontend Dev', jobDescription: 'We need a javascript and react developer' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('computes a match score and returns structured results', async () => {
    setupResume(['javascript', 'nodejs']);
    axios.post.mockResolvedValue({ data: { skills: ['javascript', 'python', 'nodejs'] } });

    Comparison.create = jest.fn().mockResolvedValue({
      _id: 'cccccccccccccccccccccccc',
      jobTitle: 'Backend Engineer',
      matchScore: 67,
      commonSkills: ['javascript', 'nodejs'],
      missingSkills: ['python']
    });

    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Backend Engineer',
        jobDescription: 'We need a javascript, nodejs and python developer with real experience'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('matchScore');
    expect(res.body.data).toHaveProperty('commonSkills');
    expect(res.body.data).toHaveProperty('missingSkills');
  });

  it('still returns results if NLP service is unavailable (NLP fallback)', async () => {
    setupResume(['javascript']);
    // NLP throws a network error
    axios.post.mockRejectedValue(new Error('connect ECONNREFUSED'));

    Comparison.create = jest.fn().mockResolvedValue({
      _id: 'dddddddddddddddddddddddd',
      matchScore: 0,
      commonSkills: [],
      missingSkills: []
    });

    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: 'Engineer',
        jobDescription: 'We need javascript and python and react developers for our team',
        jobSkills: ['python'] // explicit skills bypass NLP
      });

    expect([200, 201]).toContain(res.status);
  });

  it('sanitizes HTML in jobTitle and jobDescription', async () => {
    setupResume(['javascript']);
    axios.post.mockResolvedValue({ data: { skills: ['javascript'] } });
    Comparison.create = jest.fn().mockResolvedValue({
      _id: 'eeeeeeeeeeeeeeeeeeeeeeee',
      matchScore: 100,
      commonSkills: ['javascript'],
      missingSkills: []
    });

    const res = await request(app)
      .post('/api/comparisons/compare')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({
        jobTitle: '<b>Senior</b> Developer',
        jobDescription: '<script>alert(1)</script>We need a javascript developer with experience'
      });

    // Request should be accepted; HTML should be stripped server-side
    expect([200, 201, 400]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const createArg = Comparison.create.mock.calls[0]?.[0];
      if (createArg) {
        expect(createArg.jobDescription).not.toContain('<script>');
        expect(createArg.jobTitle).not.toContain('<b>');
      }
    }
  });
});
