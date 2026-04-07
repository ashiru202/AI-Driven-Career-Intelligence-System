import { MESSAGE_TYPES } from "../shared/constants.js";

const app = document.getElementById("app");
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
    createElement("span", "footer-chip", "Task 7 UI Shell"),
    createElement("span", "footer-chip", "State-ready")
  );
  return footer;
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
    heading.textContent = COPY.emptyHeading;
    message.textContent = COPY.emptyMessage;

    const analyzeButton = createElement("button", "primary-button", "Analyze Current Job");
    analyzeButton.disabled = true;

    const settingsButton = createElement("button", "secondary-button", "Settings");
    settingsButton.disabled = true;

    actions.append(analyzeButton, settingsButton);
  }

  if (state === POPUP_STATES.ERROR) {
    pill.textContent = "Error";
    heading.textContent = COPY.errorHeading;
    const detail = options.error ? `${COPY.errorMessage} ${options.error}` : COPY.errorMessage;
    message.textContent = detail;

    const retryButton = createElement("button", "primary-button", "Retry");
    retryButton.type = "button";
    retryButton.addEventListener("click", () => {
      bootstrapPopup();
    });

    actions.append(retryButton);
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

async function bootstrapPopup() {
  renderShell(POPUP_STATES.LOADING);

  const pingResponse = await sendRuntimeMessage({ type: MESSAGE_TYPES.PING });
  if (pingResponse.ok) {
    renderShell(POPUP_STATES.EMPTY);
    return;
  }

  renderShell(POPUP_STATES.ERROR, {
    error: pingResponse.error || "Unknown error",
  });
}

bootstrapPopup();
