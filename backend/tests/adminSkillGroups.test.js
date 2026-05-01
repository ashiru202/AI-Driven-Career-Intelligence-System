process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockAdminUser, mockUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/Resume");
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
const app = require("../src/app");

const ADMIN_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "ADMIN" });
const USER_TOKEN = makeToken({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "USER" });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

function mockResumeFind(resumes) {
  Resume.find = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(resumes),
          }),
          lean: jest.fn().mockResolvedValue(resumes),
        }),
      }),
    }),
  });
}

describe("GET /api/admin/resumes/skill-groups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires admin role", async () => {
    setupAuth(mockUser());

    const res = await request(app)
      .get("/api/admin/resumes/skill-groups")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it("returns grouped resumes with candidate level counts", async () => {
    setupAuth(mockAdminUser());

    Resume.aggregate = jest.fn().mockResolvedValue([
      {
        _id: "signature-a",
        resumeIds: ["111111111111111111111111", "222222222222222222222222"],
        resumeCount: 2,
        normalizedSkills: ["javascript", "react"],
        latestCreatedAt: new Date("2026-05-01T10:00:00Z"),
      },
    ]);

    mockResumeFind([
      {
        _id: "111111111111111111111111",
        fileName: "intern.pdf",
        createdAt: new Date("2026-05-01T09:00:00Z"),
        skillsSignature: "signature-a",
        normalizedSkills: ["javascript", "react"],
        candidateLevel: "INTERN",
        candidateLevelSource: "heuristic",
        user: {
          _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
          name: "Intern User",
          email: "intern@example.com",
          careerLevel: "UNKNOWN",
          yearsExperience: null,
        },
      },
      {
        _id: "222222222222222222222222",
        fileName: "professional.pdf",
        createdAt: new Date("2026-05-01T10:00:00Z"),
        skillsSignature: "signature-a",
        normalizedSkills: ["javascript", "react"],
        candidateLevel: "PROFESSIONAL",
        candidateLevelSource: "heuristic",
        user: {
          _id: "cccccccccccccccccccccccc",
          name: "Professional User",
          email: "pro@example.com",
          careerLevel: "UNKNOWN",
          yearsExperience: null,
        },
      },
    ]);

    const res = await request(app)
      .get("/api/admin/resumes/skill-groups?minGroupSize=2&minSkills=1&limit=10")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.groups).toHaveLength(1);
    expect(res.body.data.groups[0].candidateLevels).toEqual({
      INTERN: 1,
      PROFESSIONAL: 1,
      UNKNOWN: 0,
    });
    expect(res.body.data.groups[0].resumes).toHaveLength(2);
  });
});

describe("GET /api/admin/resumes/by-skill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes skill query before searching", async () => {
    setupAuth(mockAdminUser());
    mockResumeFind([]);

    const res = await request(app)
      .get("/api/admin/resumes/by-skill?skill=ReactJS")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.skill).toBe("react");
    expect(Resume.find).toHaveBeenCalledWith({ normalizedSkills: "react" });
  });

  it("requires a skill query", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .get("/api/admin/resumes/by-skill")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_SKILL");
  });
});

describe("PATCH /api/admin/resumes/:resumeId/candidate-level", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates candidate level as a manual override", async () => {
    setupAuth(mockAdminUser());

    const resumeDoc = {
      _id: "111111111111111111111111",
      fileName: "resume.pdf",
      createdAt: new Date("2026-05-01T10:00:00Z"),
      normalizedSkills: ["react"],
      candidateLevel: "UNKNOWN",
      candidateLevelSource: "heuristic",
      user: {
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Candidate",
        email: "candidate@example.com",
      },
      save: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          _id: this._id,
          fileName: this.fileName,
          createdAt: this.createdAt,
          normalizedSkills: this.normalizedSkills,
          candidateLevel: this.candidateLevel,
          candidateLevelSource: this.candidateLevelSource,
          user: this.user,
        };
      },
    };

    Resume.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(resumeDoc),
    });

    const res = await request(app)
      .patch("/api/admin/resumes/111111111111111111111111/candidate-level")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ candidateLevel: "INTERN" });

    expect(res.status).toBe(200);
    expect(res.body.data.resume.candidateLevel).toBe("INTERN");
    expect(res.body.data.resume.candidateLevelSource).toBe("manual");
    expect(resumeDoc.save).toHaveBeenCalled();
  });

  it("rejects invalid candidate level", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .patch("/api/admin/resumes/111111111111111111111111/candidate-level")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ candidateLevel: "BEGINNER" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CANDIDATE_LEVEL");
  });
});
