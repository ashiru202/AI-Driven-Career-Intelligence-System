function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstText(root, selectors, minLength = 1) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    const text = normalizeText(node?.innerText || node?.textContent || "");
    if (text.length >= minLength) {
      return text;
    }
  }

  return "";
}

function extractDescription(root) {
  const selectors = [
    "[data-testid='jobDescriptionText']",
    "[data-job-details-section='description']",
    "#jobDescriptionText",
    "article",
    "main",
    "[role='main']",
    ".job-description",
    ".jobs-description",
  ];

  for (const selector of selectors) {
    const text = getFirstText(root, [selector], 80);
    if (text.length >= 80) {
      return text.slice(0, 10000);
    }
  }

  return normalizeText(root.body?.innerText || "").slice(0, 10000);
}

function cleanTitleFallback(pageTitle) {
  const cleaned = normalizeText(pageTitle)
    .replace(/\s*[\-|\u2014|\u2013]\s*(linkedin|indeed|glassdoor).*$/i, "")
    .replace(/\s*\(.*?\)\s*$/, "");
  return cleaned;
}

export function detectGenericJob(options = {}) {
  const root = options.root || document;
  const pageTitle = String(options.pageTitle || root.title || "");
  const site = String(options.site || "generic").trim() || "generic";

  const jobTitle =
    getFirstText(
      root,
      [
        "h1[data-testid*='title']",
        "h1[class*='title']",
        "header h1",
        "main h1",
        "article h1",
        "h1",
        "h2",
      ],
      2
    ) || cleanTitleFallback(pageTitle);

  const company = getFirstText(
    root,
    [
      "[data-testid*='company']",
      "[class*='company'] a",
      "[class*='company'] span",
      "[class*='employer']",
    ],
    2
  );

  const location = getFirstText(
    root,
    [
      "[data-testid*='location']",
      "[class*='location']",
      "[class*='job-location']",
    ],
    2
  );

  const jobDescription = extractDescription(root);
  if (!jobTitle && jobDescription.length < 80) {
    return null;
  }

  return {
    jobTitle: jobTitle || "Untitled Role",
    company: company || null,
    location: location || null,
    jobDescription,
    descriptionLength: jobDescription.length,
    site,
    extractedBy: "generic-detector",
  };
}
