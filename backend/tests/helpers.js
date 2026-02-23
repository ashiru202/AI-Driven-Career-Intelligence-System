const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-jwt-secret-for-jest-only';

/**
 * Generate a signed JWT token for use in test Authorization headers.
 * @param {object} payload - { id, role }
 */
function makeToken(payload = {}) {
  return jwt.sign(
    { id: payload.id || 'aaaaaaaaaaaaaaaaaaaaaaaa', role: payload.role || 'USER' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Build a mock Mongoose user object (mirrors what authMiddleware expects).
 */
function mockUser(overrides = {}) {
  return {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    active: true,
    ...overrides
  };
}

/**
 * Build a mock STAFF user.
 */
function mockStaffUser(overrides = {}) {
  return mockUser({ role: 'STAFF', email: 'staff@example.com', ...overrides });
}

/**
 * Build a mock ADMIN user.
 */
function mockAdminUser(overrides = {}) {
  return mockUser({ role: 'ADMIN', email: 'admin@example.com', ...overrides });
}

module.exports = { makeToken, mockUser, mockStaffUser, mockAdminUser, JWT_SECRET };
