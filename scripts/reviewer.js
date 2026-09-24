import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    auth
} from "../firebase-config.js";

/* ============================================================
   PARAMPARA REVIEWER DASHBOARD
============================================================ */

console.log("🔥 PARAMPARA NEW REVIEWER.JS LOADED");
const API_BASE = window.PARAMPARA_API_BASE || "";
console.log("🔥 API BASE:", API_BASE);

let verificationQueue = [];
let selectedRecording = null;
let currentAudioObjectUrl = null;

async function getAuthHeaders(json = false, forceRefresh = false) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please sign in with a reviewer account to continue.");
    }

    const token = await user.getIdToken(forceRefresh);
    const headers = {
        "Authorization": `Bearer ${token}`
    };

    if (json) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function authenticatedFetch(url, options = {}, json = false) {
    let response = await fetch(url, {
        ...options,
        headers: await getAuthHeaders(json, false)
    });

    if (response.status === 401) {
        response = await fetch(url, {
            ...options,
            headers: await getAuthHeaders(json, true)
        });
    }

    return response;
}


/* ============================================================
   DOM
============================================================ */
const originalAudio =
    document.getElementById("originalAudio");

const audioStatus =
    document.getElementById("audioStatus");

const verificationList =
    document.getElementById("verificationList");

const pendingCount =
    document.getElementById("pendingCount");

const recordingCount =
    document.getElementById("recordingCount");

const provenanceCount =
    document.getElementById("provenanceCount");

const queueBadge =
    document.getElementById("queueBadge");

const emptyState =
    document.getElementById("emptyState");

const statusMessage =
    document.getElementById("statusMessage");

const refreshBtn =
    document.getElementById("refreshBtn");


/* Modal */

const reviewModal =
    document.getElementById("reviewModal");

const closeModal =
    document.getElementById("closeModal");

const modalTitle =
    document.getElementById("modalTitle");

const modalDescription =
    document.getElementById("modalDescription");

const modalLanguage =
    document.getElementById("modalLanguage");

const modalAccess =
    document.getElementById("modalAccess");

const modalRecordingId =
    document.getElementById("modalRecordingId");

const modalVerificationId =
    document.getElementById("modalVerificationId");

const modalHash =
    document.getElementById("modalHash");

const reviewerNotes =
    document.getElementById("reviewerNotes");

const approveBtn =
    document.getElementById("approveBtn");

const rejectBtn =
    document.getElementById("rejectBtn");


/* Mobile navigation */

const menuToggle =
    document.getElementById("menuToggle");

const mobileMenu =
    document.getElementById("mobileMenu");


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    setupMobileMenu();

    setupModal();

});


/* ============================================================
   MOBILE MENU
============================================================ */

function setupMobileMenu() {

    if (!menuToggle || !mobileMenu) {
        return;
    }

    menuToggle.addEventListener("click", () => {

        mobileMenu.classList.toggle("open");

    });

}


/* ============================================================
   STATUS MESSAGE
============================================================ */

function showStatus(message, type = "") {

    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message;

    statusMessage.className = "status-message show";

    if (type) {
        statusMessage.classList.add(type);
    }

}


function hideStatus() {

    if (!statusMessage) {
        return;
    }

    statusMessage.className = "status-message";

}


/* ============================================================
   LOAD QUEUE
============================================================ */

