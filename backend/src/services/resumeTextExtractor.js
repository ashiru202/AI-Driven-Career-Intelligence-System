const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

function detectType(filePath, mimeType) {
  const ext = path.extname(filePath || "").toLowerCase();

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

async function extractTextFromResume(filePath, mimeType) {
  if (!filePath) throw new Error("Resume file path is missing.");

  let buffer;
  try {
    buffer = await fs.promises.readFile(filePath);
  } catch (e) {
    throw new Error(`Unable to read uploaded file: ${e.message}`);
  }

  const type = detectType(filePath, mimeType);

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

// Export with both names for compatibility
module.exports = {
  extractTextFromResume,
  extractTextFromFile: extractTextFromResume
};
