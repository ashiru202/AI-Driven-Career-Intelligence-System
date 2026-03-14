const JobApplication = require('../models/JobApplication');

// GET /api/job-applications  — list all for the authenticated user
exports.getApplications = async (req, res, next) => {
  try {
    const apps = await JobApplication.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    next(err);
  }
};

// POST /api/job-applications  — create a new application
exports.createApplication = async (req, res, next) => {
  try {
    const { jobTitle, company, location, jobUrl, salary, source, jobDescription, status, appliedDate, interviewDate, notes } = req.body;

    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required' });
    }
    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, message: 'Company is required' });
    }

    const app = await JobApplication.create({
      user: req.user.id,
      jobTitle: jobTitle.trim(),
      company:  company.trim(),
      location:  location  || '',
      jobUrl:    jobUrl    || '',
      salary:    salary    || '',
      source:    source    || '',
      jobDescription: jobDescription || '',
      status:    status    || 'saved',
      appliedDate:   appliedDate   || null,
      interviewDate: interviewDate || null,
      notes:     notes     || '',
    });

    res.status(201).json({ success: true, application: app });
  } catch (err) {
    next(err);
  }
};

// PUT /api/job-applications/:id  — update an application
exports.updateApplication = async (req, res, next) => {
  try {
    const app = await JobApplication.findOne({ _id: req.params.id, user: req.user.id });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const allowed = ['jobTitle', 'company', 'location', 'jobUrl', 'salary', 'source', 'jobDescription', 'status', 'appliedDate', 'interviewDate', 'notes'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) app[field] = req.body[field];
    });

    await app.save();
    res.json({ success: true, application: app });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/job-applications/:id  — delete an application
exports.deleteApplication = async (req, res, next) => {
  try {
    const app = await JobApplication.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.json({ success: true, message: 'Application deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/job-applications/stats  — counts per status for the user
exports.getStats = async (req, res, next) => {
  try {
    const statuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];
    const counts = await Promise.all(
      statuses.map((s) => JobApplication.countDocuments({ user: req.user.id, status: s }))
    );
    const stats = Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};
