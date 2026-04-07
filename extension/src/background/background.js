import { DEFAULT_APP_BASE_URL, MESSAGE_TYPES } from "../shared/constants.js";
import { isTrustedExtensionSender, sanitizePath } from "../shared/validators.js";

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

async function handleJobExtractionRequest() {
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id) {
    return buildResponse(false, null, "No active tab found.");
  }

  const extractionResult = await sendMessageToTab(activeTab.id, {
    type: MESSAGE_TYPES.CONTENT_EXTRACT_JOB,
  });

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
  const baseUrl = resolveBaseUrl(message.baseUrl);
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
