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
const { sendStaffInviteEmail } = require("../src/utils/emailService");
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

  it("creates a STAFF account for admin", async () => {
    setupAuth(mockAdminUser());
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "cccccccccccccccccccccccc",
      name: "Staff Member",
      email: "staff@example.com",
      role: "STAFF",
      emailVerified: false,
    });

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe("STAFF");

    const createCall = User.create.mock.calls[0][0];
    expect(createCall.role).toBe("STAFF");
    expect(createCall.email).toBe("staff@example.com");
    expect(typeof createCall.password).toBe("string");
    expect(typeof createCall.passwordResetToken).toBe("string");
    expect(createCall.passwordResetExpires).toBeInstanceOf(Date);
    expect(sendStaffInviteEmail).toHaveBeenCalledWith(
      "staff@example.com",
      "Staff Member",
      expect.any(String)
    );
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

  it("returns 409 if staff email already exists", async () => {
    setupAuth(mockAdminUser());
    User.findOne.mockResolvedValue({ _id: "existing", email: "staff@example.com" });

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Staff Member", email: "staff@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(User.create).not.toHaveBeenCalled();
    expect(sendStaffInviteEmail).not.toHaveBeenCalled();
  });
});
