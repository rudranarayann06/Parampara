/* =========================================================
   PARAMPARA — CONTRIBUTE PAGE
========================================================= */


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const menuToggle =
    document.getElementById("menuToggle");

const mobileMenu =
    document.getElementById("mobileMenu");


if (menuToggle && mobileMenu) {

    menuToggle.addEventListener("click", () => {

        menuToggle.classList.toggle("active");

        mobileMenu.classList.toggle("open");

    });

}


/* =========================================================
   REVEAL ANIMATIONS
========================================================= */

const revealElements =
    document.querySelectorAll(".reveal");


const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

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
   CONTRIBUTION TYPE CARDS
========================================================= */

const contributionCards =
    document.querySelectorAll(
        ".contribution-type"
    );


contributionCards.forEach(card => {

    card.addEventListener("click", () => {

        window.location.href =
            "login.html?redirect=preserve";

    });

});


/* =========================================================
   HERITAGE TYPE CARDS
========================================================= */

const heritageCards =
    document.querySelectorAll(
        ".heritage-card"
    );


heritageCards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.zIndex = "3";

    });


    card.addEventListener("mouseleave", () => {

        card.style.zIndex = "";

    });

});


/* =========================================================
   NAVBAR ACTIVE STATE
========================================================= */

const currentPage =
    window.location.pathname
        .split("/")
        .pop() || "index.html";


document.querySelectorAll(".nav-link")
    .forEach(link => {

        const linkPage =
            link.getAttribute("href")
                ?.split("/")
                .pop();

        link.classList.toggle(
            "active",
            linkPage === currentPage
        );

    });


/* =========================================================
   PRESERVE BUTTON
========================================================= */

document.querySelectorAll(
    '[href*="redirect=preserve"]'
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            /*
                Later this can check Firebase auth:

                if user logged in:
                    preserve.html

                else:
                    login.html?redirect=preserve
            */

            console.log(
                "Starting preservation journey..."
            );

        }
    );

});