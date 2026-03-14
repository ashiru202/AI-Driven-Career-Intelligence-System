const multer = require("multer");
const path = require("path");

// Use memoryStorage so the file buffer is available for text extraction
// and direct Cloudinary upload without writing to local disk.
const storage = multer.memoryStorage();

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