async function loadVerificationQueue() {

    showStatus(
        "Loading verification queue..."
    );

    if (refreshBtn) {

        refreshBtn.disabled = true;

        refreshBtn.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>
             Loading...`;
    }


    try {

        const response =
            await authenticatedFetch(
                `${API_BASE}/api/verifications/pending`
            );

        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        verificationQueue =
            result.verifications || [];


        updateStatistics();

        renderQueue();


        if (verificationQueue.length === 0) {

            showStatus(
                "Verification queue is currently clear.",
                "success"
            );

        } else {

            hideStatus();

        }


    } catch (error) {

        console.error(
            "Verification queue error:",
            error
        );


        verificationQueue = [];

        updateStatistics();

        renderQueue();


        showStatus(
            "Unable to connect to the PARAMPARA backend. Check the Render API URL and /api/health endpoint.",
            "error"
        );


    } finally {

        if (refreshBtn) {

            refreshBtn.disabled = false;

            refreshBtn.innerHTML =
                `<i class="fa-solid fa-rotate"></i>
                 Refresh Queue`;
        }

    }

}


/* ============================================================
   STATISTICS
============================================================ */

function updateStatistics() {

    const count =
        verificationQueue.length;


    if (pendingCount) {
        pendingCount.textContent = count;
    }


    if (recordingCount) {
        recordingCount.textContent = count;
    }


    /*
       Every preserved recording has a SHA-256 fingerprint.
       For the current verification queue, each entry therefore
       represents a provenance-protected source.
    */

    if (provenanceCount) {
        provenanceCount.textContent = count;
    }


    if (queueBadge) {

        queueBadge.textContent =
            `${count} ${count === 1 ? "pending" : "pending"}`;

    }

}


/* ============================================================
   RENDER QUEUE
============================================================ */

function renderQueue() {

    if (!verificationList) {
        return;
    }


    verificationList.innerHTML = "";


    if (verificationQueue.length === 0) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;

    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    verificationQueue.forEach(
        verification => {

            const card =
                createVerificationCard(
                    verification
                );

            verificationList.appendChild(card);

        }
    );

}


/* ============================================================
   CREATE VERIFICATION CARD
============================================================ */

function createVerificationCard(
    verification
) {

    const card =
        document.createElement("article");

    card.className =
        "verification-card";


    const title =
        escapeHtml(
            verification.title ||
            "Untitled Recording"
        );


    const description =
        escapeHtml(
            verification.description ||
            "No description provided."
        );


    const language =
        escapeHtml(
            verification.language ||
            "Unknown"
        );


    const accessLevel =
        escapeHtml(
            verification.access_level ||
            "PRIVATE"
        );


    const hash =
        escapeHtml(
            verification.audio_hash ||
            "Hash unavailable"
        );


    const filename =
        escapeHtml(
            verification.audio_filename ||
            "Source audio"
        );


    card.innerHTML = `

        <div class="card-top">

            <div>

                <h3 class="card-title">
                    ${title}
                </h3>

                <p class="card-description">
                    ${description}
                </p>

            </div>

            <span class="pending-tag">
                Pending
            </span>

        </div>


        <div class="card-meta">

            <span class="meta-item">
                <i class="fa-solid fa-language"></i>
                ${language}
            </span>

            <span class="meta-item">
                <i class="fa-solid fa-lock"></i>
                ${accessLevel}
            </span>

            <span class="meta-item">
                <i class="fa-solid fa-file-audio"></i>
                ${filename}
            </span>

        </div>


        <div class="card-footer">

            <span class="hash-preview"
                  title="${hash}">
                SHA-256: ${hash}
            </span>

            <button
                type="button"
                class="review-btn"
                data-recording-id="${verification.recording_id}"
            >
                Review Recording
                <i class="fa-solid fa-arrow-right"></i>
            </button>

        </div>
    `;


    const reviewButton =
        card.querySelector(".review-btn");


    reviewButton.addEventListener(
        "click",
        () => {

            openReviewModal(
                verification
            );

        }
    );


    return card;

}


/* ============================================================
   MODAL
============================================================ */

function setupModal() {

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeReviewModal
        );

    }


    if (reviewModal) {

        reviewModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    reviewModal
                ) {

                    closeReviewModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                reviewModal &&
                reviewModal.classList.contains("show")
            ) {

                closeReviewModal();

            }

        }
    );


    if (approveBtn) {

        approveBtn.addEventListener(
            "click",
            approveRecording
        );

    }


    if (rejectBtn) {

        rejectBtn.addEventListener(
            "click",
            rejectRecording
        );

    }

}


/* ============================================================
   OPEN MODAL
============================================================ */

function ensureEnrichmentPanel() {
    if (document.getElementById("aiEnrichmentPanel")) return;
    const notes = document.getElementById("reviewerNotes");
    if (!notes) return;
    const panel = document.createElement("div");
    panel.id = "aiEnrichmentPanel";
    panel.className = "provenance-panel ai-enrichment-panel";
    panel.innerHTML = `
      <div class="enrichment-head">
        <div>
          <span class="section-kicker">AI ENRICHMENT</span>
          <h3>Turn the verified source into searchable evidence</h3>
          <p>Every generated artifact stays linked to the original recording and is clearly labelled as AI-derived.</p>
        </div>
        <span class="enrichment-source-badge">SOURCE → TRANSCRIPT → TRANSLATIONS</span>
      </div>
      <div class="enrichment-actions">
        <button type="button" id="autoEnrichBtn" class="action-btn approve-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto transcript + all languages</button>
        <button type="button" id="generateTranscriptBtn" class="action-btn"><i class="fa-solid fa-file-waveform"></i> Auto transcript</button>
        <button type="button" id="browserTranscriptBtn" class="action-btn"><i class="fa-solid fa-microphone-lines"></i> Browser-assisted transcript</button>
        <button type="button" data-target="en" class="translation-btn action-btn"><i class="fa-solid fa-language"></i> English</button>
        <button type="button" data-target="hi" class="translation-btn action-btn"><i class="fa-solid fa-language"></i> हिन्दी</button>
        <button type="button" data-target="or" class="translation-btn action-btn"><i class="fa-solid fa-language"></i> ଓଡ଼ିଆ</button>
      </div>
      <div class="enrichment-status" id="enrichmentStatus">Ready. Transcription/translation will run only when contributor consent permits AI processing.</div>
      <div id="aiEnrichmentOutput" class="enrichment-output"><div class="derived-empty">No derived content generated yet.</div></div>`;
    notes.parentElement.insertBefore(panel, notes);

    panel.querySelector("#autoEnrichBtn").addEventListener("click", autoEnrichAll);
    panel.querySelector("#generateTranscriptBtn").addEventListener("click", generateTranscript);
    panel.querySelector("#browserTranscriptBtn").addEventListener("click", browserAssistedTranscript);
    panel.querySelectorAll(".translation-btn").forEach(btn => btn.addEventListener("click", () => generateTranslation(btn.dataset.target)));
}

function setEnrichmentStatus(message, type = "") {
    const el = document.getElementById("enrichmentStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `enrichment-status ${type}`.trim();
}

function renderEnrichment(data) {
    const out = document.getElementById("aiEnrichmentOutput");
    if (!out) return;
    const tr = data?.transcript;
    const translations = data?.translations || [];
    const translationCards = translations.map(t => `
      <article class="derived-card">
        <div class="derived-card-head"><span class="ai-label">AI-assisted translation</span><strong>${escapeHtml(languageLabel(t.language))}</strong></div>
        <p>${escapeHtml(t.text || "")}</p>
        <small>Version ${escapeHtml(t.version || 1)} · ${escapeHtml(t.model || "Translation provider")}</small>
      </article>`).join("");
    out.innerHTML = `
      ${tr ? `<article class="derived-card transcript-card"><div class="derived-card-head"><span class="ai-label">${tr.source === "AI" ? "AI-generated transcript" : "Human verified transcript"}</span><strong>${escapeHtml(tr.language || "Original language")}</strong></div><p>${escapeHtml(tr.text || "")}</p><small>Version ${escapeHtml(tr.version || 1)} · Confidence ${tr.confidence == null ? "—" : (Number(tr.confidence) * 100).toFixed(1) + "%"} · ${escapeHtml(tr.model || "Transcript provider")}</small></article>` : ""}
      ${translationCards || (!tr ? '<div class="derived-empty">No derived content generated yet.</div>' : '')}`;
}

function languageLabel(code) {
    return ({ en: "English", "en-IN": "English", hi: "हिन्दी", "hi-IN": "हिन्दी", or: "ଓଡ଼ିଆ", "or-IN": "ଓଡ଼ିଆ", bn: "বাংলা", "bn-IN": "বাংলা" })[code] || code || "Translation";
}

async function fetchRecordEnrichment() {
    if (!selectedRecording) return;
    const response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not refresh enrichment data.");
    renderEnrichment(result.recording || {});
}

async function browserAssistedTranscript() {
    if (!selectedRecording) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setEnrichmentStatus("This browser does not support Web Speech recognition. Use Auto transcript with a configured speech provider.", "error");
        return;
    }
    const sourceLang = selectedRecording.language_code || selectedRecording.language || "en-IN";
    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    const chunks = [];
    const status = document.getElementById("enrichmentStatus");
    setEnrichmentStatus("Browser-assisted mode: play the source audio through speakers and keep the microphone close to the speaker. Stop when finished…");
    const play = document.getElementById("originalAudio");
    recognition.onresult = event => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) finalText += `${text} `;
        }
        if (finalText.trim()) chunks.push(finalText.trim());
    };
    recognition.onerror = event => setEnrichmentStatus(`Browser speech recognition: ${event.error}`, "error");
    recognition.onend = async () => {
        const text = chunks.join(" ").trim();
        if (!text) { setEnrichmentStatus("No speech was captured. Try again with microphone permission and clear audio.", "error"); return; }
        try {
            const response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}/transcript`, {method:"POST", body:JSON.stringify({text, source:"HUMAN_ASSISTED", model:"Web Speech API"})}, true);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Could not save browser-assisted transcript.");
            setEnrichmentStatus("Browser-assisted transcript saved as a separate version. Review it before treating it as verified.", "success");
            await fetchRecordEnrichment();
        } catch (e) { setEnrichmentStatus(e.message, "error"); }
    };
    try {
        recognition.start();
        if (play && play.paused) await play.play();
        const stop = () => { try { recognition.stop(); } catch (_) {} if (play) play.pause(); window.removeEventListener("beforeunload", stop); };
        window.addEventListener("beforeunload", stop, {once:true});
        setTimeout(() => { if (recognition) stop(); }, 180000);
    } catch (e) { setEnrichmentStatus(e.message || "Could not start browser speech recognition.", "error"); }
}

