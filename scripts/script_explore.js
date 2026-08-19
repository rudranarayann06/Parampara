/* =========================================================
   PARAMPARA — EXPLORE
========================================================= */


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