const Resume = require('../models/Resume');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { extractTextFromBuffer } = require('../services/resumeTextExtractor');
const { extractSkillsWithAI } = require('../services/aiSkillExtractorService');
const { uploadBuffer, deleteFile } = require('../config/cloudinary');

// Upload and analyze resume
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('INVALID_FILE', 'No file uploaded');
  }

  const file = req.file;
  const userId = req.user.id;

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    throw AppError.badRequest('INVALID_FILE_TYPE', 'Only PDF and DOCX files are allowed');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw AppError.badRequest('FILE_TOO_LARGE', 'File size must be less than 5MB');
  }

  // Step 1: Extract text from the in-memory buffer
  const extractedText = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);

  if (!extractedText || extractedText.trim().length === 0) {
    throw AppError.badRequest('EXTRACTION_FAILED', 'Could not extract text from file');
  }

  // Step 2: Upload buffer to Cloudinary (resource_type 'raw' for non-image files)
  const cloudinaryResult = await uploadBuffer(file.buffer, {
    resource_type: 'raw',
    folder: 'resumes',
    public_id: `${userId}_${Date.now()}`,
    // Preserve original extension so the file is downloadable with the correct type
    format: file.mimetype === 'application/pdf' ? 'pdf' : 'docx',
  });

  // Step 3: Extract skills using AI (Groq → keyword fallback)
  const { skills: extractedSkills, source: extractionSource } = await extractSkillsWithAI(extractedText);
  console.log(`[Resume] Skill extraction source: ${extractionSource}, count: ${extractedSkills.length}`);

  // Step 4: Save resume metadata to database
  const resume = await Resume.create({
    user: userId,
    fileName: file.originalname,
    fileUrl: cloudinaryResult.secure_url,
    cloudinaryPublicId: cloudinaryResult.public_id,
    fileSize: file.size,
    fileType: file.mimetype,
    extractedText: extractedText.substring(0, 10000), // Store first 10k chars
    extractedSkills,
  });

  res.status(201).json(successResponse({
    resumeId: resume._id,
    fileName: resume.fileName,
    fileUrl: resume.fileUrl,
    skills: resume.extractedSkills,
    skillCount: resume.extractedSkills.length,
    extractionSource, // 'groq' | 'keyword' | 'none'
  }, 'Resume analyzed successfully'));
});

// Get user's resumes
const getUserResumes = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const resumes = await Resume.find({ user: userId })
    .select('-extractedText -cloudinaryPublicId')
    .sort({ createdAt: -1 });

  res.json(successResponse({ resumes }));
});

// Get specific resume details
const getResumeDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const resume = await Resume.findOne({ _id: id, user: userId });

  if (!resume) {
    throw AppError.notFound('Resume not found');
  }

  res.json(successResponse({
    resumeId: resume._id,
    fileName: resume.fileName,
    fileUrl: resume.fileUrl,
    fileSize: resume.fileSize,
    skills: resume.extractedSkills,
    createdAt: resume.createdAt,
  }));
});

// Download / preview a resume — redirect to the Cloudinary URL
const downloadResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const resume = await Resume.findOne({ _id: id, user: userId });

  if (!resume) {
    throw AppError.notFound('Resume not found');
  }

  if (!resume.fileUrl) {
    throw AppError.notFound('File URL not available for this resume');
  }

  // Redirect the client to the Cloudinary URL (secure, CDN-served)
  res.redirect(resume.fileUrl);
});

// Delete resume
const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const resume = await Resume.findOne({ _id: id, user: userId });

  if (!resume) {
    throw AppError.notFound('Resume not found');
  }

  // Delete asset from Cloudinary
  if (resume.cloudinaryPublicId) {
    await deleteFile(resume.cloudinaryPublicId, 'raw').catch((err) => {
      console.error('[Resume] Cloudinary delete error:', err.message);
    });
  }

  // Delete from database
  await Resume.deleteOne({ _id: id });

  res.json(successResponse(null, 'Resume deleted successfully'));
});

module.exports = {
  uploadResume,
  getUserResumes,
  getResumeDetails,
  downloadResume,
  deleteResume,
};
