import { DEFAULT_APP_BASE_URL, MESSAGE_TYPES } from "../shared/constants.js";

function buildResponse(ok, data = null, error = null) {
  return { ok, data, error };
}

function isExtensionMessage(message) {
  return !!message && typeof message === "object" && typeof message.type === "string";
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

  return buildResponse(true, {
    tab: {
      id: activeTab.id,
      title: activeTab.title || null,
      url: activeTab.url || null,
    },
    extraction: extractionResult.data,
  });
}

async function handleOpenAppPage(message) {
  const baseUrl =
    typeof message.baseUrl === "string" && message.baseUrl.startsWith("http")
      ? message.baseUrl
      : DEFAULT_APP_BASE_URL;
  const path = typeof message.path === "string" ? message.path : "/";
  const targetUrl = new URL(path, baseUrl).toString();
  const tab = await chrome.tabs.create({ url: targetUrl });

  return buildResponse(true, {
    openedUrl: targetUrl,
    tabId: tab.id || null,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension service worker installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionMessage(message)) {
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