async function generateTranscript() {
    if (!selectedRecording) return;
    setEnrichmentStatus("Transcribing the original source…");
    try {
        const response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}/transcribe`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Transcription failed. Configure a speech provider on the backend.");
        setEnrichmentStatus("Transcript generated and linked to the original recording.", "success");
        await fetchRecordEnrichment();
    } catch (e) {
        setEnrichmentStatus(e.message, "error");
    }
}

async function generateTranslation(target) {
    if (!selectedRecording) return;
    const consent = selectedRecording.consent || {};
    if (consent.translation_allowed === false || consent.ai_processing_allowed === false) {
        setEnrichmentStatus("Translation is blocked by contributor consent for this record.", "error");
        return;
    }
    setEnrichmentStatus(`Generating ${languageLabel(target)} translation…`);
    try {
        const response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}/translate`, { method: "POST", body: JSON.stringify({ target_language: target }) }, true);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Translation failed. Configure a translation provider on the backend.");
        setEnrichmentStatus(`${languageLabel(target)} translation generated.`, "success");
        await fetchRecordEnrichment();
    } catch (e) {
        setEnrichmentStatus(e.message, "error");
    }
}

async function autoEnrichAll() {
    if (!selectedRecording) return;
    const consent = selectedRecording.consent || {};
    if (consent.transcription_allowed === false || consent.translation_allowed === false || consent.ai_processing_allowed === false) {
        setEnrichmentStatus("Auto enrichment is blocked because contributor consent does not permit transcription, translation and AI processing together.", "error");
        return;
    }
    const btn = document.getElementById("autoEnrichBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enriching…'; }
    try {
        setEnrichmentStatus("Step 1/4 · Generating the original-language transcript…");
        let response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}/transcribe`, { method: "POST" });
        let result = await response.json();
        if (!response.ok) throw new Error(result.error || "Transcription failed.");
        for (const target of ["en", "hi", "or"]) {
            setEnrichmentStatus(`Step ${target === "en" ? 2 : target === "hi" ? 3 : 4}/4 · Translating to ${languageLabel(target)}…`);
            response = await authenticatedFetch(`${API_BASE}/api/recordings/${selectedRecording.recording_id}/translate`, { method: "POST", body: JSON.stringify({ target_language: target }) }, true);
            result = await response.json();
            if (!response.ok) throw new Error(result.error || `${languageLabel(target)} translation failed.`);
        }
        setEnrichmentStatus("Complete · transcript + English + Hindi + Odia are linked to the source.", "success");
        await fetchRecordEnrichment();
    } catch (e) {
        setEnrichmentStatus(e.message, "error");
        await fetchRecordEnrichment().catch(() => {});
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Auto transcript + all languages'; }
    }
}

function openReviewModal(
    verification
) {

    selectedRecording =
        verification;
    ensureEnrichmentPanel();
    loadOriginalAudio(
        verification.recording_id
    );

    if (modalTitle) {

        modalTitle.textContent =
            verification.title ||
            "Review Recording";

    }


    if (modalDescription) {

        modalDescription.textContent =
            verification.description ||
            "No description provided.";

    }


    if (modalLanguage) {

        modalLanguage.textContent =
            verification.language ||
            "Unknown";

    }


    if (modalAccess) {

        modalAccess.textContent =
            verification.access_level ||
            "PRIVATE";

    }


    if (modalRecordingId) {

        modalRecordingId.textContent =
            `#${verification.recording_id}`;

    }


    if (modalVerificationId) {

        modalVerificationId.textContent =
            `#${verification.verification_id}`;

    }


    if (modalHash) {

        modalHash.textContent =
            verification.audio_hash ||
            "Hash unavailable";

    }


    if (reviewerNotes) {

        reviewerNotes.value = "";

    }

    const consent = verification.consent || {};
    setEnrichmentStatus(consent.ai_processing_allowed ? "Ready. AI processing is permitted by consent." : "AI processing is not permitted by contributor consent.", consent.ai_processing_allowed ? "" : "error");
    renderEnrichment(verification);


    if (reviewModal) {

        reviewModal.classList.add("show");

        reviewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

    }

}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeReviewModal() {
    if (currentAudioObjectUrl) {

        URL.revokeObjectURL(
            currentAudioObjectUrl
        );

        currentAudioObjectUrl = null;
    }

    selectedRecording = null;
    if (originalAudio) {

        originalAudio.pause();

        originalAudio.removeAttribute("src");

        originalAudio.load();
    }

    if (audioStatus) {

        audioStatus.textContent =
            "Protected source audio.";
    }

    if (reviewModal) {

        reviewModal.classList.remove("show");

        reviewModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }



    document.body.style.overflow = "";

}


