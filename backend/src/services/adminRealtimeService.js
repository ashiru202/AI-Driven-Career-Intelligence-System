const User = require("../models/User");
const { sendToUser } = require("../utils/sseManager");

async function getActiveAdminIds() {
  if (typeof User.find !== "function") return [];

  const query = User.find({ role: "ADMIN", active: true }, "_id");
  if (!query) return [];
  const admins = typeof query.lean === "function" ? await query.lean() : await query;
  return (admins || []).map((admin) => String(admin._id)).filter(Boolean);
}

async function notifyActiveAdmins(notification) {
  try {
    const adminIds = await getActiveAdminIds();
    adminIds.forEach((adminId) => {
      sendToUser(adminId, "notification", {
        time: "Just now",
        createdAt: new Date(),
        ...notification,
      });
    });
    return adminIds.length;
  } catch (error) {
    console.warn("[Admin Realtime] Failed to notify admins:", error.message);
    return 0;
  }
}

module.exports = {
  notifyActiveAdmins,
};
