const Roadmap = require("../models/Roadmap");
const User = require("../models/User");
const Resume = require("../models/Resume");
const Comparison = require("../models/Comparison");
const axios = require("axios");

/**
 * Analytics Service
 * All analytics calculations live here (not in controllers)
 */

/**
 * Get skill demand statistics based on stored jobSkills frequency
 * @param {Object} options - { startDate?, endDate? }
 * @returns {Object} { top: [{skill, count}], least: [{skill, count}] }
 */
async function getSkillDemandStats(options = {}) {
  const { startDate, endDate } = options;

  // Build query filter
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Primary source: comparison records created from job-vs-resume checks.
  // Fallback: roadmap jobSkills (legacy data), so existing environments still show demand.
  const [comparisons, roadmaps] = await Promise.all([
    Comparison.find(filter).select("jobSkills"),
    Roadmap.find(filter).select("jobSkills"),
  ]);

  // Count skill occurrences from jobSkills arrays.
  // We count a skill once per document to avoid duplicate entries inflating counts.
  const skillCounts = {};

  const countSkillsFromDocs = (docs) => {
    docs.forEach((doc) => {
      if (!doc.jobSkills || !Array.isArray(doc.jobSkills)) return;

      const uniqueSkills = new Set(
        doc.jobSkills
          .map((skill) => (skill || "").trim().toLowerCase())
          .filter(Boolean)
      );

      uniqueSkills.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
  };

  countSkillsFromDocs(comparisons);

  // Legacy fallback only if there is no comparison-derived signal.
  if (Object.keys(skillCounts).length === 0) {
    countSkillsFromDocs(roadmaps);
  }

  // Convert to array and sort
  const skillArray = Object.entries(skillCounts).map(([skill, count]) => ({
    skill,
    count,
  }));

  skillArray.sort((a, b) => b.count - a.count);

  // Top 10 and bottom 10
  const top = skillArray.slice(0, 10);
  const least = skillArray.slice(-10).reverse(); // Reverse to show lowest first

  return { top, least };
}

/**
 * Get most common missing skills across all users
 * @param {number} limit - Number of top skills to return
 * @returns {Array} [{skill, count}]
 */
async function getCommonGaps(limit = 10) {
  // Fetch all roadmaps with missingSkills
  const roadmaps = await Roadmap.find().select("missingSkills");

  // Count occurrences of missing skills
  const gapCounts = {};
  roadmaps.forEach((roadmap) => {
    if (roadmap.missingSkills && Array.isArray(roadmap.missingSkills)) {
      roadmap.missingSkills.forEach((skill) => {
        const normalized = skill.trim().toLowerCase();
        if (normalized) {
          gapCounts[normalized] = (gapCounts[normalized] || 0) + 1;
        }
      });
    }
  });

  // Convert to array and sort
  const gapArray = Object.entries(gapCounts).map(([skill, count]) => ({
    skill,
    count,
  }));

  gapArray.sort((a, b) => b.count - a.count);

  return gapArray.slice(0, limit);
}

/**
 * Generate insights for a specific user
 * @param {string} userId - User ID
 * @param {string} roadmapId - Optional specific roadmap ID
 * @param {string} resumeId - Optional specific resume ID to analyse
 * @returns {Object} { reasons: [], prioritySkills: [], actions: [], resumeSkills: [] }
 */
async function getUserInsights(userId, roadmapId = null, resumeId = null) {
  // Get skill demand stats first
  const demandStats = await getSkillDemandStats();
  const topDemandSkills = demandStats.top.map((item) => item.skill.toLowerCase());

  // Get resume skills if a specific resume is selected
  let resumeSkills = [];
  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (resume) resumeSkills = resume.extractedSkills || [];
  } else {
    // Fall back to most recent resume
    const latestResume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
    if (latestResume) resumeSkills = latestResume.extractedSkills || [];
  }

  // Get user's roadmaps
  const roadmaps = await Roadmap.find({ user: userId }).sort({ createdAt: -1 }).limit(1);

  const reasons = [];
  const prioritySkills = [];
  const actions = [];

  // --- Analyse resume skills vs top demand ---
  if (resumeSkills.length > 0) {
    const resumeSkillsLower = resumeSkills.map((s) => s.toLowerCase());
    const missingHighDemand = topDemandSkills
      .filter((skill) => !resumeSkillsLower.includes(skill))
      .slice(0, 5);

    if (missingHighDemand.length > 0) {
      reasons.push(`Your resume is missing ${missingHighDemand.length} high-demand skill(s) employers want`);
      prioritySkills.push(...missingHighDemand);
    } else if (topDemandSkills.length > 0) {
      reasons.push("Your resume already covers most in-demand skills - great position!");
      actions.push("Start applying to roles that match your skill set");
    }
  }

  // --- Analyse roadmap missing skills ---
  if (roadmaps.length > 0) {
    const roadmap = roadmaps[0];
    const missingSkills = roadmap.missingSkills || [];

    if (missingSkills.length === 0) {
      reasons.push("You have all the required skills for your target role!");
      actions.push("Apply to jobs matching your profile");
    } else {
      const highDemandMissing = missingSkills.filter((skill) =>
        topDemandSkills.includes(skill.toLowerCase())
      );

      if (highDemandMissing.length > 0) {
        reasons.push(`${highDemandMissing.length} of your skill gaps are highly demanded by employers`);
        highDemandMissing.forEach((s) => {
          if (!prioritySkills.map((p) => p.toLowerCase()).includes(s.toLowerCase()))
            prioritySkills.push(s);
        });
      }

      if (missingSkills.length > 5) {
        reasons.push(`You have ${missingSkills.length} total skill gaps to close`);
      } else if (missingSkills.length > 0) {
        reasons.push(`You have ${missingSkills.length} skill gap(s) - almost there!`);
      }

      const otherMissing = missingSkills.filter(
        (s) => !prioritySkills.map((p) => p.toLowerCase()).includes(s.toLowerCase())
      );
      prioritySkills.push(...otherMissing);
    }
  } else if (resumeSkills.length === 0) {
    reasons.push("No resume or roadmap found for this account");
    actions.push("Upload your resume and compare with a job description");
  }

  // Generate action steps
  if (prioritySkills.length > 0) {
    actions.push(`Start learning: ${prioritySkills[0]}`);
  }
  if (prioritySkills.length > 1) {
    actions.push(`Next, focus on: ${prioritySkills[1]}`);
  }
  if (roadmaps.length > 0) {
    actions.push("Track your progress in My Roadmaps");
    actions.push("Update roadmap status as you complete skills");
  }

  return {
    reasons,
    prioritySkills: [...new Set(prioritySkills)].slice(0, 5),
    actions,
    resumeSkills,
  };
}

/**
 * Calculate CV completeness score based on actual resume content
 * @param {string} userId - User ID
 * @param {string} resumeId - Optional: score a specific resume instead of the latest
 * @returns {Object} { score, resumeId, fileName, missingSections: [], suggestions: [] }
 */
async function getCVCompleteness(userId, resumeId = null) {
  // Get user data
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("User not found");

  // Get specific or most recent resume
  const resume = resumeId
    ? await Resume.findOne({ _id: resumeId, user: userId })
    : await Resume.findOne({ user: userId }).sort({ createdAt: -1 });

  if (!resume) {
    return {
      score: 0,
      resumeId: null,
      fileName: null,
      missingSections: ["Resume"],
      suggestions: ["Upload your resume to get a completeness score"],
    };
  }

  // Analyse actual resume text content
  const text = resume.extractedText || "";

  const sectionDetected = {
    workExperience: /work experience|professional experience|employment history|experience/i.test(text),
    education: /education|university|college|degree|bachelor|master|phd|b\.sc|m\.sc|diploma|school/i.test(text),
    skills: (resume.extractedSkills || []).length > 0,
    projects: /project|portfolio|built|developed|created|designed/i.test(text),
    summary: /summary|objective|profile|about me|career goal|professional summary/i.test(text),
    certifications: /certification|certificate|certified|aws|google cloud|microsoft|coursera|udemy|comptia/i.test(text),
    contactInfo: !!(user.name && user.email),
  };

  // Weighted scoring based on real CV content (total = 100)
  const weights = {
    workExperience: 25,
    education: 20,
    skills: 20,
    projects: 15,
    summary: 10,
    certifications: 5,
    contactInfo: 5,
  };

  let score = 0;
  const missingSections = [];
  const suggestions = [];

  if (sectionDetected.workExperience) {
    score += weights.workExperience;
  } else {
    missingSections.push("Work Experience");
    suggestions.push("Add a Work Experience section with job titles, companies and dates");
  }

  if (sectionDetected.education) {
    score += weights.education;
  } else {
    missingSections.push("Education");
    suggestions.push("Include your education details (degree, institution, graduation year)");
  }

  if (sectionDetected.skills) {
    score += weights.skills;
  } else {
    missingSections.push("Skills");
    suggestions.push("List technical and soft skills clearly - these are auto-extracted by the system");
  }

  if (sectionDetected.projects) {
    score += weights.projects;
  } else {
    missingSections.push("Projects");
    suggestions.push("Add 2–3 projects with descriptions to showcase practical experience");
  }

  if (sectionDetected.summary) {
    score += weights.summary;
  } else {
    missingSections.push("Profile Summary");
    suggestions.push("Write a 2–3 sentence professional summary at the top of your CV");
  }

  if (sectionDetected.certifications) {
    score += weights.certifications;
  } else {
    suggestions.push("Consider adding certifications (AWS, Google, Coursera, etc.) to boost your profile");
  }

  if (sectionDetected.contactInfo) {
    score += weights.contactInfo;
  } else {
    missingSections.push("Contact Information");
    suggestions.push("Ensure your account profile has a complete name and email address");
  }

  // Bonus insight: roadmap progress
  const roadmap = await Roadmap.findOne({ user: userId }).sort({ createdAt: -1 });
  if (roadmap) {
    const skills = roadmap.skillsToLearn || [];
    const completed = skills.filter((s) => s.status === "COMPLETED").length;
    const total = skills.length;
    if (total > 0 && completed < total) {
      suggestions.push(`Continue your learning roadmap (${completed}/${total} skills completed)`);
    } else if (total > 0 && completed === total) {
      suggestions.push("All roadmap skills completed - compare with a new job role!");
    }
  } else {
    suggestions.push("Compare your resume with a job description to discover skill gaps");
  }

  return {
    score: Math.min(score, 100),
    resumeId: resume._id,
    fileName: resume.fileName,
    extractedSkills: resume.extractedSkills || [],
    missingSections,
    suggestions,
    sectionsDetected: sectionDetected,
  };
}

/**
 * Generate AI-powered CV improvement suggestions using Gemini
 * @param {string} userId - User ID
 * @param {string} resumeId - Specific resume ID to analyse
 * @returns {Object} { suggestions: string[], score, fileName, model }
 */
async function getCVAISuggestions(userId, resumeId = null) {
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("User not found");

  const resume = resumeId
    ? await Resume.findOne({ _id: resumeId, user: userId })
    : await Resume.findOne({ user: userId }).sort({ createdAt: -1 });

  if (!resume) {
    return {
      suggestions: ["Upload a resume first so AI can analyse it."],
      fileName: null,
      score: 0,
      model: "none",
    };
  }

  // Gather context for the prompt
  const extractedSkills = (resume.extractedSkills || []).join(", ") || "none";
  const text = resume.extractedText || "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const sectionDetected = {
    workExperience: /work experience|professional experience|employment history|experience/i.test(text),
    education: /education|university|college|degree|bachelor|master|phd|b\.sc|m\.sc|diploma|school/i.test(text),
    skills: (resume.extractedSkills || []).length > 0,
    projects: /project|portfolio|built|developed|created|designed/i.test(text),
    summary: /summary|objective|profile|about me|career goal|professional summary/i.test(text),
    certifications: /certification|certificate|certified|aws|google cloud|microsoft|coursera|udemy|comptia/i.test(text),
  };

  const missingSections = Object.entries(sectionDetected)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim());

  const resumeSnippet = text.length > 1500 ? text.substring(0, 1500) + "..." : text;

  const prompt = `You are an expert career coach and CV reviewer. Analyse the following resume data and provide 6 specific, actionable, personalised suggestions to improve the CV's quality, ATS score, and overall professionalism.

RESUME OVERVIEW:
- File name: ${resume.fileName}
- Word count: ${wordCount}
- Detected skills: ${extractedSkills}
- Missing sections: ${missingSections.length > 0 ? missingSections.join(", ") : "None"}
- Sections present: ${Object.entries(sectionDetected).filter(([, v]) => v).map(([k]) => k).join(", ") || "None detected"}

RESUME TEXT SNIPPET:
${resumeSnippet}

Please provide exactly 6 specific suggestions formatted as a JSON array of strings. Each suggestion should be:
- Specific to this resume's content (not generic advice)
- Actionable (what exactly to do)
- Maximum 2 sentences each

Respond ONLY with a valid JSON array, no other text. Example format:
["Suggestion 1 here.", "Suggestion 2 here.", ...]`;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      suggestions: [
        "Add a concise professional summary at the top of your CV.",
        ...missingSections.map((s) => `Add a ${s} section to improve completeness.`),
        "Quantify your achievements with numbers and metrics.",
        "Tailor your skills section to match target job descriptions.",
      ].slice(0, 6),
      fileName: resume.fileName,
      score: null,
      model: "rule-based",
    };
  }

  try {
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    const responseText = completion.choices[0]?.message?.content?.trim() || "";

    // Strip markdown fences if present, then extract JSON array
    const cleaned = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in Groq response");

    const suggestions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(suggestions)) throw new Error("Parsed response is not an array");

    return {
      suggestions: suggestions.slice(0, 8),
      fileName: resume.fileName,
      model: "groq",
    };
  } catch (err) {
    console.error("[AI Suggestions] Groq error:", err.message);

    // Detect quota / rate-limit errors and surface them explicitly
    const isQuota = err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("rate_limit") || err.message?.includes("Too Many Requests");
    if (isQuota) {
      return {
        suggestions: [],
        fileName: resume.fileName,
        model: "quota-exceeded",
        error: "Groq API rate limit hit. Wait a minute and try again, or get a free key at https://console.groq.com",
      };
    }

    // Fallback to smart rule-based suggestions for other errors
    const fallback = [];
    if (!sectionDetected.summary) fallback.push("Add a professional summary (2–3 sentences) at the top of your CV to immediately capture recruiters' attention.");
    if (!sectionDetected.workExperience) fallback.push("Add a Work Experience section with job titles, companies, dates, and bullet-pointed achievements.");
    if (!sectionDetected.projects) fallback.push("Include 2–3 project descriptions with your role, technologies used, and measurable outcomes.");
    if (!sectionDetected.certifications) fallback.push("Add relevant certifications (AWS, Google, Coursera, etc.) to boost credibility.");
    if (wordCount < 300) fallback.push(`Your CV is only ~${wordCount} words. Expand each role with 3–5 bullet points describing responsibilities and achievements.`);
    fallback.push("Use action verbs (Led, Built, Improved, Reduced) to start each bullet point for stronger impact.");
    fallback.push("Quantify your achievements - replace vague statements with numbers: 'Reduced load time by 40%' instead of 'Improved performance'.");

    return {
      suggestions: fallback.slice(0, 6),
      fileName: resume.fileName,
      model: "rule-based-fallback",
    };
  }
}

