const axios = require("axios");
const SkillForecast = require("../models/SkillForecast");
const SkillSnapshot = require("../models/SkillSnapshot");
const JobPosting    = require("../models/JobPosting");
const { successResponse } = require("../utils/responseHelper");
const AppError             = require("../utils/AppError");
const { asyncHandler }     = require("../middleware/errorMiddleware");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const NLP_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";
const VALID_MARKET_SCOPES = new Set(["combined", "global", "local-lk"]);
const RISING_SLOPE_THRESHOLD = 0.001;
const FALLING_SLOPE_THRESHOLD = -0.001;
const FALLBACK_POINT_LIMIT = 12;

function normalizeMarketScope(scope) {
  if (!scope) return "combined";
  const value = String(scope).trim();
  return VALID_MARKET_SCOPES.has(value) ? value : "combined";
}

function getInternalToken() {
  const token = (process.env.NLP_INTERNAL_TOKEN || process.env.INTERNAL_TOKEN || "").trim();
  if (!token || token.toLowerCase() === "changeme") {
    throw new Error(
      "NLP_INTERNAL_TOKEN (or INTERNAL_TOKEN) must be set to a non-default shared secret"
    );
  }
  return token;
}

const INTERNAL_TOKEN = getInternalToken();

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

function linearRegressionSlope(values) {
  const n = values.length;
  if (n < 2) return 0;

  const sumX = (n * (n - 1)) / 2;
  const sumXX = ((n - 1) * n * ((2 * n) - 1)) / 6;
  const sumY = values.reduce((acc, y) => acc + y, 0);
  const sumXY = values.reduce((acc, y, x) => acc + (x * y), 0);
  const denominator = (n * sumXX) - (sumX * sumX);

  if (denominator === 0) return 0;
  return ((n * sumXY) - (sumX * sumY)) / denominator;
}

function classifyDirectionBySlope(slope) {
  if (slope > RISING_SLOPE_THRESHOLD) return "rising";
  if (slope < FALLING_SLOPE_THRESHOLD) return "falling";
  return "stable";
}

async function buildSnapshotTrendFallback({ marketScope, direction, limit, skip = 0, search = "" }) {
  const grouped = await SkillSnapshot.aggregate([
    { $match: { marketScope } },
    { $sort: { skill: 1, periodStart: -1 } },
    {
      $group: {
        _id: "$skill",
        latestSnapshot: { $first: "$$ROOT" },
        points: {
          $push: {
            periodStart: "$periodStart",
            relativeFreq: "$relativeFreq",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        skill: "$_id",
        latestSnapshot: 1,
        points: { $slice: ["$points", FALLBACK_POINT_LIMIT] },
      },
    },
  ]);

  const normalizedSearch = String(search || "").toLowerCase().trim();

  let skills = grouped
    .map((row) => {
      const points = (row.points || []).slice().reverse();
      const frequencies = points.map((pt) => Number(pt.relativeFreq) || 0);
      const trendSlope = linearRegressionSlope(frequencies);
      const trendDirection = classifyDirectionBySlope(trendSlope);

      const sparklinePoints = points.slice(-6).map((pt) => ({
        periodStart: pt.periodStart,
        predictedFreq: Number(pt.relativeFreq) || 0,
        lowerBound: Number(pt.relativeFreq) || 0,
        upperBound: Number(pt.relativeFreq) || 0,
      }));

      return {
        skill: row.skill,
        marketScope,
        trendDirection,
        trendSlope,
        trendConfidence: 0,
        dataPointsUsed: points.length,
        modelUsed: "snapshot-linear-fallback",
        generatedAt: null,
        forecastPoints: sparklinePoints,
        latestSnapshot: row.latestSnapshot || null,
      };
    })
    .filter((item) => item.dataPointsUsed >= 2);

  if (normalizedSearch) {
    skills = skills.filter((item) => item.skill.includes(normalizedSearch));
  }

  if (direction && ["rising", "falling", "stable"].includes(direction)) {
    skills = skills.filter((item) => item.trendDirection === direction);
  }

  skills.sort((a, b) => {
    if ((direction || "") === "falling") {
      return a.trendSlope - b.trendSlope;
    }
    return b.trendSlope - a.trendSlope;
  });

  return {
    total: skills.length,
    skills: skills.slice(skip, skip + limit),
  };
}

// ── User-facing handlers ──────────────────────────────────────────────────────

/**
 * GET /api/trends/skills
 * Query: ?direction=rising|falling|stable&search=&marketScope=combined|global|local-lk&page=1&limit=20
 */
const getSkillsList = asyncHandler(async (req, res) => {
  const { direction, search } = req.query;
  const marketScope = normalizeMarketScope(req.query.marketScope);
  const { page, limit, skip } = parsePagination(req.query, 20);

  const filter = { marketScope };
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

  if (total === 0) {
    const fallback = await buildSnapshotTrendFallback({
      marketScope,
      direction,
      limit,
      skip,
      search,
    });

    return res.json(successResponse({
      skills: fallback.skills,
      pagination: paginationMeta(fallback.total, page, limit),
    }));
  }

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
  const marketScope = normalizeMarketScope(req.query.marketScope);

  const [forecast, history] = await Promise.all([
    SkillForecast.findOne({ skill, marketScope }).lean(),
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
  const marketScope = normalizeMarketScope(req.query.marketScope);

  const forecasts = await SkillForecast.find({ marketScope, trendDirection: "rising" })
    .sort({ trendSlope: -1 })
    .limit(limit)
    .lean();

  if (forecasts.length === 0) {
    const fallback = await buildSnapshotTrendFallback({
      marketScope,
      direction: "rising",
      limit,
    });
    return res.json(successResponse({ skills: fallback.skills }));
  }

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
  const marketScope = normalizeMarketScope(req.query.marketScope);

  const forecasts = await SkillForecast.find({ marketScope, trendDirection: "falling" })
    .sort({ trendSlope: 1 })
    .limit(limit)
    .lean();

  if (forecasts.length === 0) {
    const fallback = await buildSnapshotTrendFallback({
      marketScope,
      direction: "falling",
      limit,
    });
    return res.json(successResponse({ skills: fallback.skills }));
  }

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
  const marketScope = normalizeMarketScope(req.query.marketScope);
  const jobFilter = marketScope === "combined" ? {} : { marketScope };
  const snapshotFilter = { marketScope };
  const forecastFilter = { marketScope };

  const [
    totalJobsIndexed,
    skillsTracked,
    forecastsGenerated,
    lastJob,
    lastForecast,
    allPeriodStarts,
  ] = await Promise.all([
    JobPosting.countDocuments(jobFilter),
    SkillSnapshot.distinct("skill", snapshotFilter).then(a => a.length),
    SkillForecast.countDocuments(forecastFilter),
    JobPosting.findOne(jobFilter).sort({ scrapedAt: -1 }).select("scrapedAt").lean(),
    SkillForecast.findOne(forecastFilter).sort({ generatedAt: -1 }).select("generatedAt").lean(),
    SkillSnapshot.distinct("periodStart", snapshotFilter),
  ]);

  res.json(successResponse({
    marketScope,
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
