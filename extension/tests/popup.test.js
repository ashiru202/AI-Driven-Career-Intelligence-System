// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_TYPES, STORAGE_KEYS } from "../src/shared/constants.js";

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createChromeMock() {
  const store = new Map();

  const storageArea = {
    get(keys, callback) {
      if (keys == null) {
        callback({});
        return;
      }

      if (typeof keys === "string") {
        callback({ [keys]: store.has(keys) ? store.get(keys) : undefined });
        return;
      }

      if (Array.isArray(keys)) {
        const result = keys.reduce((acc, key) => {
          acc[key] = store.has(key) ? store.get(key) : undefined;
          return acc;
        }, {});
        callback(result);
        return;
      }

      if (typeof keys === "object") {
        const result = Object.keys(keys).reduce((acc, key) => {
          acc[key] = store.has(key) ? store.get(key) : keys[key];
          return acc;
        }, {});
        callback(result);
        return;
      }

      callback({});
    },
    set(values, callback) {
      Object.entries(values || {}).forEach(([key, value]) => {
        store.set(key, value);
      });
      callback?.();
    },
    remove(keys, callback) {
      const list = Array.isArray(keys) ? keys : [keys];
      list.forEach((key) => store.delete(key));
      callback?.();
    },
    clear(callback) {
      store.clear();
      callback?.();
    },
  };

  const runtime = {
    id: "extension-test-id",
    lastError: null,
    sendMessage: vi.fn((message, callback) => {
      if (message?.type === MESSAGE_TYPES.PING) {
        callback({ ok: true, data: { service: "background" } });
        return;
      }

      if (message?.type === MESSAGE_TYPES.REQUEST_JOB_EXTRACTION) {
        callback({
          ok: true,
          data: {
            tab: {
              id: 99,
              title: "LinkedIn Job",
              url: "https://www.linkedin.com/jobs/view/123",
            },
            job: {
              jobTitle: "Senior React Engineer",
              company: "Acme",
              location: "Colombo",
              jobDescription:
                "Build and scale React applications, collaborate with product and backend teams, write reliable tests, and ship features with strong performance and accessibility standards.",
              descriptionLength: 186,
              site: "linkedin",
              extractedBy: "linkedin-detector",
              pageTitle: "Senior React Engineer | LinkedIn",
              pageUrl: "https://www.linkedin.com/jobs/view/123",
              extractedAt: new Date().toISOString(),
            },
          },
        });
        return;
      }

      if (message?.type === MESSAGE_TYPES.OPEN_APP_PAGE) {
        callback({ ok: true, data: { openedUrl: "http://localhost:3000/my-roadmap" } });
        return;
      }

      callback({ ok: false, error: "Unhandled runtime message" });
    }),
  };

  return {
    chrome: {
      runtime,
      storage: {
        sync: storageArea,
        local: storageArea,
      },
    },
    store,
  };
}

describe("Popup analysis flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '<main id="app" class="popup-root"></main>';
  });

  afterEach(() => {
    delete global.chrome;
    delete global.fetch;
  });

  it("loads resumes, analyzes current tab, and renders comparison results", async () => {
    const { chrome, store } = createChromeMock();
    const validToken = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    store.set(STORAGE_KEYS.AUTH_TOKEN, validToken);

    global.chrome = chrome;
    global.fetch = vi.fn(async (url, options) => {
      const target = String(url);

      if (target.endsWith("/api/users/me")) {
        return jsonResponse({ success: true, user: { id: "user-1", email: "dev@example.com" } });
      }

      if (target.endsWith("/api/extension/resumes/list")) {
        return jsonResponse({
          ok: true,
          data: [
            {
              id: "resume-1",
              name: "Resume_Jan2026.pdf",
              sizeKB: 245,
              date: "2026-04-07T10:30:00Z",
            },
          ],
        });
      }

      if (target.endsWith("/api/extension/compare")) {
        const body = JSON.parse(options?.body || "{}");
        expect(body.resumeId).toBe("resume-1");
        expect(body.jobTitle).toContain("Senior React Engineer");

        return jsonResponse({
          ok: true,
          data: {
            comparisonId: "cmp-101",
            matchScore: 72,
            commonSkills: ["React", "JavaScript", "CSS"],
            missingSkills: ["TypeScript", "AWS"],
            commonCount: 3,
            missingCount: 2,
            totalRequired: 5,
            resumeFileName: "Resume_Jan2026.pdf",
            timestamp: new Date().toISOString(),
          },
        });
      }

      return jsonResponse({ ok: false, error: { message: "Not found" } }, 404);
    });

    await import("../src/popup/popup.js");

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Analyze Current Job");
    });

    const analyzeButton = Array.from(document.querySelectorAll("button")).find((button) =>
      String(button.textContent || "").includes("Analyze Current Job")
    );

    expect(analyzeButton).toBeTruthy();
    analyzeButton.click();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Latest Comparison");
      expect(document.body.textContent).toContain("Matched Skills");
      expect(document.body.textContent).toContain("Missing Skills");
    });

    const compareCalls = global.fetch.mock.calls.filter(([calledUrl]) =>
      String(calledUrl).endsWith("/api/extension/compare")
    );

    expect(compareCalls.length).toBe(1);
    expect(store.get(STORAGE_KEYS.LAST_COMPARISON)).toMatchObject({
      comparisonId: "cmp-101",
      matchScore: 72,
    });
  });
});