/**
 * Fetch live job postings from Adzuna API for a list of skills
 * @param {string[]} skills - Skills to search for
 * @param {string} country - Country code (us, gb, au, ca, etc.)
 * @returns {Object} { available, jobs, total, message? }
 */
// ── Simple in-memory cache for Adzuna results (5-minute TTL) ─────────────────
const _jobCache = new Map();
const JOB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function _jobCacheGet(key) {
  const entry = _jobCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > JOB_CACHE_TTL_MS) { _jobCache.delete(key); return null; }
  return entry.data;
}
function _jobCacheSet(key, data) {
  _jobCache.set(key, { ts: Date.now(), data });
}
// ─────────────────────────────────────────────────────────────────────────────

async function getJobPostings(skills = [], country = "us") {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return {
      available: false,
      jobs: [],
      message: "Job postings API not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your .env file.",
    };
  }

  if (skills.length === 0) {
    return { available: true, jobs: [], total: 0, message: "No skills provided" };
  }

  // Use top 5 skills joined with OR logic (Adzuna what_or = match ANY skill)
  const skillQuery = skills.slice(0, 5).join(" ");
  const cacheKey = `${country}::${skillQuery.toLowerCase()}`;

  // Return cached result if still fresh
  const cached = _jobCacheGet(cacheKey);
  if (cached) {
    console.log(`[Adzuna] cache HIT for "${skillQuery}"`);
    return cached;
  }

  console.log(`[Adzuna] querying: "${skillQuery}" country=${country}`);

  try {
    const params = {
      app_id: appId,
      app_key: appKey,
      what_or: skillQuery,    // OR logic: jobs matching ANY of the skills
      results_per_page: 20,   // Fetch 20 so frontend can paginate locally
    };

    let response = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
      { params, timeout: 8000 }
    );

    // If no results, fall back to just the top single skill
    if (!response.data.count && skills.length > 1) {
      console.log(`[Adzuna] 0 results for multi-skill query, retrying with top skill: "${skills[0]}"`);
      response = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
        { params: { ...params, what_or: skills[0] }, timeout: 8000 }
      );
    }

    const jobs = (response.data.results || []).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company?.display_name || "Unknown Company",
      location: job.location?.display_name || "Remote",
      description: job.description
        ? job.description.substring(0, 200) + "..."
        : "",
      url: job.redirect_url,
      salaryMin: job.salary_min ? Math.round(job.salary_min) : null,
      salaryMax: job.salary_max ? Math.round(job.salary_max) : null,
      created: job.created,
    }));

    const result = { available: true, jobs, total: response.data.count || 0 };
    _jobCacheSet(cacheKey, result);  // Cache the result
    console.log(`[Adzuna] found ${response.data.count} jobs, returning ${jobs.length}`);
    return result;
  } catch (err) {
    const status = err.response?.status;
    const detail = JSON.stringify(err.response?.data);
    console.error(`[Adzuna] ERROR status=${status} detail=${detail} msg=${err.message}`);
    return {
      available: false,
      jobs: [],
      message: `Adzuna API error (${status || "network"}): ${detail || err.message}`,
    };
  }
}

