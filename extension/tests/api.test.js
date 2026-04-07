import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => {
  const state = new Map();

  return {
    state,
    getStorageValue: vi.fn(async (key, options = {}) => {
      if (state.has(key)) {
        return state.get(key);
      }
      return options.defaultValue;
    }),
    setToStorage: vi.fn(async (entries) => {
      Object.entries(entries || {}).forEach(([key, value]) => {
        state.set(key, value);
      });
    }),
    removeFromStorage: vi.fn(async (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      list.forEach((key) => state.delete(key));
    }),
  };
});

vi.mock("../src/popup/utils/storage.js", () => ({
  getStorageValue: storageMock.getStorageValue,
  setToStorage: storageMock.setToStorage,
  removeFromStorage: storageMock.removeFromStorage,
}));

import { STORAGE_KEYS } from "../src/shared/constants.js";
import { ApiRequestError, buildApiUrl, requestExtensionApi } from "../src/popup/utils/api.js";
import { AuthSessionError, decodeJwtPayload, getTokenExpiryEpochMs, requestWithAuth } from "../src/shared/auth.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("Extension API and auth helpers", () => {
  beforeEach(() => {
    storageMock.state.clear();
    storageMock.getStorageValue.mockClear();
    storageMock.setToStorage.mockClear();
    storageMock.removeFromStorage.mockClear();
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it("builds API URL using stored base URL", async () => {
    storageMock.state.set(STORAGE_KEYS.API_BASE_URL, "http://localhost:5001/");

    const url = await buildApiUrl("/api/extension/health");

    expect(url).toBe("http://localhost:5001/api/extension/health");
  });

  it("sends auth token in API request headers", async () => {
    storageMock.state.set(STORAGE_KEYS.AUTH_TOKEN, "token-123");
    global.fetch.mockResolvedValue(jsonResponse({ ok: true }));

    await requestExtensionApi("/api/extension/health");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:5001/api/extension/health");
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  it("throws ApiRequestError for non-OK responses", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error: {
            code: "NO_RESUME",
            message: "You must upload a resume first",
          },
        },
        400
      )
    );

    await expect(requestExtensionApi("/api/extension/compare", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 400,
      message: "You must upload a resume first",
    });
  });

  it("decodes JWT payload and extracts expiry", () => {
    const token = createJwt({ sub: "user-1", exp: 1910000000 });

    expect(decodeJwtPayload(token)).toMatchObject({ sub: "user-1", exp: 1910000000 });
    expect(getTokenExpiryEpochMs(token)).toBe(1910000000 * 1000);
  });

  it("rejects requestWithAuth when token is expired and clears stored auth", async () => {
    const expiredToken = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    storageMock.state.set(STORAGE_KEYS.AUTH_TOKEN, expiredToken);

    await expect(requestWithAuth("/api/extension/health")).rejects.toBeInstanceOf(AuthSessionError);
    expect(storageMock.removeFromStorage).toHaveBeenCalled();
  });

  it("clears auth session when API returns 401", async () => {
    const validToken = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    storageMock.state.set(STORAGE_KEYS.AUTH_TOKEN, validToken);

    global.fetch.mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        },
        401
      )
    );

    await expect(requestWithAuth("/api/extension/health")).rejects.toBeInstanceOf(AuthSessionError);
    expect(storageMock.removeFromStorage).toHaveBeenCalled();
  });
});
