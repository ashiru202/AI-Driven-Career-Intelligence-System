import { EXTENSION_API_ROUTES, MESSAGE_TYPES, STORAGE_AREAS, STORAGE_KEYS } from "../shared/constants.js";
import { AuthSessionError, requestWithAuth, validateSessionWithBackend } from "../shared/auth.js";
import { ApiRequestError } from "./utils/api.js";
import { getFromStorage, setToStorage } from "./utils/storage.js";
import { sanitizePlainText } from "../shared/validators.js";

const app = document.getElementById("app");
const RESUME_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_JOB_DESCRIPTION_LENGTH = 120;
const popupRuntime = {
  resumeData: null,
  lastExtraction: null,
  lastComparison: null,
  extractionError: "",
  comparisonError: "",
  manualDraft: {
    jobTitle: "",
    jobDescription: "",
    error: "",
  },
};

const POPUP_STATES = Object.freeze({
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error",
});

const COPY = Object.freeze({
  title: "Career Skill Gap Analyzer",
  subtitle: "Analyze jobs in real time and compare with your resume.",
  loadingHeading: "Connecting to extension services",
  loadingMessage: "Checking background service and preparing your workspace.",
  emptyHeading: "Ready to analyze a job post",
  emptyMessage:
    "Choose a resume in the next step, then run analysis directly from the job page you are viewing.",
  emptyNoResumeMessage:
    "No resumes found yet. Upload a resume in the main app, then reopen this popup.",
  manualHeading: "Manual Job Description Fallback",
  manualMessage: "If extraction fails on the current page, paste the job details below.",
  manualHint: "Tip: include responsibilities, requirements, and tools for better matching.",
  comparisonHeading: "Latest Comparison",
  compareFailed: "Comparison request failed.",
  roadmapLabel: "Generate Roadmap",
  roadmapFailed: "Could not open roadmap in the main app.",
  timeoutMessage: "Request timed out. Please retry.",
  networkMessage: "Network issue detected. Check your connection and retry.",
  noResumeMessage: "No resume found. Upload one in the app, then retry.",
  tokenExpiredMessage: "Your session expired. Please sign in again from the main app.",
  retryExtractionLabel: "Retry Extraction",
  retryComparisonLabel: "Retry Comparison",
  authHeading: "Sign in required",
  authMessage: "Your extension session is missing or expired. Open app login, sign in, then return and retry.",
  errorHeading: "Could not connect",
  errorMessage: "The popup could not reach the background service worker.",
});

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        resolve({ ok: false, error: runtimeError.message });
        return;
      }

      resolve(response || { ok: false, error: "No response from background." });
    });
  });
}

function normalizeResume(resume) {
  if (!resume || typeof resume !== "object") {
    return null;
  }

  const id = String(resume.id || resume._id || "").trim();
  if (!id) {
    return null;
  }

  const name = sanitizePlainText(resume.name || resume.fileName || "Untitled Resume", 180);
  const parsedSize = Number(resume.sizeKB);
  const sizeKB = Number.isFinite(parsedSize) ? Math.max(0, Math.round(parsedSize)) : null;

  return {
    id,
    name,
    sizeKB,
    date: resume.date || resume.createdAt || null,
  };
}

function parseResumeList(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.resumes)
        ? payload.resumes
        : [];

  return list.map(normalizeResume).filter(Boolean);
}

function resolveSelectedResumeId(resumes, preferredId) {
  const preferred = String(preferredId || "").trim();
  if (preferred && resumes.some((resume) => resume.id === preferred)) {
    return preferred;
  }

  return resumes[0]?.id || "";
}

function formatRelativeTime(timestampMs) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "not cached";
  }

  const diffMs = Date.now() - timestampMs;
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));
  if (diffSeconds < 30) {
    return "just now";
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function truncateText(value, maxLength) {
  const text = sanitizePlainText(value, Number.isFinite(maxLength) ? maxLength * 2 : 12000);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function getApiErrorCode(error) {
  return String(error?.payload?.error?.code || "").trim().toUpperCase();
}

function isAuthFailure(error) {
  if (error instanceof AuthSessionError) {
    return true;
  }

  if (error instanceof ApiRequestError && error.status === 401) {
    return true;
  }

  return getApiErrorCode(error) === "UNAUTHORIZED";
}

function getErrorMessage(error, fallback) {
  if (isAuthFailure(error)) {
    return COPY.tokenExpiredMessage;
  }

  if (error instanceof ApiRequestError) {
    if (error.status === 408) {
      return COPY.timeoutMessage;
    }

    if (error.status === 0) {
      return COPY.networkMessage;
    }

    const code = getApiErrorCode(error);
    if (code === "NO_RESUME") {
      return COPY.noResumeMessage;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return sanitizePlainText(error.message, 240);
    }
  }

  if (error instanceof AuthSessionError && error.message) {
    return sanitizePlainText(error.message, 240);
  }

  if (error instanceof Error && error.message) {
    return sanitizePlainText(error.message, 240);
  }

  return sanitizePlainText(fallback, 240);
}

function normalizeManualDraft(value) {
  const draft = value && typeof value === "object" ? value : {};

  return {
    jobTitle: sanitizePlainText(draft.jobTitle, 220),
    jobDescription: sanitizePlainText(draft.jobDescription, 10000),
    error: sanitizePlainText(draft.error, 240),
  };
}

function normalizeSkillList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => sanitizePlainText(item, 80))
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
}

