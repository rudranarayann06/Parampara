/* =========================================================
   PARAMPARA — STORY DETAIL SCRIPT
========================================================= */


/* =========================================================
   STORY DATA
========================================================= */

const stories = {

    "123": {

        title:
            "The Song That Guided the Fishermen",

        category:
            "Folk Tradition",

        description:
            "An old coastal song passed through generations, once sung before fishermen ventured into the sea.",

        location:
            "Odisha, India",

        language:
            "Odia",

        community:
            "Coastal Community",

        era:
            "Early 20th Century",

        contributor:
            "Ramesh Behera",

        image:
            "assets/story/fish1.jpeg",
        archiveImage: "assets/story/fish.jpeg"

    },

    "124": {

        title:
            "The Village That Remembered the Flood",

        category:
            "Oral History",

        description:
            "A first-hand account of a historic flood remembered through generations of one riverside community.",

        location:
            "Assam, India",

        language:
            "Assamese",

        community:
            "Riverside Community",

        era:
            "Mid 20th Century",

        contributor:
            "Community Archive",

        image:
            "assets/story/flood.jpeg",
        archiveImage: "assets/story/flood1.jpeg"


    },

    "125": {

        title:
            "Hands That Remember the Craft",

        category:
            "Craft Tradition",

        description:
            "The story behind a traditional craft, taught from master artisans to the next generation.",

        location:
            "Rajasthan, India",

        language:
            "Hindi",

        community:
            "Artisan Community",

        era:
            "19th Century",

        contributor:
            "Local Artisan Community",

        image:
            "assets/story/craft.jpeg",
        archiveImage: "assets/story/craft1.jpeg"

    },


    "126": {

        title:
            "When the Village Lights the First Lamp",

        category:
            "Festival",

        description:
            "A community festival and the meaning behind a ritual performed every year by generations of families.",

        location:
            "West Bengal, India",

        language:
            "Bengali",

        community:
            "Village Community",

        era:
            "Traditional",

        contributor:
            "Community Elder",

        image:
            "assets/story/lamp.jpg",
        archiveImage: "assets/story/lamp1.jpeg"

    },


    "127": {

        title:
            "A Recipe Written in Memory",

        category:
            "Food Heritage",

        description:
            "A traditional recipe preserved through stories, memories and generations of family kitchens.",

        location:
            "Kerala, India",

        language:
            "Malayalam",

        community:
            "Family Tradition",

        era:
            "Generational",

        contributor:
            "Family Archive",

        image:
            "assets/story/food.jpeg",
        archiveImage: "assets/story/food1.jpeg"

    },


    "128": {

        title:
            "The Forest Knows the Way",

        category:
            "Indigenous Knowledge",

        description:
            "Traditional ecological knowledge passed through generations of a forest-dwelling community.",

        location:
            "Jharkhand, India",

        language:
            "Santhali",

        community:
            "Tribal Community",

        era:
            "Generational",

        contributor:
            "Community Knowledge Keeper",

        image:
            "assets/story/forest.jpeg",
        archiveImage: "assets/story/forest1.jpeg"

    }

};


/* =========================================================
   GET STORY ID
========================================================= */

const params =
    new URLSearchParams(window.location.search);

const storyId =
    params.get("id") || "123";


/* =========================================================
   LOAD STORY
========================================================= */

const story =
    stories[storyId] || stories["123"];


function loadStory() {

    const title =
        document.getElementById("storyTitle");

    const description =
        document.getElementById("storyDescription");

    const location =
        document.getElementById("storyLocation");

    const language =
        document.getElementById("storyLanguage");

    const community =
        document.getElementById("storyCommunity");

    const era =
        document.getElementById("storyEra");

    const image =
        document.getElementById("heroStoryImage");
    const archiveImage =
        document.getElementById("archiveStoryImage");

    if (title)
        title.textContent = story.title;

    if (description)
        description.textContent = story.description;

    if (location)
        location.textContent = story.location;

    if (language)
        language.textContent = story.language;

    if (community)
        community.textContent = story.community;

    if (era)
        era.textContent = story.era;

    if (image) {

        image.src =
            story.image;
        image.alt =
            `${story.title} — Heritage Archive`;


    }

    if (archiveImage) {

        archiveImage.src =
            story.archiveImage;

        archiveImage.alt =
            `${story.title} — Archived Heritage Image`;


    }
    document.title =
        `${story.title} | PARAMPARA`;

}
loadStory();


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const menuToggle =
    document.getElementById("menuToggle");

