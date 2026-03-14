const Roadmap = require("../models/Roadmap");
const skillGapAnalysis = require("../services/skillGapService");
const generateRoadmap = require("../services/roadmapGenerator");
const axios = require("axios");
const { extractTextFromBuffer } = require("../services/resumeTextExtractor");
const { computeSkillGap } = require("../services/skillGapService");
const { getRecommendations } = require("../services/recommendationService");

exports.recommendations = (req, res) => {
  const { skills = [] } = req.body || {};
  if (!Array.isArray(skills)) {
    return res.status(400).json({ success: false, message: "skills must be an array" });
  }

  return res.json({
    success: true,
    recommendations: getRecommendations(skills),
  });
};

exports.debugAuthAndBody = (req, res) => {
  return res.json({
    success: true,
    userId: req.user?._id || req.user?.id || null,
    body: req.body || null,
    contentType: req.headers["content-type"] || null,
    authHeader: req.headers.authorization ? "present" : "missing",
  });
};

exports.updateSkillStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { roadmapId, skillId, status } = req.body;

    const allowed = ["PENDING", "IN_PROGRESS", "COMPLETED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status", allowed });
    }

    // 1) Confirm roadmap exists
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({ success: false, message: "Roadmap ID not found in DB." });
    }

    // 2) Confirm ownership matches token
    if (String(roadmap.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Roadmap exists but belongs to another user/token.",
        roadmapUser: String(roadmap.user),
        tokenUser: String(userId),
      });
    }

    // 3) Find skill subdocument by _id
    const skillItem = roadmap.skillsToLearn.id(skillId);
    if (!skillItem) {
      return res.status(404).json({
        success: false,
        message: "Skill item not found in this roadmap.",
      });
    }

    skillItem.status = status;
    await roadmap.save();

    return res.json({
      success: true,
      roadmapId: roadmap._id,
      updatedSkill: skillItem,
      skillsToLearn: roadmap.skillsToLearn,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyRoadmaps = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const roadmaps = await Roadmap.find({ user: userId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: roadmaps.length,
      roadmaps,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch roadmaps.",
    });
  }
};

exports.generateRoadmap = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { roadmapId } = req.body;

    if (!roadmapId) {
      return res.status(400).json({ success: false, message: "roadmapId is required." });
    }

    const doc = await Roadmap.findOne({ _id: roadmapId, user: userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Roadmap not found." });
    }

    const missing = (doc.missingSkills || [])
      .map(s => String(s).trim().toLowerCase())
      .filter(Boolean);

    // If nothing missing, clear roadmap tasks
    if (!missing.length) {
      doc.skillsToLearn = [];
      await doc.save();
      return res.json({
        success: true,
        roadmapId: doc._id,
        targetRole: doc.targetRole,
        matchScore: doc.matchScore,
        message: "No missing skills. Roadmap not needed.",
        skillsToLearn: doc.skillsToLearn,
      });
    }

    // Priority order (tune as you like)
    const priority = [
      "javascript",
      "typescript",
      "git",
      "rest",
      "api",
      "tailwind",
    ];

    const sorted = [...new Set(missing)].sort((a, b) => {
      const ia = priority.indexOf(a);
      const ib = priority.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    doc.skillsToLearn = sorted.map(skill => ({
      skill,
      status: "PENDING",
    }));

    await doc.save();

    return res.json({
      success: true,
      roadmapId: doc._id,
      targetRole: doc.targetRole,
      matchScore: doc.matchScore,
      skillsToLearn: doc.skillsToLearn,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Roadmap generation failed.",
    });
  }
};


exports.compareJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { roadmapId, jobDescription = "", jobTitle = "" } = req.body;

    if (!roadmapId) {
      return res.status(400).json({ success: false, message: "roadmapId is required." });
    }
    if (!jobDescription.trim()) {
      return res.status(400).json({ success: false, message: "jobDescription is required." });
    }

    const doc = await Roadmap.findOne({ _id: roadmapId, user: userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Roadmap not found." });
    }

    // Call Python NLP service to extract job skills
    const pythonUrl = process.env.PYTHON_NLP_URL || "http://127.0.0.1:8001";
    const nlpResp = await axios.post(`${pythonUrl}/extract-skills`, {
      text: jobDescription,
    }, { timeout: 30000 });

    const jobSkills = [...new Set((nlpResp.data?.skills || []).map(s => String(s).trim().toLowerCase()).filter(Boolean))];

    const { commonSkills, missingSkills, matchScore } =
      computeSkillGap(doc.resumeSkills, jobSkills);

    doc.jobTitle = jobTitle || doc.jobTitle || "";
    doc.jobSkills = jobSkills;
    doc.commonSkills = commonSkills;
    doc.missingSkills = missingSkills;
    doc.matchScore = matchScore;

    await doc.save();

    return res.json({
      success: true,
      roadmapId: doc._id,
      jobTitle: doc.jobTitle,
      matchScore,
      jobSkills,
      commonSkills,
      missingSkills,
    });
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || "Job comparison failed.";
    return res.status(500).json({ success: false, message: msg });
  }
};

