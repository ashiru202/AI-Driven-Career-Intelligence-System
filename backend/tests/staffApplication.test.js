process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-jest-only";

const request = require("supertest");
const { makeToken, mockAdminUser } = require("./helpers");

jest.mock("../src/config/db", () => jest.fn());
jest.mock("../src/models/User");
jest.mock("../src/models/StaffApplication");
jest.mock("../src/utils/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendStaffInviteEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/auditLogService", () => ({
  logActivity: jest.fn(),
}));
jest.mock("../src/utils/sseManager", () => ({
  sendToUser: jest.fn(),
}));

const User = require("../src/models/User");
const StaffApplication = require("../src/models/StaffApplication");
const { sendStaffInviteEmail } = require("../src/utils/emailService");
const { sendToUser } = require("../src/utils/sseManager");
const app = require("../src/app");

const ADMIN_TOKEN = makeToken({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "ADMIN" });

function setupAuth(userObj = mockAdminUser()) {
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(userObj),
  });
}

function validApplicationPayload(overrides = {}) {
  return {
    fullName: "Jane Staff",
    email: "jane.staff@example.com",
    phone: "+94 77 123 4567",
    currentRole: "Career Coach",
    yearsExperience: 6,
    expertiseAreas: ["Resume Review", "Interview Coaching"],
    motivation:
      "I want to help job seekers improve outcomes with practical, data-driven support across resumes and interviews.",
    linkedInUrl: "https://www.linkedin.com/in/jane-staff",
    portfolioUrl: "https://janestaff.example.com",
    ...overrides,
  };
}

describe("Staff application workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.find = jest.fn().mockResolvedValue([]);
  });

  describe("POST /api/auth/staff-applications", () => {
    it("submits a staff application", async () => {
      User.findOne.mockResolvedValue(null);
      User.find.mockResolvedValue([{ _id: "bbbbbbbbbbbbbbbbbbbbbbbb" }]);
      StaffApplication.findOne.mockResolvedValue(null);
      StaffApplication.create.mockResolvedValue({
        _id: "cccccccccccccccccccccccc",
        fullName: "Jane Staff",
        currentRole: "Career Coach",
        createdAt: new Date(),
        status: "PENDING",
      });

      const res = await request(app)
        .post("/api/auth/staff-applications")
        .send(validApplicationPayload());

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
      expect(StaffApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Jane Staff",
          email: "jane.staff@example.com",
          status: "PENDING",
        })
      );
      expect(sendToUser).toHaveBeenCalledWith(
        "bbbbbbbbbbbbbbbbbbbbbbbb",
        "notification",
        expect.objectContaining({
          id: expect.stringMatching(/^staff_application_/),
          link: "/staff-management",
        })
      );
    });

    it("returns 409 when a pending application already exists", async () => {
      User.findOne.mockResolvedValue(null);
      StaffApplication.findOne.mockResolvedValue({
        _id: "existing-app",
        status: "PENDING",
      });

      const res = await request(app)
        .post("/api/auth/staff-applications")
        .send(validApplicationPayload());

      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
      expect(StaffApplication.create).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid payload", async () => {
      const res = await request(app)
        .post("/api/auth/staff-applications")
        .send(validApplicationPayload({ motivation: "Too short" }));

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(StaffApplication.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/staff-applications", () => {
    it("returns paginated staff applications for admin", async () => {
      setupAuth();

      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: "app1",
            fullName: "Jane Staff",
            email: "jane.staff@example.com",
            status: "PENDING",
          },
        ]),
      };

      StaffApplication.find.mockReturnValue(chain);
      StaffApplication.countDocuments.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/admin/staff-applications?status=PENDING&page=1&limit=20")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.applications).toHaveLength(1);
      expect(StaffApplication.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING" })
      );
    });
  });

  describe("PATCH /api/admin/staff-applications/:applicationId/review", () => {
    it("approves an application, creates staff user, and sends invite email", async () => {
      setupAuth();

      const applicationDoc = {
        _id: "dddddddddddddddddddddddd",
        fullName: "Jane Staff",
        email: "jane.staff@example.com",
        phone: "+94 77 123 4567",
        currentRole: "Career Coach",
        yearsExperience: 6,
        expertiseAreas: ["Resume Review", "Interview Coaching"],
        motivation: "I can support applicants with practical and measurable improvements.",
        linkedInUrl: "https://www.linkedin.com/in/jane-staff",
        portfolioUrl: "https://janestaff.example.com",
        status: "PENDING",
        save: jest.fn().mockResolvedValue(undefined),
      };

      StaffApplication.findById.mockResolvedValue(applicationDoc);
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: "eeeeeeeeeeeeeeeeeeeeeeee",
        name: "Jane Staff",
        email: "jane.staff@example.com",
        role: "STAFF",
      });

      const res = await request(app)
        .patch("/api/admin/staff-applications/dddddddddddddddddddddddd/review")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ decision: "APPROVE", reviewNotes: "Strong profile for onboarding." });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "STAFF",
          email: "jane.staff@example.com",
          staffProfile: expect.objectContaining({
            yearsExperience: 6,
          }),
        })
      );
      expect(sendStaffInviteEmail).toHaveBeenCalledWith(
        "jane.staff@example.com",
        "Jane Staff",
        expect.any(String)
      );
      expect(applicationDoc.save).toHaveBeenCalled();
      expect(applicationDoc.status).toBe("APPROVED");
    });

    it("rejects an application with review notes", async () => {
      setupAuth();

      const applicationDoc = {
        _id: "ffffffffffffffffffffffff",
        fullName: "John Applicant",
        email: "john.applicant@example.com",
        status: "PENDING",
        save: jest.fn().mockResolvedValue(undefined),
      };

      StaffApplication.findById.mockResolvedValue(applicationDoc);
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/admin/staff-applications/ffffffffffffffffffffffff/review")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ decision: "REJECT", reviewNotes: "Need at least 2 years direct mentoring experience." });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(applicationDoc.status).toBe("REJECTED");
      expect(applicationDoc.save).toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
      expect(sendStaffInviteEmail).not.toHaveBeenCalled();
    });

    it("returns 400 when rejection has no meaningful review notes", async () => {
      setupAuth();

      const res = await request(app)
        .patch("/api/admin/staff-applications/ffffffffffffffffffffffff/review")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ decision: "REJECT", reviewNotes: "too low" });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(StaffApplication.findById).not.toHaveBeenCalled();
    });
  });
});