function normalizeComparisonResult(payload, context = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const data = source && typeof source.data === "object" ? source.data : source;

  const matchScoreRaw = Number(data.matchScore);
  const matchScore = Number.isFinite(matchScoreRaw) ? Math.max(0, Math.min(100, Math.round(matchScoreRaw))) : 0;
  const commonSkills = normalizeSkillList(data.commonSkills);
  const missingSkills = normalizeSkillList(data.missingSkills);
  const comparisonId = String(data.comparisonId || "").trim() || null;

  return {
    comparisonId,
    matchScore,
    commonSkills,
    missingSkills,
    commonCount:
      Number.isFinite(Number(data.commonCount)) && Number(data.commonCount) >= 0
        ? Number(data.commonCount)
        : commonSkills.length,
    missingCount:
      Number.isFinite(Number(data.missingCount)) && Number(data.missingCount) >= 0
        ? Number(data.missingCount)
        : missingSkills.length,
    totalRequired:
      Number.isFinite(Number(data.totalRequired)) && Number(data.totalRequired) >= 0
        ? Number(data.totalRequired)
        : commonSkills.length + missingSkills.length,
    resumeFileName: sanitizePlainText(data.resumeFileName || context.resumeName || "", 180) || null,
    resumeId: sanitizePlainText(context.resumeId || "", 120) || null,
    jobTitle: sanitizePlainText(context.jobTitle || "", 220) || null,
    site: sanitizePlainText(context.site || "generic", 40) || "generic",
    timestamp: data.timestamp || new Date().toISOString(),
  };
}

function buildStoredExtractionRecord(source, resumeId) {
  const input = source && typeof source === "object" ? source : {};
  const description = sanitizePlainText(input.jobDescription, 10000);

  return {
    jobTitle: sanitizePlainText(input.jobTitle, 220) || "Untitled role",
    jobDescription: description,
    descriptionLength: description.length,
    company: sanitizePlainText(input.company, 160) || null,
    location: sanitizePlainText(input.location, 160) || null,
    site: sanitizePlainText(input.site, 40) || "generic",
    extractedBy: sanitizePlainText(input.extractedBy, 80) || "unknown-detector",
    pageTitle: sanitizePlainText(input.pageTitle, 240) || "",
    pageUrl: sanitizePlainText(input.pageUrl, 2000) || "",
    resumeId: sanitizePlainText(resumeId, 120) || null,
    extractedAt: input.extractedAt || new Date().toISOString(),
    capturedAt: new Date().toISOString(),
  };
}

function normalizeStoredExtractionRecord(source) {
  const input = source && typeof source === "object" ? source : {};
  const resumeId = sanitizePlainText(input.resumeId, 120);
  const normalized = buildStoredExtractionRecord(input, resumeId);
  normalized.capturedAt = input.capturedAt || normalized.capturedAt;
  normalized.extractedAt = input.extractedAt || normalized.extractedAt;
  return normalized;
}

function normalizeExtractedJob(response) {
  const data = response?.data || null;
  const job = data?.job || data?.extraction?.data || null;
  const tab = data?.tab || null;

  if (!job || typeof job !== "object") {
    throw new Error("No job details were returned from the active tab.");
  }

  const jobTitle = sanitizePlainText(job.jobTitle, 220);
  const jobDescription = sanitizePlainText(job.jobDescription, 10000);

  if (!jobDescription || jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
    throw new Error("Job description appears too short. Open a full job post and try again.");
  }

  return {
    ...job,
    jobTitle: jobTitle || "Untitled role",
    jobDescription,
    tab:
      tab && typeof tab === "object"
        ? {
            id: Number.isFinite(Number(tab.id)) ? Number(tab.id) : null,
            title: sanitizePlainText(tab.title, 220) || null,
            url: sanitizePlainText(tab.url, 2000) || null,
          }
        : null,
  };
}

