process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockStaffUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/StaffReportWorkflow");

const User = require("../src/models/User");
const StaffReportWorkflow = require("../src/models/StaffReportWorkflow");
const app = require("../src/app");

const STAFF_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const STAFF_TOKEN = makeToken({ id: STAFF_ID, role: "STAFF" });
const TARGET_USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

function setupStaffAuth() {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(
      mockStaffUser({
        _id: STAFF_ID,
        id: STAFF_ID,
      })
    ),
  });
}

function mockTargetUser() {
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: TARGET_USER_ID,
        name: "Target User",
        email: "target@example.com",
        active: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    }),
  });
}

describe("Staff Report Workflow API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/staff/report-workflows returns 401 without token", async () => {
    const res = await request(app).get("/api/staff/report-workflows");
    expect(res.status).toBe(401);
  });

  it("GET /api/staff/report-workflows returns workflow list for STAFF", async () => {
    setupStaffAuth();

    User.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: TARGET_USER_ID,
              name: "Target User",
              email: "target@example.com",
              active: true,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ]),
        }),
      }),
    });

    StaffReportWorkflow.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: "dddddddddddddddddddddddd",
            user: TARGET_USER_ID,
            state: "IN_REVIEW",
            notes: "Checking CV and roadmap consistency",
            updatedBy: { _id: STAFF_ID, name: "Staff User", email: "staff@example.com", role: "STAFF" },
            lastUpdatedAt: new Date("2026-04-11T09:00:00.000Z"),
          },
        ]),
      }),
    });

    const res = await request(app)
      .get("/api/staff/report-workflows")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].state).toBe("IN_REVIEW");
  });

  it("PATCH /api/staff/report-workflows/:userId updates state", async () => {
    setupStaffAuth();
    mockTargetUser();

    StaffReportWorkflow.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "dddddddddddddddddddddddd",
          user: TARGET_USER_ID,
          state: "FOLLOW_UP_REQUIRED",
          notes: "Need user to update summary and projects",
          updatedBy: { _id: STAFF_ID, name: "Staff User", email: "staff@example.com", role: "STAFF" },
          lastUpdatedAt: new Date("2026-04-11T10:00:00.000Z"),
        }),
      }),
    });

    const res = await request(app)
      .patch(`/api/staff/report-workflows/${TARGET_USER_ID}`)
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({
        state: "FOLLOW_UP_REQUIRED",
        notes: "Need user to update summary and projects",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.item.state).toBe("FOLLOW_UP_REQUIRED");
    expect(StaffReportWorkflow.findOneAndUpdate).toHaveBeenCalled();
  });
});