/* ============================================================
   APPROVE
============================================================ */

async function approveRecording() {

    if (!selectedRecording) {
        return;
    }


    const recordingId =
        selectedRecording.recording_id;


    const notes =
        reviewerNotes
            ? reviewerNotes.value.trim()
            : "";


    const confirmed =
        window.confirm(
            "Approve this recording as a trusted archive source?"
        );


    if (!confirmed) {
        return;
    }


    setActionLoading(
        approveBtn,
        "Approving..."
    );


    try {

        const response =
            await authenticatedFetch(
                `${API_BASE}/api/verifications/${recordingId}/approve`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        reviewer_notes: notes
                    })
                },
                true
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Could not approve recording."
            );

        }


        closeReviewModal();

        showStatus(
            result.passport_id ? `Approved. Heritage Passport ${result.passport_id} issued.` : "Recording approved successfully.",
            "success"
        );

        if (result.passport_id) {
            try {
                const passportResponse = await fetch(`${API_BASE}/api/recordings/${recordingId}/passport`);
                const passportData = await passportResponse.json();
                if (passportResponse.ok && passportData.passport?.public_slug) {
                    window.open(`passport.html?passport=${encodeURIComponent(passportData.passport.public_slug)}`, "_blank", "noopener");
                }
            } catch (_) {}
        }

        await loadVerificationQueue();


    } catch (error) {

        console.error(
            "Approval error:",
            error
        );


        showStatus(
            error.message,
            "error"
        );

    } finally {

        resetActionButton(
            approveBtn,
            `<i class="fa-solid fa-check"></i>
             Approve as Trusted Source`
        );

    }

}


