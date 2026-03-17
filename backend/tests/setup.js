/**
 * Jest global setup — sets environment variables needed by the app.
 * This file is referenced via "globalSetup" in jest.config.js.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only';
process.env.PORT = '0'; // OS assigns a random free port
process.env.NLP_SERVICE_URL = 'http://localhost:8000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/career-intelligence-test';
process.env.GROQ_API_KEY = 'test-groq-api-key-for-jest-only';
process.env.INTERNAL_TOKEN = 'test-internal-token';
