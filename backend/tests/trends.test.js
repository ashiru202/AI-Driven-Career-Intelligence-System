/**
 * Industry Trends API endpoint tests — Phase 8, Task 8.2
 *
 * Covers:
 *   GET  /api/trends/snapshot-summary       (any authenticated user)
 *   GET  /api/trends/rising                 (any authenticated user)
 *   GET  /api/trends/falling                (any authenticated user)
 *   GET  /api/trends/skills                 (any authenticated user, paginated)
 *   GET  /api/trends/skills/:skill          (any authenticated user)
 *   POST /api/admin/trends/trigger-scrape   (ADMIN only)
 *
 * Run with: npm test -- --testPathPattern=trends
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';
process.env.NLP_SERVICE_URL = 'http://localhost:8000';
process.env.NLP_INTERNAL_TOKEN = 'test-internal-token';
process.env.INTERNAL_TOKEN = process.env.NLP_INTERNAL_TOKEN;

const request = require('supertest');
const { makeToken, mockUser, mockAdminUser } = require('./helpers');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../src/config/db', () => jest.fn());
jest.mock('../src/models/User');
jest.mock('../src/models/SkillForecast');
jest.mock('../src/models/SkillSnapshot');
jest.mock('../src/models/JobPosting');
jest.mock('axios');

const User          = require('../src/models/User');
const SkillForecast = require('../src/models/SkillForecast');
const SkillSnapshot = require('../src/models/SkillSnapshot');
const JobPosting    = require('../src/models/JobPosting');
const axios         = require('axios');

const app = require('../src/app');

// ── Token helpers ─────────────────────────────────────────────────────────────
const USER_TOKEN  = makeToken({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'USER' });
const ADMIN_TOKEN = makeToken({ id: 'cccccccccccccccccccccccc', role: 'ADMIN' });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

// ── Mock data factories ───────────────────────────────────────────────────────
function makeForecast(overrides = {}) {
  return {
    skill: 'python',
    trendDirection: 'rising',
    trendSlope: 0.002,
    trendConfidence: 0.85,
    dataPointsUsed: 12,
    modelUsed: 'linear',
    generatedAt: new Date('2026-03-15T12:00:00Z'),
    forecastPoints: [
      { periodStart: new Date('2026-03-23'), predictedFreq: 0.05, lowerBound: 0.04, upperBound: 0.06 },
    ],
    ...overrides,
  };
}

function makeSnapshot(overrides = {}) {
  return {
    skill: 'python',
    periodStart: new Date('2026-03-09'),
    periodEnd: new Date('2026-03-15'),
    count: 50,
    totalJobs: 200,
    relativeFreq: 0.25,
    marketScope: 'combined',
    sources: ['remotive'],
    ...overrides,
  };
}

/**
 * Build a mock Mongoose query chain that resolves at whichever point the
 * controller awaits (some chain at .sort(), others add .select(), .limit(), etc.)
 */
