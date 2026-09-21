/* ============================================================
   PARAMPARA REVIEWER DASHBOARD
============================================================ */

const API_BASE = "https://parampara-backend-8yt9.onrender.com/";

console.log("🔥 PARAMPARA NEW REVIEWER.JS LOADED");
console.log("🔥 API BASE:", API_BASE);

let verificationQueue = [];
let selectedRecording = null;


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

    loadVerificationQueue();

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

        const response = await fetch(
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
            "Unable to connect to the PARAMPARA backend. Make sure Flask is running on https://parampara-backend-8yt9.onrender.com/.",
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

function openReviewModal(
    verification
) {

    selectedRecording =
        verification;
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
            await fetch(
                `${API_BASE}/api/verifications/${recordingId}/approve`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        reviewer_notes: notes
                    })
                }
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
            "Recording approved successfully.",
            "success"
        );


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
            await fetch(
                `${API_BASE}/api/verifications/${recordingId}/reject`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        reviewer_notes: notes
                    })
                }
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

function loadOriginalAudio(
    recordingId
) {

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


    const audioUrl =
        `${API_BASE}/api/verifications/${recordingId}/audio`;

    console.log("🔥 REVIEW AUDIO URL:", audioUrl);

    originalAudio.src = audioUrl;


    originalAudio.src =
        audioUrl;


    originalAudio.load();


    originalAudio.onloadedmetadata = () => {

        if (audioStatus) {

            audioStatus.textContent =
                "Original source audio • Protected playback";
        }

    };


    originalAudio.onerror = () => {

        console.error(
            "Unable to load original audio."
        );


        if (audioStatus) {

            audioStatus.textContent =
                "Original audio could not be loaded.";
        }

    };

}