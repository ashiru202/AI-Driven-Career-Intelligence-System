import { MESSAGE_TYPES } from "../shared/constants.js";
import { sanitizePlainText } from "../shared/validators.js";

const APP_AUTH_SYNC_EVENT = "AIDC_EXTENSION_AUTH_SYNC";
const JWT_LIKE_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function normalizeJwtToken(value) {
  const token = sanitizePlainText(value, 4096);
  if (!token || !JWT_LIKE_REGEX.test(token)) {
    return "";
  }
  return token;
}

function handleAppMessage(event) {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  const payload = event.data;
  if (!payload || payload.type !== APP_AUTH_SYNC_EVENT) {
    return;
  }

  const token = normalizeJwtToken(payload.token || payload?.payload?.token);
  if (!token) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: MESSAGE_TYPES.SYNC_AUTH_SESSION,
      payload: { accessToken: token },
    },
    () => {
      void chrome.runtime.lastError;
    }
  );
}

window.addEventListener("message", handleAppMessage);
