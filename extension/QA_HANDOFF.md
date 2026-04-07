# Extension MVP Alpha QA Handoff

**Project:** Career Skill Gap Analyzer (Chrome MV3)
**Version:** 1.0.0-alpha
**Handoff Date:** 2026-04-07

## Scope Included

- Popup boot and service-worker connectivity check
- Resume list loading with 5-minute cache
- LinkedIn detector extraction
- Indeed detector extraction
- Generic detector fallback
- Manual job description fallback in popup
- Quick compare API integration
- Skill-gap results rendering (score + matched + missing)
- Roadmap deep link with comparisonId
- Core error handling:
  - timeout
  - network failure
  - unauthorized/session-expired
  - no-resume flow
  - retry extraction and retry comparison
- Security hardening:
  - message sender checks
  - payload sanitization before render/store
  - path-safe deep-linking

## Pre-Handoff Verification Command

From repository root:

```bash
npm --prefix extension run verify
```

Expected:
- Build succeeds
- All extension tests pass

## Test Artifacts

- Extension package source: `extension/`
- Load-unpacked target: `extension/dist`
- Automated tests:
  - `extension/tests/linkedin.test.js`
  - `extension/tests/indeed.test.js`
  - `extension/tests/api.test.js`
  - `extension/tests/popup.test.js`

## Manual QA Protocol

1. Build extension and load unpacked from `extension/dist`.
2. Set auth token and base URLs in `chrome.storage.sync` for test user.
3. Open a LinkedIn job detail page and click Analyze Current Job.
4. Confirm extracted job info appears and comparison result renders.
5. Click Generate Roadmap and confirm app opens with query params:
   - `from=extension`
   - `comparisonId=<value>`
6. Repeat on an Indeed job page.
7. Trigger manual fallback by testing a non-supported page and pasting job text.
8. Validate retry actions for extraction/comparison after forced failures.
9. Clear token and confirm sign-in-required flow appears.

## Known MVP Limitations

- Glassdoor extraction currently relies on generic fallback.
- Token bootstrap from main app is still manual for local testing unless custom sync flow is added.
- No PDF/CSV export flow in MVP.
- No dark/light theme toggle in MVP.

## Release Decision Checklist

- [ ] `npm --prefix extension run verify` passes on QA machine
- [ ] LinkedIn extraction verified
- [ ] Indeed extraction verified
- [ ] Manual fallback verified
- [ ] Compare API flow verified
- [ ] Roadmap deep-link verified
- [ ] Auth failure recovery verified
- [ ] Security behavior spot-checked (sanitized render, no token logging)

## Suggested Rollback Trigger

If any of the following occur in QA or beta:
- Compare endpoint returns persistent 4xx/5xx for valid payloads
- Extraction produces empty job descriptions on major supported pages
- Roadmap deep-link opens wrong route or missing comparisonId

Fallback plan:
- Keep backend endpoints active
- Disable extension beta distribution until patch build is verified
