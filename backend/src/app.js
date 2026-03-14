/**
 * Express app factory — imported by server.js (production) and test files.
 * Does NOT connect to the database or start the HTTP listener.
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { errorHandler } = require("./middleware/errorMiddleware");
const { authLimiter, generalLimiter, uploadLimiter } = require("./middleware/rateLimitMiddleware");

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true  // required for cross-origin httpOnly cookies
}));

// ── Cookie parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Body parsers (with size limits to prevent payload attacks) ────────────────
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ── NoSQL injection sanitization (Express 5 compatible — body only) ───────────
// Strips MongoDB operator keys (e.g. { "$gt": "" }) from req.body recursively.
// Express 5 makes req.query/params read-only, so we only sanitize req.body here.
function sanitizeMongoose(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMongoose);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !key.startsWith("$"))
      .map(([k, v]) => [k, sanitizeMongoose(v)])
  );
}

app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeMongoose(req.body);
  }
  next();
});

// ── SSE — mounted BEFORE the global rate limiter (long-lived streaming endpoint) ──
const sseRoutes = require("./routes/sseRoutes");
app.use("/api/sse", sseRoutes);

// ── Global rate limit (all /api/* routes except /api/sse) ─────────────────────
// Disabled in test environment to avoid interfering with rapid test requests
if (process.env.NODE_ENV !== "test") {
  app.use("/api", generalLimiter);
}

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes        = require("./routes/authRoutes");
const roadmapRoutes     = require("./routes/roadmapRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const userRoutes        = require("./routes/userRoutes");
const healthRoutes      = require("./routes/healthRoutes");
const resumeRoutes      = require("./routes/resumeRoutes");
const comparisonRoutes  = require("./routes/comparisonRoutes");
const newRoadmapRoutes  = require("./routes/newRoadmapRoutes");
const analyticsRoutes       = require("./routes/analyticsRoutes");
const reportRoutes          = require("./routes/reportRoutes");
const notificationsRoutes   = require("./routes/notificationsRoutes");
const jobApplicationRoutes  = require("./routes/jobApplicationRoutes");

app.use("/api",            healthRoutes);

// Auth: strict rate limit in non-test envs
if (process.env.NODE_ENV !== "test") {
  app.use("/api/auth",     authLimiter, authRoutes);
} else {
  app.use("/api/auth",     authRoutes);
}

app.use("/api/resumes",    resumeRoutes);
app.use("/api/comparisons", comparisonRoutes);
app.use("/api/roadmaps-new", newRoadmapRoutes);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api/reports",        reportRoutes);
app.use("/api/notifications",  notificationsRoutes);
app.use("/api/job-applications", jobApplicationRoutes);
app.use("/api/roadmap",        roadmapRoutes);
app.use("/api/roadmaps",   roadmapRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/users",      userRoutes);

app.get("/", (req, res) => res.send("Backend running"));

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
