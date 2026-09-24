# PARAMPARA Feature Matrix — SIH PS

| Requirement | Implementation |
|---|---|
| Record oral histories | MediaRecorder + audio upload |
| Offline contribution | PWA + IndexedDB + persistent Blob queue |
| Offline metadata | IndexedDB record metadata |
| Offline consent | IndexedDB consent fields |
| Offline queue | IndexedDB `syncQueue` |
| Automatic sync | `online` event + sync manager |
| Background sync | Service Worker Background Sync where supported |
| Retry | Failed items retained with attempt count/error |
| Duplicate prevention | Local SHA-256 + server SHA-256 unique constraint |
| Persistent object storage | Firebase Storage `gs://` objects in production |
| PostgreSQL | SQLAlchemy models and production Render configuration |
| Multilingual UI | English/Hindi/Odia/Bengali selector architecture |
| Multilingual content | Translation records linked to transcript versions |
| Original-language preservation | Recording language and transcript are immutable source lineage; translations are separate rows |
| AI transcription | Google Cloud Speech-to-Text integration |
| AI translation | Google Cloud Translation integration |
| Consent-aware AI | Backend blocks transcription/translation when consent is false |
| AI/source distinction | `source=AI` and explicit UI labels |
| Human transcript versions | Versioned transcript endpoint with `source=HUMAN` |
| Provenance | SHA-256 + audit events + version records + passport |
| Community verification | Community verifier role and verification endpoint |
| Reviewer verification | Reviewer/Admin RBAC + approval/rejection workflow |
| Heritage Passport | Stable `PRM-*` ID + public slug + QR page |
| Research discovery | Public research explorer with filters/search |
| Analytics | Database-backed stats endpoint |
| Production hardening | CORS, max upload size, error handlers, health endpoint, rate limiter, secure object-storage default |
| Deployment | Render blueprint + environment template + HTTPS PWA guidance |
