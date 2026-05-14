import { MESSAGE_TYPES } from "../shared/constants.js";
import { isTrustedExtensionSender, sanitizePlainText } from "../shared/validators.js";
import { detectLinkedInJob } from "./detectors/linkedin.js";
import { detectIndeedJob } from "./detectors/indeed.js";
import { detectGenericJob } from "./detectors/generic.js";

function waitForCondition(check, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let done = false;

    const finish = (value) => {
      if (done) return;
      done = true;
      try {
        observer.disconnect();
      } catch {
        // ignore
      }
      clearTimeout(timer);
      resolve(value);
    };

    const safeCheck = () => {
      try {
        return !!check();
      } catch {
        return false;
      }
    };

    if (safeCheck()) {
      finish(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (safeCheck()) {
        finish(true);
      }
    });

    try {
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    } catch {
      // ignore
    }

    const timer = setTimeout(() => finish(false), Math.max(0, timeoutMs));
  });
}

function getTextLength(selector) {
  const node = document.querySelector(selector);
  if (!node) return 0;
  const inner = String(node.innerText || "").replace(/\s+/g, " ").trim();
  const content = String(node.textContent || "").replace(/\s+/g, " ").trim();
  const text = inner.length >= content.length ? inner : content;
  return text.length;
}

async function waitForLinkedInJobContent(timeoutMs = 2500) {
  const descriptionSelectors = [
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".show-more-less-html__markup",
    ".jobs-description__content",
    "[data-job-details-section='description']",
    "[data-test-job-description]",
    "#job-details",
    ".jobs-description__container",
    ".jobs-description",
  ];

  const check = () => {
    for (const sel of descriptionSelectors) {
      if (getTextLength(sel) >= 120) {
        return true;
      }
    }

    // JSON-LD JobPosting (if present) also unblocks extraction.
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson && String(ldJson.textContent || "").length > 50) {
      return true;
    }

    return false;
  };

  await waitForCondition(check, timeoutMs);
}

function attemptExpandLinkedInDescription() {
  const candidates = [
    ".show-more-less-html__button--more",
    ".show-more-less-html__button",
    "button[aria-label*='See more']",
    "button[aria-label*='see more']",
    "button[aria-label*='Show more']",
    "button[aria-label*='show more']",
  ];

  for (const selector of candidates) {
    const button = document.querySelector(selector);
    if (!button) continue;

    try {
      const label = String(button.getAttribute("aria-label") || "");
      const text = String(button.innerText || button.textContent || "");
      const combined = `${label} ${text}`.toLowerCase();
      if (!combined.includes("more")) continue;

      button.click();
      return true;
    } catch {
      // ignore
    }
  }

  return false;
}

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

  (async () => {
    try {
      const pageUrl = window.location.href;
      const site = detectSourceSite(pageUrl);

      if (site === "linkedin") {
        attemptExpandLinkedInDescription();
        await waitForLinkedInJobContent(3500);
        // If LinkedIn expands content after interaction, wait a bit more.
        if (attemptExpandLinkedInDescription()) {
          await waitForLinkedInJobContent(2000);
        }
      }

      const payload = sanitizeExtractedJobPayload(extractCurrentJobContext());
      sendResponse({ ok: true, data: payload });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to extract job content.";
      sendResponse({ ok: false, error: errorMessage });
    }
  })();

  return true;
});

function bootstrapContentScript() {
  return {
    ready: true,
    url: window.location.href,
    site: detectSourceSite(window.location.href),
  };
}

bootstrapContentScript();
