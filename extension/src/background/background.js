import { DEFAULT_APP_BASE_URL, MESSAGE_TYPES, STORAGE_KEYS } from "../shared/constants.js";
import { isTrustedExtensionSender, sanitizePath, sanitizePlainText } from "../shared/validators.js";

const JWT_LIKE_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function buildResponse(ok, data = null, error = null) {
  return { ok, data, error };
}

function isExtensionMessage(message) {
  return !!message && typeof message === "object" && typeof message.type === "string";
}

function resolveBaseUrl(value) {
  const fallback = new URL(DEFAULT_APP_BASE_URL);
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = new URL(value.trim());
    if (!/^https?:$/.test(parsed.protocol)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function normalizeAuthToken(value) {
  const token = sanitizePlainText(value, 4096);
  if (!token || !JWT_LIKE_REGEX.test(token)) {
    return "";
  }
  return token;
}

function getOriginFromUrl(value) {
  try {
    return new URL(String(value || "")).origin;
  } catch {
    return "";
  }
}

async function getConfiguredAppBaseUrl() {
  const defaults = {
    [STORAGE_KEYS.APP_BASE_URL]: DEFAULT_APP_BASE_URL,
  };

  const stored = await chrome.storage.sync.get(defaults);
  const configured = stored?.[STORAGE_KEYS.APP_BASE_URL];
  return resolveBaseUrl(configured);
}

async function getConfiguredAppOrigin() {
  const configured = await getConfiguredAppBaseUrl();
  return configured.origin;
}

async function handleSyncAuthSession(message, sender) {
  const configuredOrigin = await getConfiguredAppOrigin();
  const senderOrigin = getOriginFromUrl(sender?.url);

  if (!senderOrigin || senderOrigin !== configuredOrigin) {
    return buildResponse(false, null, "Auth sync is only allowed from the configured app origin.");
  }

  const token = normalizeAuthToken(message?.payload?.accessToken || message?.accessToken);
  if (!token) {
    return buildResponse(false, null, "No valid access token provided for auth sync.");
  }

  await chrome.storage.sync.set({
    [STORAGE_KEYS.AUTH_TOKEN]: token,
    [STORAGE_KEYS.REFRESH_TOKEN]: "",
  });

  return buildResponse(true, {
    synced: true,
    origin: senderOrigin,
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;

      if (runtimeError) {
        resolve(buildResponse(false, null, runtimeError.message));
        return;
      }

      resolve(buildResponse(true, response));
    });
  });
}

function isMissingReceiverError(errorText) {
  const value = String(errorText || "").toLowerCase();
  return (
    value.includes("receiving end does not exist") ||
    value.includes("could not establish connection") ||
    value.includes("no receiving end")
  );
}

function isRestrictedTabUrl(url) {
  const value = String(url || "").toLowerCase();
  return (
    value.startsWith("chrome://") ||
    value.startsWith("edge://") ||
    value.startsWith("about:") ||
    value.startsWith("chrome-extension://")
  );
}

async function injectExtractionScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/content/content.js"],
  });
}

async function handleJobExtractionRequest() {
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id) {
    return buildResponse(false, null, "No active tab found.");
  }

  let extractionResult = await sendMessageToTab(activeTab.id, {
    type: MESSAGE_TYPES.CONTENT_EXTRACT_JOB,
  });

  if (!extractionResult.ok && isMissingReceiverError(extractionResult.error)) {
    if (isRestrictedTabUrl(activeTab.url)) {
      return buildResponse(
        false,
        null,
        "This tab does not allow extraction. Open a regular LinkedIn or Indeed job page and retry."
      );
    }

    try {
      await injectExtractionScript(activeTab.id);
      extractionResult = await sendMessageToTab(activeTab.id, {
        type: MESSAGE_TYPES.CONTENT_EXTRACT_JOB,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to inject extractor script.";
      return buildResponse(false, null, errorMessage);
    }
  }

  if (!extractionResult.ok) {
    return extractionResult;
  }

  const contentPayload = extractionResult.data;
  if (!contentPayload || contentPayload.ok !== true || !contentPayload.data) {
    return buildResponse(
      false,
      null,
      contentPayload?.error || "Content script could not extract job details from this page."
    );
  }

  return buildResponse(true, {
    tab: {
      id: activeTab.id,
      title: activeTab.title || null,
      url: activeTab.url || null,
    },
    job: contentPayload.data,
  });
}

async function handleOpenAppPage(message) {
  const configuredBaseUrl = await getConfiguredAppBaseUrl();
  const baseUrl = resolveBaseUrl(message.baseUrl || configuredBaseUrl.toString());
  const path = sanitizePath(message.path, "/");
  const targetUrl = new URL(path, baseUrl);

  if (targetUrl.origin !== baseUrl.origin) {
    return buildResponse(false, null, "Cross-origin app navigation is blocked.");
  }

  const tab = await chrome.tabs.create({ url: targetUrl.toString() });

  return buildResponse(true, {
    openedUrl: targetUrl.toString(),
    tabId: tab.id || null,
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionMessage(message) || !isTrustedExtensionSender(sender, chrome.runtime.id)) {
    return false;
  }

  (async () => {
    try {
      switch (message.type) {
        case MESSAGE_TYPES.PING:
          sendResponse(
            buildResponse(true, {
              service: "background",
              timestamp: new Date().toISOString(),
            })
          );
          return;

        case MESSAGE_TYPES.GET_ACTIVE_TAB: {
          const activeTab = await getActiveTab();
          sendResponse(
            buildResponse(true, {
              id: activeTab?.id || null,
              title: activeTab?.title || null,
              url: activeTab?.url || null,
            })
          );
          return;
        }

        case MESSAGE_TYPES.REQUEST_JOB_EXTRACTION: {
          const extraction = await handleJobExtractionRequest();
          sendResponse(extraction);
          return;
        }

        case MESSAGE_TYPES.OPEN_APP_PAGE: {
          const openResult = await handleOpenAppPage(message);
          sendResponse(openResult);
          return;
        }

        case MESSAGE_TYPES.SYNC_AUTH_SESSION: {
          const syncResult = await handleSyncAuthSession(message, sender);
          sendResponse(syncResult);
          return;
        }

        default:
          sendResponse(buildResponse(false, null, `Unsupported message type: ${message.type}`));
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unexpected background error.";
      sendResponse(buildResponse(false, null, messageText));
    }
  })();

  return true;
});
