const { z } = require('zod');
const AppError = require('../utils/AppError');

// Strip HTML tags from a string to prevent stored XSS
const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim();

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      // Write sanitized body back (Express 5: req.query/params are read-only getters)
      if (result && result.body) req.body = result.body;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // zod v4 uses .issues (v3 used .errors); support both
        const issues = error.issues || error.errors || [];
        const details = issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(AppError.validationError('Validation failed', details));
      }
      next(error);
    }
  };
};

// Validation schemas
const schemas = {
  register: z.object({
    body: z.object({
      name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .transform(stripHtml),
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase(),
      password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
    })
  }),

  login: z.object({
    body: z.object({
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase(),
      password: z.string().min(1, 'Password is required').max(128)
    })
  }),

  createStaff: z.object({
    body: z.object({
      name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .transform(stripHtml),
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase(),
      password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
    })
  }),

  compareJob: z.object({
    body: z.object({
      jobTitle: z.string()
        .min(1, 'Job title is required')
        .max(200, 'Job title must be at most 200 characters')
        .transform(stripHtml),
      // Cap job description at 20 000 characters; strip HTML
      jobDescription: z.string()
        .min(10, 'Job description must be at least 10 characters')
        .max(20000, 'Job description must be at most 20 000 characters')
        .transform(stripHtml),
      jobSkills: z.array(
        z.string().max(100, 'Skill name too long').transform(stripHtml)
      ).max(100, 'Too many skills').optional(),
      resumeId: z.string().optional()
    })
  }),

  updateRoadmapSkillStatus: z.object({
    body: z.object({
      skill: z.string()
        .min(1, 'Skill is required')
        .max(100, 'Skill name too long')
        .transform(stripHtml),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
        errorMap: () => ({ message: 'Status must be PENDING, IN_PROGRESS, or COMPLETED' })
      })
    }),
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid roadmap ID')
    })
  }),

  createRoadmap: z.object({
    body: z.object({
      targetRole: z.string()
        .min(1, 'Target role is required')
        .max(200, 'Target role too long')
        .transform(stripHtml),
      jobTitle: z.string().max(200).transform(stripHtml).optional(),
      jobSkills: z.array(z.string().max(100).transform(stripHtml)).max(100).optional(),
      missingSkills: z.array(z.string().max(100).transform(stripHtml)).max(100).optional(),
      resumeSkills: z.array(z.string().max(100).transform(stripHtml)).max(100).optional(),
      comparisonId: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid comparison ID')
        .optional()
        .nullable()
    })
  }),

  forgotPassword: z.object({
    body: z.object({
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase()
    })
  }),

  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, 'Token is required'),
      password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
    })
  }),

  resendVerification: z.object({
    body: z.object({
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase()
    })
  }),

  // Extension API schemas
  extensionQuickCompare: z.object({
    body: z.object({
      jobTitle: z.string()
        .min(2, 'Job title too short')
        .max(200, 'Job title too long')
        .transform(stripHtml),
      jobDescription: z.string()
        .min(10, 'Job description must be at least 10 characters')
        .max(10000, 'Job description too long')
        .transform(stripHtml),
      resumeId: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid resume ID')
        .optional()
        .nullable()
    })
  }),

  staffSetManualPriority: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
      manualPriority: z.union([
        z.number().min(0, 'Priority must be at least 0').max(100, 'Priority must be at most 100'),
        z.null()
      ])
    })
  }),

  staffCaseUserParam: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    })
  }),

  staffCaseNoteParam: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
      noteId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid note ID')
    })
  }),

  staffCreateCaseNote: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
      content: z.string()
        .min(2, 'Note content must be at least 2 characters')
        .max(2000, 'Note content must be at most 2000 characters')
        .transform(stripHtml)
    })
  }),

  staffUpdateCaseNote: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
      noteId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid note ID')
    }),
    body: z.object({
      content: z.string()
        .min(2, 'Note content must be at least 2 characters')
        .max(2000, 'Note content must be at most 2000 characters')
        .transform(stripHtml)
    })
  }),

  staffUpdateCaseTags: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
      tags: z.array(
        z.string()
          .min(1, 'Tag cannot be empty')
          .max(30, 'Tag must be at most 30 characters')
          .transform(stripHtml)
      ).max(20, 'At most 20 tags are allowed')
    })
  })
};

module.exports = {
  validate,
  schemas
};
