// =========================================================
// PARAMPARA AUTHENTICATION
// PHASE 2 — FIREBASE AUTH
// =========================================================

import {
    auth,
    db
} from "./firebase-config.js";


import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// AUTH VIEWS
// =========================================================

const authTabs =
    document.querySelectorAll(".auth-tab");


const authViews = {

    login:
        document.getElementById("loginView"),

    register:
        document.getElementById("registerView"),

    forgot:
        document.getElementById("forgotView")

};


function showAuthView(view) {

    Object.values(authViews).forEach(section => {

        if (section) {
            section.classList.remove("active");
        }

    });


    authTabs.forEach(tab => {

        tab.classList.remove("active");

        if (tab.dataset.view === view) {

            tab.classList.add("active");

        }

    });


    if (authViews[view]) {

        authViews[view].classList.add("active");

    }

}


// =========================================================
// AUTH TABS
// =========================================================

authTabs.forEach(tab => {

    tab.addEventListener("click", () => {

        showAuthView(tab.dataset.view);

    });

});


// =========================================================
// SWITCH LOGIN / REGISTER
// =========================================================

document.querySelectorAll("[data-switch]")
    .forEach(button => {

        button.addEventListener("click", () => {

            showAuthView(
                button.dataset.switch
            );

        });

    });


// =========================================================
// FORGOT PASSWORD VIEW
// =========================================================

const forgotFromLogin =
    document.getElementById("forgotFromLogin");


const backToLogin =
    document.getElementById("backToLogin");


if (forgotFromLogin) {

    forgotFromLogin.addEventListener(
        "click",
        () => showAuthView("forgot")
    );

}


if (backToLogin) {

    backToLogin.addEventListener(
        "click",
        () => showAuthView("login")
    );

}


// =========================================================
// PASSWORD VISIBILITY
// =========================================================

document
    .querySelectorAll(".password-toggle")
    .forEach(button => {

        button.addEventListener("click", () => {

            const target =
                document.getElementById(
                    button.dataset.target
                );


            const icon =
                button.querySelector("i");


            if (target.type === "password") {

                target.type = "text";

                icon.classList.remove(
                    "fa-eye"
                );

                icon.classList.add(
                    "fa-eye-slash"
                );

            }

            else {

                target.type = "password";

                icon.classList.remove(
                    "fa-eye-slash"
                );

                icon.classList.add(
                    "fa-eye"
                );

            }

        });

    });


// =========================================================
// MESSAGE FUNCTION
// =========================================================

function showMessage(
    element,
    message,
    type
) {

    if (!element) return;


    element.textContent = message;


    element.className =
        "auth-message show " + type;

}


// =========================================================
// FIREBASE ERROR TRANSLATION
// =========================================================

function getFirebaseErrorMessage(error) {

    switch (error.code) {

        case "auth/invalid-email":

            return "Please enter a valid email address.";

        case "auth/email-already-in-use":

            return "An account with this email already exists.";

        case "auth/weak-password":

            return "Password should be at least 6 characters.";

        case "auth/invalid-credential":

        case "auth/wrong-password":

        case "auth/user-not-found":

            return "Incorrect email or password.";

        case "auth/too-many-requests":

            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":

            return "Network error. Please check your internet connection.";

        default:

            console.error(error);

            return "Something went wrong. Please try again.";

    }

}


// =========================================================
// REGISTER
// =========================================================

const registerForm =
    document.getElementById("registerForm");


const registerMessage =
    document.getElementById("registerMessage");


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const name =
                document
                    .getElementById("registerName")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("registerEmail")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("registerPassword")
                    .value;


            const role =
                document
                    .getElementById("registerRole")
                    .value;


            // ---------------------------------------------
            // Validation
            // ---------------------------------------------

            if (
                !name ||
                !email ||
                !password ||
                !role
            ) {

                showMessage(
                    registerMessage,
                    "Please complete all required fields.",
                    "error"
                );

                return;

            }


            if (password.length < 6) {

                showMessage(
                    registerMessage,
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;

            }


            try {

                // -----------------------------------------
                // CREATE FIREBASE AUTH USER
                // -----------------------------------------

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // -----------------------------------------
                // SEND EMAIL VERIFICATION
                // -----------------------------------------

                await sendEmailVerification(user);


                // -----------------------------------------
                // ROLE LOGIC
                // -----------------------------------------

                /*
                    IMPORTANT:

                    The selected role is stored as
                    requestedRole.

                    For now every new account receives
                    the safe default role "community".

                    Elevated roles will later require
                    approval.
                */

                let assignedRole = "community";


                // -----------------------------------------
                // CREATE FIRESTORE USER PROFILE
                // -----------------------------------------

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {

                        uid: user.uid,

                        name: name,

                        email: user.email,

                        role: assignedRole,

                        requestedRole: role,

                        provider: "password",

                        emailVerified:
                            user.emailVerified,

                        status: "active",

                        createdAt:
                            serverTimestamp()

                    }
                );


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    registerMessage,

                    "Account created successfully! Please check your email and verify your account.",

                    "success"
                );


                registerForm.reset();


                console.log(
                    "PARAMPARA user created:",
                    user.uid
                );


            }

            catch (error) {

                showMessage(
                    registerMessage,
                    getFirebaseErrorMessage(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// LOGIN
// =========================================================

const loginForm =
    document.getElementById("loginForm");


const loginMessage =
    document.getElementById("loginMessage");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            if (!email || !password) {

                showMessage(
                    loginMessage,
                    "Please enter your email and password.",
                    "error"
                );

                return;

            }


            try {

                // -----------------------------------------
                // FIREBASE LOGIN
                // -----------------------------------------

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // -----------------------------------------
                // EMAIL VERIFICATION CHECK
                // -----------------------------------------

                if (!user.emailVerified) {

                    showMessage(
                        loginMessage,

                        "Please verify your email before continuing. Check your inbox.",

                        "error"
                    );

                    return;

                }


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    loginMessage,

                    "Login successful. Redirecting...",

                    "success"
                );


                console.log(
                    "Logged in user:",
                    user.uid
                );


                // -----------------------------------------
                // TEMPORARY REDIRECT
                // -----------------------------------------

                setTimeout(() => {

                    window.location.href =
                        "index.html";

                }, 1200);


            }

            catch (error) {

                showMessage(
                    loginMessage,
                    getFirebaseErrorMessage(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// AUTH STATE LISTENER
// =========================================================

onAuthStateChanged(
    auth,
    user => {

        if (user) {

            console.log(
                "Authenticated:",
                user.email
            );

        }

        else {

            console.log(
                "No authenticated user."
            );

        }

    }
);