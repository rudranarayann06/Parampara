/* =========================================================
   PARAMPARA ABOUT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const panel =
        document.querySelector(".archive-panel");

    const visual =
        document.querySelector(".archive-visual");


    if (!panel || !visual) return;


    /* ---------------------------------------------
       Subtle 3D glass movement
    --------------------------------------------- */

    visual.addEventListener("mousemove", (e) => {

        const rect =
            visual.getBoundingClientRect();

        const x =
            (e.clientX - rect.left)
            / rect.width - 0.5;

        const y =
            (e.clientY - rect.top)
            / rect.height - 0.5;


        panel.style.transform =
            `perspective(1000px)
             rotateX(${y * -3}deg)
             rotateY(${x * 4}deg)
             rotateZ(1deg)
             translateY(-5px)`;

    });


    visual.addEventListener("mouseleave", () => {

        panel.style.transform =
            "rotate(2.5deg)";

    });

});

document.addEventListener("DOMContentLoaded", () => {

    const scene =
        document.querySelector(".memory-scene");

    const photo =
        document.querySelector(".memory-photo");

    const note =
        document.querySelector(".memory-note");

    const glow =
        document.querySelector(".memory-glow");


    if (!scene) return;


    /* =========================================
       VERY SUBTLE MOUSE PARALLAX
    ========================================= */

    scene.addEventListener("mousemove", (e) => {

        const rect =
            scene.getBoundingClientRect();

        const x =
            (e.clientX - rect.left)
            / rect.width - .5;

        const y =
            (e.clientY - rect.top)
            / rect.height - .5;


        if (photo) {

            photo.style.transform = `
                rotate(-3deg)
                translate(
                    ${x * 8}px,
                    ${y * 6}px
                )
            `;

        }


        if (note) {

            note.style.transform = `
                rotate(2deg)
                translate(
                    ${x * -5}px,
                    ${y * -4}px
                )
            `;

        }


        if (glow) {

            glow.style.transform = `
                translate(
                    calc(-50% + ${x * 20}px),
                    calc(-50% + ${y * 20}px)
                )
            `;

        }

    });


    /* =========================================
       RESET
    ========================================= */

    scene.addEventListener("mouseleave", () => {

        if (photo) {

            photo.style.transform =
                "rotate(-4deg)";

        }


        if (note) {

            note.style.transform =
                "rotate(2deg)";

        }


        if (glow) {

            glow.style.transform =
                "translate(-50%, -50%)";

        }

    });


    /* =========================================
       SLOW FLOATING MEMORY
    ========================================= */

    let time = 0;


    function breathe() {

        time += 0.008;


        if (photo) {

            const float =
                Math.sin(time) * 1.5;

            photo.style.marginTop =
                `${float}px`;

        }


        requestAnimationFrame(breathe);

    }


    breathe();

});

/* =========================================================
   PARAMPARA — HERITAGE SLIDESHOW
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const gallery =
        document.querySelector("#heritageGallery");

    if (!gallery) return;


    const slides =
        gallery.querySelectorAll(".gallery-slide");

    const progress =
        gallery.querySelector(".progress-fill");

    const number =
        gallery.querySelector(".current-number");


    let currentSlide = 0;

    let slideTimer;

    const slideDuration = 5000;


    /* =====================================================
       SHOW SLIDE
    ===================================================== */

    function showSlide(index) {

        slides.forEach((slide, i) => {

            slide.classList.toggle(
                "active",
                i === index
            );

        });


        if (number) {

            number.textContent =
                String(index + 1).padStart(2, "0");

        }


        /* reset progress */

        if (progress) {

            progress.style.transition = "none";

            progress.style.width = "0%";


            requestAnimationFrame(() => {

                requestAnimationFrame(() => {

                    progress.style.transition =
                        `width ${slideDuration}ms linear`;

                    progress.style.width = "100%";

                });

            });

        }

    }


    /* =====================================================
       NEXT SLIDE
    ===================================================== */

    function nextSlide() {

        currentSlide =
            (currentSlide + 1) % slides.length;

        showSlide(currentSlide);

    }


    /* =====================================================
       START SLIDESHOW
    ===================================================== */

    function startSlideshow() {

        clearInterval(slideTimer);

        slideTimer =
            setInterval(
                nextSlide,
                slideDuration
            );

    }


    /* =====================================================
       INITIAL
    ===================================================== */

    showSlide(0);

    startSlideshow();


    /* =====================================================
       SCROLL → COLOR TRANSITION
    ===================================================== */

    function updateColorState() {

        const rect =
            gallery.getBoundingClientRect();

        const windowHeight =
            window.innerHeight;


        /*
            progress:

            0 = gallery outside viewport
            1 = gallery centered
        */

        const startPoint =
            windowHeight * 0.90;

        const endPoint =
            windowHeight * 0.35;


        let amount =
            (startPoint - rect.top)
            /
            (startPoint - endPoint);


        amount =
            Math.max(
                0,
                Math.min(1, amount)
            );


        /*
            Use CSS variable so the
            transition is smooth.
        */

        gallery.style.setProperty(
            "--color-progress",
            amount
        );


        /*
            When sufficiently inside
            viewport, enable color.
        */

        if (amount > 0.45) {

            gallery.classList.add(
                "is-color"
            );

        } else {

            gallery.classList.remove(
                "is-color"
            );

        }

    }


    window.addEventListener(
        "scroll",
        updateColorState,
        { passive: true }
    );


    window.addEventListener(
        "resize",
        updateColorState
    );


    updateColorState();

});

document.addEventListener("DOMContentLoaded", () => {

    const journey =
        document.querySelector(".heritage-journey");

    if (!journey) return;

    const steps =
        journey.querySelectorAll(".journey-step");

    const progress =
        journey.querySelector(".journey-progress");


    steps.forEach((step, index) => {

        step.addEventListener("mouseenter", () => {

            const progressWidth =
                (index / (steps.length - 1)) * 100;

            progress.style.width =
                `${progressWidth}%`;

            steps.forEach(s => {
                s.classList.remove("active");
            });

            step.classList.add("active");

        });

    });


    journey.addEventListener("mouseleave", () => {

        progress.style.width = "38%";

        steps.forEach(s => {
            s.classList.remove("active");
        });

        steps[0].classList.add("active");

    });

});

document.addEventListener("DOMContentLoaded", () => {

    const section =
        document.querySelector("#storyCta");

    if (!section) return;


    /* =========================================
       SCROLL REVEAL
    ========================================= */

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        section.classList.add(
                            "in-view"
                        );

                    } else {

                        section.classList.remove(
                            "in-view"
                        );

                    }

                });

            },
            {
                threshold: 0.25
            }
        );


    observer.observe(section);


    /* =========================================
       SUBTLE MOUSE PARALLAX
    ========================================= */

    const image =
        section.querySelector(
            ".cta-background img"
        );


    if (!image) return;


    section.addEventListener(
        "mousemove",
        (event) => {

            const rect =
                section.getBoundingClientRect();

            const x =
                (event.clientX - rect.left)
                / rect.width - 0.5;

            const y =
                (event.clientY - rect.top)
                / rect.height - 0.5;


            image.style.transform = `
                scale(1.02)
                translate(
                    ${x * -10}px,
                    ${y * -7}px
                )
            `;

        }
    );


    section.addEventListener(
        "mouseleave",
        () => {

            image.style.transform =
                "scale(1)";

        }
    );

});