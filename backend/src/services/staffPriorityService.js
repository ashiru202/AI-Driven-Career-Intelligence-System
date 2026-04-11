const User = require("../models/User");
const Resume = require("../models/Resume");
const Roadmap = require("../models/Roadmap");
const Comparison = require("../models/Comparison");
const StaffCase = require("../models/StaffCase");
const analyticsService = require("./analyticsService");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const AppError = require("../utils/AppError");

function daysSince(dateLike) {
  if (!dateLike) return 999;
  const diffMs = Date.now() - new Date(dateLike).getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function getRoadmapProgress(roadmap) {
  if (!roadmap || !Array.isArray(roadmap.skillsToLearn) || roadmap.skillsToLearn.length === 0) {
    return 0;
  }
  const total = roadmap.skillsToLearn.length;
  const completed = roadmap.skillsToLearn.filter((s) => s.status === "COMPLETED").length;
  return Math.round((completed / total) * 100);
}

function computePriorityScore({ cvScore, roadmapProgress, gapCount, inactiveDays, hasRoadmap }) {
  let score = 0;
  const reasons = [];

  if (cvScore < 45) {
    score += 40;
    reasons.push("Low CV score");
  } else if (cvScore < 60) {
    score += 28;
    reasons.push("CV quality needs improvement");
  } else if (cvScore < 75) {
    score += 18;
  } else {
    score += 6;
  }

  if (!hasRoadmap || roadmapProgress === 0) {
    score += 30;
    reasons.push("No roadmap progress");
  } else if (roadmapProgress < 40) {
    score += 20;
  } else if (roadmapProgress < 70) {
    score += 10;
  } else {
    score += 2;
  }

  if (inactiveDays >= 30) {
    score += 20;
    reasons.push("Inactive for 30+ days");
  } else if (inactiveDays >= 14) {
    score += 14;
    reasons.push("Inactive for 14+ days");
  } else {
    score += 4;
  }

  if (gapCount >= 10) {
    score += 20;
    reasons.push("High skill-gap count");
  } else if (gapCount >= 6) {
    score += 14;
    reasons.push("Moderate skill-gap count");
  } else if (gapCount >= 3) {
    score += 8;
  } else if (gapCount > 0) {
    score += 4;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

async function buildQueueItemForUser(user, existingCase) {
  const [latestRoadmap, latestResume, latestComparison] = await Promise.all([
    Roadmap.findOne({ user: user._id })
      .select("skillsToLearn missingSkills createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Resume.findOne({ user: user._id })
      .select("_id createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Comparison.findOne({ user: user._id })
      .select("createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  let cvScore = 0;
  try {
    const cv = await analyticsService.getCVCompleteness(
      String(user._id),
      latestResume?._id ? String(latestResume._id) : null
    );
    cvScore = Number(cv?.score || 0);
  } catch {
    cvScore = 0;
  }

  const roadmapProgress = getRoadmapProgress(latestRoadmap);
  const gapCount = Array.isArray(latestRoadmap?.missingSkills) ? latestRoadmap.missingSkills.length : 0;
  const lastActivityAt = [
    user.createdAt,
    latestRoadmap?.createdAt,
    latestResume?.createdAt,
    latestComparison?.createdAt,
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || user.createdAt;
  const inactiveDays = daysSince(lastActivityAt);

  const computed = computePriorityScore({
    cvScore,
    roadmapProgress,
    gapCount,
    inactiveDays,
    hasRoadmap: Boolean(latestRoadmap),
  });

  const manualPriority = existingCase?.manualPriority ?? null;
  const effectivePriority = manualPriority === null || manualPriority === undefined
    ? computed.score
    : Number(manualPriority);

  const caseDoc = await StaffCase.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      computedPriority: computed.score,
      manualPriority,
      effectivePriority,
      reasons: computed.reasons,
      factors: {
        cvScore,
        roadmapProgress,
        gapCount,
        inactiveDays,
        hasRoadmap: Boolean(latestRoadmap),
        lastActivityAt,
      },
      lastScoredAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    _id: String(caseDoc._id),
    user: {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      active: Boolean(user.active),
      createdAt: user.createdAt,
    },
    computedPriority: caseDoc.computedPriority,
    manualPriority: caseDoc.manualPriority,
    effectivePriority: caseDoc.effectivePriority,
    reasons: caseDoc.reasons || [],
    factors: caseDoc.factors || {},
    updatedAt: caseDoc.updatedAt,
  };
}

async function buildPriorityQueue({ search = "", page = 1, limit = 20 } = {}) {
  const query = { role: "USER" };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("name email active createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!users.length) {
    const { page: p, limit: l } = parsePagination({ page, limit }, 20);
    return { items: [], pagination: paginationMeta(0, p, l) };
  }

  const caseDocs = await StaffCase.find({ user: { $in: users.map((u) => u._id) } })
    .select("user manualPriority")
    .lean();
  const caseMap = new Map(caseDocs.map((c) => [String(c.user), c]));

  const items = await Promise.all(
    users.map((user) => buildQueueItemForUser(user, caseMap.get(String(user._id))))
  );

  const sorted = items.sort((a, b) => {
    if (b.effectivePriority !== a.effectivePriority) {
      return b.effectivePriority - a.effectivePriority;
    }
    return new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime();
  });

  const { page: p, limit: l, skip } = parsePagination({ page, limit }, 20);
  const pagedItems = sorted.slice(skip, skip + l);

  return {
    items: pagedItems,
    pagination: paginationMeta(sorted.length, p, l),
  };
}

async function setManualPriority({ userId, manualPriority }) {
  const user = await User.findOne({ _id: userId, role: "USER" })
    .select("name email active createdAt")
    .lean();

  if (!user) {
    throw AppError.notFound("User not found");
  }

  const existing = await StaffCase.findOneAndUpdate(
    { user: userId },
    { user: userId, manualPriority },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return buildQueueItemForUser(user, existing);
}

module.exports = {
  buildPriorityQueue,
  setManualPriority,
};
