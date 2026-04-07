import {
  API_TIMEOUT_MS,
  DEFAULT_API_BASE_URL,
  EXTENSION_API_ROUTES,
  STORAGE_AREAS,
  STORAGE_KEYS,
} from "../../shared/constants.js";
import { getStorageValue } from "./storage.js";

export class ApiRequestError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizeBaseUrl(rawBaseUrl) {
  const fallback = DEFAULT_API_BASE_URL;
  const value = typeof rawBaseUrl === "string" && rawBaseUrl.trim() ? rawBaseUrl.trim() : fallback;
  return value.replace(/\/+$/, "");
}

function resolvePath(path) {
  if (typeof path !== "string" || !path.trim()) {
    throw new Error("API path is required.");
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function getErrorMessage(payload, status) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (payload.error && typeof payload.error === "object") {
      if (typeof payload.error.message === "string" && payload.error.message.trim()) {
        return payload.error.message;
      }
      if (typeof payload.error.code === "string" && payload.error.code.trim()) {
        return payload.error.code;
      }
    }
  }

  return `Request failed with status ${status}.`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function resolveAuthToken(explicitToken) {
  if (typeof explicitToken === "string" && explicitToken.trim()) {
    return explicitToken.trim();
  }

  const storedToken = await getStorageValue(STORAGE_KEYS.AUTH_TOKEN, {
    area: STORAGE_AREAS.SYNC,
    defaultValue: "",
  });
  return typeof storedToken === "string" ? storedToken.trim() : "";
}

export async function getApiBaseUrl() {
  const storedBaseUrl = await getStorageValue(STORAGE_KEYS.API_BASE_URL, {
    area: STORAGE_AREAS.SYNC,
    defaultValue: DEFAULT_API_BASE_URL,
  });

  return normalizeBaseUrl(storedBaseUrl);
}

export async function buildApiUrl(path) {
  const baseUrl = await getApiBaseUrl();
  return `${baseUrl}${resolvePath(path)}`;
}

export async function requestExtensionApi(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = API_TIMEOUT_MS,
    token,
    includeCredentials = false,
    signal,
  } = options;

  const url = await buildApiUrl(path);
  const authToken = await resolveAuthToken(token);
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && requestHeaders["Content-Type"] == null) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (authToken && requestHeaders.Authorization == null) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  const abortController = signal ? null : new AbortController();
  const requestSignal = signal || abortController.signal;
  const timeoutId =
    abortController && timeoutMs > 0
      ? setTimeout(() => abortController.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: includeCredentials ? "include" : "same-origin",
      signal: requestSignal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      const message = getErrorMessage(payload, response.status);
      throw new ApiRequestError(message, response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiRequestError("Request timed out.", 408, null);
    }

    if (error instanceof ApiRequestError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unexpected API error.";
    throw new ApiRequestError(message, 0, null);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const extensionApi = {
  listResumes() {
    return requestExtensionApi(EXTENSION_API_ROUTES.RESUMES_LIST);
  },

  getCurrentUser() {
    return requestExtensionApi(EXTENSION_API_ROUTES.AUTH_ME);
  },

  quickCompare(payload) {
    return requestExtensionApi(EXTENSION_API_ROUTES.QUICK_COMPARE, {
      method: "POST",
      body: payload,
    });
  },

  healthCheck() {
    return requestExtensionApi(EXTENSION_API_ROUTES.HEALTH);
  },
};