const mobileMenu =
    document.getElementById("mobileMenu");


if (menuToggle) {

    menuToggle.addEventListener(
        "click",
        () => {

            mobileMenu.classList.toggle("open");

            menuToggle.classList.toggle("active");

        }
    );

}


/* =========================================================
   TOAST
========================================================= */

const toast =
    document.getElementById("toast");

const toastText =
    document.getElementById("toastText");


function showToast(message) {

    if (!toast)
        return;

    toastText.textContent =
        message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2600);

}


/* =========================================================
   SAVE STORY
========================================================= */

const saveStory =
    document.getElementById("saveStory");


if (saveStory) {

    saveStory.addEventListener(
        "click",
        () => {

            const icon =
                saveStory.querySelector("i");

            const text =
                saveStory.querySelector("span");

            const saved =
                saveStory.classList.toggle("saved");

            if (saved) {

                icon.className =
                    "fa-solid fa-bookmark";

                text.textContent =
                    "Saved";

                showToast(
                    "Story saved to your archive"
                );

            } else {

                icon.className =
                    "fa-regular fa-bookmark";

                text.textContent =
                    "Save Story";

                showToast(
                    "Story removed from saved stories"
                );

            }

        }
    );

}


/* =========================================================
   SHARE
========================================================= */

const shareStory =
    document.getElementById("shareStory");


if (shareStory) {

    shareStory.addEventListener(
        "click",
        async () => {

            const shareData = {

                title:
                    story.title,

                text:
                    `Explore "${story.title}" on PARAMPARA.`,

                url:
                    window.location.href

            };


            try {

                if (
                    navigator.share
                ) {

                    await navigator.share(
                        shareData
                    );

                } else {

                    await navigator.clipboard.writeText(
                        window.location.href
                    );

                    showToast(
                        "Story link copied"
                    );

                }

            } catch (error) {

                console.log(
                    "Share cancelled"
                );

            }

        }
    );

}


/* =========================================================
   TRANSCRIPT TABS
========================================================= */

const transcriptTabs =
    document.querySelectorAll(
        ".transcript-tab"
    );


const originalTranscript =
    document.getElementById(
        "originalTranscript"
    );


const translationTranscript =
    document.getElementById(
        "translationTranscript"
    );


transcriptTabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                transcriptTabs.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );

                tab.classList.add(
                    "active"
                );


                const selected =
                    tab.dataset.tab;


                if (
                    selected === "original"
                ) {

                    originalTranscript
                        .classList.remove(
                            "hidden"
                        );

                    translationTranscript
                        .classList.add(
                            "hidden"
                        );

                } else {

                    originalTranscript
                        .classList.add(
                            "hidden"
                        );

                    translationTranscript
                        .classList.remove(
                            "hidden"
                        );

                }

            }
        );

    }
);


/* =========================================================
   TEXT TO SPEECH
========================================================= */

const speakText =
    document.getElementById(
        "speakText"
    );


if (speakText) {

    speakText.addEventListener(
        "click",
        () => {

            if (
                !("speechSynthesis" in window)
            ) {

                showToast(
                    "Text-to-speech is not supported"
                );

                return;

            }


            const visibleTranscript =
                document.querySelector(
                    ".transcript-content:not(.hidden)"
                );


            const text =
                visibleTranscript
                    ? visibleTranscript.innerText
                    : "";


            window.speechSynthesis.cancel();


            const speech =
                new SpeechSynthesisUtterance(
                    text
                );


            speech.rate = 0.9;

            speech.pitch = 1;

            speech.volume = 1;


            window.speechSynthesis.speak(
                speech
            );


            showToast(
                "Reading the story aloud"
            );

        }
    );

}