/* ============================================================
   REJECT
============================================================ */

async function rejectRecording() {

    if (!selectedRecording) {
        return;
    }


    const recordingId =
        selectedRecording.recording_id;


    const notes =
        reviewerNotes
            ? reviewerNotes.value.trim()
            : "";


    if (!notes) {

        alert(
            "Please provide a rejection reason in Reviewer Notes."
        );

        if (reviewerNotes) {
            reviewerNotes.focus();
        }

        return;

    }


    const confirmed =
        window.confirm(
            "Reject this recording from the trusted archive?"
        );


    if (!confirmed) {
        return;
    }


    setActionLoading(
        rejectBtn,
        "Rejecting..."
    );


    try {

        const response =
            await authenticatedFetch(
                `${API_BASE}/api/verifications/${recordingId}/reject`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        reviewer_notes: notes
                    })
                },
                true
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Could not reject recording."
            );

        }


        closeReviewModal();

        showStatus(
            "Recording rejected.",
            "success"
        );


        await loadVerificationQueue();


    } catch (error) {

        console.error(
            "Rejection error:",
            error
        );


        showStatus(
            error.message,
            "error"
        );

    } finally {

        resetActionButton(
            rejectBtn,
            `<i class="fa-solid fa-xmark"></i>
             Reject`
        );

    }

}


