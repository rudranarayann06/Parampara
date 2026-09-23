/* =========================================================
   PARAMPARA — EXPLORE
========================================================= */
/* =========================================================
   LIVE ARCHIVE
========================================================= */

const API_BASE = window.PARAMPARA_API_BASE || "https://parampara-backend-8yt9.onrender.com";

let archiveRecords = [];

async function loadArchiveRecords() {

    const archiveGrid =
        document.getElementById("archiveGrid");

    const archiveCount =
        document.getElementById("archiveCount");

    if (!archiveGrid) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/api/recordings/public`
        );

        if (!response.ok) {

            throw new Error(
                `Archive request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        archiveRecords =
            data.recordings || [];

        if (archiveCount) {

            archiveCount.textContent =
                `${archiveRecords.length} verified record${archiveRecords.length === 1
                    ? ""
                    : "s"
                }`;

        }

        renderArchiveRecords(
            archiveRecords
        );

    } catch (error) {

        console.error(
            "PARAMPARA archive error:",
            error
        );

        if (archiveGrid) {

            archiveGrid.innerHTML = `
                <div class="archive-error">
                    Unable to load the cultural archive.
                    Please try again later.
                </div>
            `;

        }

        if (archiveCount) {
            archiveCount.textContent =
                "Archive unavailable";
        }
    }
}
function renderArchiveRecords(records) {
    const archiveGrid = document.getElementById("archiveGrid");

    if (!archiveGrid) {
        console.error("archiveGrid element not found.");
        return;
    }

    if (!records || records.length === 0) {
        archiveGrid.innerHTML = `
            <div class="archive-loading">
                No verified cultural records are available yet.
            </div>
        `;
        return;
    }

    archiveGrid.innerHTML = records.map(record => `
        <article class="archive-card">
            <div class="archive-card-content">

                <span class="section-label">
                    VERIFIED RECORD
                </span>

                <h3 class="archive-card-title">
                    ${escapeHtml(record.title || "Untitled recording")}
                </h3>

                <p class="archive-card-description">
                    ${escapeHtml(
                        record.description ||
                        "Community-contributed cultural recording."
                    )}
                </p>

                <div class="archive-card-meta">
                    <span>
                        Language:
                        ${escapeHtml(record.language || "Not specified")}
                    </span>

                    <span>
                        Record ID:
                        PARAMPARA-${record.id}
                    </span>
                </div>

                <audio
                    class="archive-audio"
                    controls
                    preload="none"
                    src="${API_BASE}/api/recordings/public/${record.id}/audio"
                ></audio>

                <button
                    type="button"
                    class="provenance-button"
                    data-recording-id="${record.id}"
                >
                    View provenance
                </button>

            </div>
        </article>
    `).join("");

    // Make broken/missing files visible instead of leaving a silent 0:00 player.
    archiveGrid.querySelectorAll(".archive-audio").forEach(audio => {
        audio.addEventListener("error", () => {
            audio.insertAdjacentHTML(
                "afterend",
                '<small class="audio-error">Audio file is currently unavailable.</small>'
            );
        }, { once: true });
    });

    console.log(
        "Rendered archive records:",
        records.length
    );
}
function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
/* =========================================================
   MOBILE NAV
========================================================= */

const menuToggle =
    document.getElementById("menuToggle");

const mobileMenu =
    document.getElementById("mobileMenu");


if (menuToggle) {

    menuToggle.addEventListener("click", () => {

        menuToggle.classList.toggle("active");

        mobileMenu.classList.toggle("open");

    });

}



/* =========================================================
   SEARCH
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");


function performSearch() {

    const query =
        searchInput.value.trim();

    if (!query) {

        searchInput.focus();

        return;

    }

    console.log(
        "Searching PARAMPARA for:",
        query
    );

    /*
       Later connect this with Firebase:

       stories
       traditions
       people
       places
       languages
    */

    document.querySelector(".discovery-section")
        ?.scrollIntoView({
            behavior: "smooth"
        });

}


if (searchButton) {

    searchButton.addEventListener(
        "click",
        performSearch
    );

}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                performSearch();

            }

        }
    );

}



/* =========================================================
   SEARCH SUGGESTIONS
========================================================= */

const suggestions =
    document.querySelectorAll(
        ".search-suggestion"
    );


suggestions.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            searchInput.value =
                button.textContent.trim();

            performSearch();

        }
    );

});



/* =========================================================
   FILTERS
========================================================= */

const filterIds = [

    "stateFilter",
    "districtFilter",
    "languageFilter",
    "communityFilter",
    "traditionFilter",
    "eraFilter",
    "verificationFilter"

];


const applyFilters =
    document.getElementById(
        "applyFilters"
    );


