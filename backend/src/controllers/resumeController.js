const Resume = require('../models/Resume');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { extractTextFromFile } = require('../services/resumeTextExtractor');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Upload and analyze resume
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('INVALID_FILE', 'No file uploaded');
  }

  const file = req.file;
  const userId = req.user.id;

  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.mimetype)) {
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    throw AppError.badRequest('INVALID_FILE_TYPE', 'Only PDF and DOCX files are allowed');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    await fs.unlink(file.path).catch(() => {});
    throw AppError.badRequest('FILE_TOO_LARGE', 'File size must be less than 5MB');
  }

  try {
    // Step 1: Extract text from file
    const extractedText = await extractTextFromFile(file.path);

    if (!extractedText || extractedText.trim().length === 0) {
      throw AppError.badRequest('EXTRACTION_FAILED', 'Could not extract text from file');
    }

    // Step 2: Call NLP service to extract skills
    let extractedSkills = [];
    try {
      const nlpResponse = await axios.post(
        `${process.env.NLP_SERVICE_URL}/extract-skills`,
        { text: extractedText },
        { timeout: 10000 }
      );

      if (nlpResponse.data && Array.isArray(nlpResponse.data.skills)) {
        extractedSkills = nlpResponse.data.skills;
      }
    } catch (nlpError) {
      console.error('NLP service error:', nlpError.message);
      throw AppError.internal('NLP service is not responding', 'NLP_DOWN');
    }

    // Step 3: Save resume data to database
    const resume = await Resume.create({
      user: userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.mimetype,
      extractedText: extractedText.substring(0, 10000), // Store first 10k chars
      extractedSkills
    });

    res.status(201).json(successResponse({
      resumeId: resume._id,
      fileName: resume.fileName,
      skills: resume.extractedSkills,
      skillCount: resume.extractedSkills.length
    }, 'Resume analyzed successfully'));

  } catch (error) {
    // Clean up file on error
    await fs.unlink(file.path).catch(() => {});
    throw error;
  }
});

// Get user's resumes
const getUserResumes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const resumes = await Resume.find({ user: userId })
    .select('-extractedText -filePath')
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
    fileSize: resume.fileSize,
    skills: resume.extractedSkills,
    createdAt: resume.createdAt
  }));
});

// Serve / download a resume file
const downloadResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Query all fields (filePath is needed to serve the file)
  const resume = await Resume.findOne({ _id: id, user: userId });

  if (!resume) {
    throw AppError.notFound('Resume not found');
  }

  const isPdf = resume.fileType === 'application/pdf';

  res.setHeader('Content-Type', resume.fileType);
  // inline → browser preview (PDF); attachment → force-download (DOCX)
  res.setHeader(
    'Content-Disposition',
    `${isPdf ? 'inline' : 'attachment'}; filename="${resume.fileName}"`
  );

  res.sendFile(path.resolve(resume.filePath), (err) => {
    if (err) {
      console.error('File send error:', err);
      if (!res.headersSent) {
        res.status(404).json({ ok: false, message: 'File not found on disk' });
      }
    }
  });
});

// Delete resume
const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const resume = await Resume.findOne({ _id: id, user: userId });
  
  if (!resume) {
    throw AppError.notFound('Resume not found');
  }

  // Delete file from filesystem
  await fs.unlink(resume.filePath).catch(() => {});

  // Delete from database
  await Resume.deleteOne({ _id: id });

  res.json(successResponse(null, 'Resume deleted successfully'));
});

module.exports = {
  uploadResume,
  getUserResumes,
  getResumeDetails,
  downloadResume,
  deleteResume
};
