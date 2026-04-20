/**
 * Notifications Controller
 * Generates real-time, data-driven notifications per role by querying the DB.
 */
const Resume     = require('../models/Resume');
const Roadmap    = require('../models/Roadmap');
const Comparison = require('../models/Comparison');
const User       = require('../models/User');
const StaffApplication = require('../models/StaffApplication');

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins =  Math.floor(diff / 60000);
  const hrs  =  Math.floor(diff / 3600000);
  const days =  Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function makeId(prefix, doc) {
  return `${prefix}_${doc._id}`;
}

// ── USER notifications ────────────────────────────────────────────────────────
async function getUserNotifications(userId) {
  const notifications = [];

  // 1. Latest resume
  const resumes = await Resume.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
  if (resumes.length === 0) {
    notifications.push({
      id: 'no_resume',
      icon: 'FileText',
      title: 'No resume uploaded yet',
      body: 'Upload your resume to unlock AI-powered career insights and skill analysis.',
      link: '/resume-analyze',
      time: 'Now',
      createdAt: new Date(),
    });
  } else {
    resumes.forEach((r) => {
      const skillCount = r.extractedSkills?.length || 0;
      notifications.push({
        id: makeId('resume', r),
        icon: 'FileText',
        title: `Resume analysed: ${r.fileName}`,
        body: skillCount > 0
          ? `${skillCount} skill${skillCount > 1 ? 's' : ''} detected. View your full analysis.`
          : 'Analysis complete. View your resume details.',
        link: '/my-resumes',
        time: timeAgo(r.createdAt),
        createdAt: r.createdAt,
      });
    });
  }

  // 2. Latest roadmaps
  const roadmaps = await Roadmap.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
  if (roadmaps.length === 0) {
    notifications.push({
      id: 'no_roadmap',
      icon: 'Map',
      title: 'Generate your AI Roadmap',
      body: 'Create a personalised learning path to close your skill gaps for any job role.',
      link: '/my-roadmap',
      time: 'Now',
      createdAt: new Date(),
    });
  } else {
    roadmaps.forEach((rm) => {
      const completed = rm.skillsToLearn?.filter(s => s.status === 'COMPLETED').length || 0;
      const total     = rm.skillsToLearn?.length || 0;
      notifications.push({
        id: makeId('roadmap', rm),
        icon: 'Map',
        title: `Roadmap: ${rm.targetRole}`,
        body: total > 0
          ? `${completed}/${total} skills completed · ${rm.matchScore || 0}% match score.`
          : `Match score: ${rm.matchScore || 0}%. Start learning to progress.`,
        link: '/my-roadmap',
        time: timeAgo(rm.createdAt),
        createdAt: rm.createdAt,
      });
    });
  }

  // 3. Latest comparisons
  const comparisons = await Comparison.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
  if (comparisons.length === 0) {
    notifications.push({
      id: 'no_comparison',
      icon: 'Target',
      title: 'Compare a Job Description',
      body: 'Paste any job posting and instantly see how well your skills match.',
      link: '/compare-job',
      time: 'Now',
      createdAt: new Date(),
    });
  } else {
    comparisons.forEach((c) => {
      const score  = c.matchScore || 0;
      const level  = score >= 75 ? 'Strong' : score >= 50 ? 'Partial' : 'Low';
      notifications.push({
        id: makeId('comparison', c),
        icon: 'Target',
        title: `Job match: ${c.jobTitle}`,
        body: `${level} match · ${score}% · ${c.missingSkills?.length || 0} skill gap${c.missingSkills?.length !== 1 ? 's' : ''} found.`,
        link: '/compare-job',
        time: timeAgo(c.createdAt),
        createdAt: c.createdAt,
      });
    });
  }

  // Sort newest first
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications;
}

