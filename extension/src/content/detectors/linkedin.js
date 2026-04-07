const LINKEDIN_URL_PATTERN = /linkedin\.com\/jobs(\/|$)|linkedin\.com\/jobs\/view/i;

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

function extractLinkedInDescription(root) {
  const selectors = [
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".show-more-less-html__markup",
    ".jobs-description__content",
    ".jobs-search__job-details--container .jobs-description",
    "[data-job-details-section='description']",
    ".jobs-description",
  ];

  return getFirstText(root, selectors, 80).slice(0, 10000);
}

function looksLikeLinkedInPage(root, url) {
  if (LINKEDIN_URL_PATTERN.test(url)) {
    return true;
  }

  return !!root.querySelector("meta[property='og:site_name'][content='LinkedIn']");
}

export function detectLinkedInJob(options = {}) {
  const root = options.root || document;
  const url = String(options.url || globalThis.location?.href || "");
  const pageTitle = String(options.pageTitle || globalThis.document?.title || "");

  if (!looksLikeLinkedInPage(root, url)) {
    return null;
  }

  const jobTitle =
    getFirstText(
      root,
      [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".top-card-layout__title",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        "h1",
      ],
      2
    ) || normalizeText(pageTitle.replace(/\|\s*LinkedIn.*$/i, ""));

  const company = getFirstText(
    root,
    [
      ".job-details-jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
      ".topcard__flavor-row .topcard__flavor:first-child",
    ],
    2
  );

  const location = getFirstText(
    root,
    [
      ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
      ".jobs-unified-top-card__bullet",
      ".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
    ],
    2
  );

  const jobDescription = extractLinkedInDescription(root);

  if (!jobTitle && jobDescription.length < 80) {
    return null;
  }

  return {
    jobTitle: jobTitle || "Untitled LinkedIn Role",
    company: company || null,
    location: location || null,
    jobDescription,
    descriptionLength: jobDescription.length,
    site: "linkedin",
    extractedBy: "linkedin-detector",
  };
}