/* ============================================================
   BUTTON HELPERS
============================================================ */

function setActionLoading(
    button,
    text
) {

    if (!button) {
        return;
    }


    button.disabled = true;


    button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i>
         ${text}`;

}


function resetActionButton(
    button,
    html
) {

    if (!button) {
        return;
    }


    button.disabled = false;

    button.innerHTML = html;

}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;

}


/* ============================================================
   REFRESH
============================================================ */

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        loadVerificationQueue
    );

}
/* ============================================================
   LOAD PROTECTED ORIGINAL AUDIO
============================================================ */
async function loadOriginalAudio(recordingId) {

    if (currentAudioObjectUrl) {

        URL.revokeObjectURL(
            currentAudioObjectUrl
        );

        currentAudioObjectUrl = null;
    }

    if (!originalAudio) {
        return;
    }

    originalAudio.pause();
    originalAudio.removeAttribute("src");
    originalAudio.load();

    if (audioStatus) {
        audioStatus.textContent =
            "Loading protected source audio...";
    }

    try {

        const audioUrl =
            `${API_BASE}/api/recordings/${recordingId}/audio`;

        console.log(
            "🔥 REVIEW AUDIO URL:",
            audioUrl
        );

        const response =
            await authenticatedFetch(audioUrl);

        if (!response.ok) {

            throw new Error(
                `Audio request failed: HTTP ${response.status}`
            );
        }

        const audioBlob =
            await response.blob();

        currentAudioObjectUrl =
            URL.createObjectURL(audioBlob);

        originalAudio.src =
            currentAudioObjectUrl;

        originalAudio.load();

        originalAudio.onloadedmetadata = () => {

            if (audioStatus) {

                audioStatus.textContent =
                    "Original source audio • Protected playback";
            }
        };

    } catch (error) {

        console.error(
            "Unable to load original audio:",
            error
        );

        if (audioStatus) {

            audioStatus.textContent =
                error.message ||
                "Original audio could not be loaded.";
        }
    }
}

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            showStatus(
                "Please sign in with a reviewer account to access the verification queue.",
                "error"
            );

            return;
        }

        console.log(
            "🔥 Reviewer authenticated:",
            user.email
        );

        try {

            await loadVerificationQueue();

        } catch (error) {

            console.error(
                "Verification queue error:",
                error
            );

            showStatus(
                error.message,
                "error"
            );
        }
    }
);