/**
 * Get skill growth timeline across a user's resume uploads
 * @param {string} userId - User ID
 * @returns {Object} { dataPoints: [{date, fileName, skillCount, newSkills}] }
 */
async function getSkillGrowthTimeline(userId) {
  const resumes = await Resume.find({ user: userId })
    .select("fileName extractedSkills createdAt")
    .sort({ createdAt: 1 });

  const dataPoints = [];
  let previousSkills = new Set();

  for (const resume of resumes) {
    const skills = (resume.extractedSkills || []).map((s) => s.toLowerCase());
    const currentSkills = new Set(skills);
    const newSkills = skills.filter((s) => !previousSkills.has(s));

    dataPoints.push({
      date: resume.createdAt,
      fileName: resume.fileName,
      skillCount: skills.length,
      newSkills,
      newSkillCount: newSkills.length,
    });

    previousSkills = currentSkills;
  }

  return { dataPoints };
}

/**
 * Get comparison match score history for a user (for charting)
 * @param {string} userId - User ID
 * @param {number} limit - Max data points to return
 * @returns {Object} { dataPoints: [{date, jobTitle, matchScore, commonCount, missingCount}] }
 */
async function getComparisonHistoryChart(userId, limit = 20) {
  const comparisons = await Comparison.find({ user: userId })
    .select("jobTitle matchScore commonSkills missingSkills createdAt")
    .sort({ createdAt: 1 })
    .limit(limit);

  const dataPoints = comparisons.map((c) => ({
    date: c.createdAt,
    jobTitle: c.jobTitle || "Untitled",
    matchScore: c.matchScore || 0,
    commonCount: (c.commonSkills || []).length,
    missingCount: (c.missingSkills || []).length,
  }));

  return { dataPoints };
}

