export const EXTENSION_NAME = "Career Skill Gap Analyzer";

export const DEFAULT_APP_BASE_URL = "http://localhost:3000";
export const DEFAULT_API_BASE_URL = "http://localhost:5001";
export const API_TIMEOUT_MS = 15000;

export const STORAGE_AREAS = Object.freeze({
	SYNC: "sync",
	LOCAL: "local",
});

export const STORAGE_KEYS = Object.freeze({
	API_BASE_URL: "extensionApiBaseUrl",
	APP_BASE_URL: "extensionAppBaseUrl",
	AUTH_TOKEN: "extensionAuthToken",
	REFRESH_TOKEN: "extensionRefreshToken",
	RESUME_CACHE: "extensionResumeCache",
	RESUME_CACHE_UPDATED_AT: "extensionResumeCacheUpdatedAt",
	SELECTED_RESUME_ID: "extensionSelectedResumeId",
	LAST_ANALYSIS: "extensionLastAnalysis",
	LAST_COMPARISON: "extensionLastComparison",
});

export const MESSAGE_TYPES = Object.freeze({
	PING: "EXTENSION/PING",
	GET_ACTIVE_TAB: "EXTENSION/GET_ACTIVE_TAB",
	REQUEST_JOB_EXTRACTION: "EXTENSION/REQUEST_JOB_EXTRACTION",
	OPEN_APP_PAGE: "EXTENSION/OPEN_APP_PAGE",
	SYNC_AUTH_SESSION: "EXTENSION/SYNC_AUTH_SESSION",
	CONTENT_EXTRACT_JOB: "CONTENT/EXTRACT_JOB",
});

export const EXTENSION_API_ROUTES = Object.freeze({
	RESUMES_LIST: "/api/extension/resumes/list",
	QUICK_COMPARE: "/api/extension/compare",
	HEALTH: "/api/extension/health",
	AUTH_ME: "/api/users/me",
});
