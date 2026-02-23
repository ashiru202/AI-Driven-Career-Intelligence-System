/**
 * Roadmap endpoint tests
 *
 * Covers: POST /api/roadmaps-new, GET /api/roadmaps-new, PATCH skill status
 * Run with: npm test -- --testPathPattern=roadmap
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';

const request = require('supertest');
const { makeToken, mockUser } = require('./helpers');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../src/config/db', () => jest.fn());
jest.mock('../src/models/User');
jest.mock('../src/models/Roadmap');
jest.mock('../src/models/Comparison');

const User       = require('../src/models/User');
const Roadmap    = require('../src/models/Roadmap');
const Comparison = require('../src/models/Comparison');

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const USER_TOKEN = makeToken({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'USER' });
const ROADMAP_ID = '123412341234123412341234';

function setupAuth() {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(mockUser())
  });
}

function mockRoadmapDoc(overrides = {}) {
  return {
    _id: ROADMAP_ID,
    user: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    targetRole: 'Frontend Developer',
    jobTitle: 'Frontend Developer',
    skillsToLearn: [
      { skill: 'react',   status: 'PENDING', estimate: '2 weeks', resources: [] },
      { skill: 'graphql', status: 'PENDING', estimate: '1 week',  resources: [] }
    ],
    missingSkills: ['react', 'graphql'],
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/roadmaps-new', () => {
  beforeEach(() => { jest.clearAllMocks(); setupAuth(); });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/roadmaps-new')
      .send({ targetRole: 'Dev', missingSkills: ['python'] });

    expect(res.status).toBe(401);
  });

  it('returns 400 when missingSkills is empty', async () => {
    const res = await request(app)
      .post('/api/roadmaps-new')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ targetRole: 'Developer', missingSkills: [] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('creates a roadmap from missingSkills', async () => {
    Roadmap.create = jest.fn().mockResolvedValue({
      _id: ROADMAP_ID,
      targetRole: 'Backend Developer',
      skillsToLearn: [{ skill: 'python', status: 'PENDING' }]
    });

    const res = await request(app)
      .post('/api/roadmaps-new')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ targetRole: 'Backend Developer', missingSkills: ['python', 'docker'] });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('roadmapId');
  });

  it('returns 400 when targetRole is missing', async () => {
    const res = await request(app)
      .post('/api/roadmaps-new')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ missingSkills: ['react'] });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/roadmaps-new', () => {
  beforeEach(() => { jest.clearAllMocks(); setupAuth(); });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/roadmaps-new');
    expect(res.status).toBe(401);
  });

  it('returns list of roadmaps', async () => {
    Roadmap.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([mockRoadmapDoc()])
      })
    });

    const res = await request(app)
      .get('/api/roadmaps-new')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.roadmaps)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/roadmaps-new/:id/skills — update skill status', () => {
  beforeEach(() => { jest.clearAllMocks(); setupAuth(); });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/roadmaps-new/${ROADMAP_ID}/skills`)
      .send({ skill: 'react', status: 'IN_PROGRESS' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/roadmaps-new/${ROADMAP_ID}/skills`)
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ skill: 'react', status: 'DONE' }); // DONE is not a valid status

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('updates a skill status to IN_PROGRESS', async () => {
    const doc = mockRoadmapDoc();
    Roadmap.findOne = jest.fn().mockResolvedValue(doc);
    doc.save = jest.fn().mockResolvedValue(doc);

    const res = await request(app)
      .patch(`/api/roadmaps-new/${ROADMAP_ID}/skills`)
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ skill: 'react', status: 'IN_PROGRESS' });

    expect([200, 201]).toContain(res.status);
  });

  it('updates a skill status to COMPLETED', async () => {
    const doc = mockRoadmapDoc();
    Roadmap.findOne = jest.fn().mockResolvedValue(doc);
    doc.save = jest.fn().mockResolvedValue(doc);

    const res = await request(app)
      .patch(`/api/roadmaps-new/${ROADMAP_ID}/skills`)
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ skill: 'react', status: 'COMPLETED' });

    expect([200, 201]).toContain(res.status);
  });

  it('returns 400 for invalid roadmap ID format', async () => {
    const res = await request(app)
      .patch('/api/roadmaps-new/not-a-valid-id/skills')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ skill: 'react', status: 'COMPLETED' });

    expect(res.status).toBe(400);
  });
});