async function openMainApp(path = "/") {
  const response = await sendRuntimeMessage({
    type: MESSAGE_TYPES.OPEN_APP_PAGE,
    path,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Failed to open main app.");
  }

  return response;
}

async function readResumeCache() {
  const defaults = {
    [STORAGE_KEYS.RESUME_CACHE]: [],
    [STORAGE_KEYS.RESUME_CACHE_UPDATED_AT]: 0,
    [STORAGE_KEYS.SELECTED_RESUME_ID]: "",
  };

  const stored = await getFromStorage(defaults, { area: STORAGE_AREAS.SYNC });
  const resumes = parseResumeList(stored[STORAGE_KEYS.RESUME_CACHE]);
  const updatedAt = Number(stored[STORAGE_KEYS.RESUME_CACHE_UPDATED_AT]) || 0;
  const selectedResumeId = String(stored[STORAGE_KEYS.SELECTED_RESUME_ID] || "").trim();
  const isFresh = updatedAt > 0 && Date.now() - updatedAt <= RESUME_CACHE_TTL_MS;

  return {
    resumes,
    updatedAt,
    selectedResumeId,
    isFresh,
  };
}

async function persistResumeData(resumes, selectedResumeId, updatedAt = Date.now()) {
  await setToStorage(
    {
      [STORAGE_KEYS.RESUME_CACHE]: resumes,
      [STORAGE_KEYS.RESUME_CACHE_UPDATED_AT]: updatedAt,
      [STORAGE_KEYS.SELECTED_RESUME_ID]: selectedResumeId,
    },
    { area: STORAGE_AREAS.SYNC }
  );
}

async function loadResumesForPopup(forceRefresh = false) {
  const cache = await readResumeCache();

  if (!forceRefresh && cache.isFresh) {
    const selectedResumeId = resolveSelectedResumeId(cache.resumes, cache.selectedResumeId);
    if (selectedResumeId !== cache.selectedResumeId) {
      await persistResumeData(cache.resumes, selectedResumeId, cache.updatedAt);
    }

    return {
      resumes: cache.resumes,
      selectedResumeId,
      source: "cache",
      cacheUpdatedAt: cache.updatedAt,
      warning: "",
    };
  }

  try {
    const response = await requestWithAuth(EXTENSION_API_ROUTES.RESUMES_LIST);

    if (response?.ok === false) {
      const code = response?.error?.code || "LIST_RESUMES_FAILED";
      const message = response?.error?.message || "Unable to fetch resumes.";
      throw new AuthSessionError(message, { code, status: 400 });
    }

    const resumes = parseResumeList(response);
    const selectedResumeId = resolveSelectedResumeId(resumes, cache.selectedResumeId);
    const updatedAt = Date.now();
    await persistResumeData(resumes, selectedResumeId, updatedAt);

    return {
      resumes,
      selectedResumeId,
      source: "network",
      cacheUpdatedAt: updatedAt,
      warning: "",
    };
  } catch (error) {
    if (cache.resumes.length > 0) {
      const selectedResumeId = resolveSelectedResumeId(cache.resumes, cache.selectedResumeId);
      return {
        resumes: cache.resumes,
        selectedResumeId,
        source: "stale-cache",
        cacheUpdatedAt: cache.updatedAt,
        warning: "Using cached resumes because refresh failed.",
      };
    }

    throw error;
  }
}

async function runQuickComparison({ resumeId, jobContext }) {
  const activeResumeId = sanitizePlainText(resumeId, 120);
  const title = sanitizePlainText(jobContext?.jobTitle, 220) || "Untitled Role";
  const description = sanitizePlainText(jobContext?.jobDescription, 10000);

  if (!activeResumeId) {
    throw new Error("Resume selection is required before comparison.");
  }

  if (!description) {
    throw new Error("Job description is required for comparison.");
  }

  const payload = {
    resumeId: activeResumeId,
    jobTitle: title,
    jobDescription: description,
  };

  const response = await requestWithAuth(EXTENSION_API_ROUTES.QUICK_COMPARE, {
    method: "POST",
    body: payload,
  });

  if (response?.ok === false) {
    const code = String(response?.error?.code || "COMPARE_FAILED").trim().toUpperCase();
    const message = response?.error?.message || COPY.compareFailed;
    throw new ApiRequestError(message, 400, {
      error: {
        code,
        message,
      },
    });
  }

  const comparison = normalizeComparisonResult(response, {
    resumeId: activeResumeId,
    jobTitle: title,
    site: sanitizePlainText(jobContext?.site, 40),
  });

  await setToStorage(
    {
      [STORAGE_KEYS.LAST_COMPARISON]: comparison,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  popupRuntime.lastComparison = comparison;
  popupRuntime.comparisonError = "";

  return comparison;
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

function createHeader() {
  const header = createElement("header", "popup-header");
  const title = createElement("h1", "popup-title", COPY.title);
  const subtitle = createElement("p", "popup-subtitle", COPY.subtitle);
  header.append(title, subtitle);
  return header;
}

function createFooter() {
  const footer = createElement("footer", "popup-footer");
  footer.append(
    createElement("span", "footer-chip", "Task 16 Error Recovery"),
    createElement("span", "footer-chip", "Timeout/auth/retry handling")
  );
  return footer;
}

function createExtractionSummary(options = {}) {
  const extraction = options.lastExtraction;
  if (!extraction || typeof extraction !== "object") {
    return null;
  }

  const resumes = Array.isArray(options.resumes) ? options.resumes : [];
  const selectedResume = resumes.find((resume) => resume.id === extraction.resumeId);

  const panel = createElement("section", "analysis-summary");
  const title = createElement("h3", "analysis-summary-title", "Latest Extraction");
  const meta1 = createElement(
    "p",
    "analysis-summary-meta",
    `Source: ${String(extraction.site || "generic").toUpperCase()} | Resume: ${selectedResume?.name || "Unknown"}`
  );
  const meta2 = createElement(
    "p",
    "analysis-summary-meta",
    `Captured ${formatRelativeTime(new Date(extraction.capturedAt || extraction.extractedAt || Date.now()).getTime())}`
  );
  const jobTitle = createElement("p", "analysis-summary-role", extraction.jobTitle || "Untitled role");
  const snippet = createElement("p", "analysis-summary-snippet", truncateText(extraction.jobDescription, 220));

  panel.append(title, meta1, meta2, jobTitle, snippet);
  return panel;
}

function createComparisonSummary(options = {}) {
  const comparison = options.lastComparison;
  if (!comparison || typeof comparison !== "object") {
    return null;
  }

  const matchScore = Math.max(0, Math.min(100, Number(comparison.matchScore || 0)));
  const commonSkills = normalizeSkillList(comparison.commonSkills);
  const missingSkills = normalizeSkillList(comparison.missingSkills);

  const createSkillList = (skills, variant, emptyText) => {
    if (!skills.length) {
      return createElement("p", "comparison-section-empty", emptyText);
    }

    const list = createElement("div", `comparison-skill-list ${variant}`);
    skills.slice(0, 12).forEach((skill) => {
      list.append(createElement("span", `comparison-skill-pill ${variant}`, skill));
    });
    return list;
  };

  const panel = createElement("section", "comparison-summary");
  const title = createElement("h3", "comparison-summary-title", COPY.comparisonHeading);
  const score = createElement("p", "comparison-summary-score", `${Math.round(matchScore)}% match`);

  const scoreBar = createElement("div", "comparison-scorebar");
  const scoreFill = createElement("div", "comparison-scorebar-fill");
  scoreFill.style.width = `${Math.round(matchScore)}%`;
  scoreBar.append(scoreFill);

  const stats = createElement("div", "comparison-summary-stats");
  stats.append(
    createElement("span", "comparison-stat-pill matched", `Matched ${Number(comparison.commonCount || 0)}`),
    createElement("span", "comparison-stat-pill missing", `Missing ${Number(comparison.missingCount || 0)}`),
    createElement("span", "comparison-stat-pill total", `Required ${Number(comparison.totalRequired || 0)}`)
  );

  const metaTextParts = [];
  if (comparison.site) {
    metaTextParts.push(String(comparison.site).toUpperCase());
  }
  if (comparison.timestamp) {
    metaTextParts.push(`Updated ${formatRelativeTime(new Date(comparison.timestamp).getTime())}`);
  }

  const meta = createElement(
    "p",
    "comparison-summary-meta",
    metaTextParts.length ? metaTextParts.join(" | ") : "Latest analysis"
  );

  const matchedSection = createElement("div", "comparison-section");
  matchedSection.append(
    createElement("h4", "comparison-section-title matched", "Matched Skills"),
    createSkillList(commonSkills, "matched", "No matched skills found yet.")
  );

  const missingSection = createElement("div", "comparison-section");
  missingSection.append(
    createElement("h4", "comparison-section-title missing", "Missing Skills"),
    createSkillList(missingSkills, "missing", "No missing skills detected.")
  );

  const sections = createElement("div", "comparison-sections");
  sections.append(matchedSection, missingSection);

  const actionBar = createElement("div", "comparison-actions");
  const roadmapButton = createElement("button", "primary-button roadmap-button", COPY.roadmapLabel);
  roadmapButton.type = "button";
  roadmapButton.disabled = !comparison.comparisonId;
  roadmapButton.addEventListener("click", async () => {
    if (typeof options.onGenerateRoadmap !== "function") {
      return;
    }

    roadmapButton.disabled = true;
    roadmapButton.textContent = "Opening...";
    await options.onGenerateRoadmap(comparison);
  });
  actionBar.append(roadmapButton);

  panel.append(title, score, scoreBar, stats, meta, sections, actionBar);
  return panel;
}

function createResumeSelector(options = {}) {
  const resumes = Array.isArray(options.resumes) ? options.resumes : [];
  const selectedResumeId = String(options.selectedResumeId || "").trim();

  const section = createElement("section", "selector-group");
  const label = createElement("label", "selector-label", "Select Resume");
  label.setAttribute("for", "resume-selector");

  const select = createElement("select", "resume-select");
  select.id = "resume-selector";
  select.name = "resume-selector";

  if (resumes.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No resumes available";
    select.append(option);
    select.disabled = true;
  } else {
    resumes.forEach((resume) => {
      const option = document.createElement("option");
      option.value = resume.id;
      const suffix = Number.isFinite(resume.sizeKB) ? ` (${resume.sizeKB} KB)` : "";
      option.textContent = `${resume.name}${suffix}`;

      if (resume.id === selectedResumeId) {
        option.selected = true;
      }

      select.append(option);
    });

    select.addEventListener("change", async () => {
      const value = String(select.value || "").trim();
      await setToStorage(
        {
          [STORAGE_KEYS.SELECTED_RESUME_ID]: value,
        },
        { area: STORAGE_AREAS.SYNC }
      );
    });
  }

  const sourceLabel =
    options.source === "network"
      ? "Live from backend"
      : options.source === "stale-cache"
        ? `Stale cache (${formatRelativeTime(options.cacheUpdatedAt)})`
        : `Cached (${formatRelativeTime(options.cacheUpdatedAt)})`;

  const meta = createElement("p", "resume-meta", sourceLabel);
  section.append(label, select, meta);

  if (options.warning) {
    section.append(createElement("p", "status-warning", options.warning));
  }

  return section;
}

function createManualInputSection(options = {}) {
  const draft = normalizeManualDraft(options.manualDraft);

  const section = createElement("section", "manual-input");
  const heading = createElement("h3", "manual-input-title", COPY.manualHeading);
  const message = createElement("p", "manual-input-message", COPY.manualMessage);

  const titleLabel = createElement("label", "manual-input-label", "Job Title (optional)");
  titleLabel.setAttribute("for", "manual-job-title");

  const titleInput = createElement("input", "manual-input-field");
  titleInput.id = "manual-job-title";
  titleInput.type = "text";
  titleInput.placeholder = "e.g. Senior Frontend Engineer";
  titleInput.value = draft.jobTitle;

  const descLabel = createElement("label", "manual-input-label", "Job Description");
  descLabel.setAttribute("for", "manual-job-description");

  const descInput = createElement("textarea", "manual-input-area");
  descInput.id = "manual-job-description";
  descInput.rows = 5;
  descInput.placeholder = "Paste full job requirements, responsibilities, and skills...";
  descInput.value = draft.jobDescription;

  const hint = createElement("p", "manual-input-hint", COPY.manualHint);
  const charCount = createElement(
    "p",
    "manual-input-count",
    `${String(draft.jobDescription || "").trim().length} characters`
  );

  const manualActions = createElement("div", "manual-input-actions");
  const saveButton = createElement("button", "secondary-button", "Use Manual Input");
  saveButton.type = "button";

  const clearButton = createElement("button", "secondary-button", "Clear");
  clearButton.type = "button";

  titleInput.addEventListener("input", () => {
    const nextDraft = {
      ...draft,
      jobTitle: titleInput.value,
      jobDescription: descInput.value,
      error: "",
    };
    options.onManualDraftChange?.(nextDraft);
    charCount.textContent = `${String(nextDraft.jobDescription || "").trim().length} characters`;
  });

  descInput.addEventListener("input", () => {
    const nextDraft = {
      ...draft,
      jobTitle: titleInput.value,
      jobDescription: descInput.value,
      error: "",
    };
    options.onManualDraftChange?.(nextDraft);
    charCount.textContent = `${String(nextDraft.jobDescription || "").trim().length} characters`;
  });

  saveButton.addEventListener("click", async () => {
    const activeResumeId = options.getSelectedResumeId?.() || "";
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    await options.onManualSubmit?.({
      resumeId: activeResumeId,
      jobTitle: titleInput.value,
      jobDescription: descInput.value,
    });
  });

  clearButton.addEventListener("click", () => {
    const cleared = {
      jobTitle: "",
      jobDescription: "",
      error: "",
    };
    options.onManualDraftChange?.(cleared);
    options.onManualClear?.();
  });

  manualActions.append(saveButton, clearButton);

  section.append(
    heading,
    message,
    titleLabel,
    titleInput,
    descLabel,
    descInput,
    hint,
    charCount,
    manualActions
  );

  if (draft.error) {
    section.append(createElement("p", "status-warning", draft.error));
  }

  return section;
}

function createStateCard(state, options = {}) {
  const card = createElement("section", "status-card");
  const pill = createElement("div", `status-pill ${state}`);
  const heading = createElement("h2", "status-heading");
  const message = createElement("p", "status-message");
  const actions = createElement("div", "status-actions");

  if (state === POPUP_STATES.LOADING) {
    pill.append(createElement("span", "spinner"), document.createTextNode("Loading"));
    heading.textContent = COPY.loadingHeading;
    message.textContent = COPY.loadingMessage;

    const checkButton = createElement("button", "secondary-button", "Checking");
    checkButton.disabled = true;
    actions.append(checkButton);
  }

  if (state === POPUP_STATES.EMPTY) {
    pill.textContent = "Ready";
    const resumes = Array.isArray(options.resumes) ? options.resumes : [];
    const selectedResumeId = String(options.selectedResumeId || "").trim();

    heading.textContent = resumes.length > 0 ? COPY.emptyHeading : "Upload a resume to continue";
    message.textContent = resumes.length > 0 ? COPY.emptyMessage : COPY.emptyNoResumeMessage;

    card.append(createResumeSelector(options));

    const extractionSummary = createExtractionSummary(options);
    if (extractionSummary) {
      card.append(extractionSummary);
    }

    const comparisonSummary = createComparisonSummary({
      ...options,
      onGenerateRoadmap: options.onGenerateRoadmap,
    });
    if (comparisonSummary) {
      card.append(comparisonSummary);
    }

    const getActiveResumeId = () => {
      const selector = card.querySelector("#resume-selector");
      return String(selector?.value || selectedResumeId || "").trim();
    };

    card.append(
      createManualInputSection({
        manualDraft: options.manualDraft,
        onManualDraftChange: options.onManualDraftChange,
        onManualSubmit: options.onManualSubmit,
        onManualClear: options.onManualClear,
        getSelectedResumeId: getActiveResumeId,
      })
    );

    if (options.extractionError) {
      card.append(createElement("p", "status-warning", options.extractionError));
    }

    if (options.comparisonError) {
      card.append(createElement("p", "status-warning", options.comparisonError));
    }

    const analyzeButton = createElement("button", "primary-button", "Analyze Current Job");
    analyzeButton.type = "button";
    analyzeButton.disabled = resumes.length === 0;

    analyzeButton.addEventListener("click", async () => {
      if (typeof options.onAnalyze !== "function") {
        return;
      }

      const activeResumeId = getActiveResumeId();
      if (!activeResumeId) {
        return;
      }

      analyzeButton.disabled = true;
      analyzeButton.textContent = "Extracting...";

      await options.onAnalyze({ resumeId: activeResumeId });
    });

    const refreshButton = createElement("button", "secondary-button", "Refresh CV List");
    refreshButton.type = "button";
    refreshButton.addEventListener("click", () => {
      bootstrapPopup(true);
    });

    actions.append(analyzeButton, refreshButton);

    if (resumes.length === 0) {
      const uploadButton = createElement("button", "secondary-button", "Open App to Upload");
      uploadButton.type = "button";
      uploadButton.addEventListener("click", async () => {
        try {
          await openMainApp("/upload");
        } catch (error) {
          popupRuntime.extractionError = getErrorMessage(error, "Could not open upload page.");
          renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
        }
      });
      actions.append(uploadButton);
    } else {
      analyzeButton.dataset.resumeId = selectedResumeId;

      if (options.extractionError && typeof options.onRetryExtraction === "function") {
        const retryExtractionButton = createElement("button", "secondary-button", COPY.retryExtractionLabel);
        retryExtractionButton.type = "button";
        retryExtractionButton.addEventListener("click", async () => {
          const activeResumeId = getActiveResumeId();
          if (!activeResumeId) {
            return;
          }

          retryExtractionButton.disabled = true;
          retryExtractionButton.textContent = "Retrying...";
          await options.onRetryExtraction({ resumeId: activeResumeId });
        });
        actions.append(retryExtractionButton);
      }

      if (
        options.comparisonError &&
        options.lastExtraction &&
        typeof options.onRetryComparison === "function"
      ) {
        const retryComparisonButton = createElement("button", "secondary-button", COPY.retryComparisonLabel);
        retryComparisonButton.type = "button";
        retryComparisonButton.addEventListener("click", async () => {
          const activeResumeId = getActiveResumeId();
          if (!activeResumeId) {
            return;
          }

          retryComparisonButton.disabled = true;
          retryComparisonButton.textContent = "Retrying...";
          await options.onRetryComparison({ resumeId: activeResumeId });
        });
        actions.append(retryComparisonButton);
      }
    }
  }

  if (state === POPUP_STATES.ERROR) {
    pill.textContent = "Error";
    heading.textContent = options.heading || COPY.errorHeading;
    const baseMessage = options.message || COPY.errorMessage;
    const detail = options.error ? `${baseMessage} ${options.error}` : baseMessage;
    message.textContent = detail;

    const retryButton = createElement("button", "primary-button", "Retry");
    retryButton.type = "button";
    retryButton.addEventListener("click", () => {
      bootstrapPopup();
    });

    actions.append(retryButton);

    if (options.allowOpenApp) {
      const openAppButton = createElement("button", "secondary-button", "Open App Login");
      openAppButton.type = "button";
      openAppButton.addEventListener("click", async () => {
        try {
          await openMainApp("/login?from=extension");
        } catch (error) {
          const detail = getErrorMessage(error, COPY.roadmapFailed);
          renderShell(POPUP_STATES.ERROR, {
            heading: COPY.authHeading,
            message: COPY.authMessage,
            error: detail,
            allowOpenApp: true,
          });
        }
      });
      actions.append(openAppButton);
    }
  }

  card.append(pill, heading, message, actions);
  return card;
}

function renderShell(state, options = {}) {
  if (!app) {
    return;
  }

  app.innerHTML = "";

  const shell = createElement("section", "popup-shell");
  shell.append(createHeader(), createStateCard(state, options), createFooter());
  app.append(shell);
}

function renderReadyState(resumeData) {
  popupRuntime.resumeData = resumeData;

  renderShell(POPUP_STATES.EMPTY, {
    ...resumeData,
    lastExtraction: popupRuntime.lastExtraction,
    lastComparison: popupRuntime.lastComparison,
    extractionError: popupRuntime.extractionError,
    comparisonError: popupRuntime.comparisonError,
    manualDraft: popupRuntime.manualDraft,
    onAnalyze: handleAnalyzeCurrentTab,
    onGenerateRoadmap: handleGenerateRoadmap,
    onRetryExtraction: handleRetryExtraction,
    onRetryComparison: handleRetryComparison,
    onManualDraftChange: handleManualDraftChange,
    onManualSubmit: handleManualInputSubmit,
    onManualClear: handleManualInputClear,
  });
}

function renderAuthRequiredState(message = COPY.authMessage) {
  renderShell(POPUP_STATES.ERROR, {
    heading: COPY.authHeading,
    message,
    allowOpenApp: true,
  });
}

function handleManualDraftChange(nextDraft) {
  popupRuntime.manualDraft = normalizeManualDraft(nextDraft);
}

function handleManualInputClear() {
  popupRuntime.manualDraft = {
    jobTitle: "",
    jobDescription: "",
    error: "",
  };
  renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
}

async function handleRetryExtraction({ resumeId }) {
  await handleAnalyzeCurrentTab({ resumeId });
}

async function handleRetryComparison({ resumeId }) {
  const activeResumeId = String(resumeId || "").trim() || String(popupRuntime.lastExtraction?.resumeId || "").trim();
  if (!activeResumeId) {
    popupRuntime.comparisonError = "Select a resume before retrying comparison.";
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
    return;
  }

  if (!popupRuntime.lastExtraction) {
    popupRuntime.comparisonError = "No extracted job data found. Retry extraction first.";
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
    return;
  }

  try {
    await runQuickComparison({
      resumeId: activeResumeId,
      jobContext: popupRuntime.lastExtraction,
    });
    popupRuntime.comparisonError = "";
  } catch (error) {
    if (isAuthFailure(error)) {
      renderAuthRequiredState(getErrorMessage(error, COPY.authMessage));
      return;
    }
    popupRuntime.comparisonError = getErrorMessage(error, COPY.compareFailed);
  }

  renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
}

async function handleGenerateRoadmap(comparison) {
  const comparisonId = sanitizePlainText(comparison?.comparisonId, 120);
  if (!comparisonId) {
    popupRuntime.comparisonError = "No comparison ID is available yet. Analyze a job first.";
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
    return;
  }

  const query = new URLSearchParams({
    from: "extension",
    comparisonId,
  });

  try {
    await openMainApp(`/my-roadmap?${query.toString()}`);
    popupRuntime.comparisonError = "";
  } catch (error) {
    popupRuntime.comparisonError = getErrorMessage(error, COPY.roadmapFailed);
  }

  renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
}

async function handleManualInputSubmit({ resumeId, jobTitle, jobDescription }) {
  const activeResumeId = sanitizePlainText(resumeId, 120);
  const normalizedTitle = sanitizePlainText(jobTitle, 220);
  const normalizedDescription = sanitizePlainText(jobDescription, 10000);

  if (!activeResumeId) {
    popupRuntime.manualDraft = {
      ...normalizeManualDraft({ jobTitle: normalizedTitle, jobDescription: normalizedDescription }),
      error: "Select a resume before saving manual input.",
    };
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
    return;
  }

  if (normalizedDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
    popupRuntime.manualDraft = {
      ...normalizeManualDraft({ jobTitle: normalizedTitle, jobDescription: normalizedDescription }),
      error: `Description is too short. Add at least ${MIN_JOB_DESCRIPTION_LENGTH} characters.`,
    };
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
    return;
  }

  const manualExtraction = buildStoredExtractionRecord(
    {
    jobTitle: normalizedTitle || "Manual Job Entry",
    jobDescription: normalizedDescription,
    descriptionLength: normalizedDescription.length,
    company: null,
    location: null,
    site: "manual",
    extractedBy: "manual-input",
    pageTitle: "Manual Input",
    pageUrl: "manual://input",
    extractedAt: new Date().toISOString(),
    },
    activeResumeId
  );

  await setToStorage(
    {
      [STORAGE_KEYS.SELECTED_RESUME_ID]: activeResumeId,
      [STORAGE_KEYS.LAST_ANALYSIS]: manualExtraction,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  popupRuntime.lastExtraction = manualExtraction;
  popupRuntime.extractionError = "";
  popupRuntime.comparisonError = "";
  popupRuntime.manualDraft = {
    jobTitle: normalizedTitle,
    jobDescription: normalizedDescription,
    error: "",
  };

  try {
    await runQuickComparison({
      resumeId: activeResumeId,
      jobContext: manualExtraction,
    });
  } catch (error) {
    if (isAuthFailure(error)) {
      renderAuthRequiredState(getErrorMessage(error, COPY.authMessage));
      return;
    }
    popupRuntime.comparisonError = getErrorMessage(error, COPY.compareFailed);
  }

  renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
}

async function handleAnalyzeCurrentTab({ resumeId }) {
  const activeResumeId = sanitizePlainText(resumeId, 120);
  if (!activeResumeId) {
    popupRuntime.extractionError = "Select a resume before starting analysis.";
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: "" });
    return;
  }

  await setToStorage(
    {
      [STORAGE_KEYS.SELECTED_RESUME_ID]: activeResumeId,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  let lastExtraction = null;

  try {
    const extractionResponse = await sendRuntimeMessage({
      type: MESSAGE_TYPES.REQUEST_JOB_EXTRACTION,
    });

    if (!extractionResponse.ok) {
      throw new Error(extractionResponse.error || "Extraction request failed.");
    }

    const extractedJob = normalizeExtractedJob(extractionResponse);
    lastExtraction = buildStoredExtractionRecord(extractedJob, activeResumeId);

    await setToStorage(
      {
        [STORAGE_KEYS.LAST_ANALYSIS]: lastExtraction,
      },
      { area: STORAGE_AREAS.SYNC }
    );

    popupRuntime.lastExtraction = lastExtraction;
    popupRuntime.extractionError = "";
    popupRuntime.comparisonError = "";
  } catch (error) {
    popupRuntime.extractionError = getErrorMessage(error, "Could not extract job details from this page.");
    popupRuntime.manualDraft = {
      ...popupRuntime.manualDraft,
      error: "Auto extraction failed. Paste the job description manually below.",
    };
    renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
    return;
  }

  try {
    await runQuickComparison({
      resumeId: activeResumeId,
      jobContext: lastExtraction,
    });
  } catch (error) {
    if (isAuthFailure(error)) {
      renderAuthRequiredState(getErrorMessage(error, COPY.authMessage));
      return;
    }
    popupRuntime.comparisonError = getErrorMessage(error, COPY.compareFailed);
  }

  renderReadyState(popupRuntime.resumeData || { resumes: [], selectedResumeId: activeResumeId });
}

async function loadLastExtraction() {
  const stored = await getFromStorage(
    {
      [STORAGE_KEYS.LAST_ANALYSIS]: null,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  const extraction = stored[STORAGE_KEYS.LAST_ANALYSIS];
  if (extraction && typeof extraction === "object") {
    popupRuntime.lastExtraction = normalizeStoredExtractionRecord(extraction);

    if (String(popupRuntime.lastExtraction.site || "") === "manual") {
      popupRuntime.manualDraft = {
        jobTitle: sanitizePlainText(popupRuntime.lastExtraction.jobTitle, 220),
        jobDescription: sanitizePlainText(popupRuntime.lastExtraction.jobDescription, 10000),
        error: "",
      };
    }
  }
}

async function loadLastComparison() {
  const stored = await getFromStorage(
    {
      [STORAGE_KEYS.LAST_COMPARISON]: null,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  const comparison = stored[STORAGE_KEYS.LAST_COMPARISON];
  if (comparison && typeof comparison === "object") {
    popupRuntime.lastComparison = normalizeComparisonResult(comparison, {
      resumeId: comparison.resumeId,
      jobTitle: comparison.jobTitle,
      site: comparison.site,
    });
  }
}

async function bootstrapPopup(forceRefresh = false) {
  renderShell(POPUP_STATES.LOADING);

  const pingResponse = await sendRuntimeMessage({ type: MESSAGE_TYPES.PING });
  if (!pingResponse.ok) {
    renderShell(POPUP_STATES.ERROR, {
      error: pingResponse.error || "Unknown error",
    });
    return;
  }

  const authState = await validateSessionWithBackend({ strict: false });
  if (!authState.ok && ["missing-token", "expired-token", "unauthorized"].includes(authState.reason)) {
    const reasonMessage = authState.reason === "expired-token" ? COPY.tokenExpiredMessage : COPY.authMessage;
    renderAuthRequiredState(reasonMessage);
    return;
  }

  try {
    await loadLastExtraction();
    await loadLastComparison();
    const resumeData = await loadResumesForPopup(forceRefresh);
    renderReadyState(resumeData);
  } catch (error) {
    const isAuthError = isAuthFailure(error);
    const message = error instanceof Error ? error.message : "Failed to load resumes.";

    if (isAuthError) {
      renderAuthRequiredState(getErrorMessage(error, COPY.authMessage));
      return;
    }

    renderShell(POPUP_STATES.ERROR, {
      heading: COPY.errorHeading,
      message: "Could not load your resumes.",
      error: getErrorMessage(error, message),
    });
  }
}

bootstrapPopup();
