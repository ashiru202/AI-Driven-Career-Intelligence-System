const PDFDocument = require("pdfkit");

// ─── Professional Monochrome Palette ─────────────────────────────────────────
const C = {
  black:      "#0f0f0f",
  ink:        "#1c1c1c",
  dark:       "#2d2d2d",
  mid:        "#555555",
  muted:      "#888888",
  rule:       "#cccccc",
  border:     "#d8d8d8",
  subtle:     "#ebebeb",
  surface:    "#f5f5f5",
  white:      "#ffffff",
  accent:     "#2d2d2d",   // section header strip
  barFill:    "#444444",
  barFillLow: "#999999",
  barTrack:   "#e4e4e4",
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function rect(doc, x, y, w, h, fill, radius) {
  doc.save();
  if (radius > 0) {
    doc.roundedRect(x, y, w, h, radius).fillColor(fill).fill();
  } else {
    doc.rect(x, y, w, h).fillColor(fill).fill();
  }
  doc.restore();
}

function borderedRect(doc, x, y, w, h, fill, stroke, radius, lw) {
  radius = radius || 3;
  lw     = lw     || 0.5;
  doc.save();
  doc.roundedRect(x, y, w, h, radius)
    .fillColor(fill).strokeColor(stroke).lineWidth(lw).fillAndStroke();
  doc.restore();
}

function progressBar(doc, x, y, w, h, pct) {
  rect(doc, x, y, w, h, C.barTrack, h / 2);
  if (pct > 0) {
    const fw = Math.max(h, Math.round((Math.min(pct, 100) / 100) * w));
    // Use darker fill for high values, lighter for low
    const fill = pct > 60 ? C.barFill : C.barFillLow;
    rect(doc, x, y, fw, h, fill, h / 2);
  }
}

function hLine(doc, x, y, w, color, lw) {
  color = color || C.rule;
  lw    = lw    || 0.5;
  doc.save().moveTo(x, y).lineTo(x + w, y)
    .strokeColor(color).lineWidth(lw).stroke().restore();
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Page furniture ───────────────────────────────────────────────────────────
function drawHeader(doc, title, subtitle, generatedAt) {
  const pw = doc.page.width;
  // Solid dark banner
  rect(doc, 0, 0, pw, 80, C.ink, 0);
  // Thin bottom accent rule
  rect(doc, 0, 80, pw, 3, C.dark, 0);

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(18)
    .text("AI Career Intelligence System", 0, 18, { align: "center", width: pw });
  doc.fillColor("#c8c8c8").font("Helvetica").fontSize(11)
    .text(title, 0, 44, { align: "center", width: pw });
  if (subtitle) {
    doc.fillColor("#999999").font("Helvetica").fontSize(8.5)
      .text(subtitle, 0, 62, { align: "center", width: pw });
  }

  // Generated date below banner
  doc.fillColor(C.muted).font("Helvetica").fontSize(8)
    .text("Generated: " + new Date(generatedAt).toLocaleString(), 0, 92, {
      align: "center", width: pw,
    });
}

function drawSectionTitle(doc, label, x, y, useW) {
  // Dark background, white text, left border
  rect(doc, x, y, useW, 24, C.dark, 3);
  rect(doc, x, y, 4, 24, C.muted, 2);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(10)
    .text(label, x + 12, y + 7, { width: useW - 20, lineBreak: false });
  return y + 34;
}

function drawFooter(doc, pageNum, generatedAt) {
  const pw   = doc.page.width;
  const ML   = 40;
  const useW = pw - ML * 2;
  const by   = doc.page.height - 30;
  hLine(doc, ML, by, useW, C.rule, 0.5);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
    .text("AI Career Intelligence System  \u2022  Confidential", ML, by + 5, {
      width: useW / 2, lineBreak: false,
    })
    .text("Page " + pageNum + "  |  " + new Date(generatedAt).toLocaleDateString(),
      ML + useW / 2, by + 5,
      { width: useW / 2, align: "right", lineBreak: false });
}

// ─── Ranked skill table ───────────────────────────────────────────────────────
function drawSkillTable(doc, items, maxCount, ML, y, useW, pageNum, generatedAt) {
  if (!items || items.length === 0) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5).text("No data available.", ML, y);
    return { y: y + 20, pageNum: pageNum };
  }
  const ROW_H  = 22;
  const RANK_W = 24;
  const NAME_W = 200;
  const CNT_W  = 48;
  const BAR_X  = ML + RANK_W + NAME_W + CNT_W + 6;
  const BAR_W  = useW - (BAR_X - ML) - 4;

  items.forEach(function(item, i) {
    if (y + ROW_H > doc.page.height - 56) {
      drawFooter(doc, pageNum++, generatedAt);
      doc.addPage();
      y = 50;
    }
    // Alternating row
    if (i % 2 === 0) rect(doc, ML, y, useW, ROW_H, C.surface, 2);

    // Rank badge
    rect(doc, ML + 4, y + 4, 16, 14, C.mid, 2);
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7.5)
      .text(String(i + 1), ML + 4, y + 7, { width: 16, align: "center", lineBreak: false });

    // Skill name
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9)
      .text(capitalize(item.skill), ML + RANK_W + 4, y + 6, { width: NAME_W, lineBreak: false });

    // Count
    doc.fillColor(C.muted).font("Helvetica").fontSize(8)
      .text(item.count + "\u00d7", ML + RANK_W + NAME_W + 4, y + 7,
        { width: CNT_W, align: "right", lineBreak: false });

    // Bar
    const pct = Math.round((item.count / maxCount) * 100);
    progressBar(doc, BAR_X, y + 8, BAR_W, 6, pct);
    y += ROW_H;
  });
  hLine(doc, ML, y, useW, C.rule);
  return { y: y + 10, pageNum: pageNum };
}

