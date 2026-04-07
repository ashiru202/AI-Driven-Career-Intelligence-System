# Career Skill Gap Analyzer Extension

Chrome Manifest V3 extension for real-time job skill gap analysis while browsing job boards.

Current MVP capabilities:
- Detects and extracts job content from LinkedIn and Indeed (with generic fallback)
- Supports manual job description fallback when extraction fails
- Loads resume list from backend with 5-minute cache
- Runs quick comparison via extension API
- Displays match score, matched skills, and missing skills in popup
- Opens roadmap deep link in the main app with comparison context

## Prerequisites

- Node.js 18+
- Chrome (or Chromium-based browser) with extension developer mode enabled
- Backend running with extension endpoints enabled:
	- GET /api/extension/resumes/list
	- POST /api/extension/compare
	- GET /api/extension/health
- Backend CORS configured to allow chrome-extension:// origins

## Install And Build

From repository root:

```bash
npm --prefix extension install
npm --prefix extension run build
```

Build output is generated in:

```text
extension/dist
```

## Load Unpacked In Chrome

1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select extension/dist
5. Pin Career Skill Gap Analyzer from the extensions toolbar

After code changes, rebuild and click Reload on the extension card.

## Development Workflow

Run watch build:

```bash
npm --prefix extension run build:watch
```

Run tests:

```bash
npm --prefix extension test
```

Watch tests:

```bash
npm --prefix extension run test:watch
```

## Runtime Configuration

The extension reads these storage keys:

- extensionApiBaseUrl (default: http://localhost:5001)
- extensionAppBaseUrl (default: http://localhost:3000)
- extensionAuthToken
- extensionRefreshToken

Temporary developer setup (manual): open the extension service worker console and run:

```javascript
chrome.storage.sync.set({
	extensionApiBaseUrl: "http://localhost:5001",
	extensionAppBaseUrl: "http://localhost:3000",
	extensionAuthToken: "<JWT_TOKEN_HERE>"
});
```

Do not commit real tokens or share them in logs.

## Supported Sites

- LinkedIn jobs pages
- Indeed job pages
- Glassdoor host permission is present; fallback extraction is currently generic

## Security Notes

- Manifest uses extension_pages CSP: script-src 'self'; object-src 'self'
- Message handlers validate sender identity and message shape
- Extracted/displayed text is sanitized before storage and rendering
- Extension deep-links to app routes are path-sanitized and cross-origin guarded

## QA Checklist (MVP)

- Extension loads successfully from extension/dist
- Popup opens without runtime errors
- Auth flow:
	- Missing token shows sign-in-required state
	- Expired/invalid token clears session and prompts re-login
- Resume list:
	- Loads from backend
	- Uses cache on reopen
	- Refresh action updates list
- Extraction:
	- LinkedIn extraction returns title + description
	- Indeed extraction returns title + description
	- Generic/manual fallback works when auto extraction fails
- Comparison:
	- Compare API called after extraction/manual submit
	- Match score and skill sections render correctly
	- Retry extraction and retry comparison actions work
- Roadmap:
	- Generate Roadmap opens main app route with from=extension and comparisonId

## Troubleshooting

- Popup says sign-in required:
	- Verify extensionAuthToken is set in chrome.storage.sync
	- Confirm backend /api/users/me accepts the token
- Compare fails with no resume:
	- Upload resume in main app, then refresh CV list in popup
- No extraction on page:
	- Open a full job detail page (not listing preview only)
	- Use manual input fallback section
- API unreachable:
	- Confirm backend is running on configured extensionApiBaseUrl

