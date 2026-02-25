# AI-Driven Career Intelligence System — Full Project Summary

> **Date:** February 25, 2026
> This document is a complete, honest account of everything built in this project so far — architecture, features, services, routes, models, security, testing, and design decisions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend — Detailed Breakdown](#4-backend--detailed-breakdown)
   - 4.1 [Entry Points](#41-entry-points)
   - 4.2 [Database & Config](#42-database--config)
   - 4.3 [Data Models](#43-data-models)
   - 4.4 [Authentication & Security](#44-authentication--security)
   - 4.5 [Middleware Stack](#45-middleware-stack)
   - 4.6 [API Routes & Controllers](#46-api-routes--controllers)
   - 4.7 [Services Layer](#47-services-layer)
   - 4.8 [Utilities](#48-utilities)
5. [NLP Microservice](#5-nlp-microservice)
6. [Frontend — Detailed Breakdown](#6-frontend--detailed-breakdown)
   - 6.1 [Routing & Access Control](#61-routing--access-control)
   - 6.2 [Pages by Role](#62-pages-by-role)
   - 6.3 [UI Components & Styling](#63-ui-components--styling)
7. [AI & Intelligence Features](#7-ai--intelligence-features)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Testing](#9-testing)
10. [Security Hardening](#10-security-hardening)
11. [Full API Reference](#11-full-api-reference)
12. [File & Directory Structure](#12-file--directory-structure)
13. [Known Limitations & Future Work](#13-known-limitations--future-work)

---

## 1. Project Overview

The **AI-Driven Career Intelligence System** is a full-stack web application designed to help job seekers close the gap between their current skill set and the demands of roles they are targeting. Instead of passively reading a job description, a user can:

- Upload their resume (PDF or DOCX)
- Have their skills extracted automatically by AI
- Paste any job description and get an instant match score
- Receive a prioritised, AI-generated learning roadmap with real resource links
- Track their learning progress skill by skill
- Get personalised career insights and CV completeness feedback
- Browse live job postings (via JSearch integration)
- See which skills are most in demand across the whole platform

Admin and Staff users get additional tooling: user management, platform-wide analytics, per-user reports, and PDF report generation.

---

## 2. System Architecture

The project is split into **three independently runnable services**:

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                     │
│            React SPA  (localhost:3000)               │
└───────────────────────┬─────────────────────────────┘
                        │  HTTP / REST
                        ▼
┌─────────────────────────────────────────────────────┐
│              Node.js / Express Backend               │
│                  (localhost:5000)                    │
│                                                      │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │  Routes  │→ │Controllers │→ │    Services      │  │
│  └──────────┘  └────────────┘  └────────┬────────┘  │
│                                         │            │
│  ┌──────────────────────────────────────▼──────────┐ │
│  │             MongoDB (Mongoose ODM)               │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │  HTTP (internal)
                        ▼
┌─────────────────────────────────────────────────────┐
│            Python NLP Microservice                   │
│         FastAPI  (localhost:8000)                    │
│                                                      │
│   /extract-skills   (keyword matching)               │
│   /semantic-match   (all-MiniLM-L6-v2 embeddings)   │
│   /health                                            │
└─────────────────────────────────────────────────────┘
```

External APIs called from the backend:
- **Groq** (LLaMA-3.3-70b) — AI skill extraction from resume / job text
- **Google Gemini** (gemini-2.0-flash) — resource suggestions for unknown skills
- **JSearch (RapidAPI)** — live job postings matched to a user's skills

---

## 3. Technology Stack

### Backend
| Concern | Library / Version |
|---|---|
| Runtime | Node.js |
| Framework | Express 5.2 |
| Database ORM | Mongoose 9.1 |
| Auth | jsonwebtoken 9, bcryptjs 3 |
| Validation | Zod 4 |
| File Uploads | Multer 2 |
| PDF Parsing | pdf-parse 1.1 |
| DOCX Parsing | mammoth 1.11 |
| PDF Generation | PDFKit 0.17 |
| AI (Groq) | groq-sdk 0.37 |
| AI (Gemini) | @google/generative-ai 0.24 |
| HTTP Client | axios 1.13 |
| Rate Limiting | express-rate-limit 8 |
| Security Headers | helmet 8 |
| Testing | Jest 30 + Supertest 7 |

### Frontend
| Concern | Library / Version |
|---|---|
| Framework | React 18.2 |
| Routing | React Router v6 |
| HTTP | Axios |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui (Card, etc.) |
| Build Tool | Create React App |

### NLP Microservice (Python)
| Concern | Library / Version |
|---|---|
| API Framework | FastAPI 0.115 |
| ASGI Server | Uvicorn 0.32 |
| Data Validation | Pydantic 2.9 |
| Semantic Embeddings | sentence-transformers ≥ 3.0 (all-MiniLM-L6-v2) |
| DL Backend | PyTorch ≥ 2.0 |
| Testing | pytest + httpx |

---

## 4. Backend — Detailed Breakdown

### 4.1 Entry Points

**`src/server.js`** — Production entry point. Loads `.env`, connects to MongoDB via `connectDB()`, then starts the Express HTTP listener on `process.env.PORT` (default `5000`).

**`src/app.js`** — Express application factory. Intentionally kept separate from `server.js` so test files can import the app without triggering a DB connection or listener. This is the standard pattern for testable Node applications.

The app module applies all middleware and mounts all routes before exporting.

---

### 4.2 Database & Config

**`src/config/db.js`** — Connects Mongoose to MongoDB using `MONGO_URI` from environment. A single function exported and called once from `server.js`.

---

### 4.3 Data Models

#### `User`
```
name        String (required)
email       String (required, unique)
password    String (bcrypt hash, required)
role        Enum: USER | STAFF | ADMIN  (default: USER)
active      Boolean (default: true)
phone       String
bio         String
location    String
jobTitle    String
avatar      String (URL, future use)
createdAt   Date
```
The `active` field allows admins to soft-disable accounts without deleting data.

#### `Resume`
```
user            ObjectId → User
fileName        String
filePath        String  (server disk path)
fileSize        Number  (bytes)
fileType        String  (pdf | docx)
extractedText   String  (raw text from file)
extractedSkills [String] (AI-extracted skills)
createdAt       Date
```
Resumes are stored on disk in `backend/uploads/resumes/` and referenced in MongoDB with metadata only (not binary stored in DB).

#### `Comparison`
```
user              ObjectId → User
resume            ObjectId → Resume (nullable)
resumeFileName    String
jobTitle          String
jobDescription    String
jobSkills         [String]
resumeSkills      [String]
commonSkills      [String]
missingSkills     [String]
matchScore        Number  (0–100)
matchingMethod    String  ('all-MiniLM-L6-v2' | 'keyword-fallback')
semanticMatches   [{jobSkill, matchedWith, score, isExact}]
createdAt         Date
```
Stores the full result of every job comparison run by a user. The `semanticMatches` array records which resume skill matched which job skill at what cosine similarity score, enabling detailed audit.

#### `Roadmap`
```
user            ObjectId → User
targetRole      String
resumeSkills    [String]
jobSkills       [String]
missingSkills   [String]
commonSkills    [String]
matchScore      Number
jobTitle        String
skillsToLearn   [{
  skill           String,
  status          Enum: PENDING | IN_PROGRESS | COMPLETED,
  estimateWeeks   Number,
  resources       [Mixed]  // {name, url, type} or legacy strings
  priority        Number
}]
timestamps      createdAt, updatedAt (auto)
```
Resources are stored as `Mixed` so the schema can support both legacy plain-string resources and the newer `{name, url, type}` objects without a migration.

---

### 4.4 Authentication & Security

**JWT-based authentication:**
- Tokens signed with `JWT_SECRET`, 7-day expiry
- Token is included in responses on register/login
- Frontend stores the token in `localStorage` and attaches it as `Authorization: Bearer <token>` on every API request
- `authMiddleware.js` verifies the token, decodes `{ id, role }`, and attaches `req.user`

**Password hashing:**
- bcryptjs with cost factor 10

**Account gating:**
- Disabled accounts get `403 ACCOUNT_DISABLED` on login attempt

---

### 4.5 Middleware Stack

Applied in this order inside `app.js`:

1. **`helmet()`** — Sets security-related HTTP response headers (X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, etc.)

2. **`cors()`** — Configured to allow only `CORS_ORIGIN` (default `http://localhost:3000`), specific HTTP methods, and `Content-Type` / `Authorization` headers

3. **Body parsers** — `express.json({ limit: '50kb' })` and `express.urlencoded({ limit: '50kb' })`. Size limits prevent large-payload denial-of-service

4. **NoSQL Injection sanitizer** — Custom recursive middleware strips any key starting with `$` from `req.body`. This prevents MongoDB operator injection attacks (e.g. `{ "$gt": "" }` as a password)

5. **Rate limiters** (non-test environments only):
   - `generalLimiter` — 300 requests / 15 min / IP applied to all `/api/*`
   - `authLimiter` — 10 requests / 15 min / IP applied to `/api/auth/*` to prevent brute-force
   - `uploadLimiter` — 10 uploads / hour / IP applied to resume upload endpoint

6. **`authMiddleware`** — Verifies JWT, populates `req.user`. Mounted on protected routes

7. **`roleMiddleware`** — Checks `req.user.role` against an allowed list. Returns `403` for unauthorised roles

8. **`validationMiddleware`** — Zod-based schema validation factory. Parses `req.body`, `req.query`, `req.params` through typed schemas. Also strips HTML tags from string fields (XSS defence layer 2). Schemas defined for: `register`, `login`, `createStaff`, `compareJob`, `updateProfile`

9. **`asyncHandler`** — Wraps async route handlers and forwards any thrown error to the global error handler, avoiding uncaught promise rejections

10. **`errorMiddleware`** (last) — Global error handler. Sends structured JSON error responses:
    ```json
    { "ok": false, "error": { "code": "...", "message": "...", "details": [] } }
    ```
    Distinguishes operational errors (`AppError.isOperational`) from unexpected crashes (500 in production, full stack in development)

**`upload.js`** — Multer configuration for resume uploads:
- `dest`: `uploads/resumes/`
- `fileFilter`: accepts only `application/pdf` and DOCX MIME types
- `limits.fileSize`: 5 MB max

---

### 4.6 API Routes & Controllers

All routes are prefixed with `/api`. Full endpoint list:

#### Health (`/api`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Returns system health: server up, DB status, NLP service status |

Implemented in `healthController.js`. Makes a live check to `/health` on the NLP service and reports DB connection state.

---

#### Auth (`/api/auth`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new USER account |
| POST | `/api/auth/login` | Public | Login, receive JWT |

Both endpoints use Zod validation (register: name min 2, email format, password min 6; login: email + password). Returns `{ token, user: { id, name, email, role } }`.

---

#### Users (`/api/users`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/users/me` | Any auth | Get own profile |
| PATCH | `/api/users/me` | Any auth | Update own profile (name, phone, bio, location, jobTitle) |

---

#### Resumes (`/api/resumes`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/resumes/upload` | USER | Upload PDF/DOCX, extract text + skills |
| GET | `/api/resumes` | USER | List own resumes |
| GET | `/api/resumes/:id` | USER | Get single resume details |
| DELETE | `/api/resumes/:id` | USER | Delete resume (DB record + disk file) |

**Upload flow:**
1. Multer saves file to disk
2. `resumeTextExtractor.js` reads text from PDF (pdf-parse) or DOCX (mammoth)
3. `aiSkillExtractorService.js` extracts skills (Groq → NLP fallback)
4. Resume document saved to MongoDB with `extractedText` and `extractedSkills`

---

#### Comparisons (`/api/comparisons`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/comparisons` | USER | Compare job description against user's skills |
| GET | `/api/comparisons` | USER | List own comparisons |
| GET | `/api/comparisons/:id` | USER | Get single comparison |
| DELETE | `/api/comparisons/:id` | USER | Delete comparison |

**Comparison flow:**
1. User POSTs `{ jobTitle, jobDescription, resumeId? }`
2. Job skills extracted from `jobDescription` via `aiSkillExtractorService`
3. Resume skills loaded from DB (selected resume or most recent)
4. `/semantic-match` called on NLP microservice (all-MiniLM-L6-v2 embeddings)
5. Falls back to keyword matching if NLP service is down
6. Full result saved to `Comparison` model
7. Response includes `matchScore`, `commonSkills`, `missingSkills`, `semanticMatches`

---

#### Roadmaps (`/api/roadmap` and `/api/roadmaps`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/roadmaps-new` | USER | Generate AI roadmap for a target role + resume |
| GET | `/api/roadmaps` | USER | List own roadmaps |
| GET | `/api/roadmaps/:id` | USER | Get single roadmap |
| PATCH | `/api/roadmaps/:id/skills/:skillId` | USER | Update skill status (PENDING/IN_PROGRESS/COMPLETED) |
| DELETE | `/api/roadmaps/:id` | USER | Delete roadmap |
| GET | `/api/roadmaps/all` | STAFF, ADMIN | List ALL users' roadmaps |

**Generation flow:**
1. User selects a resume and types a target job role
2. Job skills extracted from role name via AI
3. Resume skills loaded from DB
4. `skillGapService.computeSkillGap()` calculates common, missing, match score
5. `roadmapGenerator.generateRoadmap()` sorts missing skills by priority (foundational first), fetches real resources for each skill
6. Resources come from: curated map (80+ skills) → Gemini AI → YouTube/Google search URL fallback
7. Roadmap saved to DB with `skillsToLearn` array

**Progress tracking:**
- Each skill has a `status` field independently updatable via PATCH
- `calculateProgress()` returns percentage of COMPLETED skills

---

#### Analytics (`/api/analytics`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/analytics/users` | STAFF, ADMIN | List all users (searchable, filterable by role) |
| GET | `/api/analytics/skill-demand` | Any auth | Top 10 + bottom 10 skills by demand (date filterable) |
| GET | `/api/analytics/common-gaps` | STAFF, ADMIN | Most common missing skills platform-wide |
| GET | `/api/analytics/user-insights/:userId?` | Any auth | Personalised insights for a user |
| GET | `/api/analytics/cv-completeness/:userId?` | Any auth | CV completeness score |
| GET | `/api/analytics/cv-ai-suggestions` | Any auth | Gemini-powered CV improvement tips |
| GET | `/api/analytics/my-resumes` | Any auth | Current user's resumes |

Users can only see their own data; STAFF/ADMIN can query any user.

---

#### Reports (`/api/reports`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/reports/summary` | ADMIN | Platform summary report (JSON) |
| GET | `/api/reports/user/:userId` | ADMIN, STAFF | Per-user report (JSON) |
| GET | `/api/reports/summary/pdf` | ADMIN | Platform summary report (PDF download) |
| GET | `/api/reports/user/:userId/pdf` | ADMIN, STAFF | Per-user report (PDF download) |

PDF generation is done entirely server-side with PDFKit. Reports are styled with a professional monochrome palette, include section headers, progress bars, skill lists, and are streamed directly to the response (no temp files).

---

#### Notifications (`/api/notifications`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/notifications` | Any auth | Get role-aware notifications list |

The notifications controller queries the live database (not a notification queue) and generates context-aware messages:
- **USER**: Latest resumes analysed, roadmap progress, comparison scores, action prompts if nothing uploaded
- **STAFF**: Recent USER + STAFF activity, roadmap stats
- **ADMIN**: New users this week, upload activity, low-match alerts, platform counts

---

#### Admin (`/api/admin`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/admin/staff` | ADMIN | Create a STAFF account |
| GET | `/api/admin/users` | ADMIN | List all users (paginated, searchable) |
| PATCH | `/api/admin/users/:userId/status` | ADMIN | Enable / disable a user account |
| GET | `/api/admin/users/:userId/report` | ADMIN | Full report for a specific user |
| GET | `/api/admin/platform-stats` | ADMIN | Platform wide statistics |

Admins cannot disable their own account (guarded check in controller).

---

### 4.7 Services Layer

All business logic lives in `src/services/` — controllers are thin.

#### `aiSkillExtractorService.js`
3-layer skill extraction pipeline:
1. **Groq (LLaMA-3.3-70b)** — sends text (truncated to 3,000 chars) to Groq API with a strict system prompt, parses JSON array from response. Temperature 0.1 for deterministic output.
2. **NLP keyword service** — POST to `/extract-skills` on the Python microservice
3. **Empty array** — never crashes the caller; returns `{ skills: [], source: 'none' }`

Returns `{ skills: string[], source: 'groq' | 'keyword' | 'none' }`.

#### `analyticsService.js`
The largest service (666 lines). Contains:
- `getSkillDemandStats({ startDate?, endDate? })` — aggregates `jobSkills` across all Roadmaps, returns top 10 / bottom 10 by frequency
- `getCommonGaps(limit)` — aggregates `missingSkills` across all Roadmaps
- `getUserInsights(userId, roadmapId?, resumeId?)` — cross-references a user's skills vs platform demand, generates natural language `reasons`, `prioritySkills`, `actions`
- `getCVCompleteness(userId, resumeId?)` — scores the resume on sections found (contact, education, experience, skills, projects, certifications)
- `getCVAISuggestions(userId, resumeId?)` — sends resume text to Gemini API and returns bullet-point improvement suggestions
- `getPlatformSummaryReport()` — counts all users, resumes, roadmaps, comparisons; computes average match score; finds top missing skills
- `generateUserReport(userId)` — per-user deep report used for both JSON and PDF endpoints

#### `roadmapGenerator.js`
- `generateRoadmap(missingSkills, targetRole)` — sorts skills by a priority map (foundational/languages → frameworks → DevOps → ML), estimates weeks per skill, fetches resources in parallel with `Promise.all`
- `calculateProgress(skills)` — percentage of COMPLETED skills

#### `resourceEnrichmentService.js`
3-layer resource fetching:
1. **Curated map** — 80+ skills with real, manually verified URLs across Official Docs, YouTube (freeCodeCamp etc.), free books, and interactive tutorials
2. **Gemini AI** — for any skill not in the curated map, generates 3–4 resources using Gemini 2.0 Flash (free tier)
3. **Search URL fallback** — constructs `https://www.youtube.com/results?search_query=learn+{skill}` and a Google search URL — always works even with no API keys

Resources returned as `{ name, url, type }` where type is `documentation | tutorial | video | course | article`.

An in-memory cache (`Map`) avoids re-fetching resources for the same skill within a session.

#### `skillGapService.js`
Pure function `computeSkillGap(resumeSkills, jobSkills)`:
- Normalises both arrays (lowercase, trim, deduplicate)
- Returns `{ commonSkills, missingSkills, matchScore }`
- Used as the keyword-level fallback when semantic matching is unavailable

#### `resumeTextExtractor.js`
- Detects file type from MIME or extension
- Uses `pdf-parse` for PDFs
- Uses `mammoth` for DOCX

#### `reportService.js`
Full PDF layout engine built on PDFKit:
- Professional monochrome colour palette (`C` constants)
- Helper functions: `rect()`, `borderedRect()`, `progressBar()`, `hLine()`
- `drawHeader()` — dark banner with title, subtitle, generated date
- `drawSectionTitle()` — dark background section headers
- `drawFooter()` — page number, timestamp
- `streamPlatformSummaryPDF(report, res)` — builds and pipes platform summary PDF
- `streamUserReportPDF(report, res)` — builds and pipes per-user PDF

#### `recommendationService.js`
Lightweight supplemental resource map for a subset of skills. Returns platform + level + URL objects. Acts as a simpler/older alternative to `resourceEnrichmentService`.

---

### 4.8 Utilities

#### `AppError.js`
Custom error class extending `Error`. Factory methods:
- `AppError.badRequest(code, message, details)` — 400
- `AppError.unauthorized(message)` — 401
- `AppError.forbidden(message)` — 403
- `AppError.notFound(message)` — 404
- `AppError.conflict(message)` — 409
- `AppError.internal(message)` — 500
- `AppError.validationError(message, details)` — 400

All errors carry `isOperational = true` to distinguish them from programming bugs in the error handler.

#### `responseHelper.js`
`successResponse(data, message)` and `errorResponse(code, message, details)` — enforce a consistent response envelope:
```json
{ "ok": true, "data": {}, "message": "..." }
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

#### `skillNormalizer.js`
Utility to normalise skill name strings for consistent comparison (lowercase, trim, deduplication helpers).

---

## 5. NLP Microservice

**Language:** Python 3.x  
**Framework:** FastAPI 0.115 + Uvicorn  
**Port:** 8000

### Endpoints

#### `GET /health`
Returns `{ ok, service, semanticModel }`. `semanticModel` is `true` if the sentence-transformer model loaded successfully. Used by the backend health check.

#### `POST /extract-skills`
**Request:** `{ text: string }`  
**Response:** `{ skills: string[] }`

Uses a curated `SKILL_PATTERNS` set (170+ tech skills) to match against the input text with regex word boundary matching. Handles multi-word skills (`"machine learning"`, `"react native"`), dot-notation (`"node.js"`), and maps aliases to canonical names (`"js"` → `"JavaScript"`, `"k8s"` → `"Kubernetes"`).

This endpoint is now a **fallback** — the primary extraction happens in the Node backend via Groq AI.

#### `POST /semantic-match`
**Request:** `{ resume_skills: string[], job_skills: string[], threshold?: float }`  
**Response:** `{ matchScore, commonSkills, missingSkills, semanticMatches, modelUsed }`

Primary matching method used by the comparison feature:
1. Loads `all-MiniLM-L6-v2` sentence-transformer model lazily on first call (cached globally)
2. Encodes both skill lists into embedding vectors
3. For each job skill, computes cosine similarity against all resume skill embeddings
4. Skills above `threshold` (default 0.50) are counted as matched — even if the words differ (e.g. `"ML"` matches `"Machine Learning"`)
5. Falls back to exact keyword matching if the model failed to load

This enables **semantic skill matching** — a major advantage over pure keyword matching that would miss synonyms.

---

## 6. Frontend — Detailed Breakdown

### 6.1 Routing & Access Control

The React app uses React Router v6 with two custom wrapper components:

**`ProtectedRoute.jsx`** — Checks for a JWT token in `localStorage`. If missing or expired, redirects to `/login`.

**`RoleRoute.jsx`** — Checks `user.role` against an allowed roles array prop. If the role doesn't match, redirects to the appropriate dashboard.

### 6.2 Pages by Role

#### Public Pages (no login required)
| Route | Component | Purpose |
|---|---|---|
| `/` | `WelcomePage` | Landing page, links to Login/Register |
| `/login` | `Login` | Email + password login form |
| `/register` | `Register` | Registration form |
| `/health` | `Health` | System health display page |
| `/ping` | `Ping` | Connectivity test |

#### USER Role Pages
| Route | Component | Purpose |
|---|---|---|
| `/dashboard` | `Dashboard` | Home dashboard with 6 feature cards |
| `/resume-analyze` | `ResumeAnalyze` | Upload resume, view extracted skills |
| `/my-resumes` | `MyResumes` | List all uploaded resumes with details |
| `/compare-job` | `CompareJob` | Paste job description, get match score |
| `/my-roadmap` | `MyRoadmap` | View + manage learning roadmaps |
| `/analytics` | `Analytics` | CV completeness + personal insights |
| `/job-postings` | `JobPostings` | Browse live jobs via JSearch API |
| `/skills-in-demand` | `SkillsInDemand` | Top/bottom skills chart platform-wide |

#### STAFF Role Pages
| Route | Component | Purpose |
|---|---|---|
| `/staff-home` | `StaffHome` | Staff welcome/nav page |
| `/staff` | `StaffDashboard` | View all users' roadmaps, run reports |
| `/all-roadmaps` | `AllRoadmaps` | Table of all roadmaps on platform |

#### ADMIN Role Pages
| Route | Component | Purpose |
|---|---|---|
| `/admin` | `AdminDashboard` | Platform stats overview |
| `/users` | `UserManagement` | List/search/disable user accounts |
| `/staff-management` | `StaffManagement` | Create and manage staff accounts |
| `/admin-report` | `AdminReport` | Platform summary report + PDF download |

### 6.3 UI Components & Styling

**`Layout.jsx`** — Shared shell wrapping all protected pages. Includes:
- Role-aware sidebar navigation (different links shown per USER/STAFF/ADMIN)
- Live notification bell (polls `/api/notifications`)
- User profile display (name, role badge)
- Logout button

**`src/components/ui/`** — shadcn/ui components: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`. Used for consistent card-based layouts across all pages.

**Tailwind CSS** — Utility-first CSS. Config in `tailwind.config.js`. Custom colour extensions for the dark slate theme used throughout.

**Dashboard feature cards** — Each feature has an associated colour (`blue`, `violet`, `orange`, `indigo`, `green`, `purple`) applied to icon badge, heading, CTA text, and hover strip.

**`api/api.js`** — Centralised Axios instance with:
- `baseURL: http://localhost:5000/api`
- Request interceptor adds `Authorization: Bearer <token>` from `localStorage`
- Response interceptor handles 401 (clears storage, redirects to login)

---

## 7. AI & Intelligence Features

### Feature 1 — AI Skill Extraction (Groq)
When a resume or job description is submitted, the text is sent to Groq's LLaMA-3.3-70b model with a strict extraction prompt. The model returns a clean JSON array of skills. This approach handles:
- Skill synonyms and abbreviations ("JS" → detected as JavaScript in context)
- Skills mentioned in sentences without explicit bullet points
- Non-standard skill naming

### Feature 2 — Semantic Skill Matching (sentence-transformers)
Skill comparison does not rely on string equality. The NLP microservice uses `all-MiniLM-L6-v2` to convert skills to embeddings and computes cosine similarity. This means:
- `"ML"` can match `"Machine Learning"` (semantic similarity)
- `"React"` can match `"ReactJS"` or `"React.js"`
- The threshold (default 0.5) is configurable per request

### Feature 3 — AI Learning Roadmap Generation
Missing skills are prioritised (foundational → frameworks → DevOps → specialist) and assembled into a step-by-step learning plan. Resources are fetched from:
- A manually curated library of 80+ skills with real, verified URLs
- Gemini AI for unknown/emerging skills (free tier, gemini-2.0-flash)
- YouTube/Google search URL construction as a universal fallback

### Feature 4 — AI CV Improvement Suggestions
Sends the user's resume text to Gemini AI with a structured prompt requesting specific, actionable improvement suggestions. Returns bullet points rendered directly in the Analytics page.

### Feature 5 — CV Completeness Scoring
Analyses the `extractedText` of a resume and awards points for detected sections (contact info, education, work experience, skills section, projects, certifications). Returns a 0–100 score with per-section breakdown.

### Feature 6 — Platform Skill Demand Analytics
Aggregates `jobSkills` arrays across all stored Comparisons and Roadmaps to compute platform-wide skill frequency rankings. Users can see which skills are most in demand, helping them prioritise their learning.

### Feature 7 — Personalised Career Insights
Cross-references a user's resume skills against the platform's top-demand skills to generate specific insights:
- Skills the user is missing that are high-demand
- Actions to take based on roadmap progress
- Encouragement if skills are already well-aligned

---

## 8. Role-Based Access Control (RBAC)

Three roles exist in the system:

| Role | Description |
|---|---|
| `USER` | Standard job seeker. Full access to resume, comparison, roadmap, analytics, job postings features |
| `STAFF` | Career advisor / moderator. Can view all users' roadmaps, generate per-user reports, access analytics |
| `ADMIN` | System administrator. All STAFF capabilities plus: create/disable accounts, platform reports, staff management |

RBAC is enforced at two levels:
1. **Backend** — `authMiddleware` verifies JWT, `roleMiddleware` checks role
2. **Frontend** — `RoleRoute` wrapper redirects to appropriate dashboard if role doesn't match; sidebar links are filtered by role

Admin accounts are created by seeding the database directly (no public registration for ADMIN). STAFF accounts are created by an ADMIN via the `/api/admin/staff` endpoint.

---

## 9. Testing

The backend has a full Jest + Supertest test suite in `backend/tests/`.

### Test Files

| File | What it tests |
|---|---|
| `auth.test.js` | Register/login, edge cases (duplicate email, invalid fields, HTML stripping) |
| `resume.test.js` | Resume upload, list, delete |
| `compare.test.js` | Job comparison endpoint |
| `roadmap.test.js` | Roadmap generation, skill status updates |
| `analytics.test.js` | Analytics endpoints |

### Testing Pattern
- MongoDB models are **mocked** with `jest.mock(...)` — no real DB connection needed for unit/integration tests
- `tests/setup.js` configures environment variables (`NODE_ENV=test`, `JWT_SECRET`, etc.)
- `tests/helpers.js` provides shared factory functions (create test user, generate token, etc.)
- Rate limiting is **disabled** in test mode (`process.env.NODE_ENV === 'test'`)
- Tests run in band (`--runInBand`) to avoid parallel DB conflicts

### NPM Test Commands
```bash
npm test                 # All tests
npm run test:auth        # Auth tests only
npm run test:compare     # Comparison tests only
npm run test:roadmap     # Roadmap tests only
npm run test:analytics   # Analytics tests only
npm run test:resume      # Resume tests only
npm run test:coverage    # All tests + coverage report
```

---

## 10. Security Hardening

Security measures implemented across the stack:

| Layer | Measure | Details |
|---|---|---|
| HTTP | Helmet | Sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP headers |
| HTTP | CORS | Restricted to `CORS_ORIGIN`, explicit method + header whitelist |
| HTTP | Rate limiting | Auth: 10/15min; General: 300/15min; Uploads: 10/hour |
| Input | Zod validation | Type-strict schemas on all mutation endpoints |
| Input | HTML stripping | Strip `<tags>` from string fields in Zod transforms |
| Input | NoSQL injection | Recursive `$`-key filtering on `req.body` |
| Input | Payload size | JSON body limited to 50 KB |
| Input | File type check | Multer fileFilter rejects non-PDF/DOCX |
| Input | File size limit | 5 MB max per resume |
| Auth | bcrypt | Password hashing, cost factor 10 |
| Auth | JWT expiry | 7-day token lifespan |
| Auth | Account disable | Blocked users receive 403 on login |
| Logic | RBAC | Role enforced on every protected route |
| Logic | Ownership checks | Users can only access their own resources |

---

## 11. Full API Reference

### Summary by Category

```
Public
  GET  /api/health
  POST /api/auth/register
  POST /api/auth/login

Users
  GET    /api/users/me
  PATCH  /api/users/me

Resumes
  POST   /api/resumes/upload
  GET    /api/resumes
  GET    /api/resumes/:id
  DELETE /api/resumes/:id

Comparisons
  POST   /api/comparisons
  GET    /api/comparisons
  GET    /api/comparisons/:id
  DELETE /api/comparisons/:id

Roadmaps
  POST   /api/roadmaps-new
  GET    /api/roadmaps
  GET    /api/roadmaps/:id
  PATCH  /api/roadmaps/:id/skills/:skillId
  DELETE /api/roadmaps/:id
  GET    /api/roadmaps/all       [STAFF+]

Analytics
  GET /api/analytics/users                     [STAFF+]
  GET /api/analytics/skill-demand
  GET /api/analytics/common-gaps               [STAFF+]
  GET /api/analytics/user-insights/:userId?
  GET /api/analytics/cv-completeness/:userId?
  GET /api/analytics/cv-ai-suggestions
  GET /api/analytics/my-resumes

Reports
  GET /api/reports/summary                     [ADMIN]
  GET /api/reports/user/:userId                [STAFF+]
  GET /api/reports/summary/pdf                 [ADMIN]
  GET /api/reports/user/:userId/pdf            [STAFF+]

Notifications
  GET /api/notifications

Admin
  POST  /api/admin/staff
  GET   /api/admin/users
  PATCH /api/admin/users/:userId/status
  GET   /api/admin/users/:userId/report
  GET   /api/admin/platform-stats
```

---

## 12. File & Directory Structure

```
AI-Driven-Career-Intelligence-System/
├── README.md
├── STARTUP.md
├── PROJECT_SUMMARY.md          ← this file
│
├── backend/
│   ├── package.json
│   └── src/
│       ├── app.js              Express app factory
│       ├── server.js           HTTP entry point
│       ├── config/
│       │   └── db.js           MongoDB connection
│       ├── controllers/
│       │   ├── adminController.js
│       │   ├── analyticsController.js
│       │   ├── authController.js
│       │   ├── comparisonController.js
│       │   ├── healthController.js
│       │   ├── newRoadmapController.js
│       │   ├── notificationsController.js
│       │   ├── reportController.js
│       │   ├── resumeController.js
│       │   ├── roadmapController.js
│       │   └── userController.js
│       ├── middleware/
│       │   ├── asyncHandler.js
│       │   ├── authMiddleware.js
│       │   ├── errorMiddleware.js
│       │   ├── rateLimitMiddleware.js
│       │   ├── upload.js
│       │   └── validationMiddleware.js
│       ├── models/
│       │   ├── Comparison.js
│       │   ├── Resume.js
│       │   ├── Roadmap.js
│       │   └── User.js
│       ├── routes/
│       │   ├── adminRoutes.js
│       │   ├── analyticsRoutes.js
│       │   ├── authRoutes.js
│       │   ├── comparisonRoutes.js
│       │   ├── healthRoutes.js
│       │   ├── newRoadmapRoutes.js
│       │   ├── notificationsRoutes.js
│       │   ├── reportRoutes.js
│       │   ├── resumeRoutes.js
│       │   ├── roadmapRoutes.js
│       │   └── userRoutes.js
│       ├── services/
│       │   ├── aiSkillExtractorService.js   Groq + NLP fallback
│       │   ├── analyticsService.js          All analytics logic (666 lines)
│       │   ├── recommendationService.js     Supplemental resource map
│       │   ├── reportService.js             PDFKit PDF generation
│       │   ├── resourceEnrichmentService.js 80+ skill curated links + Gemini
│       │   ├── resumeTextExtractor.js       PDF/DOCX text extraction
│       │   ├── roadmapGenerator.js          Roadmap step builder
│       │   └── skillGapService.js           Keyword gap computation
│       └── utils/
│           ├── AppError.js
│           ├── responseHelper.js
│           └── skillNormalizer.js
│   ├── tests/
│   │   ├── setup.js
│   │   ├── helpers.js
│   │   ├── auth.test.js
│   │   ├── resume.test.js
│   │   ├── compare.test.js
│   │   ├── roadmap.test.js
│   │   └── analytics.test.js
│   └── uploads/
│       └── resumes/            Uploaded resume files stored here
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js              Router with all routes defined
│       ├── api/
│       │   └── api.js          Axios instance with auth interceptors
│       ├── auth/
│       │   ├── ProtectedRoute.jsx
│       │   └── RoleRoute.jsx
│       ├── components/
│       │   ├── Layout.jsx      Main shell with sidebar + notifications
│       │   └── ui/             shadcn/ui components (Card, etc.)
│       └── pages/
│           ├── WelcomePage.jsx
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── ResumeAnalyze.jsx
│           ├── MyResumes.jsx
│           ├── CompareJob.jsx
│           ├── MyRoadmap.jsx
│           ├── Analytics.jsx
│           ├── JobPostings.jsx
│           ├── SkillsInDemand.jsx
│           ├── StaffHome.jsx
│           ├── StaffDashboard.jsx
│           ├── AllRoadmaps.jsx
│           ├── AdminDashboard.jsx
│           ├── UserManagement.jsx
│           ├── StaffManagement.jsx
│           ├── AdminReport.jsx
│           ├── Health.jsx
│           └── Logout.jsx
│
└── nlp-service/
    ├── main.py                 FastAPI app: /health, /extract-skills, /semantic-match
    ├── requirements.txt
    └── tests/
        └── test_nlp.py
```

---

## 13. Known Limitations & Future Work

### Current Limitations
- **No email verification** — Users register without confirming their email
- **No password reset** — There is no forgot-password / reset-password flow
- **Resumes stored on disk** — Not suitable for multi-instance deployment; should use cloud object storage (S3, GCS)
- **JWT stored in localStorage** — Susceptible to XSS; `httpOnly` cookies would be more secure
- **No real-time updates** — Notifications are polled, not pushed (no WebSocket or SSE)
- **Job postings** — JSearch integration may have API rate limits on free tier
- **NLP model cold start** — `all-MiniLM-L6-v2` loads lazily on first semantic-match request, causing a delay
- **Gemini free tier limits** — CV suggestions and unknown-skill resources could fail under heavy use

### Potential Next Steps
- Email verification and password reset via nodemailer
- Cloud file storage for resumes (AWS S3 / Cloudinary)
- Move JWT to `httpOnly` cookies to eliminate XSS risk
- Add WebSocket/SSE for real-time notifications and progress updates
- Implement a job application tracker (save/apply/interview stages)
- Add more granular analytics (skill growth over time, comparison history chart)
- Containerise all three services with Docker Compose for one-command startup
- CI/CD pipeline with GitHub Actions (run tests on every push)
- Pagination on more list endpoints (resumes, comparisons)
- Admin activity audit log

---

*Generated from codebase analysis — February 25, 2026*