// ─── Platform Summary PDF ─────────────────────────────────────────────────────
/**
 * Stream a platform summary PDF report to the HTTP response
 * @param {Object} report - Platform summary report data
 * @param {Object} res - Express response object
 */
function streamPlatformSummaryPDF(report, res) {
  const doc     = new PDFDocument({ margin: 0, size: "A4" });
  const ML      = 40;
  const pw      = doc.page.width;
  const useW    = pw - ML * 2;
  let   y       = 0;
  let   pageNum = 1;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition",
    "attachment; filename=\"platform-report-" + Date.now() + ".pdf\"");
  doc.pipe(res);

  // ── Header ────────────────────────────────────────────
  drawHeader(doc, "Platform Summary Report", null, report.generatedAt);
  y = 112;

  const p = report.platform;

  // ── KPI Cards (2 rows × 3 cols) ───────────────────────
  y = drawSectionTitle(doc, "Platform Overview", ML, y, useW);

  const kpis = [
    { label: "Job Seekers",   value: p.totalUsers       },
    { label: "Staff Members", value: p.totalStaff       },
    { label: "Admins",        value: p.totalAdmins      },
    { label: "Resumes",       value: p.totalResumes     },
    { label: "Roadmaps",      value: p.totalRoadmaps    },
    { label: "Comparisons",   value: p.totalComparisons },
  ];

  const COLS   = 3;
  const CARD_W = (useW - (COLS - 1) * 8) / COLS;
  const CARD_H = 54;

  kpis.forEach(function(kpi, i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx  = ML + col * (CARD_W + 8);
    const cy  = y + row * (CARD_H + 8);
    borderedRect(doc, cx, cy, CARD_W, CARD_H, C.white, C.border, 3, 0.5);
    // Left accent rule
    rect(doc, cx, cy, 4, CARD_H, C.mid, 2);

    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(24)
      .text(String(kpi.value), cx + 14, cy + 8, { width: CARD_W - 20, lineBreak: false });
    doc.fillColor(C.muted).font("Helvetica").fontSize(8)
      .text(kpi.label.toUpperCase(), cx + 14, cy + 38, { width: CARD_W - 20, lineBreak: false });
  });

  y += Math.ceil(kpis.length / COLS) * (CARD_H + 8) + 8;

  // ── Score Health Panels ───────────────────────────────
  const HALF    = (useW - 10) / 2;
  const PANEL_H = 68;

  // Match Score
  borderedRect(doc, ML, y, HALF, PANEL_H, C.surface, C.border, 3, 0.5);
  rect(doc, ML, y, 4, PANEL_H, C.mid, 2);
  doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
    .text("AVERAGE MATCH SCORE", ML + 14, y + 10, { lineBreak: false });
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(26)
    .text(p.avgMatchScore + "%", ML + 14, y + 22, { lineBreak: false });
  progressBar(doc, ML + 14, y + 56, HALF - 28, 7, p.avgMatchScore);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
    .text("How well users match job requirements on average", ML + 14, y + 58, {
      width: HALF - 28, lineBreak: false,
    });

  // CV Completeness
  const cx2 = ML + HALF + 10;
  borderedRect(doc, cx2, y, HALF, PANEL_H, C.surface, C.border, 3, 0.5);
  rect(doc, cx2, y, 4, PANEL_H, C.mid, 2);
  doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
    .text("AVERAGE CV COMPLETENESS", cx2 + 14, y + 10, { lineBreak: false });
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(26)
    .text(p.avgCvCompleteness + "%", cx2 + 14, y + 22, { lineBreak: false });
  progressBar(doc, cx2 + 14, y + 56, HALF - 28, 7, p.avgCvCompleteness);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
    .text("Average completeness of user resumes across platform", cx2 + 14, y + 58, {
      width: HALF - 28, lineBreak: false,
    });

  y += PANEL_H + 14;

  // ── Top In-Demand Skills ──────────────────────────────
  y = drawSectionTitle(doc, "Top In-Demand Skills", ML, y, useW);
  const topSkills = (report.skillDemand && report.skillDemand.top) ? report.skillDemand.top.slice(0, 10) : [];
  const topMax    = topSkills.length > 0 ? topSkills[0].count : 1;
  const r1 = drawSkillTable(doc, topSkills, topMax, ML, y, useW, pageNum, report.generatedAt);
  y = r1.y; pageNum = r1.pageNum;

  // ── Least Demanded Skills ─────────────────────────────
  y += 8;
  if (y > doc.page.height - 180) {
    drawFooter(doc, pageNum++, report.generatedAt);
    doc.addPage(); y = 50;
  }
  y = drawSectionTitle(doc, "Least Demanded Skills", ML, y, useW);
  const leastSkills = (report.skillDemand && report.skillDemand.least) ? report.skillDemand.least.slice(0, 10) : [];
  const leastMax    = leastSkills.length > 0 ? leastSkills[0].count : 1;
  const r2 = drawSkillTable(doc, leastSkills, leastMax, ML, y, useW, pageNum, report.generatedAt);
  y = r2.y; pageNum = r2.pageNum;

  // ── Common Skill Gaps ─────────────────────────────────
  y += 8;
  if (y > doc.page.height - 180) {
    drawFooter(doc, pageNum++, report.generatedAt);
    doc.addPage(); y = 50;
  }
  y = drawSectionTitle(doc, "Most Common Skill Gaps", ML, y, useW);
  const gaps   = report.commonGaps ? report.commonGaps.slice(0, 10) : [];
  const gapMax = gaps.length > 0 ? gaps[0].count : 1;

  if (gaps.length === 0) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5).text("No gap data available.", ML, y);
    y += 20;
  } else {
    const ROW_H  = 22;
    const RANK_W = 24;
    const NAME_W = 200;
    const CNT_W  = 58;
    const BAR_X  = ML + RANK_W + NAME_W + CNT_W + 6;
    const BAR_W  = useW - (BAR_X - ML) - 4;

    gaps.forEach(function(item, i) {
      if (y + ROW_H > doc.page.height - 56) {
        drawFooter(doc, pageNum++, report.generatedAt);
        doc.addPage(); y = 50;
      }
      const pct = Math.round((item.count / gapMax) * 100);
      // Severity shown via badge darkness only (no color)
      const badgeFill = pct > 66 ? C.ink : pct > 33 ? C.mid : C.muted;

      if (i % 2 === 0) rect(doc, ML, y, useW, ROW_H, C.surface, 2);

      rect(doc, ML + 4, y + 4, 16, 14, badgeFill, 2);
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7.5)
        .text(String(i + 1), ML + 4, y + 7, { width: 16, align: "center", lineBreak: false });

      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9)
        .text(capitalize(item.skill), ML + RANK_W + 4, y + 6, { width: NAME_W, lineBreak: false });

      doc.fillColor(C.muted).font("Helvetica").fontSize(8)
        .text(item.count + " users", ML + RANK_W + NAME_W + 4, y + 7,
          { width: CNT_W, align: "right", lineBreak: false });

      progressBar(doc, BAR_X, y + 8, BAR_W, 6, pct);
      y += ROW_H;
    });

    hLine(doc, ML, y, useW, C.rule);
    y += 10;
  }

  drawFooter(doc, pageNum, report.generatedAt);
  doc.end();
}

