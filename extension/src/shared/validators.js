export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

export function sanitizePlainText(value, maxLength = 10000) {
  const normalized = String(value ?? "")
    .replace(CONTROL_CHAR_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    return normalized;
  }

  return normalized.slice(0, Math.trunc(maxLength));
}

export function sanitizePath(path, fallback = "/") {
  const normalized = sanitizePlainText(path, 512);
  const lower = normalized.toLowerCase();

  if (
    !normalized ||
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("//")
  ) {
    return fallback;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function isTrustedExtensionSender(sender, runtimeId) {
  if (!sender || typeof sender !== "object") {
    return false;
  }

  if (!runtimeId) {
    return true;
  }

  if (typeof sender.id === "string" && sender.id !== runtimeId) {
    return false;
  }

  return true;
}
