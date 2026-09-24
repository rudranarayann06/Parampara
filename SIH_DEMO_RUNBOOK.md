# PARAMPARA SIH Demo — one continuous story

## 1. Prepare
- Deploy the Flask API to Render with PostgreSQL, Firebase Storage/Auth and Google Cloud credentials.
- Serve the frontend over HTTPS.
- Open `preserve.html` once online so the service worker installs.
- Sign in as a reviewer on the reviewer page in another browser/profile.

## 2. Offline capture
1. Open Preserve.
2. Switch the browser to Offline in DevTools, or disable Wi-Fi/mobile data.
3. The bottom-right pill changes to `Offline Mode`.
4. Click `Record locally` and speak a short real oral-history sample.
5. Fill title, language, location, community, tradition and access.
6. Complete consent.
7. Submit.
8. Show the queue: the audio Blob, metadata and consent are stored in IndexedDB.
9. Close and reopen the page. The queue remains.

## 3. Sync
1. Re-enable internet.
2. PARAMPARA detects connectivity and starts synchronization.
3. Show `Synchronizing...` and the queue moving to `✓ Synchronized`.
4. The server rejects a duplicate SHA-256 source with HTTP 409 instead of creating a second archive record.

## 4. Verification
1. Open the reviewer queue.
2. Play the protected original source audio.
3. Show SHA-256, consent, metadata and verification state.
4. Approve the source.
5. If public consent is enabled, a Digital Heritage Passport is issued.

## 5. AI enrichment
1. In the reviewer modal, click `Generate transcript`.
2. The backend checks transcription consent before calling Speech-to-Text.
3. The UI labels it `AI-generated transcript`.
4. Click `Translate to English`.
5. The backend checks translation consent before calling Translation.
6. The UI labels the result `AI-assisted translation`.

## 6. Provenance
Open Explore → View provenance. Show the timeline:
- contribution created
- transcript generated/versioned
- translation generated/versioned
- community verification
- reviewer approval

The original audio hash is retained and the derived artifacts point to the stored transcript/source chain.

## 7. Physical judge interaction
Open the Heritage Passport and show its QR code. Scan it from a phone. The phone opens `passport.html?passport=<slug>` and shows:
- Digital Heritage ID
- verified status
- source fingerprint
- consent/provenance state
- original audio
- transcript
- translations

## 8. Researcher story
Open `research.html` and search/filter verified public records by language, state and tradition. Each result links to evidence instead of presenting a generated summary as if it were the testimony itself.