/* =========================================================
   AUDIO PLAYER PROTOTYPE
========================================================= */

let playing = false;

let progress = 0;

let audioTimer = null;


const mainPlay =
    document.getElementById(
        "mainPlay"
    );


const heroPlay =
    document.getElementById(
        "heroPlay"
    );


const progressBar =
    document.getElementById(
        "audioProgress"
    );


const currentTime =
    document.getElementById(
        "currentTime"
    );


const audioBars =
    document.querySelectorAll(
        ".audio-wave i"
    );


function updateAudioUI() {

    if (progressBar) {

        progressBar.style.width =
            `${progress}%`;

    }


    audioBars.forEach(
        (bar, index) => {

            const threshold =
                (index /
                    audioBars.length) *
                100;

            if (
                threshold <= progress
            ) {

                bar.classList.add(
                    "played"
                );

            } else {

                bar.classList.remove(
                    "played"
                );

            }

        }
    );


    const totalSeconds =
        138;

    const seconds =
        Math.floor(
            (progress / 100) *
            totalSeconds
        );


    const minutes =
        Math.floor(
            seconds / 60
        );

    const remaining =
        seconds % 60;


    if (currentTime) {

        currentTime.textContent =
            `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;

    }

}


function toggleAudio() {

    playing =
        !playing;


    if (mainPlay) {

        mainPlay.innerHTML =
            playing
                ? '<i class="fa-solid fa-pause"></i>'
                : '<i class="fa-solid fa-play"></i>';

    }


    if (heroPlay) {

        heroPlay.innerHTML =
            playing
                ? '<i class="fa-solid fa-pause"></i>'
                : '<i class="fa-solid fa-play"></i>';

    }


    if (playing) {

        audioTimer =
            setInterval(
                () => {

                    progress +=
                        0.72;

                    if (
                        progress >= 100
                    ) {

                        progress = 0;

                    }

                    updateAudioUI();

                },
                1000
            );

    } else {

        clearInterval(
            audioTimer
        );

    }

}


if (mainPlay) {

    mainPlay.addEventListener(
        "click",
        toggleAudio
    );

}


if (heroPlay) {

    heroPlay.addEventListener(
        "click",
        toggleAudio
    );


}


/* =========================================================
   CLICK WAVEFORM TO SEEK
========================================================= */

const audioWave =
    document.querySelector(
        ".audio-wave"
    );


if (audioWave) {

    audioWave.addEventListener(
        "click",
        event => {

            const rect =
                audioWave.getBoundingClientRect();

            const clickPosition =
                event.clientX -
                rect.left;

            progress =
                Math.max(
                    0,
                    Math.min(
                        100,
                        (clickPosition /
                            rect.width) *
                        100
                    )
                );

            updateAudioUI();

        }
    );

}


/* =========================================================
   IMAGE LIGHTBOX
========================================================= */

const imageExpand =
    document.getElementById(
        "imageExpand"
    );


const lightbox =
    document.getElementById(
        "lightbox"
    );


const lightboxImage =
    document.getElementById(
        "lightboxImage"
    );


const lightboxClose =
    document.getElementById(
        "lightboxClose"
    );


if (imageExpand) {

    imageExpand.addEventListener(
        "click",
        () => {

            lightboxImage.src =
                story.archiveImage;
            lightboxImage.alt =
                `${story.title} — Visual Archive`;

            lightbox.classList.add(
                "open"
            );

        }
    );

}


if (lightboxClose) {

    lightboxClose.addEventListener(
        "click",
        () => {

            lightbox.classList.remove(
                "open"
            );

        }
    );

}


if (lightbox) {

    lightbox.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                lightbox
            ) {

                lightbox.classList.remove(
                    "open"
                );

            }

        }
    );

}


/* =========================================================
   ESCAPE LIGHTBOX
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            lightbox?.classList.remove(
                "open"
            );

        }

    }
);


/* =========================================================
   INITIAL AUDIO UI
========================================================= */

updateAudioUI();