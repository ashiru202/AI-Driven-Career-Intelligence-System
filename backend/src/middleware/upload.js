const multer = require("multer");
const path = require("path");
const fs = require("fs");

// FIXED upload folder path (no process.cwd confusion)
// BACKEND/uploads/resumes
const uploadDir = path.resolve(__dirname, "..", "..", "uploads", "resumes");
fs.mkdirSync(uploadDir, { recursive: true });

console.log("✅ Resume upload directory:", uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "resume", ext)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);

    cb(null, `${Date.now()}_${base}${ext || ""}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  const allowedExt = new Set([".pdf", ".docx"]);
  const allowedMime = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream", // some clients send docx as this
  ]);

  if (!allowedExt.has(ext)) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only PDF/DOCX allowed"), false);
  }

  // Allow octet-stream only if extension is pdf/docx
  if (!allowedMime.has(mime)) {
    return cb(new Error(`Unsupported file type: ${mime}`), false);
  }

  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB
});
