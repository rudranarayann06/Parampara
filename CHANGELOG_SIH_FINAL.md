# PARAMPARA SIH Final Build Changes

## 1. Preserve page layout

- Offline-first recording panel is now full-width.
- The `Tell us the story` form is moved below the offline recorder on desktop and mobile.
- Existing dark/gold PARAMPARA theme is preserved.
- Glassmorphism is strengthened without replacing the visual identity.

## 2. Reviewer AI workspace

The reviewer modal now contains:

- Auto transcript
- English translation
- Hindi translation
- Odia translation
- Auto transcript + all languages
- AI-derived labels
- Provider/model/version information
- Consent-aware blocking
- Refresh of stored transcript/translation data

## 3. Translation provider

`backend/services/ai_service.py` now supports:

- Google Cloud Translation when configured
- MyMemory free fallback when `TRANSLATION_PROVIDER=mymemory` or `auto`

This is intended for prototype/SIH use. A production archive should use a controlled provider with explicit quotas and reliability guarantees.

## 4. Transcription compatibility

The AI service now supports both:

- GCS-backed Google Speech-to-Text
- Local-upload Google Speech-to-Text when Google credentials are configured

## 5. Passport fix

`passport.html` now accepts either:

- `?passport=<public_slug>`
- `?id=<recording_id>`

A direct page visit no longer displays the broken `Passport not specified.` state; it provides a useful archive navigation state.

Reviewer approval automatically opens a public Heritage Passport when the record has public-access consent.

## 6. Dashboard

The dashboard has been rebuilt as a live archive command center with:

- live story count
- verified count
- language count
- community count
- API/database health
- PWA/queue status
- quick actions
- archive workflow
- recent verified records
- passport links

Numbers come from the backend rather than hardcoded demo statistics.

## 7. Free deployment mode

For the current $0 prototype:

- `ALLOW_LOCAL_STORAGE_FALLBACK=true`
- Render local media is temporary
- IndexedDB is the durable offline layer on the user's device
- `TRANSLATION_PROVIDER=mymemory`
- Google AI credentials remain optional

Do not treat Render local media or Free PostgreSQL as the final permanent heritage archive.

## 2026-09-24 — SIH audio + passport/provenance hardening v3
- Replaced conflicting provenance light-theme rules with a final isolated dark modal layer.
- Added dedicated passport.css so global styles cannot wash out passport controls/card styling.
- Public Explore audio now loads through fetch/blob, exposing real HTTP errors and avoiding direct-media caching issues.
- Passport audio/download now resolve through the same public media path and use an object URL when available.
- Durable audio resolver now checks the stored URI, current/legacy Supabase bucket names, multiple historical object layouts, and the Firebase default bucket.
- Reviewer compatibility audio endpoint now uses the same durable resolver.
- Transcription now resolves the actual Recording object from durable storage before sending it to the speech provider.
