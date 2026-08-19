/* =========================================================
   PARAMPARA — PRESERVE PAGE
   Authentication Protection
========================================================= */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


/* =========================================================
   AUTHENTICATION GUARD
========================================================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        /*
         * User is NOT logged in.
         * Redirect them to login page.
         */

        window.location.replace(
            "login.html?redirect=preserve.html"
        );

        return;
    }


    /*
     * User IS logged in.
     * Now initialize the preserve page.
     */

    initializePreservePage(user);

});


/* =========================================================
   PRESERVE PAGE
========================================================= */

function initializePreservePage(user) {

    console.log(
        "Authenticated user:",
        user.email
    );

/* =========================================================
   PARAMPARA — PRESERVE PAGE JAVASCRIPT
   Phase 5 Prototype
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const form = document.getElementById("preserveForm");

    const titleInput =
        document.getElementById("storyTitle");

    const descriptionInput =
        document.getElementById("storyDescription");

    const stateInput =
        document.getElementById("state");

    const districtInput =
        document.getElementById("district");

    const locationInput =
        document.getElementById("location");

    const languageInput =
        document.getElementById("language");

    const categoryInput =
        document.getElementById("traditionCategory");


    /* Preview */

    const previewTitle =
        document.getElementById("previewTitle");

    const previewDescription =
        document.getElementById("previewDescription");

    const previewLocation =
        document.getElementById("previewLocation");

    const previewLanguage =
        document.getElementById("previewLanguage");

    const previewCategory =
        document.getElementById("previewCategory");


    /* Character counter */

    const descriptionCount =
        document.getElementById("descriptionCount");


    /* Modal */

    const successModal =
        document.getElementById("successModal");

    const successClose =
        document.getElementById("successClose");


    /* Submit button */

    const submitButton =
        document.querySelector(".submit-preserve-btn");


    /* =====================================================
       STORY TITLE → LIVE PREVIEW
    ===================================================== */

    if (titleInput) {

        titleInput.addEventListener("input", () => {

            const value =
                titleInput.value.trim();

            if (previewTitle) {

                previewTitle.textContent =
                    value || "Your story title";
            }

            validateField(titleInput);

        });

    }


    /* =====================================================
       DESCRIPTION → LIVE PREVIEW
    ===================================================== */

    if (descriptionInput) {

        descriptionInput.addEventListener("input", () => {

            const value =
                descriptionInput.value.trim();

            if (previewDescription) {

                previewDescription.textContent =
                    value ||
                    "Your story description will appear here as you add it.";
            }


            /* Character count */

            if (descriptionCount) {

                descriptionCount.textContent =
                    `${descriptionInput.value.length} / 5000`;
            }


            validateField(descriptionInput);

        });

    }


    /* =====================================================
       STATE + DISTRICT + LOCATION
       → LIVE LOCATION PREVIEW
    ===================================================== */

    function updateLocationPreview() {

        const state =
            stateInput?.value.trim() || "";

        const district =
            districtInput?.value.trim() || "";

        const location =
            locationInput?.value.trim() || "";


        let result = "";


        if (location) {

            result = location;

        } else if (district && state) {

            result =
                `${district}, ${state}`;

        } else if (state) {

            result = state;

        } else {

            result = "Location";
        }


        if (previewLocation) {

            previewLocation.textContent =
                result;
        }

    }


    stateInput?.addEventListener(
        "change",
        updateLocationPreview
    );

    districtInput?.addEventListener(
        "input",
        updateLocationPreview
    );

    locationInput?.addEventListener(
        "input",
        updateLocationPreview
    );


    /* =====================================================
       LANGUAGE → PREVIEW
    ===================================================== */

    if (languageInput) {

        languageInput.addEventListener("input", () => {

            const value =
                languageInput.value.trim();

            if (previewLanguage) {

                previewLanguage.textContent =
                    value || "Language";
            }

            validateField(languageInput);

        });

    }


    /* =====================================================
       CATEGORY → PREVIEW
    ===================================================== */

    if (categoryInput) {

        categoryInput.addEventListener("change", () => {

            const selected =
                categoryInput.options[
                    categoryInput.selectedIndex
                ];

            if (previewCategory) {

                previewCategory.textContent =
                    selected && selected.value
                        ? selected.textContent.toUpperCase()
                        : "HERITAGE STORY";
            }

            validateField(categoryInput);

        });

    }


    /* =====================================================
       FILE UPLOADS
    ===================================================== */

    setupFileInput(
        "audioUpload",
        "audioName",
        "audio"
    );

    setupFileInput(
        "imageUpload",
        "imageName",
        "image"
    );

    setupFileInput(
        "videoUpload",
        "videoName",
        "video"
    );

    setupFileInput(
        "documentUpload",
        "documentName",
        "document"
    );


    function setupFileInput(
        inputId,
        outputId,
        type
    ) {

        const input =
            document.getElementById(inputId);

        const output =
            document.getElementById(outputId);


        if (!input || !output) {
            return;
        }


        input.addEventListener("change", () => {

            const files =
                Array.from(input.files);


            if (!files.length) {

                output.textContent =
                    "No file selected";

                return;
            }


            /* Image uploads */

            if (
                type === "image" ||
                type === "document"
            ) {

                if (files.length === 1) {

                    output.textContent =
                        files[0].name;

                } else {

                    output.textContent =
                        `${files.length} files selected`;
                }

            }

            /* Single media */

            else {

                output.textContent =
                    files[0].name;
            }


            /* Show selected state */

            const zone =
                input.closest(".upload-zone");

            if (zone) {

                zone.classList.add(
                    "has-file"
                );
            }

        });

    }


    /* =====================================================
       DRAG & DROP UPLOAD
    ===================================================== */

    document
        .querySelectorAll(".upload-zone")
        .forEach(zone => {

            const input =
                zone.querySelector(
                    'input[type="file"]'
                );


            if (!input) {
                return;
            }


            zone.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();

                    zone.classList.add(
                        "dragging"
                    );

                }
            );


            zone.addEventListener(
                "dragleave",
                () => {

                    zone.classList.remove(
                        "dragging"
                    );

                }
            );


            zone.addEventListener(
                "drop",
                event => {

                    event.preventDefault();

                    zone.classList.remove(
                        "dragging"
                    );


                    const files =
                        event.dataTransfer.files;


                    if (!files.length) {
                        return;
                    }


                    try {

                        const dataTransfer =
                            new DataTransfer();

                        Array.from(files).forEach(
                            file => {
                                dataTransfer.items.add(
                                    file
                                );
                            }
                        );

                        input.files =
                            dataTransfer.files;

                        input.dispatchEvent(
                            new Event(
                                "change",
                                {
                                    bubbles: true
                                }
                            )
                        );

                    } catch (error) {

                        console.warn(
                            "Drag and drop assignment failed:",
                            error
                        );

                    }

                }
            );

        });


    /* =====================================================
       FORM VALIDATION
    ===================================================== */

    const requiredFields =
        form?.querySelectorAll(
            "[required]"
        );


    requiredFields?.forEach(field => {

        field.addEventListener(
            "blur",
            () => validateField(field)
        );


        field.addEventListener(
            "change",
            () => validateField(field)
        );

    });


    function validateField(field) {

        if (!field) {
            return true;
        }


        if (!field.required) {
            return true;
        }


        const valid =
            field.checkValidity();


        field.classList.toggle(
            "valid",
            valid && field.value.trim() !== ""
        );


        field.classList.toggle(
            "invalid",
            !valid
        );


        return valid;

    }


    /* =====================================================
       FORM SUBMISSION
    ===================================================== */

    if (form) {

        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                /* Validate everything */

                let formValid = true;


                requiredFields?.forEach(field => {

                    const valid =
                        validateField(field);


                    if (!valid) {

                        formValid = false;
                    }

                });


                if (!formValid) {

                    showValidationMessage();

                    return;
                }


                /* Disable button */

                setLoadingState(true);


                /*
                    IMPORTANT:

                    This is currently a prototype.

                    Firebase / backend submission
                    will be connected here later.
                */


                setTimeout(() => {

                    setLoadingState(false);

                    openSuccessModal();

                }, 900);

            }
        );

    }


    /* =====================================================
       VALIDATION MESSAGE
    ===================================================== */

    function showValidationMessage() {

        const firstInvalid =
            form?.querySelector(
                ".invalid"
            );


        if (firstInvalid) {

            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            setTimeout(() => {

                firstInvalid.focus();

            }, 400);

        }

    }


    /* =====================================================
       LOADING STATE
    ===================================================== */

    function setLoadingState(isLoading) {

        if (!submitButton) {
            return;
        }


        if (isLoading) {

            submitButton.classList.add(
                "loading"
            );

            submitButton.disabled = true;


            submitButton.querySelector(
                "span"
            ).textContent =
                "Preparing Contribution";


            const icon =
                submitButton.querySelector(
                    "i"
                );


            if (icon) {

                icon.className =
                    "fa-solid fa-spinner";
            }

        } else {

            submitButton.classList.remove(
                "loading"
            );

            submitButton.disabled = false;


            submitButton.querySelector(
                "span"
            ).textContent =
                "Submit for Verification";


            const icon =
                submitButton.querySelector(
                    "i"
                );


            if (icon) {

                icon.className =
                    "fa-solid fa-arrow-right";
            }

        }

    }


    /* =====================================================
       SUCCESS MODAL
    ===================================================== */

    function openSuccessModal() {

        if (!successModal) {
            return;
        }


        successModal.classList.add(
            "show"
        );


        successModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    function closeSuccessModal() {

        if (!successModal) {
            return;
        }


        successModal.classList.remove(
            "show"
        );


        successModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";

    }


    successClose?.addEventListener(
        "click",
        closeSuccessModal
    );


    /* Click outside modal */

    successModal?.addEventListener(
        "click",
        event => {

            if (
                event.target.classList.contains(
                    "success-backdrop"
                )
            ) {

                closeSuccessModal();
            }

        }
    );


    /* Escape key */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                successModal?.classList.contains(
                    "show"
                )
            ) {

                closeSuccessModal();

            }

        }
    );


    /* =====================================================
       AUTO-SCROLL PROGRESS
    ===================================================== */

    const formSections =
        document.querySelectorAll(
            ".form-section"
        );

    const progressSteps =
        document.querySelectorAll(
            ".progress-step"
        );


    if (
        formSections.length &&
        progressSteps.length
    ) {

        const observer =
            new IntersectionObserver(
                entries => {

                    entries.forEach(
                        entry => {

                            if (
                                entry.isIntersecting
                            ) {

                                const index =
                                    Array.from(
                                        formSections
                                    ).indexOf(
                                        entry.target
                                    );


                                /*
                                   There are four
                                   major form sections.
                                */

                                if (
                                    progressSteps[index]
                                ) {

                                    progressSteps
                                        .forEach(
                                            step =>
                                                step.classList.remove(
                                                    "active"
                                                )
                                        );


                                    progressSteps[
                                        index
                                    ].classList.add(
                                        "active"
                                    );

                                }

                            }

                        }
                    );

                },
                {
                    threshold: 0.35
                }
            );


        formSections.forEach(
            section =>
                observer.observe(section)
        );

    }


    /* =====================================================
       UPLOAD ZONE VISUAL STATE
    ===================================================== */

    const style =
        document.createElement("style");


    style.textContent = `

        .upload-zone.has-file {

            border-color:
                rgba(215,168,91,0.38);

            background:
                rgba(215,168,91,0.035);

        }


        .upload-zone.dragging {

            border-color:
                rgba(215,168,91,0.65);

            background:
                rgba(215,168,91,0.075);

            transform:
                translateY(-2px);

        }


        .submit-preserve-btn:disabled {

            cursor:
                not-allowed;

        }

    `;


    document.head.appendChild(style);


    /* =====================================================
       INITIAL PREVIEW
    ===================================================== */

    updateLocationPreview();


    if (previewTitle) {

        previewTitle.textContent =
            titleInput?.value.trim() ||
            "Your story title";

    }


    if (previewDescription) {

        previewDescription.textContent =
            descriptionInput?.value.trim() ||
            "Your story description will appear here as you add it.";

    }


    if (previewLanguage) {

        previewLanguage.textContent =
            languageInput?.value.trim() ||
            "Language";

    }


    /* =====================================================
       CONSOLE
    ===================================================== */

    console.log(
        "PARAMPARA Preserve System initialized."
    );

});
}