// ─── User Report PDF ──────────────────────────────────────────────────────────
/**
 * Stream a per-user PDF report to the HTTP response
 * @param {Object} report - User report data
 * @param {Object} res - Express response object
 */
function streamUserReportPDF(report, res) {
  const doc     = new PDFDocument({ margin: 0, size: "A4" });
  const ML      = 40;
  const pw      = doc.page.width;
  const useW    = pw - ML * 2;
  let   y       = 0;
  let   pageNum = 1;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition",
    "attachment; filename=\"user-report-" +
    (report.user && report.user.id ? report.user.id : "unknown") +
    "-" + Date.now() + ".pdf\"");
  doc.pipe(res);

  // ── Header ────────────────────────────────────────────
  drawHeader(doc, "User Career Report",
    (report.user && report.user.name) || "", report.generatedAt);
  y = 112;

  // ── User Information ──────────────────────────────────
  y = drawSectionTitle(doc, "User Information", ML, y, useW);
  borderedRect(doc, ML, y, useW, 60, C.surface, C.border, 3, 0.5);
  rect(doc, ML, y, 4, 60, C.mid, 2);

  var fields = [
    ["Name",  (report.user && report.user.name)  || "\u2014"],
    ["Email", (report.user && report.user.email) || "\u2014"],
    ["Role",  capitalize((report.user && report.user.role) || "\u2014")],
  ];
  fields.forEach(function(f, i) {
    const fy = y + 10 + i * 16;
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
      .text(f[0].toUpperCase(), ML + 14, fy, { width: 55, lineBreak: false });
    doc.fillColor(C.ink).font("Helvetica").fontSize(9)
      .text(f[1], ML + 74, fy, { width: useW - 90, lineBreak: false });
  });
  y += 70;

  // ── CV Completeness ───────────────────────────────────
  y = drawSectionTitle(doc, "CV Completeness", ML, y, useW);

  const cvScore = (report.cvCompleteness && report.cvCompleteness.score != null)
    ? report.cvCompleteness.score : 0;

  // Score panel (left)
  borderedRect(doc, ML, y, 110, 62, C.surface, C.border, 3, 0.5);
  rect(doc, ML, y, 4, 62, C.mid, 2);
  doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
    .text("CV SCORE", ML + 14, y + 10, { lineBreak: false });
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(26)
    .text(cvScore + "%", ML + 14, y + 22, { lineBreak: false });
  progressBar(doc, ML + 14, y + 54, 82, 6, cvScore);

  // Missing / present (right)
  const infoX  = ML + 120;
  const infoW  = useW - 120;
  const missing = (report.cvCompleteness && report.cvCompleteness.missingSections) || [];
  if (missing.length > 0) {
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(8.5)
      .text("Missing Sections:", infoX, y + 8, { width: infoW, lineBreak: false });
    missing.forEach(function(s, i) {
      doc.fillColor(C.mid).font("Helvetica").fontSize(8.5)
        .text("\u25aa  " + s, infoX + 8, y + 22 + i * 13, { width: infoW - 8, lineBreak: false });
    });
  } else {
    doc.fillColor(C.mid).font("Helvetica-Bold").fontSize(9)
      .text("\u2714  All key sections present", infoX, y + 28, { width: infoW, lineBreak: false });
  }
  y += 72;

  // Suggestions box
  const suggestions = (report.cvCompleteness && report.cvCompleteness.suggestions) || [];
  if (suggestions.length > 0) {
    const sugH = 18 + suggestions.length * 14;
    borderedRect(doc, ML, y, useW, sugH, C.surface, C.border, 3, 0.5);
    rect(doc, ML, y, 4, sugH, C.mid, 2);
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(8.5)
      .text("Suggestions", ML + 12, y + 5, { lineBreak: false });
    suggestions.forEach(function(s, i) {
      doc.fillColor(C.mid).font("Helvetica").fontSize(8.5)
        .text("\u2192  " + s, ML + 12, y + 17 + i * 14, { width: useW - 24, lineBreak: false });
    });
    y += sugH + 10;
  }

  y += 8;

  // ── Career Insights ───────────────────────────────────
  if (y > doc.page.height - 200) {
    drawFooter(doc, pageNum++, report.generatedAt);
    doc.addPage(); y = 50;
  }
  y = drawSectionTitle(doc, "Career Insights", ML, y, useW);

  const reasons  = (report.insights && report.insights.reasons)        || [];
  const priority = (report.insights && report.insights.prioritySkills) || [];
  const actions  = (report.insights && report.insights.actions)        || [];

  // Key Observations
  if (reasons.length > 0) {
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9)
      .text("Key Observations", ML, y);
    y += 13;
    reasons.forEach(function(r) {
      if (y > doc.page.height - 56) { drawFooter(doc, pageNum++, report.generatedAt); doc.addPage(); y = 50; }
      rect(doc, ML, y + 2, 3, 10, C.mid, 1);
      doc.fillColor(C.mid).font("Helvetica").fontSize(9)
        .text(r, ML + 10, y + 1, { width: useW - 10, lineBreak: false });
      y += 14;
    });
    y += 6;
  }

  // Priority Skills (inline tags)
  if (priority.length > 0) {
    if (y > doc.page.height - 80) { drawFooter(doc, pageNum++, report.generatedAt); doc.addPage(); y = 50; }
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9)
      .text("Priority Skills to Learn", ML, y);
    y += 13;
    let chipX = ML;
    priority.forEach(function(s) {
      const label = capitalize(s);
      const chipW = Math.min(doc.widthOfString(label) + 16, useW);
      if (chipX + chipW > ML + useW) { chipX = ML; y += 20; }
      if (y > doc.page.height - 56) { drawFooter(doc, pageNum++, report.generatedAt); doc.addPage(); y = 50; chipX = ML; }
      borderedRect(doc, chipX, y, chipW, 16, C.white, C.mid, 8, 0.5);
      doc.fillColor(C.dark).font("Helvetica").fontSize(8)
        .text(label, chipX + 8, y + 4, { width: chipW - 16, lineBreak: false });
      chipX += chipW + 6;
    });
    y += 24;
  }

  // Recommended Actions
  if (actions.length > 0) {
    if (y > doc.page.height - 80) { drawFooter(doc, pageNum++, report.generatedAt); doc.addPage(); y = 50; }
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9)
      .text("Recommended Actions", ML, y);
    y += 13;
    actions.forEach(function(a) {
      if (y > doc.page.height - 56) { drawFooter(doc, pageNum++, report.generatedAt); doc.addPage(); y = 50; }
      rect(doc, ML, y + 2, 3, 10, C.mid, 1);
      doc.fillColor(C.mid).font("Helvetica").fontSize(9)
        .text(a, ML + 10, y + 1, { width: useW - 10, lineBreak: false });
      y += 14;
    });
    y += 6;
  }

  // ── Roadmap Progress ──────────────────────────────────
  y += 8;
  if (y > doc.page.height - 160) {
    drawFooter(doc, pageNum++, report.generatedAt);
    doc.addPage(); y = 50;
  }
  y = drawSectionTitle(doc, "Roadmap Progress", ML, y, useW);

  const roadmaps = report.roadmaps || [];
  if (roadmaps.length === 0) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5)
      .text("No roadmaps created yet.", ML, y);
    y += 20;
  } else {
    roadmaps.forEach(function(r) {
      const CARD_H = 58;
      if (y + CARD_H > doc.page.height - 56) {
        drawFooter(doc, pageNum++, report.generatedAt);
        doc.addPage(); y = 50;
      }
      const pct = r.totalSkills > 0
        ? Math.round((r.skillsCompleted / r.totalSkills) * 100) : 0;

      borderedRect(doc, ML, y, useW, CARD_H, C.surface, C.border, 3, 0.5);
      rect(doc, ML, y, 4, CARD_H, C.mid, 2);

      // Role title
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10)
        .text(capitalize(r.targetRole || "Untitled"), ML + 14, y + 10, {
          width: useW - 120, lineBreak: false,
        });

      // Date (right-aligned)
      doc.fillColor(C.muted).font("Helvetica").fontSize(8)
        .text(new Date(r.createdAt).toLocaleDateString(), ML + useW - 90, y + 12, {
          width: 86, align: "right", lineBreak: false,
        });

      // Match score badge
      borderedRect(doc, ML + useW - 86, y + 26, 78, 15, C.white, C.border, 3, 0.5);
      doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(8)
        .text("Match: " + r.matchScore + "%", ML + useW - 84, y + 30, {
          width: 70, lineBreak: false,
        });

      // Skills text
      doc.fillColor(C.muted).font("Helvetica").fontSize(8)
        .text("Skills completed: " + r.skillsCompleted + " / " + r.totalSkills + "  (" + pct + "%)",
          ML + 14, y + 28, { width: 200, lineBreak: false });

      // Progress bar
      progressBar(doc, ML + 14, y + 46, useW - 28, 7, pct);
      y += CARD_H + 8;
    });
  }

  drawFooter(doc, pageNum, report.generatedAt);
  doc.end();
}

module.exports = { streamPlatformSummaryPDF, streamUserReportPDF };
