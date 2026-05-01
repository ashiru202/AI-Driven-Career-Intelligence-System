process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockAdminUser, mockUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/Resume");
jest.mock("../src/models/SkillSnapshot");
jest.mock("../src/services/analyticsService", () => ({
  getSkillDemandStats: jest.fn(),
  getCommonGaps: jest.fn(),
}));
jest.mock("../src/utils/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendStaffInviteEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/auditLogService", () => ({
  logActivity: jest.fn(),
  logActivityWithActor: jest.fn(),
}));

const User = require("../src/models/User");
const Resume = require("../src/models/Resume");
const SkillSnapshot = require("../src/models/SkillSnapshot");
const analyticsService = require("../src/services/analyticsService");
const app = require("../src/app");

const ADMIN_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "ADMIN" });
const USER_TOKEN = makeToken({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "USER" });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

function queryResolving(value) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
}

describe("GET /api/admin/skills/supply-vs-demand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires admin role", async () => {
    setupAuth(mockUser());

    const res = await request(app)
      .get("/api/admin/skills/supply-vs-demand")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it("returns platform demand rows enriched with weekly resume and user counts", async () => {
    setupAuth(mockAdminUser());
    analyticsService.getSkillDemandStats.mockResolvedValue({
      top: [
        { skill: "ReactJS", count: 8 },
        { skill: "Node", count: 6 },
      ],
      least: [
        { skill: "COBOL", count: 1 },
      ],
    });
    Resume.aggregate = jest.fn().mockResolvedValue([
      { skill: "react", resumeCount: 3, userCount: 2 },
      { skill: "node.js", resumeCount: 1, userCount: 1 },
    ]);

    const res = await request(app)
      .get("/api/admin/skills/supply-vs-demand?source=platform&period=weekly&limit=2")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.source).toBe("platform");
    expect(res.body.data.period).toBe("weekly");
    expect(res.body.data.top).toEqual([
      expect.objectContaining({
        skill: "react",
        displaySkill: "ReactJS",
        demandRank: 1,
        demandMetric: 8,
        resumeCount: 3,
        userCount: 2,
        demandGroup: "top",
      }),
      expect.objectContaining({
        skill: "node.js",
        displaySkill: "Node",
        demandRank: 2,
        demandMetric: 6,
        resumeCount: 1,
        userCount: 1,
        demandGroup: "top",
      }),
    ]);
    expect(res.body.data.least[0]).toEqual(expect.objectContaining({
      skill: "cobol",
      resumeCount: 0,
      userCount: 0,
      demandGroup: "least",
    }));
    expect(Resume.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({
          normalizedSkills: { $in: ["react", "node.js", "cobol"] },
        }),
      }),
    ]));
  });

  it("can use latest industry snapshots as the demand source", async () => {
    setupAuth(mockAdminUser());
    const latestSnapshot = {
      skill: "python",
      periodStart: new Date("2026-04-20T00:00:00Z"),
      periodEnd: new Date("2026-04-27T00:00:00Z"),
      marketScope: "combined",
    };

    SkillSnapshot.findOne = jest.fn().mockReturnValue(queryResolving(latestSnapshot));
    SkillSnapshot.find = jest
      .fn()
      .mockReturnValueOnce(queryResolving([
        { skill: "Python", count: 20, totalJobs: 100, relativeFreq: 0.2, marketScope: "combined" },
      ]))
      .mockReturnValueOnce(queryResolving([
        { skill: "Perl", count: 1, totalJobs: 100, relativeFreq: 0.01, marketScope: "combined" },
      ]));
    Resume.aggregate = jest.fn().mockResolvedValue([
      { skill: "python", resumeCount: 5, userCount: 4 },
    ]);

    const res = await request(app)
      .get("/api/admin/skills/supply-vs-demand?source=industry&period=monthly&marketScope=combined&limit=1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("industry");
    expect(res.body.data.period).toBe("monthly");
    expect(res.body.data.demandPeriod.startDate).toBe("2026-04-20T00:00:00.000Z");
    expect(res.body.data.top[0]).toEqual(expect.objectContaining({
      skill: "python",
      demandMetric: 0.2,
      resumeCount: 5,
      userCount: 4,
    }));
    expect(res.body.data.least[0]).toEqual(expect.objectContaining({
      skill: "perl",
      demandMetric: 0.01,
      resumeCount: 0,
      userCount: 0,
    }));
  });
});

describe("GET /api/admin/skills/alignment-timeseries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns rolling CV alignment buckets for current platform top skills", async () => {
    setupAuth(mockAdminUser());
    analyticsService.getSkillDemandStats.mockResolvedValue({
      top: [
        { skill: "ReactJS", count: 8 },
        { skill: "Node", count: 6 },
      ],
      least: [],
    });
    Resume.aggregate = jest.fn().mockResolvedValue([
      { createdAt: new Date(), matchedTopSkills: ["react", "node.js"] },
      { createdAt: new Date(), matchedTopSkills: [] },
    ]);

    const res = await request(app)
      .get("/api/admin/skills/alignment-timeseries?source=platform&period=weekly&limit=2&lookback=3")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.source).toBe("platform");
    expect(res.body.data.period).toBe("weekly");
    expect(res.body.data.dataPoints).toHaveLength(3);
    expect(res.body.data.topSkills.map((row) => row.skill)).toEqual(["react", "node.js"]);
    expect(res.body.data.latest).toEqual(expect.objectContaining({
      cvUploads: 2,
      cvWithTopSkills: 1,
      alignmentRate: 0.5,
      avgTopSkillsPerCV: 1,
    }));
    expect(Resume.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        $project: expect.objectContaining({
          matchedTopSkills: { $setIntersection: [{ $ifNull: ["$normalizedSkills", []] }, ["react", "node.js"]] },
        }),
      }),
    ]));
  });

  it("returns current industry top skills with monthly alignment data", async () => {
    setupAuth(mockAdminUser());
    const latestSnapshot = {
      skill: "python",
      periodStart: new Date("2026-04-20T00:00:00Z"),
      periodEnd: new Date("2026-04-27T00:00:00Z"),
      marketScope: "combined",
    };

    SkillSnapshot.findOne = jest.fn().mockReturnValue(queryResolving(latestSnapshot));
    SkillSnapshot.find = jest
      .fn()
      .mockReturnValueOnce(queryResolving([
        { skill: "Python", count: 20, totalJobs: 100, relativeFreq: 0.2, marketScope: "combined" },
      ]))
      .mockReturnValueOnce(queryResolving([
        { skill: "Perl", count: 1, totalJobs: 100, relativeFreq: 0.01, marketScope: "combined" },
      ]));
    Resume.aggregate = jest.fn().mockResolvedValue([
      { createdAt: new Date(), matchedTopSkills: ["python"] },
    ]);

    const res = await request(app)
      .get("/api/admin/skills/alignment-timeseries?source=industry&period=monthly&marketScope=combined&limit=1&lookback=2")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("industry");
    expect(res.body.data.period).toBe("monthly");
    expect(res.body.data.demandPeriod.startDate).toBe("2026-04-20T00:00:00.000Z");
    expect(res.body.data.topSkills).toEqual([
      expect.objectContaining({
        skill: "python",
        demandMetric: 0.2,
      }),
    ]);
    expect(res.body.data.latest).toEqual(expect.objectContaining({
      cvUploads: 1,
      cvWithTopSkills: 1,
      alignmentRate: 1,
      avgTopSkillsPerCV: 1,
    }));
  });
});
