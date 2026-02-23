/**
 * Auth endpoint tests — POST /api/auth/register and POST /api/auth/login
 *
 * Models are mocked so no real MongoDB connection is required.
 * Run with: npm test -- --testPathPattern=auth
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';

const request = require('supertest');

// ── Mock the DB connection so app.js doesn't fail to import ──────────────────
jest.mock('../src/config/db', () => jest.fn());

// ── Mock the User model ───────────────────────────────────────────────────────
jest.mock('../src/models/User');
const User = require('../src/models/User');

const app = require('../src/app');

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a new user and returns a token', async () => {
    User.findOne.mockResolvedValue(null); // user doesn't exist yet
    User.create.mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  it('returns 409 if the email is already registered', async () => {
    User.findOne.mockResolvedValue({ email: 'alice@example.com' }); // already exists

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com' }); // missing name + password

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 400 for a password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('strips HTML tags from name field', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '<script>alert(1)</script>Alice', email: 'alice2@example.com', password: 'password123' });

    // Should not echo back the script tag; it gets stripped
    expect(res.status).toBe(201);
    // The User.create should have been called with sanitised name
    const createCall = User.create.mock.calls[0][0];
    expect(createCall.name).not.toContain('<script>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in with valid credentials', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    User.findOne.mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER',
      password: hash,
      active: true
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 for a wrong password', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correctpass', 10);

    User.findOne.mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      email: 'alice@example.com',
      password: hash,
      active: true,
      role: 'USER'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('returns 401 for unknown email', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('returns 403 for a disabled account', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    User.findOne.mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      email: 'alice@example.com',
      password: hash,
      active: false,
      role: 'USER'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});
