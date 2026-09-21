/* =========================================================
   PARAMPARA — PRESERVE PAGE
   Authentication Protection
========================================================= */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "../firebase-config.js";


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


    function setupFileInput(inputId, outputId, type) {

        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);

        if (!input || !output) {
            console.warn(`Missing file input: ${inputId}`);
            return;
        }

        input.addEventListener("change", () => {

            const files = Array.from(input.files || []);

            if (!files.length) {
                output.textContent = "No file selected";
                return;
            }

            const file = files[0];

            output.textContent = `✓ ${file.name}`;
            if (type === "audio") {

                const zone =
                    input.closest(".upload-zone");

                if (zone) {

                    let preview =
                        zone.querySelector(
                            "audio.audio-preview"
                        );

                    if (!preview) {

                        preview =
                            document.createElement("audio");

                        preview.className =
                            "audio-preview";

                        preview.controls = true;

                        preview.preload = "metadata";

                        preview.style.display = "block";

                        preview.style.width = "100%";

                        preview.style.marginTop = "12px";

                        zone.appendChild(preview);
                    }

                    if (preview.dataset.objectUrl) {

                        URL.revokeObjectURL(
                            preview.dataset.objectUrl
                        );
                    }

                    const objectUrl =
                        URL.createObjectURL(file);

                    preview.dataset.objectUrl =
                        objectUrl;

                    preview.src = objectUrl;

                    preview.load();
                }
            }

            const zone = input.closest(".upload-zone");

            if (zone) {
                zone.classList.add("has-file");
            }

            console.log("Audio selected:", {
                name: file.name,
                type: file.type,
                size: file.size
            });
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

                console.log("🔥 PRESERVE FORM SUBMITTED");


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


                /* Send contribution to Flask backend */

                submitContribution()
                    .then(result => {

                        console.log(
                            "Recording successfully preserved:",
                            result
                        );

                        setLoadingState(false);

                        showBackendSuccess(result);

                    })
                    .catch(error => {

                        console.error(
                            "Contribution submission failed:",
                            error
                        );

                        setLoadingState(false);

                        let errorMessage = "Unknown error";

                        if (error instanceof Error) {

                            errorMessage =
                                error.message;

                        } else if (
                            typeof error === "string"
                        ) {

                            errorMessage =
                                error;

                        } else if (
                            error &&
                            typeof error === "object"
                        ) {

                            errorMessage =
                                error.error ||
                                error.message ||
                                error.detail ||
                                JSON.stringify(error);

                        }

                        alert(
                            "Could not preserve your story.\n\n" +
                            errorMessage
                        );
                    });

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

} function showBackendSuccess(result) {

    console.log(
        "Recording successfully preserved:",
        result.recording_id
    );

    const recordingId =
        document.getElementById("resultRecordingId");

    const hash =
        document.getElementById("resultHash");

    if (recordingId) {
        recordingId.textContent =
            `#${result.recording_id}`;
    }

    if (hash) {
        hash.textContent =
            result.audio_hash || "—";
    }

    // Open success modal
    const successModal =
        document.getElementById("successModal");

    if (successModal) {

        successModal.classList.add("show");

        successModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";

    } else {

        console.error(
            "Success modal not found in HTML."
        );

    }
}

async function submitContribution() {
    console.log("🚀 submitContribution() started");
    const audioInput =
        document.getElementById("audioUpload");

    const titleInput =
        document.getElementById("storyTitle");

    const descriptionInput =
        document.getElementById("storyDescription");

    const languageInput =
        document.getElementById("language");

    const accessLevelInput =
        document.getElementById("accessLevel");

    const stateInput =
        document.getElementById("state");

    const districtInput =
        document.getElementById("district");

    const locationInput =
        document.getElementById("location");

    const communityInput =
        document.getElementById("community");

    const categoryInput =
        document.getElementById("traditionCategory");

    const consentDeclaration =
        document.getElementById("consentDeclaration");

    const accuracyDeclaration =
        document.getElementById("accuracyDeclaration");


    /* =========================================
       AUDIO
    ========================================= */

    if (!audioInput || !audioInput.files.length) {

        throw new Error(
            "Please upload an audio recording."
        );

    }


    const audioFile =
        audioInput.files[0];
    console.log(
        "🎙️ AUDIO FILE:",
        audioFile.name,
        audioFile.type,
        audioFile.size
    );


    /* =========================================
       FORM VALUES
    ========================================= */

    const title =
        titleInput?.value.trim() || "";

    const description =
        descriptionInput?.value.trim() || "";

    const language =
        languageInput?.value.trim() || "";

    const accessLevel =
        accessLevelInput?.value || "RESTRICTED";


    /* =========================================
       CREATE FORM DATA
    ========================================= */

    const formData =
        new FormData();


    formData.append(
        "audio",
        audioFile
    );


    formData.append(
        "title",
        title
    );


    formData.append(
        "description",
        description
    );


    formData.append(
        "language",
        language
    );


    formData.append(
        "access_level",
        accessLevel
    );


    /* =========================================
       ADDITIONAL HERITAGE METADATA
    ========================================= */

    formData.append(
        "state",
        stateInput?.value.trim() || ""
    );


    formData.append(
        "district",
        districtInput?.value.trim() || ""
    );


    formData.append(
        "location",
        locationInput?.value.trim() || ""
    );


    formData.append(
        "community",
        communityInput?.value.trim() || ""
    );


    formData.append(
        "category",
        categoryInput?.value || ""
    );


    /* =========================================
       CONSENT
    ========================================= */
    formData.append(
        "archive_allowed",
        document.getElementById("archiveAllowed")?.checked
            ? "true"
            : "false"
    );

    formData.append(
        "transcription_allowed",
        document.getElementById("transcriptionAllowed")?.checked
            ? "true"
            : "false"
    );

    formData.append(
        "translation_allowed",
        document.getElementById("translationAllowed")?.checked
            ? "true"
            : "false"
    );

    formData.append(
        "research_allowed",
        document.getElementById("researchAllowed")?.checked
            ? "true"
            : "false"
    );


    formData.append(
        "public_access_allowed",
        accessLevel === "PUBLIC"
            ? "true"
            : "false"
    );


    formData.append(
        "commercial_use_allowed",
        "false"
    );


    formData.append(
        "ai_processing_allowed",
        "true"
    );


    formData.append(
        "ai_training_allowed",
        "false"
    );


    /* =========================================
       SEND TO FLASK
    ========================================= */
    console.log(
        "🌐 Sending request to Flask..."
    );
    const user = auth.currentUser;

    if (!user) {
        throw new Error(
            "Please sign in before preserving a story."
        );
    }

    const token = await user.getIdToken();
    const response =
        await fetch(
            `${API_BASE}/api/recordings`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            }
        );
    console.log(
        "🌐 Flask response:",
        response.status
    );


    const result =
        await response.json();


    console.log(
        "PARAMPARA BACKEND RESPONSE:",
        result
    );


    /* =========================================
       ERROR HANDLING
    ========================================= */

    if (!response.ok) {

        throw new Error(
            result.error ||
            result.message ||
            "Server rejected the contribution."
        );

    }

    return result;

}

