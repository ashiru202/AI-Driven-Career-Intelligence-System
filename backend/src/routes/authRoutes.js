const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const {
  register,
  applyForStaff,
  login,
  logout,
  issueExtensionToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { validate, schemas } = require("../middleware/validationMiddleware");

router.post("/register",             validate(schemas.register),             register);
router.post("/staff-applications",   validate(schemas.staffApply),           applyForStaff);
router.post("/login",                validate(schemas.login),                login);
router.post("/logout",                                                        logout);
router.get( "/extension-token",      requireAuth,                             issueExtensionToken);
router.get( "/verify-email",                                                 verifyEmail);
router.post("/resend-verification",  validate(schemas.resendVerification),   resendVerification);
router.post("/forgot-password",      validate(schemas.forgotPassword),       forgotPassword);
router.post("/reset-password",       validate(schemas.resetPassword),        resetPassword);

module.exports = router;
