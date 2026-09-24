# PARAMPARA SIH 2026 — Deployment Checklist

## Target for the current free prototype

- Frontend: GitHub Pages (HTTPS)
- Backend: existing Render Flask service
- Database: existing Render PostgreSQL or temporary Render Free PostgreSQL
- Offline data: IndexedDB + Service Worker
- Temporary synced media: Render local filesystem (`ALLOW_LOCAL_STORAGE_FALLBACK=true`)
- Authentication: existing Firebase Authentication if configured
- Translation: `TRANSLATION_PROVIDER=mymemory` for the free prototype, or `google` when Google Cloud credentials are configured
- Transcription: Google Speech-to-Text when configured; otherwise use the reviewer/manual transcript workflow. Do not claim that Render Free is running Whisper.

## Before deployment

1. Extract the ZIP.
2. Put the contents of `Prototype/` at the root of the GitHub repository.
3. Never commit service-account JSON, `.env`, `backend/uploads/`, or secrets.
4. Check `scripts/config.js` after Render gives the final API URL.
5. In Render set:
   - `SECRET_KEY=<random 64+ character secret>`
   - `DATABASE_URL=<Render internal PostgreSQL URL>`
   - `FRONTEND_URL=https://YOUR_USERNAME.github.io/parampara`
   - `CORS_ORIGINS=https://YOUR_USERNAME.github.io`
   - `ALLOW_LOCAL_STORAGE_FALLBACK=true`
   - `MAX_CONTENT_LENGTH=78643200`
   - `TRANSLATION_PROVIDER=mymemory`
   - `MYMEMORY_EMAIL=` (optional)
6. Leave Google/Firebase service-account variables empty for the free-only deployment unless you intentionally enable those services.

## Backend verification

Open:

`https://YOUR-RENDER-URL.onrender.com/`

Expected: JSON with `status: online` and project `PARAMPARA`.

Then:

`https://YOUR-RENDER-URL.onrender.com/api/health`

Expected at minimum:

```json
{"status":"ok","database":"connected","storage":"local","translation":"mymemory"}
```

Then:

`https://YOUR-RENDER-URL.onrender.com/api/recordings/stats`

Expected: JSON counters, even if all counters are zero.

## Frontend verification

1. Open the GitHub Pages URL.
2. Check DevTools → Application → Service Workers.
3. Confirm `service-worker.js` is activated.
4. Confirm the manifest loads.
5. Confirm IndexedDB is present.
6. Confirm no fatal Console errors.
7. Confirm microphone permission works.
8. Confirm API calls point to the Render URL, not localhost or the old Render URL.

## Offline verification

1. Open PARAMPARA while online once.
2. Turn Network → Offline.
3. Open Preserve.
4. Confirm Offline Mode is visible.
5. Record audio.
6. Fill metadata.
7. Capture consent.
8. Save.
9. Confirm the queue contains the record.
10. Close the browser.
11. Reopen the PWA while still offline.
12. Confirm the record and audio still exist.
13. Turn the network back on.
14. Confirm automatic synchronization.
15. Click Sync Now and confirm it does not duplicate the record.

## Reviewer verification

1. Sign in as a reviewer.
2. Open `reviewer.html`.
3. Confirm the pending recording appears.
4. Open Review Recording.
5. Play the original source audio.
6. Confirm SHA-256 is visible.
7. Confirm consent state is visible.
8. Use `Auto transcript` when a speech provider is configured.
9. Use English, Hindi and Odia translation buttons.
10. Use `Auto transcript + all languages` to run the complete enrichment sequence.
11. Confirm each output is marked as AI-derived.
12. Confirm the original testimony remains unchanged.
13. Approve the record.
14. If public access was allowed, confirm a Heritage Passport is issued and opened.

## Passport verification

Valid URLs:

- `passport.html?passport=<public_slug>`
- `passport.html?id=<recording_id>` for an approved/public record

A direct `passport.html` visit without an identifier should show a useful navigation message instead of `Passport not specified.`

Verify:

- title
- passport ID
- location
- language
- community
- category
- verification
- SHA-256
- original audio
- transcript
- translations
- QR code

Scan the QR from a different phone.

## Failure tests

- Internet disabled during recording
- Internet disabled during upload
- Browser closed with pending records
- Duplicate audio
- Invalid file extension
- Large audio
- Invalid/expired authentication
- Unauthorized reviewer access
- Rejected recording
- Failed sync followed by retry
- Translation consent disabled
- Transcription consent disabled
- Public access disabled

## Known free-tier limitation

Render Free local disk is ephemeral. A redeploy/restart can remove temporary uploaded audio. Render Free PostgreSQL is also a temporary development database with a limited lifetime. Before treating PARAMPARA as a real permanent archive, move media to durable object storage and the database to a persistent production tier.
