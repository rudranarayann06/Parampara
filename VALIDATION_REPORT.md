# PARAMPARA SIH Final Validation Report

## Static validation completed

- Python backend modules compile successfully with `python -m compileall`.
- `scripts/reviewer.js` passes Node syntax validation.
- `scripts/preserve.js` passes Node syntax validation.
- Dashboard inline JavaScript passes Node syntax validation.
- Passport inline JavaScript passes Node syntax validation.
- `preserve.html`, `dashboard.html`, `reviewer.html`, and `passport.html` parse as HTML.
- Static server returned HTTP 200 for `/`, `/preserve.html`, `/dashboard.html`, `/reviewer.html`, `/passport.html`, `/service-worker.js`, and `/manifest.webmanifest`.

## Changes specifically requested

### Preserve page

The offline-first contribution panel is now full width and appears before the story form. The story form is below it on desktop and mobile.

### Dashboard

Rebuilt as a glassmorphism archive command center while retaining the existing PARAMPARA dark/gold visual language. It loads live counters and service status from the backend.

### Passport

Fixed the broken direct-open state. Passport accepts `?passport=<slug>` and `?id=<recording_id>` for approved/public records. Missing identifiers produce a useful archive navigation state.

### Reviewer

Added:

- Auto transcript
- Browser-assisted transcript fallback
- English translation
- Hindi translation
- Odia translation
- Auto transcript + all languages
- Consent-aware blocking
- AI-derived labels
- Provider/model/version display
- Automatic passport opening after public approval

## Runtime limitation

The execution environment used for this build does not contain the Flask dependencies and has no outbound package/network access. A live Flask/PostgreSQL/Firebase/Google-Cloud integration test could therefore not be performed here.

The free deployment mode is designed to be tested on the user's Render/GitHub deployment.

## Free-tier reality

- IndexedDB is the persistent offline store on the contributor device.
- Render local media is temporary and must not be treated as permanent archival storage.
- Render Free PostgreSQL is temporary and must not be treated as the final permanent heritage database.
- MyMemory is included as a prototype translation fallback; it is rate-limited and should be replaced by a controlled provider for production.
- Automatic cloud transcription requires a configured speech provider. The browser-assisted transcript fallback is explicitly labelled and must be human-reviewed.
