/* =====================================================
   SCROLL REVEAL
====================================================== */

const revealElements =
    document.querySelectorAll(".reveal");

const revealObserver =
    new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
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

/* =====================================================
   IMPACT COUNTERS
====================================================== */

const counters =
    document.querySelectorAll(".counter");

let countersStarted = false;

function animateCounters() {
    if (countersStarted) return;
    countersStarted = true;
    counters.forEach(counter => {
        const target =
            Number(counter.dataset.target);
        let current = 0;
        const increment =
            Math.max(1, Math.ceil(target / 80));

        const updateCounter = () => {
            current += increment;
            if (current >= target) {
                counter.textContent = target;
                return;
            }

            counter.textContent = current;
            requestAnimationFrame(updateCounter);
        };

        updateCounter();
    });
}


const impactSection =
    document.querySelector(".impact-section");

const impactObserver =
    new IntersectionObserver(
        entries => {
            if (entries[0].isIntersecting) {
                animateCounters();
            }
        },
        {
            threshold: 0.35
        }
    );

impactObserver.observe(impactSection);

/* =====================================================
   STORY CARD INTERACTION
====================================================== */

document.querySelectorAll(".story-card")
    .forEach(card => {
        card.addEventListener("click", () => {
            alert(
                "Story details will be connected in the Explore phase."
            );
        });
    });

/* =====================================================
   BUTTON INTERACTION
====================================================== */

document.querySelectorAll(
    'a[href="#"]'
).forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
    });
});

/* =====================================================
   SUBTLE MOUSE GLOW
====================================================== */

const glow =
    document.createElement("div");
glow.style.position = "fixed";
glow.style.width = "250px";
glow.style.height = "250px";
glow.style.borderRadius = "50%";
glow.style.pointerEvents = "none";
glow.style.zIndex = "-1";
glow.style.background =
    "radial-gradient(circle, rgba(215,168,91,0.045), transparent 70%)";
glow.style.transform = "translate(-50%, -50%)";
document.body.appendChild(glow);
document.addEventListener("mousemove", event => {
    glow.style.left = event.clientX + "px";
    glow.style.top = event.clientY + "px";
});

const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
        menuToggle.classList.toggle("active");
        mobileMenu.classList.toggle("open");
    });

    mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            menuToggle.classList.remove("active");
            mobileMenu.classList.remove("open");
        });
    });
}
