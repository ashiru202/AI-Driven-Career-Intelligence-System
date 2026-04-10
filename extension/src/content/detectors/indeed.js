const INDEED_URL_PATTERN = /https?:\/\/(?:[a-z]{2,3}\.)?indeed\.[^/]+\/viewjob|indeed\.[^/]+\/jobs/i;

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

function extractIndeedDescription(root) {
  const selectors = [
    "#jobDescriptionText",
    "#jobDescriptionText > div",
    "[data-testid='jobsearch-JobComponent-description']",
    "[data-testid='jobDescriptionText']",
    ".jobsearch-JobComponent-description",
    "main [role='main']",
  ];

  return getFirstText(root, selectors, 80).slice(0, 10000);
}

function looksLikeIndeedPage(root, url) {
  if (INDEED_URL_PATTERN.test(url)) {
    return true;
  }

  return !!root.querySelector("meta[property='og:site_name'][content='Indeed']");
}

export function detectIndeedJob(options = {}) {
  const root = options.root || document;
  const url = String(options.url || globalThis.location?.href || "");
  const pageTitle = String(options.pageTitle || globalThis.document?.title || "");

  if (!looksLikeIndeedPage(root, url)) {
    return null;
  }

  const jobTitle =
    getFirstText(
      root,
      [
        "h1[data-testid='jobsearch-JobInfoHeader-title']",
        "h1.jobsearch-JobInfoHeader-title",
        "h1.jobsearch-JobInfoHeader-title span",
        "h1",
      ],
      2
    ) || normalizeText(pageTitle.replace(/\s*-\s*Indeed.*$/i, ""));

  const company = getFirstText(
    root,
    [
      "[data-testid='inlineHeader-companyName']",
      ".jobsearch-CompanyInfoWithoutHeaderImage div[data-company-name='true']",
      ".jobsearch-InlineCompanyRating div:first-child",
      ".icl-u-lg-mr--sm",
    ],
    2
  );

  const location = getFirstText(
    root,
    [
      "[data-testid='job-location']",
      "[data-testid='inlineHeader-companyLocation']",
      ".jobsearch-JobInfoHeader-subtitle > div:last-child",
      ".jobsearch-DesktopStickyContainer-subtitle [data-testid='job-location']",
    ],
    2
  );

  const jobDescription = extractIndeedDescription(root);

  if (!jobTitle && jobDescription.length < 80) {
    return null;
  }

  return {
    jobTitle: jobTitle || "Untitled Indeed Role",
    company: company || null,
    location: location || null,
    jobDescription,
    descriptionLength: jobDescription.length,
    site: "indeed",
    extractedBy: "indeed-detector",
  };
}
