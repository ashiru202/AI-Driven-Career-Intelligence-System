import { MESSAGE_TYPES } from "../shared/constants.js";

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
  const titleElement = document.querySelector("h1, h2");
  const title = normalizeText(titleElement?.textContent || document.title);
  const description = getDescriptionText().slice(0, 10000);

  return {
    jobTitle: title,
    jobDescription: description,
    pageTitle: document.title,
    pageUrl: window.location.href,
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
  };
}

bootstrapContentScript();