const normalizeSkills = (skills) =>
  [...new Set((skills || [])
    .map(s => String(s).trim().toLowerCase())
    .filter(Boolean))];

exports.analyzeResume = async (req, res) => {
  try {
    // multer puts file here
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume file is required." });
    }

    const userId = req.user?._id || req.user?.id; // depends on your auth middleware
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { targetRole = "" } = req.body;

    // 1) Extract text from uploaded file buffer (memoryStorage — no disk path)
    const resumeText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        success: false,
        message: "Could not extract enough text from resume. Try a clearer PDF/DOCX.",
      });
    }

    // 2) Call Python NLP service
    const pythonUrl = process.env.PYTHON_NLP_URL || "http://127.0.0.1:8001";
    const nlpResp = await axios.post(`${pythonUrl}/extract-skills`, {
      text: resumeText,
    }, { timeout: 30000 });

    const extractedSkills = normalizeSkills(nlpResp.data?.skills);

    // 3) Save to Mongo (create a roadmap doc now, we’ll fill gaps later)
    const doc = await Roadmap.create({
    user: userId,          // ✅ MATCHES SCHEMA
       targetRole: targetRole || "Not specified", // ✅ ENSURE REQUIRED FIELD
        resumeSkills: extractedSkills,
    });
    // jobSkills / missingSkills / steps will be added later
    

    // 4) file is in memory (memoryStorage) — no disk cleanup needed

  return res.json({
  success: true,
  roadmapId: doc._id,
  targetRole: doc.targetRole,
  resumeSkills: doc.resumeSkills || [],
  extractedCount: (doc.resumeSkills || []).length,
});


  } catch (err) {
    // file is in memory (memoryStorage) — no disk cleanup needed

    const msg =
      err.response?.data?.detail ||
      err.message ||
      "Resume analysis failed.";

    return res.status(500).json({ success: false, message: msg });
  }
};

exports.generateAIRoadmap = async (req, res) => {
  try {
    const { userSkills = [], targetSkills = [], targetRole } = req.body;

    if (!targetRole) {
      return res.status(400).json({ message: "targetRole is required" });
    }

    const { missingSkills, matchPercentage } =
      skillGapAnalysis(userSkills, targetSkills);

    const skillsToLearn = missingSkills.map((skill) => ({
      skill,
      status: "PENDING",
    }));

    // optional: overwrite existing roadmap for this user+role
    const roadmap = await Roadmap.findOneAndUpdate(
      { user: req.user._id, targetRole },
      { user: req.user._id, targetRole, skillsToLearn },
      { new: true, upsert: true }
    );

    res.status(201).json({
      message: "AI roadmap generated successfully",
      matchPercentage,
      roadmap,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRoadmap = async (req, res) => {
  try {
    const { targetRole, skillsToLearn } = req.body;

    const roadmap = new Roadmap({
      user: req.user._id,
      targetRole,
      skillsToLearn
    });

    await roadmap.save();
    res.status(201).json(roadmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap
      .findOne({ user: req.user._id })
      .sort({ createdAt: -1 }); // ✅ latest roadmap

    res.json(roadmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find().populate("user", "name email role");
    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoadmapStats = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find().populate("user", "name email role");

    const totalRoadmaps = roadmaps.length;

    // 1) Completion % for each roadmap
    const completionRates = roadmaps.map((r) => {
      const total = r.skillsToLearn?.length || 0;
      const done = (r.skillsToLearn || []).filter(
        (s) => s.status === "COMPLETED"
      ).length;

      return total ? Math.round((done / total) * 100) : 0;
    });

    // 2) Average completion %
    const avgCompletion = totalRoadmaps
      ? Math.round(completionRates.reduce((a, b) => a + b, 0) / totalRoadmaps)
      : 0;

    // 3) Completion distribution (0-25, 26-50, 51-75, 76-99, 100)
    const completionDistribution = {
      "0-25": 0,
      "26-50": 0,
      "51-75": 0,
      "76-99": 0,
      "100": 0,
    };

    completionRates.forEach((p) => {
      if (p <= 25) completionDistribution["0-25"]++;
      else if (p <= 50) completionDistribution["26-50"]++;
      else if (p <= 75) completionDistribution["51-75"]++;
      else if (p <= 99) completionDistribution["76-99"]++;
      else completionDistribution["100"]++;
    });

    // 4) Top missing skills (frequency)
    const skillCount = {};
    roadmaps.forEach((r) => {
      (r.skillsToLearn || []).forEach((s) => {
        const key = (s.skill || "").trim();
        if (!key) return;
        skillCount[key] = (skillCount[key] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // 5) Role breakdown
    const roleBreakdown = { USER: 0, STAFF: 0, ADMIN: 0, UNKNOWN: 0 };
    roadmaps.forEach((r) => {
      const role = r.user?.role || "UNKNOWN";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    });

   console.log("STATS: sending completionDistribution", completionDistribution);

    // ✅ IMPORTANT: include completionDistribution here
    return res.json({
    totalRoadmaps,
    avgCompletion,
    completionDistribution,
    topSkills,
    roleBreakdown,
  })

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

