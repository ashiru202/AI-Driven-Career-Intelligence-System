import { MESSAGE_TYPES } from "../shared/constants.js";
import { isTrustedExtensionSender, sanitizePlainText } from "../shared/validators.js";
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

function sanitizeExtractedJobPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const description = sanitizePlainText(source.jobDescription, 10000);

  return {
    ...source,
    jobTitle: sanitizePlainText(source.jobTitle, 220) || "Untitled Role",
    company: sanitizePlainText(source.company, 160) || null,
    location: sanitizePlainText(source.location, 160) || null,
    jobDescription: description,
    descriptionLength: description.length,
    site: sanitizePlainText(source.site, 40) || "generic",
    extractedBy: sanitizePlainText(source.extractedBy, 80) || "generic-detector",
    pageTitle: sanitizePlainText(source.pageTitle || document.title, 240),
    pageUrl: sanitizePlainText(source.pageUrl || window.location.href, 2000),
    extractedAt: source.extractedAt || new Date().toISOString(),
  };
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
  if (
    !message ||
    message.type !== MESSAGE_TYPES.CONTENT_EXTRACT_JOB ||
    !isTrustedExtensionSender(sender, chrome.runtime.id)
  ) {
    return false;
  }

  try {
    const payload = sanitizeExtractedJobPayload(extractCurrentJobContext());
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
