# PARAMPARA — Production Deployment

## Architecture
- GitHub Pages / any HTTPS static host: PWA frontend
- Render Web Service: Flask API
- Render PostgreSQL: metadata, consent, audit, provenance, versions
- Firebase Storage: original audio/object storage
- Firebase Authentication: identity and RBAC claims
- Google Cloud Speech-to-Text: transcript generation
- Google Cloud Translation: derived translations

## Required environment variables
Copy `backend/.env.example` into your deployment configuration. Never commit service-account JSON.

## Firebase
1. Enable Authentication.
2. Create a service account for the backend.
3. Enable Firebase Storage.
4. Put the service account JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` as a single-line JSON secret.
5. Add reviewer/community-keeper/admin custom claims to the Firebase users or manage the `users.role` field server-side.

## Google Cloud
Enable Speech-to-Text and Cloud Translation APIs in the same project. The Render process must have credentials with permission to call them. If using a separate service account, set `GOOGLE_APPLICATION_CREDENTIALS` to a mounted secret path or use a supported workload identity setup.

## Database
`db.create_all()` bootstraps a fresh prototype database. For a long-lived production system, use Alembic/Flask-Migrate migrations before changing schema.

## Static frontend
Serve the repository root over HTTPS. Service workers and microphone access require a secure context (localhost is allowed for development).

## Offline demo
1. Open `preserve.html` while online so the service worker installs.
2. Open DevTools > Network and switch to Offline.
3. Click `Record locally`.
4. Fill title, language, location, category and consent.
5. Submit. The record is stored in IndexedDB with the audio Blob, metadata and consent.
6. Close/reopen the page; the queue remains.
7. Re-enable the network. The sync manager uploads the queue automatically.
8. Failed uploads remain in the queue and can be retried with `Sync now`.

## Production security
- Original audio remains private until both verification approval and public consent are true.
- AI transcript and translation are derived artifacts and retain source/version metadata.
- SHA-256 prevents silent source replacement and supports duplicate detection.
- Do not expose service-account credentials in the frontend.
- Use HTTPS for all deployments.
