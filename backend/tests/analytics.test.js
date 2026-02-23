/**
 * Analytics endpoint tests
 *
 * Covers:
 *   GET /api/analytics/skill-demand    (any authenticated user)
 *   GET /api/analytics/common-gaps     (STAFF/ADMIN only)
 *   GET /api/analytics/user-insights   (current user)
 *   GET /api/analytics/cv-completeness (current user)
 *
 * Run with: npm test -- --testPathPattern=analytics
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';

const request = require('supertest');
const { makeToken, mockUser, mockStaffUser } = require('./helpers');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../src/config/db', () => jest.fn());
jest.mock('../src/models/User');
jest.mock('../src/services/analyticsService');

const User             = require('../src/models/User');
const analyticsService = require('../src/services/analyticsService');

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const USER_TOKEN  = makeToken({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'USER' });
const STAFF_TOKEN = makeToken({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'STAFF' });
const ADMIN_TOKEN = makeToken({ id: 'cccccccccccccccccccccccc', role: 'ADMIN' });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/skill-demand', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/analytics/skill-demand');
    expect(res.status).toBe(401);
  });

  it('returns skill demand data for any authenticated user', async () => {
    setupAuth(mockUser());
    analyticsService.getSkillDemandStats = jest.fn().mockResolvedValue({
      topSkills: [{ skill: 'javascript', count: 50 }],
      bottomSkills: [{ skill: 'cobol', count: 1 }]
    });

    const res = await request(app)
      .get('/api/analytics/skill-demand')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('topSkills');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/common-gaps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/analytics/common-gaps');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a plain USER', async () => {
    setupAuth(mockUser());

    const res = await request(app)
      .get('/api/analytics/common-gaps')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('returns common gaps for STAFF', async () => {
    setupAuth(mockStaffUser());
    analyticsService.getCommonGaps = jest.fn().mockResolvedValue([
      { skill: 'aws', count: 30 },
      { skill: 'docker', count: 25 }
    ]);

    const res = await request(app)
      .get('/api/analytics/common-gaps')
      .set('Authorization', `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns common gaps for ADMIN', async () => {
    setupAuth(mockUser({ role: 'ADMIN', email: 'admin@example.com' }));
    analyticsService.getCommonGaps = jest.fn().mockResolvedValue([
      { skill: 'kubernetes', count: 20 }
    ]);

    const res = await request(app)
      .get('/api/analytics/common-gaps')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/user-insights', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/analytics/user-insights');
    expect(res.status).toBe(401);
  });

  it('returns user insights for the current user', async () => {
    setupAuth(mockUser());
    analyticsService.getUserInsights = jest.fn().mockResolvedValue({
      totalResumes: 2,
      avgMatchScore: 65,
      topMissingSkills: ['docker', 'aws'],
      recommendations: []
    });

    const res = await request(app)
      .get('/api/analytics/user-insights')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/cv-completeness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/analytics/cv-completeness');
    expect(res.status).toBe(401);
  });

  it('returns CV completeness score', async () => {
    setupAuth(mockUser());
    analyticsService.getCVCompleteness = jest.fn().mockResolvedValue({
      score: 72,
      suggestions: ['Add a projects section', 'Include measurable achievements']
    });

    const res = await request(app)
      .get('/api/analytics/cv-completeness')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