/**
 * Generate comprehensive report data for a user
 * Used for report generation (Phase 10)
 * @param {string} userId - User ID
 * @returns {Object} Complete analytics report
 */
async function generateUserReport(userId) {
  const [insights, cvCompleteness, user] = await Promise.all([
    getUserInsights(userId),
    getCVCompleteness(userId),
    User.findById(userId).select("-password"),
  ]);

  const roadmaps = await Roadmap.find({ user: userId }).sort({ createdAt: -1 });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    cvCompleteness,
    insights,
    roadmaps: roadmaps.map((r) => ({
      id: r._id,
      targetRole: r.targetRole,
      matchScore: r.matchScore,
      createdAt: r.createdAt,
      skillsCompleted: (r.skillsToLearn || []).filter((s) => s.status === "COMPLETED").length,
      totalSkills: (r.skillsToLearn || []).length,
    })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate platform-wide summary report for admin
 * @returns {Object} Platform summary
 */
async function getPlatformSummaryReport() {
  // User counts
  const [totalUsers, totalStaff, totalAdmins, totalResumes, totalRoadmaps, totalComparisons] =
    await Promise.all([
      User.countDocuments({ role: "USER" }),
      User.countDocuments({ role: "STAFF" }),
      User.countDocuments({ role: "ADMIN" }),
      Resume.countDocuments(),
      Roadmap.countDocuments(),
      Comparison.countDocuments(),
    ]);

  // Average match score from comparisons
  const matchScoreAgg = await Comparison.aggregate([
    { $group: { _id: null, avgScore: { $avg: "$matchScore" } } },
  ]);
  const avgMatchScore = matchScoreAgg.length > 0
    ? Math.round(matchScoreAgg[0].avgScore * 10) / 10
    : 0;

  // Skill demand (top 10 + least 10)
  const skillDemand = await getSkillDemandStats();

  // Common gaps (top 10)
  const commonGaps = await getCommonGaps(10);

  // Average CV completeness across all users (sample up to 100 users)
  const users = await User.find({ role: "USER" }).select("_id").limit(100);
  let totalCvScore = 0;
  let cvCount = 0;
  for (const u of users) {
    try {
      const cvResult = await getCVCompleteness(u._id.toString());
      totalCvScore += cvResult.score;
      cvCount++;
    } catch (_) {
      // skip
    }
  }
  const avgCvCompleteness = cvCount > 0 ? Math.round(totalCvScore / cvCount) : 0;

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      totalUsers,
      totalStaff,
      totalAdmins,
      totalResumes,
      totalRoadmaps,
      totalComparisons,
      avgMatchScore,
      avgCvCompleteness,
    },
    skillDemand,
    commonGaps,
  };
}

module.exports = {
  getSkillDemandStats,
  getCommonGaps,
  getUserInsights,
  getCVCompleteness,
  getCVAISuggestions,
  getJobPostings,
  generateUserReport,
  getPlatformSummaryReport,
  getSkillGrowthTimeline,
  getComparisonHistoryChart,
};
