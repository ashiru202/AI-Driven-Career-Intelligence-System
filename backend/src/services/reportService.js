const PDFDocument = require("pdfkit");

/**
 * Stream a platform summary PDF report to the HTTP response
 * @param {Object} report - Platform summary report data
 * @param {Object} res - Express response object
 */
function streamPlatformSummaryPDF(report, res) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="platform-report-${Date.now()}.pdf"`
  );

  doc.pipe(res);

  // ── Title ──────────────────────────────────────────────
  doc.fontSize(22).font("Helvetica-Bold").text("AI Career Intelligence System", { align: "center" });
  doc.fontSize(16).font("Helvetica").text("Platform Summary Report", { align: "center" });
  doc.fontSize(11).fillColor("gray").text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, { align: "center" });
  doc.fillColor("black");
  doc.moveDown(1.5);

  // ── Platform Stats ─────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("Platform Overview");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  const p = report.platform;
  const stats = [
    ["Total Job Seekers", p.totalUsers],
    ["Total Staff", p.totalStaff],
    ["Total Admins", p.totalAdmins],
    ["Total Resumes Uploaded", p.totalResumes],
    ["Total Roadmaps Created", p.totalRoadmaps],
    ["Total Job Comparisons", p.totalComparisons],
    ["Average Match Score", `${p.avgMatchScore}%`],
    ["Average CV Completeness", `${p.avgCvCompleteness}%`],
  ];

  stats.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`);
  });

  doc.moveDown(1.5);

  // ── Skill Demand ───────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("Top 10 Most Demanding Skills");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  if (report.skillDemand && report.skillDemand.top) {
    report.skillDemand.top.slice(0, 10).forEach((item, i) => {
      doc.text(`${i + 1}. ${item.skill}  (${item.count} occurrences)`);
    });
  } else {
    doc.text("No data available.");
  }

  doc.moveDown(1.5);

  doc.fontSize(14).font("Helvetica-Bold").text("Top 10 Least Demanding Skills");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  if (report.skillDemand && report.skillDemand.least) {
    report.skillDemand.least.slice(0, 10).forEach((item, i) => {
      doc.text(`${i + 1}. ${item.skill}  (${item.count} occurrences)`);
    });
  } else {
    doc.text("No data available.");
  }

  doc.moveDown(1.5);

  // ── Common Gaps ────────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("Top 10 Common Skill Gaps");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  if (report.commonGaps && report.commonGaps.length > 0) {
    report.commonGaps.slice(0, 10).forEach((item, i) => {
      doc.text(`${i + 1}. ${item.skill}  (missing in ${item.count} roadmaps)`);
    });
  } else {
    doc.text("No gap data available.");
  }

  doc.end();
}

/**
 * Stream a per-user PDF report to the HTTP response
 * @param {Object} report - User report data
 * @param {Object} res - Express response object
 */
function streamUserReportPDF(report, res) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="user-report-${report.user.id}-${Date.now()}.pdf"`
  );

  doc.pipe(res);

  // ── Title ──────────────────────────────────────────────
  doc.fontSize(22).font("Helvetica-Bold").text("AI Career Intelligence System", { align: "center" });
  doc.fontSize(16).font("Helvetica").text("User Career Report", { align: "center" });
  doc.fontSize(11).fillColor("gray").text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, { align: "center" });
  doc.fillColor("black");
  doc.moveDown(1.5);

  // ── User Info ──────────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("User Information");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);
  doc.text(`Name: ${report.user.name}`);
  doc.text(`Email: ${report.user.email}`);
  doc.text(`Role: ${report.user.role}`);
  doc.moveDown(1.5);

  // ── CV Completeness ────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("CV Completeness");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);
  doc.text(`Score: ${report.cvCompleteness?.score ?? 0}%`);

  if (report.cvCompleteness?.missingSections?.length > 0) {
    doc.moveDown(0.3);
    doc.text("Missing Sections:");
    report.cvCompleteness.missingSections.forEach((s) => doc.text(`  • ${s}`));
  }

  if (report.cvCompleteness?.suggestions?.length > 0) {
    doc.moveDown(0.3);
    doc.text("Suggestions:");
    report.cvCompleteness.suggestions.forEach((s) => doc.text(`  → ${s}`));
  }

  doc.moveDown(1.5);

  // ── Insights ───────────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("Career Insights");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  if (report.insights?.reasons?.length > 0) {
    doc.text("Key Observations:");
    report.insights.reasons.forEach((r) => doc.text(`  • ${r}`));
    doc.moveDown(0.3);
  }

  if (report.insights?.prioritySkills?.length > 0) {
    doc.text("Priority Skills to Learn:");
    report.insights.prioritySkills.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.3);
  }

  if (report.insights?.actions?.length > 0) {
    doc.text("Recommended Actions:");
    report.insights.actions.forEach((a) => doc.text(`  → ${a}`));
  }

  doc.moveDown(1.5);

  // ── Roadmaps ───────────────────────────────────────────
  doc.fontSize(14).font("Helvetica-Bold").text("Roadmap Progress");
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11);

  if (report.roadmaps && report.roadmaps.length > 0) {
    report.roadmaps.forEach((r, i) => {
      const pct = r.totalSkills > 0
        ? Math.round((r.skillsCompleted / r.totalSkills) * 100)
        : 0;
      doc.text(
        `${i + 1}. ${r.targetRole}  |  Match: ${r.matchScore}%  |  Progress: ${r.skillsCompleted}/${r.totalSkills} skills (${pct}%)  |  Created: ${new Date(r.createdAt).toLocaleDateString()}`
      );
    });
  } else {
    doc.text("No roadmaps created yet.");
  }

  doc.end();
}

module.exports = { streamPlatformSummaryPDF, streamUserReportPDF };