if (applyFilters) {

    applyFilters.addEventListener(
        "click",
        () => {

            const filters = {};

            filterIds.forEach(id => {

                const element =
                    document.getElementById(id);

                filters[id] =
                    element.value;

            });


            console.log(
                "PARAMPARA filters:",
                filters
            );


            document.querySelector(
                ".discovery-section"
            )?.scrollIntoView({
                behavior: "smooth"
            });

        }
    );

}



/* =========================================================
   CLEAR FILTERS
========================================================= */

const clearFilters =
    document.getElementById(
        "clearFilters"
    );


if (clearFilters) {

    clearFilters.addEventListener(
        "click",
        () => {

            filterIds.forEach(id => {

                document.getElementById(id)
                    .value = "";

            });

        }
    );

}



/* =========================================================
   CATEGORY SELECTION
========================================================= */

const categoryCards =
    document.querySelectorAll(
        ".category-card"
    );


categoryCards.forEach(card => {

    card.addEventListener(
        "click",
        () => {

            categoryCards.forEach(item => {

                item.classList.remove(
                    "active-category"
                );

            });


            card.classList.add(
                "active-category"
            );


            const category =
                card.dataset.category;

            console.log(
                "Selected category:",
                category
            );

        }
    );

});



/* =========================================================
   REVEAL ANIMATION
========================================================= */

const revealElements =
    document.querySelectorAll(
        ".reveal"
    );


const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if (
                    entry.isIntersecting
                ) {

                    entry.target.classList.add(
                        "visible"
                    );

                    revealObserver.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: 0.12
        }
    );


revealElements.forEach(element => {

    revealObserver.observe(element);

});



/* =========================================================
   STORY CARD INTERACTION
========================================================= */

const storyCards =
    document.querySelectorAll(
        ".story-discovery-card, .compact-story, .verified-card"
    );


storyCards.forEach(card => {

    card.addEventListener(
        "click",
        () => {

            /*
              Later:

              window.location.href =
                  "story.html?id=...";
            */

            console.log(
                "Story selected"
            );

        }
    );

});
document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadArchiveRecords();

    }
);

/* =========================================================
   PROVENANCE MODAL
========================================================= */

function openProvenance(recordingId) {

    const modal =
        document.getElementById("provenanceModal");

    const title =
        document.getElementById("provenanceTitle");

    const content =
        document.getElementById("provenanceContent");

    if (!modal || !title || !content) {
        console.error(
            "Provenance modal elements are missing."
        );
        return;
    }

    const record = archiveRecords.find(
        item => Number(item.id) === Number(recordingId)
    );

    if (!record) {
        console.error(
            "Archive record not found:",
            recordingId
        );
        return;
    }

    title.textContent =
        record.title || "Record provenance";

    content.innerHTML = `
        <div class="provenance-row">
            <span class="provenance-label">
                Verification
            </span>
            <span class="provenance-value">
                ✓ Verified by PARAMPARA review process
            </span>
        </div>

        <div class="provenance-row">
            <span class="provenance-label">
                Community access
            </span>
            <span class="provenance-value">
                Public archive access granted
            </span>
        </div>

        <div class="provenance-row">
            <span class="provenance-label">
                Language
            </span>
            <span class="provenance-value">
                ${escapeHtml(
                    record.language || "Not specified"
                )}
            </span>
        </div>

        <div class="provenance-row">
            <span class="provenance-label">
                Recording ID
            </span>
            <span class="provenance-value">
                PARAMPARA-${record.id}
            </span>
        </div>

        <div class="provenance-row">
            <span class="provenance-label">
                SHA-256 integrity fingerprint
            </span>
            <span class="provenance-value">
                ${escapeHtml(
                    record.audio_hash || "Unavailable"
                )}
            </span>
        </div>

        <div class="provenance-row">
            <span class="provenance-label">
                Preservation date
            </span>
            <span class="provenance-value">
                ${
                    record.created_at
                        ? new Date(
                            record.created_at
                        ).toLocaleString()
                        : "Not available"
                }
            </span>
        </div>
    `;

    modal.classList.add("open");
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}


function closeProvenanceModal() {

    const modal =
        document.getElementById("provenanceModal");

    if (!modal) return;

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";
}


/* Button clicks */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".provenance-button"
            );

        if (button) {

            event.preventDefault();

            openProvenance(
                button.dataset.recordingId
            );

            return;
        }

        if (
            event.target.closest(
                "#closeProvenance"
            )
        ) {
            closeProvenanceModal();
            return;
        }

        const modal =
            document.getElementById(
                "provenanceModal"
            );

        if (
            modal &&
            event.target === modal
        ) {
            closeProvenanceModal();
        }
    }
);


/* Escape key */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeProvenanceModal();
        }

    }
);