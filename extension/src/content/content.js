import { MESSAGE_TYPES } from "../shared/constants.js";
import { detectLinkedInJob } from "./detectors/linkedin.js";
import { detectIndeedJob } from "./detectors/indeed.js";

function detectSourceSite(url) {
  const value = String(url || "").toLowerCase();

  if (value.includes("linkedin.com")) {
    return "linkedin";
  }

  if (value.includes("indeed.")) {
    return "indeed";
  }

  if (value.includes("glassdoor.")) {
    return "glassdoor";
  }

  return "generic";
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescriptionText() {
  const selectors = [
    "main",
    "article",
    "[role='main']",
    ".jobs-description",
    ".jobsearch-jobDescriptionText",
    ".jobDescriptionContent",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = normalizeText(element?.innerText || element?.textContent || "");
    if (text.length > 80) {
      return text;
    }
  }

  return normalizeText(document.body?.innerText || "");
}

function extractCurrentJobContext() {
  const pageUrl = window.location.href;
  const site = detectSourceSite(pageUrl);

  if (site === "linkedin") {
    const linkedInJob = detectLinkedInJob({
      root: document,
      url: pageUrl,
      pageTitle: document.title,
    });

    if (linkedInJob) {
      return {
        ...linkedInJob,
        pageTitle: document.title,
        pageUrl,
        extractedAt: new Date().toISOString(),
      };
    }
  }

  if (site === "indeed") {
    const indeedJob = detectIndeedJob({
      root: document,
      url: pageUrl,
      pageTitle: document.title,
    });

    if (indeedJob) {
      return {
        ...indeedJob,
        pageTitle: document.title,
        pageUrl,
        extractedAt: new Date().toISOString(),
      };
    }
  }

  const titleElement = document.querySelector("h1, h2");
  const title = normalizeText(titleElement?.textContent || document.title);
  const description = getDescriptionText().slice(0, 10000);

  return {
    jobTitle: title,
    jobDescription: description,
    descriptionLength: description.length,
    site,
    extractedBy: "generic-detector",
    pageTitle: document.title,
    pageUrl,
    extractedAt: new Date().toISOString(),
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== MESSAGE_TYPES.CONTENT_EXTRACT_JOB) {
    return false;
  }

  try {
    const payload = extractCurrentJobContext();
    sendResponse({ ok: true, data: payload });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to extract job content.";
    sendResponse({ ok: false, error: errorMessage });
  }

  return true;
});

export function bootstrapContentScript() {
  return {
    ready: true,
    url: window.location.href,
    site: detectSourceSite(window.location.href),
  };
}

bootstrapContentScript();
