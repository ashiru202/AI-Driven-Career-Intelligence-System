process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockStaffUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/CaseNote");
jest.mock("../src/models/StaffCase");

const User = require("../src/models/User");
const CaseNote = require("../src/models/CaseNote");
const StaffCase = require("../src/models/StaffCase");
const app = require("../src/app");

const STAFF_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "STAFF" });
const TARGET_USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

function setupAuthAndTargetUser() {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(
      mockStaffUser({
        _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
        id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      })
    ),
  });

  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: TARGET_USER_ID,
        name: "Target User",
        email: "target@example.com",
        active: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      }),
    }),
  });
}

describe("Staff Case Notes API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/staff/cases/:userId/notes returns 401 without token", async () => {
    const res = await request(app).get(`/api/staff/cases/${TARGET_USER_ID}/notes`);
    expect(res.status).toBe(401);
  });

  it("GET /api/staff/cases/:userId/notes returns notes and tags for STAFF", async () => {
    setupAuthAndTargetUser();

    CaseNote.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: "dddddddddddddddddddddddd",
              content: "Follow up next week",
              createdAt: new Date("2025-02-01T10:00:00.000Z"),
              author: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Staff User", email: "staff@example.com", role: "STAFF" },
            },
          ]),
        }),
      }),
    });

    StaffCase.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ tags: ["risk-high", "cv-review"] }),
      }),
    });

    const res = await request(app)
      .get(`/api/staff/cases/${TARGET_USER_ID}/notes`)
      .set("Authorization", `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe("target@example.com");
    expect(res.body.data.tags).toEqual(["risk-high", "cv-review"]);
    expect(res.body.data.notes).toHaveLength(1);
  });

  it("POST /api/staff/cases/:userId/notes creates note", async () => {
    setupAuthAndTargetUser();

    CaseNote.create = jest.fn().mockResolvedValue({ _id: "eeeeeeeeeeeeeeeeeeeeeeee" });
    CaseNote.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "eeeeeeeeeeeeeeeeeeeeeeee",
          content: "User requested interview prep",
          author: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Staff User", email: "staff@example.com", role: "STAFF" },
        }),
      }),
    });

    const res = await request(app)
      .post(`/api/staff/cases/${TARGET_USER_ID}/notes`)
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({ content: "User requested interview prep" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.note.content).toBe("User requested interview prep");
    expect(CaseNote.create).toHaveBeenCalledWith({
      user: TARGET_USER_ID,
      author: "bbbbbbbbbbbbbbbbbbbbbbbb",
      content: "User requested interview prep",
    });
  });

  it("PATCH /api/staff/cases/:userId/tags updates tags", async () => {
    setupAuthAndTargetUser();

    StaffCase.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        tags: ["risk-high", "no-response"],
      }),
    });

    const res = await request(app)
      .patch(`/api/staff/cases/${TARGET_USER_ID}/tags`)
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({ tags: ["Risk-High", "no-response", "risk-high"] });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.tags).toEqual(["risk-high", "no-response"]);
    expect(StaffCase.findOneAndUpdate).toHaveBeenCalled();
  });
});
