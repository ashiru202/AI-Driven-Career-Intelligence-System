const Resume = require('../models/Resume');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { extractTextFromFile } = require('../services/resumeTextExtractor');
const { extractSkillsWithAI } = require('../services/aiSkillExtractorService');
const { sendToUser } = require('../utils/sseManager');
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
  const operationId = `resume_upload_${userId}_${Date.now()}`;

  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.mimetype)) {
    await fs.unlink(file.path).catch(() => {});
    throw AppError.badRequest('INVALID_FILE_TYPE', 'Only PDF and DOCX files are allowed');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    await fs.unlink(file.path).catch(() => {});
    throw AppError.badRequest('FILE_TOO_LARGE', 'File size must be less than 5MB');
  }

  try {
    // Step 1: Extract text
    sendToUser(userId, 'progress', {
      operationId,
      operation: 'resume_upload',
      step: 'extracting_text',
      progress: 25,
      message: 'Extracting text from resume…',
    });
    const extractedText = await extractTextFromFile(file.path);

    if (!extractedText || extractedText.trim().length === 0) {
      throw AppError.badRequest('EXTRACTION_FAILED', 'Could not extract text from file');
    }

    // Step 2: AI skill extraction
    sendToUser(userId, 'progress', {
      operationId,
      operation: 'resume_upload',
      step: 'analyzing_skills',
      progress: 60,
      message: 'Analysing skills with AI…',
    });
    const { skills: extractedSkills, source: extractionSource } = await extractSkillsWithAI(extractedText);
    console.log(`[Resume] Skill extraction source: ${extractionSource}, count: ${extractedSkills.length}`);

    // Step 3: Persist to DB
    sendToUser(userId, 'progress', {
      operationId,
      operation: 'resume_upload',
      step: 'saving',
      progress: 85,
      message: 'Saving resume…',
    });
    const resume = await Resume.create({
      user: userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.mimetype,
      extractedText: extractedText.substring(0, 10000),
      extractedSkills
    });

    // Step 4: Done — notify via SSE
    sendToUser(userId, 'progress', {
      operationId,
      operation: 'resume_upload',
      step: 'complete',
      progress: 100,
      message: 'Resume analysed successfully!',
      resumeId: resume._id,
    });

    // Push a fresh notification card for this resume
    sendToUser(userId, 'notification', {
      id: `resume_${resume._id}`,
      icon: 'FileText',
      title: `Resume analysed: ${resume.fileName}`,
      body: extractedSkills.length > 0
        ? `${extractedSkills.length} skill${extractedSkills.length > 1 ? 's' : ''} detected. View your full analysis.`
        : 'Analysis complete. View your resume details.',
      link: '/my-resumes',
      time: 'Just now',
      createdAt: new Date(),
    });

    res.status(201).json(successResponse({
      resumeId: resume._id,
      fileName: resume.fileName,
      skills: resume.extractedSkills,
      skillCount: resume.extractedSkills.length,
      extractionSource
    }, 'Resume analyzed successfully'));

  } catch (error) {
    // Notify the browser of the failure
    sendToUser(userId, 'progress', {
      operationId,
      operation: 'resume_upload',
      step: 'error',
      progress: 0,
      message: 'Resume analysis failed.',
    });
    await fs.unlink(file.path).catch(() => {});
    throw error;
  }
});

// Get user's resumes
const getUserResumes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, skip } = parsePagination(req.query, 6);

  const total = await Resume.countDocuments({ user: userId });
  const resumes = await Resume.find({ user: userId })
    .select('-extractedText -filePath')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json(successResponse({ resumes, pagination: paginationMeta(total, page, limit) }));
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
