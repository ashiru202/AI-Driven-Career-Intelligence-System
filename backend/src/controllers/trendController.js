const axios = require("axios");
const SkillForecast = require("../models/SkillForecast");
const SkillSnapshot = require("../models/SkillSnapshot");
const JobPosting    = require("../models/JobPosting");
const { successResponse } = require("../utils/responseHelper");
const AppError             = require("../utils/AppError");
const { asyncHandler }     = require("../middleware/errorMiddleware");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const NLP_URL        = process.env.NLP_SERVICE_URL      || "http://localhost:8000";
const INTERNAL_TOKEN = process.env.NLP_INTERNAL_TOKEN   || "changeme";

// ── Shared helper: latest snapshot per skill ──────────────────────────────────

async function latestSnapshotMap(skills, marketScope) {
  const docs = await SkillSnapshot.aggregate([
    { $match: { skill: { $in: skills }, marketScope } },
    { $sort:  { periodStart: -1 } },
    { $group: { _id: "$skill", doc: { $first: "$$ROOT" } } },
  ]);
  const map = {};
  docs.forEach(({ _id, doc }) => { map[_id] = doc; });
  return map;
}

// ── User-facing handlers ──────────────────────────────────────────────────────

/**
 * GET /api/trends/skills
 * Query: ?direction=rising|falling|stable&search=&marketScope=combined|global|local-lk&page=1&limit=20
 */
const getSkillsList = asyncHandler(async (req, res) => {
  const { direction, search, marketScope = "combined" } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 20);

  const filter = {};
  if (direction && ["rising", "falling", "stable"].includes(direction)) {
    filter.trendDirection = direction;
  }
  if (search) {
    filter.skill = { $regex: search.toLowerCase().trim(), $options: "i" };
  }

  const sort = direction === "falling" ? { trendSlope: 1 } : { trendSlope: -1 };

  const [forecasts, total] = await Promise.all([
    SkillForecast.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    SkillForecast.countDocuments(filter),
  ]);

  const snapshotMap = await latestSnapshotMap(
    forecasts.map(f => f.skill),
    marketScope
  );

  const skills = forecasts.map(f => ({
    skill:           f.skill,
    trendDirection:  f.trendDirection,
    trendSlope:      f.trendSlope,
    trendConfidence: f.trendConfidence,
    dataPointsUsed:  f.dataPointsUsed,
    modelUsed:       f.modelUsed,
    generatedAt:     f.generatedAt,
    forecastPoints:  f.forecastPoints,
    latestSnapshot:  snapshotMap[f.skill] || null,
  }));

  res.json(successResponse({ skills, pagination: paginationMeta(total, page, limit) }));
});

/**
 * GET /api/trends/skills/:skill
 * Query: ?marketScope=combined|global|local-lk
 */
const getSkillDetail = asyncHandler(async (req, res) => {
  const skill       = decodeURIComponent(req.params.skill).toLowerCase().trim();
  const marketScope = req.query.marketScope || "combined";

  const [forecast, history] = await Promise.all([
    SkillForecast.findOne({ skill }).lean(),
    SkillSnapshot.find({ skill, marketScope }).sort({ periodStart: 1 }).lean(),
  ]);

  if (!forecast && history.length === 0) {
    throw AppError.notFound(`No trend data found for skill: ${skill}`);
  }

  res.json(successResponse({
    skill,
    marketScope,
    forecast:        forecast || null,
    forecastPending: !forecast,
    history,
  }));
});

/**
 * GET /api/trends/rising
 * Query: ?limit=10&marketScope=combined
 */
const getRisingSkills = asyncHandler(async (req, res) => {
  const limit       = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const marketScope = req.query.marketScope || "combined";

  const forecasts = await SkillForecast.find({ trendDirection: "rising" })
    .sort({ trendSlope: -1 })
    .limit(limit)
    .lean();

  const snapshotMap = await latestSnapshotMap(
    forecasts.map(f => f.skill),
    marketScope
  );

  const skills = forecasts.map(f => ({ ...f, latestSnapshot: snapshotMap[f.skill] || null }));
  res.json(successResponse({ skills }));
});

/**
 * GET /api/trends/falling
 * Query: ?limit=10&marketScope=combined
 */
const getFallingSkills = asyncHandler(async (req, res) => {
  const limit       = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const marketScope = req.query.marketScope || "combined";

  const forecasts = await SkillForecast.find({ trendDirection: "falling" })
    .sort({ trendSlope: 1 })
    .limit(limit)
    .lean();

  const snapshotMap = await latestSnapshotMap(
    forecasts.map(f => f.skill),
    marketScope
  );

  const skills = forecasts.map(f => ({ ...f, latestSnapshot: snapshotMap[f.skill] || null }));
  res.json(successResponse({ skills }));
});

/**
 * GET /api/trends/snapshot-summary
 */
const getSnapshotSummary = asyncHandler(async (req, res) => {
  const [
    totalJobsIndexed,
    skillsTracked,
    forecastsGenerated,
    lastJob,
    lastForecast,
    allPeriodStarts,
  ] = await Promise.all([
    JobPosting.countDocuments(),
    SkillSnapshot.distinct("skill").then(a => a.length),
    SkillForecast.countDocuments(),
    JobPosting.findOne().sort({ scrapedAt: -1 }).select("scrapedAt").lean(),
    SkillForecast.findOne().sort({ generatedAt: -1 }).select("generatedAt").lean(),
    SkillSnapshot.distinct("periodStart"),
  ]);

  res.json(successResponse({
    lastScrapedAt:     lastJob?.scrapedAt      || null,
    totalJobsIndexed,
    skillsTracked,
    weeksCovered:      allPeriodStarts.length,
    forecastsGenerated,
    lastForecastAt:    lastForecast?.generatedAt || null,
  }));
});

// ── Admin-only handlers ───────────────────────────────────────────────────────

/**
 * POST /api/admin/trends/trigger-scrape
 * Kicks off scrape + process cycle on the NLP service.
 */
const triggerScrape = asyncHandler(async (req, res) => {
  const response = await axios.post(
    `${NLP_URL}/internal/trigger-scrape`,
    {},
    { headers: { "X-Internal-Token": INTERNAL_TOKEN }, timeout: 120_000 }
  );
  res.json(successResponse(response.data, "Scrape job triggered"));
});

/**
 * POST /api/admin/trends/trigger-forecast
 * Refreshes all skill forecasts on the NLP service.
 */
const triggerForecast = asyncHandler(async (req, res) => {
  const response = await axios.post(
    `${NLP_URL}/internal/trigger-forecast`,
    {},
    { headers: { "X-Internal-Token": INTERNAL_TOKEN }, timeout: 120_000 }
  );
  res.json(successResponse(response.data, "Forecast refresh triggered"));
});

/**
 * GET /api/admin/trends/scrape-status
 * Returns live DB counts and last run timestamps from the NLP service.
 */
const getScrapeStatus = asyncHandler(async (req, res) => {
  const response = await axios.get(
    `${NLP_URL}/internal/scrape-status`,
    { headers: { "X-Internal-Token": INTERNAL_TOKEN }, timeout: 10_000 }
  );
  res.json(successResponse(response.data));
});

module.exports = {
  getSkillsList,
  getSkillDetail,
  getRisingSkills,
  getFallingSkills,
  getSnapshotSummary,
  triggerScrape,
  triggerForecast,
  getScrapeStatus,
};
