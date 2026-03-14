const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

function detectType(fileNameOrPath, mimeType) {
  const ext = path.extname(fileNameOrPath || "").toLowerCase();

  if (mimeType === "application/pdf" || ext === ".pdf") return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/octet-stream" ||
    ext === ".docx"
  )
    return "docx";

  if (mimeType === "application/msword" || ext === ".doc") return "doc";

  return "unknown";
}

/**
 * Extract text from a Buffer (used with multer memoryStorage + Cloudinary).
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} mimeType - File MIME type
 * @param {string} originalName - Original filename (used for extension detection)
 */
async function extractTextFromBuffer(buffer, mimeType, originalName = "") {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("File buffer is missing or invalid.");
  }

  const type = detectType(originalName, mimeType);

  try {
    if (type === "pdf") {
      const data = await pdfParse(buffer);
      const text = (data.text || "").replace(/\s+\n/g, "\n").trim();

      if (!text) {
        throw new Error(
          "No readable text found in PDF. If it's a scanned/image PDF, please upload a DOCX or a text-based PDF."
        );
      }
      return text;
    }

    if (type === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();

      if (!text) {
        throw new Error("No readable text found in DOCX. Please try another DOCX file.");
      }
      return text;
    }

    if (type === "doc") {
      throw new Error("DOC format is not supported for text extraction. Please upload DOCX or PDF.");
    }

    throw new Error("Unsupported resume type. Please upload a PDF or DOCX.");
  } catch (e) {
    throw new Error(`Resume text extraction failed: ${e.message}`);
  }
}

// Export with all names for compatibility
module.exports = {
  extractTextFromBuffer,
  extractTextFromResume: extractTextFromBuffer,
  extractTextFromFile: extractTextFromBuffer,
};
