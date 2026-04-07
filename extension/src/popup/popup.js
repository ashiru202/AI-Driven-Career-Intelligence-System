import { EXTENSION_API_ROUTES, MESSAGE_TYPES, STORAGE_AREAS, STORAGE_KEYS } from "../shared/constants.js";
import { AuthSessionError, requestWithAuth, validateSessionWithBackend } from "../shared/auth.js";
import { getFromStorage, setToStorage } from "./utils/storage.js";

const app = document.getElementById("app");
const RESUME_CACHE_TTL_MS = 5 * 60 * 1000;

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
  authHeading: "Sign in required",
  authMessage: "Your extension session is missing or expired. Sign in from the main app to continue.",
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

  const name = String(resume.name || resume.fileName || "Untitled Resume").trim();
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

async function openMainApp(path = "/") {
  await sendRuntimeMessage({
    type: MESSAGE_TYPES.OPEN_APP_PAGE,
    path,
  });
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
    createElement("span", "footer-chip", "Task 8 CV Selector"),
    createElement("span", "footer-chip", "5-min cache enabled")
  );
  return footer;
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

    const analyzeButton = createElement("button", "primary-button", "Analyze Current Job");
    analyzeButton.disabled = resumes.length === 0;

    const refreshButton = createElement("button", "secondary-button", "Refresh CV List");
    refreshButton.type = "button";
    refreshButton.addEventListener("click", () => {
      bootstrapPopup(true);
    });

    actions.append(analyzeButton, refreshButton);

    if (resumes.length === 0) {
      const uploadButton = createElement("button", "secondary-button", "Open App to Upload");
      uploadButton.type = "button";
      uploadButton.addEventListener("click", () => {
        openMainApp("/upload");
      });
      actions.append(uploadButton);
    } else {
      analyzeButton.dataset.resumeId = selectedResumeId;
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
      openAppButton.addEventListener("click", () => {
        openMainApp("/login");
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
    renderShell(POPUP_STATES.ERROR, {
      heading: COPY.authHeading,
      message: COPY.authMessage,
      allowOpenApp: true,
    });
    return;
  }

  try {
    const resumeData = await loadResumesForPopup(forceRefresh);
    renderShell(POPUP_STATES.EMPTY, resumeData);
  } catch (error) {
    const isAuthError = error instanceof AuthSessionError;
    const message = error instanceof Error ? error.message : "Failed to load resumes.";

    renderShell(POPUP_STATES.ERROR, {
      heading: isAuthError ? COPY.authHeading : COPY.errorHeading,
      message: isAuthError ? COPY.authMessage : "Could not load your resumes.",
      error: message,
      allowOpenApp: isAuthError,
    });
  }
}

bootstrapPopup();
