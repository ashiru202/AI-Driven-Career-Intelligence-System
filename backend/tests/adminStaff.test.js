process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockUser, mockAdminUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/utils/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendStaffInviteEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/auditLogService", () => ({
  logActivity: jest.fn(),
}));

const User = require("../src/models/User");
const app = require("../src/app");

const USER_TOKEN = makeToken({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "USER" });
const ADMIN_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "ADMIN" });

function setupAuth(userObj) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

describe("POST /api/admin/staff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/admin/staff")
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    setupAuth(mockUser());

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(403);
  });

  it("returns 410 because direct invite is disabled", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(410);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("DIRECT_INVITE_DISABLED");
    expect(User.create).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payload", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "A" });

    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("does not attempt invite side effects", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(410);
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });
});