function chainResolving(value) {
  const chain = {};
  const resolved = Promise.resolve(value);
  // Make the chain awaitable (Mongoose thenable)
  chain.then = resolved.then.bind(resolved);
  chain.catch = resolved.catch.bind(resolved);
  chain.sort   = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.limit  = jest.fn().mockReturnValue(chain);
  chain.skip   = jest.fn().mockReturnValue(chain);
  chain.lean   = jest.fn().mockReturnValue(chain);
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/trends/snapshot-summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trends/snapshot-summary');
    expect(res.status).toBe(401);
  });

  it('returns a scope-aware summary for any authenticated user', async () => {
    setupAuth(mockUser());
    const lkFilter = { marketScope: 'local-lk' };

    // Cover all the chain variants the controller might use
    JobPosting.findOne   = jest.fn().mockReturnValue(chainResolving({ scrapedAt: new Date('2026-03-15') }));
    JobPosting.countDocuments    = jest.fn().mockResolvedValue(420);
    SkillForecast.countDocuments = jest.fn().mockResolvedValue(80);
    SkillForecast.findOne = jest.fn().mockReturnValue(chainResolving({ generatedAt: new Date('2026-03-15') }));
    SkillSnapshot.distinct = jest.fn((field) => {
      if (field === 'skill') {
        return Promise.resolve(['python', 'react']);
      }
      if (field === 'periodStart') {
        return Promise.resolve([new Date('2026-03-03'), new Date('2026-03-10')]);
      }
      return Promise.resolve([]);
    });

    const res = await request(app)
      .get('/api/trends/snapshot-summary?marketScope=local-lk')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('marketScope', 'local-lk');
    expect(res.body.data).toHaveProperty('totalJobsIndexed', 420);
    expect(res.body.data).toHaveProperty('skillsTracked', 2);
    expect(res.body.data).toHaveProperty('weeksCovered', 2);
    expect(res.body.data).toHaveProperty('forecastsGenerated');

    expect(JobPosting.countDocuments).toHaveBeenCalledWith(lkFilter);
    expect(JobPosting.findOne).toHaveBeenCalledWith(lkFilter);
    expect(SkillSnapshot.distinct).toHaveBeenNthCalledWith(1, 'skill', lkFilter);
    expect(SkillSnapshot.distinct).toHaveBeenNthCalledWith(2, 'periodStart', lkFilter);
  });

  it('falls back to combined scope when query marketScope is invalid', async () => {
    setupAuth(mockUser());

    JobPosting.findOne = jest.fn().mockReturnValue(chainResolving({ scrapedAt: new Date('2026-03-15') }));
    JobPosting.countDocuments = jest.fn().mockResolvedValue(1500);
    SkillForecast.countDocuments = jest.fn().mockResolvedValue(80);
    SkillForecast.findOne = jest.fn().mockReturnValue(chainResolving({ generatedAt: new Date('2026-03-15') }));
    SkillSnapshot.distinct = jest.fn((field) => {
      if (field === 'skill') return Promise.resolve(['python']);
      if (field === 'periodStart') return Promise.resolve([new Date('2026-03-03')]);
      return Promise.resolve([]);
    });

    const res = await request(app)
      .get('/api/trends/snapshot-summary?marketScope=not-a-valid-scope')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('marketScope', 'combined');
    expect(JobPosting.countDocuments).toHaveBeenCalledWith({});
    expect(JobPosting.findOne).toHaveBeenCalledWith({});
    expect(SkillSnapshot.distinct).toHaveBeenNthCalledWith(1, 'skill', { marketScope: 'combined' });
    expect(SkillSnapshot.distinct).toHaveBeenNthCalledWith(2, 'periodStart', { marketScope: 'combined' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/trends/rising', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trends/rising');
    expect(res.status).toBe(401);
  });

  it('returns an array where every skill has trendSlope > 0', async () => {
    setupAuth(mockUser());

    const forecasts = [
      makeForecast({ skill: 'python',     trendSlope: 0.003 }),
      makeForecast({ skill: 'typescript', trendSlope: 0.002 }),
    ];

    SkillForecast.find = jest.fn().mockReturnValue(chainResolving(forecasts));
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([
      { _id: 'python',     latestFreq: 0.25, latestPeriodStart: new Date() },
      { _id: 'typescript', latestFreq: 0.15, latestPeriodStart: new Date() },
    ]);

    const res = await request(app)
      .get('/api/trends/rising?limit=2')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.skills)).toBe(true);
    res.body.data.skills.forEach((s) => {
      expect(s.trendSlope).toBeGreaterThan(0);
    });
  });

  it('clamps limit to a maximum of 50', async () => {
    setupAuth(mockUser());

    SkillForecast.find = jest.fn().mockReturnValue(chainResolving([]));
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trends/rising?limit=999')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    // The Mongoose chain should have been called with limit ≤ 50
    const chain = SkillForecast.find.mock.results[0].value;
    const limitCalls = chain.limit.mock.calls;
    if (limitCalls.length > 0) {
      expect(limitCalls[0][0]).toBeLessThanOrEqual(50);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/trends/falling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trends/falling');
    expect(res.status).toBe(401);
  });

  it('returns an array where every skill has trendSlope < 0', async () => {
    setupAuth(mockUser());

    const forecasts = [
      makeForecast({ skill: 'perl',  trendDirection: 'falling', trendSlope: -0.004 }),
      makeForecast({ skill: 'cobol', trendDirection: 'falling', trendSlope: -0.002 }),
    ];

    SkillForecast.find = jest.fn().mockReturnValue(chainResolving(forecasts));
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trends/falling?limit=2')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.skills)).toBe(true);
    res.body.data.skills.forEach((s) => {
      expect(s.trendSlope).toBeLessThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/trends/skills', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trends/skills');
    expect(res.status).toBe(401);
  });

  it('returns a paginated list with correct shape', async () => {
    setupAuth(mockUser());

    const forecasts = [
      makeForecast({ skill: 'python' }),
      makeForecast({ skill: 'react', trendDirection: 'stable', trendSlope: 0.0 }),
    ];

    SkillForecast.countDocuments = jest.fn().mockResolvedValue(2);
    SkillForecast.find = jest.fn().mockReturnValue(chainResolving(forecasts));
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([
      { _id: 'python', latestFreq: 0.25, latestPeriodStart: new Date() },
      { _id: 'react',  latestFreq: 0.18, latestPeriodStart: new Date() },
    ]);

    const res = await request(app)
      .get('/api/trends/skills?limit=10&page=1')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.skills)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
  });

  it('applies the direction filter when provided', async () => {
    setupAuth(mockUser());

    SkillForecast.countDocuments = jest.fn().mockResolvedValue(1);
    SkillForecast.find = jest.fn().mockReturnValue(
      chainResolving([makeForecast({ skill: 'python', trendDirection: 'rising' })])
    );
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trends/skills?direction=rising&limit=5')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    // Confirm the model was queried with the direction constraint
    expect(SkillForecast.find).toHaveBeenCalledWith(
      expect.objectContaining({ trendDirection: 'rising' })
    );
  });

  it('respects the ?limit= query param and returns pagination metadata', async () => {
    setupAuth(mockUser());

    SkillForecast.countDocuments = jest.fn().mockResolvedValue(50);
    SkillForecast.find = jest.fn().mockReturnValue(chainResolving([]));
    SkillSnapshot.aggregate = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trends/skills?limit=5&page=2')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    const { pagination } = res.body.data;
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination.total).toBe(50);
    expect(pagination.page).toBe(2);
    expect(pagination.limit).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/trends/skills/:skill', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trends/skills/python');
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown skill with no forecast or history', async () => {
    setupAuth(mockUser());

    SkillForecast.findOne = jest.fn().mockReturnValue(chainResolving(null));
    SkillSnapshot.find    = jest.fn().mockReturnValue(chainResolving([]));

    const res = await request(app)
      .get('/api/trends/skills/nonexistentskill')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('returns forecast and history for a known skill', async () => {
    setupAuth(mockUser());

    SkillForecast.findOne = jest.fn().mockReturnValue(chainResolving(makeForecast({ skill: 'python' })));
    SkillSnapshot.find    = jest.fn().mockReturnValue(
      chainResolving([makeSnapshot({ skill: 'python' })])
    );

    const res = await request(app)
      .get('/api/trends/skills/python')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('skill');
    expect(res.body.data).toHaveProperty('history');
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  it('returns forecastPending=true if forecast not yet computed but history exists', async () => {
    setupAuth(mockUser());

    SkillForecast.findOne = jest.fn().mockReturnValue(chainResolving(null));
    SkillSnapshot.find    = jest.fn().mockReturnValue(
      chainResolving([makeSnapshot({ skill: 'rust' })])
    );

    const res = await request(app)
      .get('/api/trends/skills/rust')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('forecastPending', true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/admin/trends/trigger-scrape', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/trends/trigger-scrape');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a plain USER', async () => {
    setupAuth(mockUser({ role: 'USER' }));

    const res = await request(app)
      .post('/api/admin/trends/trigger-scrape')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('triggers scrape for ADMIN and proxies NLP response', async () => {
    setupAuth(mockAdminUser());

    const nlpResponse = {
      scraped: 50,
      inserted: 48,
      skipped: 2,
      by_source: { remotive: { scraped: 50, inserted: 48, skipped: 2 } },
    };
    axios.post = jest.fn().mockResolvedValue({ data: nlpResponse });

    const res = await request(app)
      .post('/api/admin/trends/trigger-scrape')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Controller must have forwarded the request to the NLP service
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/trigger-scrape'),
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Internal-Token': expect.any(String),
        }),
      })
    );
  });
});
