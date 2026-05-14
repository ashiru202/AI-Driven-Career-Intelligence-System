const User    = require("../models/User");
const bcrypt  = require("bcryptjs");

// ── Admin: list all users ────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Admin: toggle active status ──────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.active = !user.active;
    await user.save();

    res.json({ message: "User status updated", active: user.active });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Self: get own profile ────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Self: update own profile ─────────────────────────────────────────────────
const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, bio, location, jobTitle, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Basic field updates
    if (name     !== undefined) user.name     = name.trim();
    if (phone    !== undefined) user.phone    = phone.trim();
    if (bio      !== undefined) user.bio      = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();

    // Password change (optional)
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
      user.mustChangePassword = false;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
        phone:    user.phone,
        bio:      user.bio,
        location: user.location,
        jobTitle: user.jobTitle,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, toggleUserStatus, getMyProfile, updateMyProfile };
