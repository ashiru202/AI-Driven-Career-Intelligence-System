process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const bcrypt = require("bcryptjs");
const { makeToken, mockStaffUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");

const User = require("../src/models/User");
const app = require("../src/app");

const STAFF_TOKEN = makeToken({ id: "cccccccccccccccccccccccc", role: "STAFF" });

describe("forced password change enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks protected routes while mustChangePassword is true", async () => {
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(
        mockStaffUser({
          _id: "cccccccccccccccccccccccc",
          mustChangePassword: true,
        })
      ),
    });

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("allows /api/users/me password update and clears mustChangePassword", async () => {
    const hash = await bcrypt.hash("991234567V", 10);
    const userDoc = {
      _id: "cccccccccccccccccccccccc",
      name: "Staff Member",
      email: "staff@example.com",
      role: "STAFF",
      active: true,
      emailVerified: true,
      mustChangePassword: true,
      password: hash,
      phone: "",
      bio: "",
      location: "",
      jobTitle: "",
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findById = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(
          mockStaffUser({
            _id: "cccccccccccccccccccccccc",
            mustChangePassword: true,
          })
        ),
      })
      .mockResolvedValueOnce(userDoc);

    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${STAFF_TOKEN}`)
      .send({
        currentPassword: "991234567V",
        newPassword: "new-password-123",
      });

    expect(res.status).toBe(200);
    expect(userDoc.mustChangePassword).toBe(false);
    expect(userDoc.save).toHaveBeenCalled();
    expect(res.body.user.mustChangePassword).toBe(false);
  });
});
