process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockUser, mockStaffUser, mockAdminUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/services/staffPriorityService");

const User = require("../src/models/User");
const staffPriorityService = require("../src/services/staffPriorityService");
const app = require("../src/app");

const USER_TOKEN = makeToken({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "USER" });
const STAFF_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "STAFF" });
const ADMIN_TOKEN = makeToken({ id: "cccccccccccccccccccccccc", role: "ADMIN" });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

describe("Staff Priority Queue API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/staff/priority-queue returns 401 without token", async () => {
    const res = await request(app).get("/api/staff/priority-queue");
    expect(res.status).toBe(401);
  });

  it("GET /api/staff/priority-queue returns 403 for USER role", async () => {
    setupAuth(mockUser());

    const res = await request(app)
      .get("/api/staff/priority-queue")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it("GET /api/staff/priority-queue returns queue for STAFF", async () => {
    setupAuth(mockStaffUser());
    staffPriorityService.buildPriorityQueue.mockResolvedValue({
      items: [
        {
          _id: "case-1",
          user: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Test User", email: "test@example.com", active: true },
          computedPriority: 74,
          manualPriority: null,
          effectivePriority: 74,
          reasons: ["Low CV score"],
          factors: { cvScore: 42, roadmapProgress: 0, gapCount: 8, inactiveDays: 20 },
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, pages: 1 },
    });

    const res = await request(app)
      .get("/api/staff/priority-queue")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(staffPriorityService.buildPriorityQueue).toHaveBeenCalled();
  });

  it("PATCH /api/staff/priority-queue/:userId/manual-priority updates for ADMIN", async () => {
    setupAuth(mockAdminUser());
    staffPriorityService.setManualPriority.mockResolvedValue({
      _id: "case-1",
      user: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Test User", email: "test@example.com", active: true },
      computedPriority: 74,
      manualPriority: 90,
      effectivePriority: 90,
      reasons: ["Low CV score"],
      factors: { cvScore: 42, roadmapProgress: 0, gapCount: 8, inactiveDays: 20 },
    });

    const res = await request(app)
      .patch("/api/staff/priority-queue/aaaaaaaaaaaaaaaaaaaaaaaa/manual-priority")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ manualPriority: 90 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.item.manualPriority).toBe(90);
    expect(staffPriorityService.setManualPriority).toHaveBeenCalledWith({
      userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      manualPriority: 90,
    });
  });
});
