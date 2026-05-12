process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockUser, mockAdminUser } = require("./helpers");
const bcrypt = require("bcryptjs");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/utils/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendStaffInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendStaffTemporaryPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/auditLogService", () => ({
  logActivity: jest.fn(),
  logActivityWithActor: jest.fn(),
}));

const User = require("../src/models/User");
const { sendStaffTemporaryPasswordEmail } = require("../src/utils/emailService");
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

  it("creates staff with a temporary password and forced password change", async () => {
    setupAuth(mockAdminUser());
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockImplementation(async (payload) => ({
      _id: "cccccccccccccccccccccccc",
      active: true,
      ...payload,
    }));

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: "Staff Member",
        email: "staff@example.com",
        nicOrTempPassword: "991234567V",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.staff.email).toBe("staff@example.com");
    expect(res.body.data.staff.mustChangePassword).toBe(true);

    expect(sendStaffTemporaryPasswordEmail).toHaveBeenCalledWith(
      "staff@example.com",
      "Staff Member",
      "991234567V"
    );

    const createCall = User.create.mock.calls[0][0];
    expect(createCall.role).toBe("STAFF");
    expect(createCall.emailVerified).toBe(true);
    expect(createCall.createdByAdmin).toBe(true);
    expect(createCall.mustChangePassword).toBe(true);
    expect(createCall.password).not.toBe("991234567V");
    await expect(bcrypt.compare("991234567V", createCall.password)).resolves.toBe(true);
  });

  it("returns 400 for invalid payload", async () => {
    setupAuth(mockAdminUser());

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "A", email: "not-an-email", nicOrTempPassword: "123" });

    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("returns 409 if staff email already exists", async () => {
    setupAuth(mockAdminUser());
    User.findOne = jest.fn().mockResolvedValue({ email: "staff@example.com" });

    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: "Staff Member",
        email: "staff@example.com",
        nicOrTempPassword: "991234567V",
      });

    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });
});
