const { z } = require('zod');
const AppError = require('../utils/AppError');

// Strip HTML tags from a string to prevent stored XSS
const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim();
const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().url('Invalid URL').max(300, 'URL must be at most 300 characters').optional()
);

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
        .max(128, 'Password must be at most 128 characters'),
      role: z.enum(['USER']).optional().default('USER')
    })
  }),

  adminCreateStaff: z.object({
    body: z.object({
      name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .transform(stripHtml),
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase(),
      nicOrTempPassword: z.string()
        .min(6, 'Temporary password must be at least 6 characters')
        .max(64, 'Temporary password must be at most 64 characters')
        .transform(stripHtml)
    })
  }),

  staffApply: z.object({
    body: z.object({
      fullName: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .transform(stripHtml),
      email: z.string()
        .email('Invalid email address')
        .max(254, 'Email too long')
        .toLowerCase(),
      phone: z.string()
        .min(7, 'Phone number must be at least 7 characters')
        .max(20, 'Phone number must be at most 20 characters')
        .transform(stripHtml),
      currentRole: z.string()
        .min(2, 'Current role must be at least 2 characters')
        .max(120, 'Current role must be at most 120 characters')
        .transform(stripHtml),
      yearsExperience: z.coerce.number()
        .int('Years of experience must be a whole number')
        .min(0, 'Years of experience cannot be negative')
        .max(50, 'Years of experience must be at most 50'),
      expertiseAreas: z.array(
        z.string()
          .min(2, 'Each expertise area must be at least 2 characters')
          .max(50, 'Each expertise area must be at most 50 characters')
          .transform(stripHtml)
      )
        .min(1, 'At least one expertise area is required')
        .max(10, 'At most 10 expertise areas are allowed'),
      motivation: z.string()
        .min(30, 'Motivation must be at least 30 characters')
        .max(2000, 'Motivation must be at most 2000 characters')
        .transform(stripHtml),
      linkedInUrl: optionalUrl,
      portfolioUrl: optionalUrl,
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

  adminListStaffApplications: z.object({
    query: z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      search: z.string().max(120, 'Search text too long').optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
  }),

  adminReviewStaffApplication: z.object({
    params: z.object({
      applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID')
    }),
    body: z.object({
      decision: z.enum(['APPROVE', 'REJECT']),
      reviewNotes: z.string()
        .max(1000, 'Review notes must be at most 1000 characters')
        .optional()
        .default('')
        .transform(stripHtml),
    }).refine((data) => {
      if (data.decision === 'REJECT') {
        return data.reviewNotes.length >= 10;
      }
      return true;
    }, {
      message: 'Review notes are required when rejecting an application',
      path: ['reviewNotes']
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
  }),

  staffFollowUpQuery: z.object({
    query: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
      status: z.enum(['PENDING', 'COMPLETED']).optional(),
      reminder: z.enum(['UPCOMING', 'DUE_SOON', 'OVERDUE']).optional(),
      search: z.string().max(120, 'Search text too long').optional()
    })
  }),

  staffFollowUpTaskParam: z.object({
    params: z.object({
      taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID')
    })
  }),

  staffCreateFollowUpTask: z.object({
    body: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
      title: z.string()
        .min(2, 'Title must be at least 2 characters')
        .max(180, 'Title must be at most 180 characters')
        .transform(stripHtml),
      description: z.string()
        .max(2000, 'Description must be at most 2000 characters')
        .optional()
        .default('')
        .transform(stripHtml),
      dueDate: z.coerce.date(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM')
    })
  }),

  staffUpdateFollowUpTask: z.object({
    params: z.object({
      taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID')
    }),
    body: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
      title: z.string()
        .min(2, 'Title must be at least 2 characters')
        .max(180, 'Title must be at most 180 characters')
        .transform(stripHtml)
        .optional(),
      description: z.string()
        .max(2000, 'Description must be at most 2000 characters')
        .transform(stripHtml)
        .optional(),
      dueDate: z.coerce.date().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      status: z.enum(['PENDING', 'COMPLETED']).optional(),
    }).refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required to update follow-up task'
    })
  }),

  staffReportWorkflowQuery: z.object({
    query: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
      state: z.enum(['NEW', 'IN_REVIEW', 'FOLLOW_UP_REQUIRED', 'RESOLVED']).optional(),
      search: z.string().max(120, 'Search text too long').optional(),
    })
  }),

  staffUpdateReportWorkflow: z.object({
    params: z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
      state: z.enum(['NEW', 'IN_REVIEW', 'FOLLOW_UP_REQUIRED', 'RESOLVED']),
      notes: z.string()
        .max(2000, 'Notes must be at most 2000 characters')
        .optional()
        .default('')
        .transform(stripHtml),
    })
  })
};

module.exports = {
  validate,
  schemas
};
