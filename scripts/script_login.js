async function redirectUserByRole(user) {

    const userRef =
        doc(db, "users", user.uid);

    const userSnapshot =
        await getDoc(userRef);

    if (!userSnapshot.exists()) {

        console.error(
            "User profile not found."
        );

        window.location.href =
            "dashboard.html";

        return;

    }

    const userData =
        userSnapshot.data();

    const role =
        userData.role || "community";


    switch (role) {

        case "community":

            window.location.href =
                "dashboard.html";

            break;


        case "researcher":

            window.location.href =
                "researcher.html";

            break;


        case "linguist":

            window.location.href =
                "linguist.html";

            break;


        case "archaeologist":

            window.location.href =
                "archaeologist.html";

            break;


        case "archivist":

            window.location.href =
                "archivist.html";

            break;


        case "institution":

            window.location.href =
                "institution.html";

            break;


        case "student":

            window.location.href =
                "student.html";

            break;


        default:

            window.location.href =
                "dashboard.html";

    }

}
// =========================================================
// PARAMPARA AUTHENTICATION
// Firebase Authentication
// =========================================================

import {
    auth,
    db
} from "../firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
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
// GOOGLE PROVIDER
// =========================================================

const googleProvider = new GoogleAuthProvider();


// =========================================================
// AUTH VIEWS
// =========================================================

const authTabs =
    document.querySelectorAll(".auth-tab");

const authViews = {

    login: document.getElementById("loginView"),

    register: document.getElementById("registerView"),

    forgot: document.getElementById("forgotView")

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

document
    .querySelectorAll("[data-switch]")
    .forEach(button => {

        button.addEventListener("click", () => {

            showAuthView(button.dataset.switch);

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

    forgotFromLogin.addEventListener("click", () => {

        showAuthView("forgot");

    });

}


if (backToLogin) {

    backToLogin.addEventListener("click", () => {

        showAuthView("login");

    });

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

                icon.classList.remove("fa-eye");

                icon.classList.add("fa-eye-slash");

            } else {

                target.type = "password";

                icon.classList.remove("fa-eye-slash");

                icon.classList.add("fa-eye");

            }

        });

    });


// =========================================================
// MESSAGE
// =========================================================

function showMessage(
    element,
    message,
    type
) {

    if (!element) return;

    element.textContent = message;

    element.className =
        `auth-message show ${type}`;

}


// =========================================================
// FIREBASE ERROR HANDLING
// =========================================================

function firebaseError(error) {

    console.error(
        "Firebase Error:",
        error.code,
        error.message
    );


    switch (error.code) {

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/user-not-found":
            return "No account exists with this email.";

        case "auth/wrong-password":
            return "Incorrect password.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/email-already-in-use":
            return "An account with this email already exists.";

        case "auth/weak-password":
            return "Password must contain at least 6 characters.";

        case "auth/popup-closed-by-user":
            return "Google sign-in was cancelled.";

        case "auth/popup-blocked":
            return "Your browser blocked the Google login popup.";

        case "auth/cancelled-popup-request":
            return "Google login was cancelled.";

        case "auth/operation-not-allowed":
            return "This login method is not enabled in Firebase.";

        case "auth/unauthorized-domain":
            return "This website domain is not authorized in Firebase.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        default:
            return error.message || "Authentication failed.";

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


            const requestedRole =
                document
                    .getElementById("registerRole")
                    .value;


            if (
                !name ||
                !email ||
                !password ||
                !requestedRole
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

                // Create Firebase Auth account

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    credential.user;


                // Send verification email

                await sendEmailVerification(user);


                // IMPORTANT:
                // Everyone starts as community.
                // Elevated roles require approval.

                const immediateRoles = [
                    "community",
                    "student"
                ];

                const assignedRole =
                    immediateRoles.includes(requestedRole)
                        ? requestedRole
                        : "community";


                const accountStatus =
                    immediateRoles.includes(requestedRole)
                        ? "active"
                        : "pending";


                // Create Firestore profile

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

                        requestedRole:
                            requestedRole,

                        provider: "password",

                        emailVerified:
                            user.emailVerified,

                        status: accountStatus,

                        createdAt:
                            serverTimestamp()

                    }
                );


                showMessage(
                    registerMessage,

                    "Account created! Check your email to verify your account.",

                    "success"
                );


                registerForm.reset();


            }

            catch (error) {

                showMessage(
                    registerMessage,
                    firebaseError(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// EMAIL LOGIN
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

                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    credential.user;


                // Require verification

                if (!user.emailVerified) {

                    showMessage(
                        loginMessage,

                        "Please verify your email before logging in. Check your inbox.",

                        "error"
                    );

                    return;

                }


                showMessage(
                    loginMessage,
                    "Login successful! Redirecting...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 1000);


            }

            catch (error) {

                showMessage(
                    loginMessage,
                    firebaseError(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// GOOGLE LOGIN
// =========================================================

const googleLogin =
    document.getElementById("googleLogin");


if (googleLogin) {

    googleLogin.addEventListener(
        "click",
        async () => {

            try {

                // REAL GOOGLE LOGIN

                const result =
                    await signInWithPopup(
                        auth,
                        googleProvider
                    );


                const user =
                    result.user;


                // Store/update profile

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {

                        uid: user.uid,

                        name:
                            user.displayName || "PARAMPARA User",

                        email:
                            user.email,

                        photoURL:
                            user.photoURL || "",

                        role:
                            "community",

                        requestedRole:
                            "community",

                        provider:
                            "google",

                        emailVerified:
                            user.emailVerified,

                        status:
                            "active",

                        lastLogin:
                            serverTimestamp(),

                        createdAt:
                            serverTimestamp()

                    },

                    {
                        merge: true
                    }
                );


                showMessage(
                    loginMessage,
                    "Google login successful! Redirecting...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 1000);


            }

            catch (error) {

                showMessage(
                    loginMessage,
                    firebaseError(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// FORGOT PASSWORD
// =========================================================

const forgotForm =
    document.getElementById("forgotForm");

const forgotMessage =
    document.getElementById("forgotMessage");


if (forgotForm) {

    forgotForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document
                    .getElementById("forgotEmail")
                    .value
                    .trim();


            if (!email) {

                showMessage(
                    forgotMessage,
                    "Please enter your email.",
                    "error"
                );

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                showMessage(

                    forgotMessage,

                    "Password reset email sent. Please check your inbox.",

                    "success"

                );


                forgotForm.reset();


            }

            catch (error) {

                showMessage(
                    forgotMessage,
                    firebaseError(error),
                    "error"
                );

            }

        }
    );

}


// =========================================================
// AUTH STATE
// =========================================================

onAuthStateChanged(
    auth,
    user => {

        if (user) {

            console.log(
                "Currently authenticated:",
                user.email
            );

        } else {

            console.log(
                "No authenticated user."
            );

        }

    }
);