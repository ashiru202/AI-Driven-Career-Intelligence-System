process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockStaffUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/StaffFollowUpTask");

const User = require("../src/models/User");
const StaffFollowUpTask = require("../src/models/StaffFollowUpTask");
const app = require("../src/app");

const STAFF_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const STAFF_TOKEN = makeToken({ id: STAFF_ID, role: "STAFF" });
const TARGET_USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TASK_ID = "dddddddddddddddddddddddd";

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
      }),
    }),
  });
}

describe("Staff Follow-up Task API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/staff/follow-up-tasks returns 401 without token", async () => {
    const res = await request(app).get("/api/staff/follow-up-tasks");
    expect(res.status).toBe(401);
  });

  it("GET /api/staff/follow-up-tasks returns list for STAFF", async () => {
    setupStaffAuth();

    StaffFollowUpTask.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: TASK_ID,
                title: "Follow up on CV update",
                description: "Check whether user updated summary section",
                dueDate: new Date("2026-04-20T10:00:00.000Z"),
                priority: "HIGH",
                status: "PENDING",
                user: { _id: TARGET_USER_ID, name: "Target User", email: "target@example.com" },
                createdBy: { _id: STAFF_ID, name: "Staff User", email: "staff@example.com", role: "STAFF" },
              },
            ]),
          }),
        }),
      }),
    });

    const res = await request(app)
      .get("/api/staff/follow-up-tasks")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
  });

  it("POST /api/staff/follow-up-tasks creates task", async () => {
    setupStaffAuth();
    mockTargetUser();

    StaffFollowUpTask.create = jest.fn().mockResolvedValue({ _id: TASK_ID });
    StaffFollowUpTask.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: TASK_ID,
            title: "Call user for roadmap review",
            description: "Discuss stalled roadmap progress",
            dueDate: new Date("2026-04-22T09:00:00.000Z"),
            priority: "MEDIUM",
            status: "PENDING",
            user: { _id: TARGET_USER_ID, name: "Target User", email: "target@example.com" },
            createdBy: { _id: STAFF_ID, name: "Staff User", email: "staff@example.com", role: "STAFF" },
          }),
        }),
      }),
    });

    const res = await request(app)
      .post("/api/staff/follow-up-tasks")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({
        userId: TARGET_USER_ID,
        title: "Call user for roadmap review",
        description: "Discuss stalled roadmap progress",
        dueDate: "2026-04-22T09:00:00.000Z",
        priority: "MEDIUM",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.item.title).toBe("Call user for roadmap review");
    expect(StaffFollowUpTask.create).toHaveBeenCalled();
  });

  it("PATCH /api/staff/follow-up-tasks/:taskId updates task status", async () => {
    setupStaffAuth();

    const save = jest.fn().mockResolvedValue(true);
    StaffFollowUpTask.findById = jest
      .fn()
      .mockResolvedValueOnce({
        _id: TASK_ID,
        user: TARGET_USER_ID,
        title: "Follow up on CV update",
        description: "Check progress",
        dueDate: new Date("2026-04-20T10:00:00.000Z"),
        priority: "HIGH",
        status: "PENDING",
        completedAt: null,
        save,
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
              _id: TASK_ID,
              user: { _id: TARGET_USER_ID, name: "Target User", email: "target@example.com" },
              createdBy: { _id: STAFF_ID, name: "Staff User", email: "staff@example.com", role: "STAFF" },
              title: "Follow up on CV update",
              description: "Check progress",
              dueDate: new Date("2026-04-20T10:00:00.000Z"),
              priority: "HIGH",
              status: "COMPLETED",
              completedAt: new Date("2026-04-11T08:00:00.000Z"),
            }),
          }),
        }),
      });

    const res = await request(app)
      .patch(`/api/staff/follow-up-tasks/${TASK_ID}`)
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.item.status).toBe("COMPLETED");
    expect(save).toHaveBeenCalled();
  });
});
