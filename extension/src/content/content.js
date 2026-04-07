import { MESSAGE_TYPES } from "../shared/constants.js";
import { detectLinkedInJob } from "./detectors/linkedin.js";
import { detectIndeedJob } from "./detectors/indeed.js";
import { detectGenericJob } from "./detectors/generic.js";

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

  const genericJob = detectGenericJob({
    root: document,
    pageTitle: document.title,
    site,
  });

  if (genericJob) {
    return {
      ...genericJob,
      pageTitle: document.title,
      pageUrl,
      extractedAt: new Date().toISOString(),
    };
  }

  return {
    jobTitle: document.title || "Untitled Role",
    jobDescription: "",
    descriptionLength: 0,
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
