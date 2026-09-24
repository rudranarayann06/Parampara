# PARAMPARA audio durability + passport actions

## What changed

- Added durable Supabase Storage support for audio.
- Supabase is preferred automatically when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
- Existing Firebase `gs://...` audio remains readable for migration/backward compatibility.
- Local Render filesystem is no longer the default fallback; set `ALLOW_LOCAL_STORAGE_FALLBACK=false` in production.
- Audio endpoints now support `?download=1` for attachment downloads.
- Passport now has **Download audio**, **Share passport**, and **Copy link** controls beside the QR code.
- Supabase-backed recordings can also be downloaded by the transcription service before local Google Speech processing.
- Health endpoint reports `storage: "supabase"` when Supabase credentials are active.

## Render environment variables

Set these in the Render service:

- `SUPABASE_URL` — Supabase project URL, e.g. `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server-side service-role key. **Never put this in frontend code.**
- `SUPABASE_AUDIO_BUCKET=parampara-audio`
- `ALLOW_LOCAL_STORAGE_FALLBACK=false`

Create a **private** Supabase Storage bucket named `parampara-audio`. The Flask API uses the server-side key to read/write the objects, so the key never reaches GitHub Pages.

## Important migration note

Existing recordings whose `audio_path` points to a Render-local file cannot be recovered after the file has disappeared. Those recordings need their original audio re-uploaded once. New recordings will use durable storage after the Supabase variables are configured.

## Passport behavior

- **Download audio** calls the existing public audio endpoint with `?download=1`, so the server returns an attachment.
- **Share passport** uses the device's native Web Share sheet where available.
- If native sharing is unavailable, the UI copies the passport URL when possible.
- **Copy link** always attempts to copy the passport URL.
