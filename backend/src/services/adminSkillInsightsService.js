const Resume = require("../models/Resume");
const SkillSnapshot = require("../models/SkillSnapshot");
const analyticsService = require("./analyticsService");
const { normalizeSkill } = require("../utils/skillNormalizer");

const VALID_SOURCES = new Set(["platform", "industry"]);
const VALID_PERIODS = new Set(["weekly", "monthly"]);
const VALID_MARKET_SCOPES = new Set(["global", "local-lk", "combined"]);

function readSource(value) {
  const source = String(value || "platform").toLowerCase();
  return VALID_SOURCES.has(source) ? source : "platform";
}

function readPeriod(value) {
  const period = String(value || "weekly").toLowerCase();
  return VALID_PERIODS.has(period) ? period : "weekly";
}

function readMarketScope(value) {
  const marketScope = String(value || "combined").toLowerCase();
  return VALID_MARKET_SCOPES.has(marketScope) ? marketScope : "combined";
}

function readLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 50);
}

function getPeriodWindow(period, now = new Date()) {
  const endDate = new Date(now);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (period === "monthly" ? 30 : 7));
  return { startDate, endDate };
}

function normalizeDemandRows(rows, metricKey) {
  return (rows || [])
    .map((row) => {
      const skill = normalizeSkill(row.skill);
      if (!skill) return null;
      return {
        skill,
        displaySkill: row.skill,
        demandMetric: Number(row[metricKey] || 0),
        demandCount: Number(row.count || 0),
        totalJobs: row.totalJobs ?? null,
        relativeFreq: row.relativeFreq ?? null,
        marketScope: row.marketScope,
        sources: row.sources || [],
      };
    })
    .filter(Boolean);
}

async function getIndustryDemand({ marketScope, limit }) {
  const latestSnapshot = await SkillSnapshot.findOne({ marketScope })
    .sort({ periodStart: -1 })
    .lean();

  if (!latestSnapshot) {
    return {
      periodStart: null,
      periodEnd: null,
      top: [],
      least: [],
    };
  }

  const snapshotFilter = {
    marketScope,
    periodStart: latestSnapshot.periodStart,
  };

  const [top, least] = await Promise.all([
    SkillSnapshot.find(snapshotFilter)
      .sort({ relativeFreq: -1, count: -1, skill: 1 })
      .limit(limit)
      .lean(),
    SkillSnapshot.find(snapshotFilter)
      .sort({ relativeFreq: 1, count: 1, skill: 1 })
      .limit(limit)
      .lean(),
  ]);

  return {
    periodStart: latestSnapshot.periodStart,
    periodEnd: latestSnapshot.periodEnd,
    top: normalizeDemandRows(top, "relativeFreq"),
    least: normalizeDemandRows(least, "relativeFreq"),
  };
}

async function getPlatformDemand({ limit }) {
  const demand = await analyticsService.getSkillDemandStats();
  return {
    periodStart: null,
    periodEnd: null,
    top: normalizeDemandRows((demand.top || []).slice(0, limit), "count"),
    least: normalizeDemandRows((demand.least || []).slice(0, limit), "count"),
  };
}

async function getSupplyCounts(skills, { startDate, endDate }) {
  const normalizedSkills = [...new Set(skills.map(normalizeSkill).filter(Boolean))];
  if (normalizedSkills.length === 0) return new Map();

  const rows = await Resume.aggregate([
    {
      $match: {
        normalizedSkills: { $in: normalizedSkills },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        user: 1,
        matchedSkills: { $setIntersection: ["$normalizedSkills", normalizedSkills] },
      },
    },
    { $unwind: "$matchedSkills" },
    {
      $group: {
        _id: "$matchedSkills",
        resumeCount: { $sum: 1 },
        userIds: { $addToSet: "$user" },
      },
    },
    {
      $project: {
        _id: 0,
        skill: "$_id",
        resumeCount: 1,
        userCount: { $size: "$userIds" },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      row.skill,
      {
        resumeCount: Number(row.resumeCount || 0),
        userCount: Number(row.userCount || 0),
      },
    ])
  );
}

function attachSupply(rows, supplyCounts, group) {
  return rows.map((row, index) => {
    const supply = supplyCounts.get(row.skill) || { resumeCount: 0, userCount: 0 };
    return {
      ...row,
      demandGroup: group,
      demandRank: index + 1,
      resumeCount: supply.resumeCount,
      userCount: supply.userCount,
    };
  });
}

async function getSupplyVsDemand(options = {}) {
  const source = readSource(options.source);
  const period = readPeriod(options.period);
  const marketScope = readMarketScope(options.marketScope);
  const limit = readLimit(options.limit);
  const { startDate, endDate } = getPeriodWindow(period);

  const demand = source === "industry"
    ? await getIndustryDemand({ marketScope, limit })
    : await getPlatformDemand({ limit });

  const demandSkills = [...demand.top, ...demand.least].map((row) => row.skill);
  const supplyCounts = await getSupplyCounts(demandSkills, { startDate, endDate });

  const top = attachSupply(demand.top, supplyCounts, "top");
  const least = attachSupply(demand.least, supplyCounts, "least");

  return {
    source,
    period,
    marketScope,
    limit,
    supplyWindow: {
      startDate,
      endDate,
    },
    demandPeriod: {
      startDate: demand.periodStart,
      endDate: demand.periodEnd,
    },
    top,
    least,
    rows: [...top, ...least],
  };
}

module.exports = {
  getSupplyVsDemand,
  getPeriodWindow,
};