// ── ADMIN notifications ───────────────────────────────────────────────────────
async function getAdminNotifications() {
  const notifications = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const oneDayAgo    = new Date(Date.now() -     86400000);

  const [
    newUsers,
    totalUsers,
    newResumes,
    newRoadmaps,
    newComparisons,
    lowMatchComps,
    pendingStaffApplications,
    latestPendingApplications,
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ role: 'USER' }),
    Resume.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    Roadmap.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Comparison.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Comparison.countDocuments({ matchScore: { $lt: 40 }, createdAt: { $gte: sevenDaysAgo } }),
    StaffApplication.countDocuments({ status: 'PENDING' }),
    StaffApplication.find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName currentRole createdAt')
      .lean(),
  ]);

  notifications.push({
    id: 'admin_users',
    icon: 'Users',
    title: `${newUsers} new user${newUsers !== 1 ? 's' : ''} this week`,
    body: `Platform has ${totalUsers} total job seekers. ${newUsers} joined in the last 7 days.`,
    link: '/users',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'admin_resumes',
    icon: 'FileText',
    title: `${newResumes} resume${newResumes !== 1 ? 's' : ''} uploaded today`,
    body: newResumes > 0
      ? 'Users are actively uploading resumes. Review platform activity.'
      : 'No new resumes uploaded today. Platform activity is low.',
    link: '/admin-report',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'admin_roadmaps',
    icon: 'Map',
    title: `${newRoadmaps} roadmap${newRoadmaps !== 1 ? 's' : ''} created this week`,
    body: 'Users are generating AI career roadmaps. Review in All Roadmaps.',
    link: '/all-roadmaps',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'admin_comparisons',
    icon: 'Target',
    title: `${newComparisons} job comparisons this week`,
    body: `${lowMatchComps} had a match score below 40% - skill gaps may need addressing.`,
    link: '/admin-report',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'admin_staff_applications_summary',
    icon: 'ClipboardList',
    title: `${pendingStaffApplications} pending staff application${pendingStaffApplications !== 1 ? 's' : ''}`,
    body: pendingStaffApplications > 0
      ? 'New staff applications are waiting for review.'
      : 'No pending staff applications at the moment.',
    link: '/staff-management',
    time: 'Live',
    createdAt: new Date(),
  });

  latestPendingApplications.forEach((application) => {
    notifications.push({
      id: `staff_application_${application._id}`,
      icon: 'ClipboardList',
      title: 'New staff application received',
      body: `${application.fullName} applied for staff (${application.currentRole || 'Role not specified'}).`,
      link: '/staff-management',
      time: timeAgo(application.createdAt),
      createdAt: application.createdAt,
    });
  });

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return notifications;
}

// ── STAFF notifications ───────────────────────────────────────────────────────
async function getStaffNotifications() {
  const notifications = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [totalUsers, newRoadmaps, totalComparisons, lowMatchComps] = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    Roadmap.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Comparison.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Comparison.countDocuments({ matchScore: { $lt: 40 }, createdAt: { $gte: sevenDaysAgo } }),
  ]);

  notifications.push({
    id: 'staff_users',
    icon: 'ClipboardList',
    title: `${totalUsers} user report${totalUsers !== 1 ? 's' : ''} available`,
    body: 'Review job seeker profiles, resumes and career progress.',
    link: '/staff',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'staff_roadmaps',
    icon: 'Map',
    title: `${newRoadmaps} new roadmap${newRoadmaps !== 1 ? 's' : ''} this week`,
    body: 'Users have generated AI career roadmaps. Review them now.',
    link: '/all-roadmaps',
    time: 'Live',
    createdAt: new Date(),
  });

  notifications.push({
    id: 'staff_comparisons',
    icon: 'Target',
    title: `${lowMatchComps} low-match job comparison${lowMatchComps !== 1 ? 's' : ''} this week`,
    body: `${totalComparisons} total comparisons · ${lowMatchComps} users may need career coaching.`,
    link: '/all-roadmaps',
    time: 'Live',
    createdAt: new Date(),
  });

  return notifications;
}

// ── Route handler ─────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    let notifications = [];

    if (role === 'ADMIN') {
      notifications = await getAdminNotifications();
    } else if (role === 'STAFF') {
      notifications = await getStaffNotifications();
    } else {
      notifications = await getUserNotifications(userId);
    }

    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};
