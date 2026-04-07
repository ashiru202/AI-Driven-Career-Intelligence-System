import { EXTENSION_API_ROUTES, STORAGE_AREAS, STORAGE_KEYS } from "./constants.js";
import { ApiRequestError, requestExtensionApi } from "../popup/utils/api.js";
import { getStorageValue, removeFromStorage, setToStorage } from "../popup/utils/storage.js";

const EXPIRY_SKEW_SECONDS = 30;
const REFRESH_WINDOW_SECONDS = 5 * 60;

export class AuthSessionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AuthSessionError";
    this.code = options.code || "AUTH_ERROR";
    this.status = options.status || 0;
    this.cause = options.cause || null;
  }
}

function decodeBase64Url(base64Url) {
  const normalized = String(base64Url || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = normalized.length % 4;
  const padded = padding > 0 ? normalized + "=".repeat(4 - padding) : normalized;

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }

  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(padded, "base64").toString("utf-8");
  }

  throw new Error("No base64 decoder is available in this environment.");
}

export function decodeJwtPayload(token) {
  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenExpiryEpochMs(token) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp) || exp <= 0) {
    return null;
  }

  return exp * 1000;
}

export function isTokenExpired(token, skewSeconds = EXPIRY_SKEW_SECONDS) {
  const expiryEpochMs = getTokenExpiryEpochMs(token);

  if (!expiryEpochMs) {
    return false;
  }

  return Date.now() >= expiryEpochMs - skewSeconds * 1000;
}

export function isTokenExpiringSoon(token, withinSeconds = REFRESH_WINDOW_SECONDS) {
  const expiryEpochMs = getTokenExpiryEpochMs(token);

  if (!expiryEpochMs) {
    return false;
  }

  return Date.now() >= expiryEpochMs - withinSeconds * 1000;
}

export async function getAuthToken() {
  const value = await getStorageValue(STORAGE_KEYS.AUTH_TOKEN, {
    area: STORAGE_AREAS.SYNC,
    defaultValue: "",
  });
  return typeof value === "string" ? value.trim() : "";
}

export async function getRefreshToken() {
  const value = await getStorageValue(STORAGE_KEYS.REFRESH_TOKEN, {
    area: STORAGE_AREAS.SYNC,
    defaultValue: "",
  });
  return typeof value === "string" ? value.trim() : "";
}

export async function saveAuthSession(session) {
  const accessToken = typeof session?.accessToken === "string" ? session.accessToken.trim() : "";
  const refreshToken = typeof session?.refreshToken === "string" ? session.refreshToken.trim() : "";

  if (!accessToken) {
    throw new AuthSessionError("Access token is required.", {
      code: "MISSING_ACCESS_TOKEN",
      status: 400,
    });
  }

  await setToStorage(
    {
      [STORAGE_KEYS.AUTH_TOKEN]: accessToken,
      [STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
    },
    { area: STORAGE_AREAS.SYNC }
  );

  return {
    accessToken,
    refreshToken,
    expiresAt: getTokenExpiryEpochMs(accessToken),
  };
}

export async function clearAuthSession() {
  await removeFromStorage([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN], {
    area: STORAGE_AREAS.SYNC,
  });
}

export async function getAuthSessionState() {
  const accessToken = await getAuthToken();
  const refreshToken = await getRefreshToken();

  if (!accessToken) {
    return {
      isAuthenticated: false,
      reason: "missing-token",
      accessToken: "",
      refreshToken,
      expiresAt: null,
      isExpired: false,
      expiringSoon: false,
    };
  }

  const expiresAt = getTokenExpiryEpochMs(accessToken);
  const expired = isTokenExpired(accessToken);
  const expiringSoon = isTokenExpiringSoon(accessToken);

  return {
    isAuthenticated: !expired,
    reason: expired ? "expired-token" : "authenticated",
    accessToken,
    refreshToken,
    expiresAt,
    isExpired: expired,
    expiringSoon,
  };
}

export async function validateSessionWithBackend(options = {}) {
  const session = await getAuthSessionState();
  if (!session.accessToken) {
    return {
      ok: false,
      reason: "missing-token",
      status: 401,
      profile: null,
    };
  }

  if (session.isExpired) {
    await clearAuthSession();
    return {
      ok: false,
      reason: "expired-token",
      status: 401,
      profile: null,
    };
  }

  const strict = options.strict !== false;

  try {
    const profileResponse = await requestExtensionApi(EXTENSION_API_ROUTES.AUTH_ME, {
      method: "GET",
      token: session.accessToken,
    });

    return {
      ok: true,
      reason: "authenticated",
      status: 200,
      profile: profileResponse?.user || profileResponse?.data?.user || null,
      expiringSoon: session.expiringSoon,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await clearAuthSession();
      return {
        ok: false,
        reason: "unauthorized",
        status: 401,
        profile: null,
      };
    }

    if (!strict) {
      return {
        ok: true,
        reason: "validation-skipped",
        status: 200,
        profile: null,
        expiringSoon: session.expiringSoon,
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to validate session.";
    return {
      ok: false,
      reason: "validation-failed",
      status: error instanceof ApiRequestError ? error.status : 0,
      profile: null,
      error: errorMessage,
    };
  }
}

export async function requestWithAuth(path, options = {}) {
  const token = await getAuthToken();

  if (!token) {
    throw new AuthSessionError("No auth token available.", {
      code: "MISSING_TOKEN",
      status: 401,
    });
  }

  if (isTokenExpired(token)) {
    await clearAuthSession();
    throw new AuthSessionError("Session token has expired.", {
      code: "EXPIRED_TOKEN",
      status: 401,
    });
  }

  try {
    return await requestExtensionApi(path, {
      ...options,
      token,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await clearAuthSession();
      throw new AuthSessionError("Session is no longer valid.", {
        code: "UNAUTHORIZED",
        status: 401,
        cause: error,
      });
    }

    throw error;
  }
}
