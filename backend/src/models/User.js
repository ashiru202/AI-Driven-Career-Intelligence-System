const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["USER", "STAFF", "ADMIN"],
    default: "USER",
  },
  active:              { type: Boolean, default: true },
  // Email verification
  emailVerified:           { type: Boolean, default: false },
  emailVerificationToken:  { type: String },
  emailVerificationExpires:{ type: Date },
  // Password reset
  passwordResetToken:      { type: String },
  passwordResetExpires:    { type: Date },
  // Profile fields
  phone:    { type: String, default: '' },
  bio:      { type: String, default: '' },
  location: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  avatar:   { type: String, default: '' }, // future: URL to profile picture
  careerLevel: {
    type: String,
    enum: ['INTERN', 'PROFESSIONAL', 'UNKNOWN'],
    default: 'UNKNOWN',
  },
  yearsExperience: { type: Number, default: null },
  mustChangePassword: { type: Boolean, default: false },
  createdByAdmin: { type: Boolean, default: false },
  staffProfile: {
    phone: { type: String, default: '' },
    currentRole: { type: String, default: '' },
    yearsExperience: { type: Number, default: 0 },
    expertiseAreas: { type: [String], default: [] },
    motivation: { type: String, default: '' },
    linkedInUrl: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
