import {
    auth,
    db
} from "../firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// ELEMENTS
// =========================================================

const userName =
    document.getElementById("userName");

const userNameNav =
    document.getElementById("userNameNav");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const profileRole =
    document.getElementById("profileRole");

const profileStatus =
    document.getElementById("profileStatus");

const profileRequestedRole =
    document.getElementById("profileRequestedRole");

const rolePendingNotice =
    document.getElementById("rolePendingNotice");

const pendingRoleText =
    document.getElementById("pendingRoleText");

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================================================
// ROLE FORMATTER
// =========================================================

function formatRole(role) {

    const roles = {

        community:
            "Community Member",

        researcher:
            "Researcher",

        linguist:
            "Linguist",

        archaeologist:
            "Archaeologist",

        archivist:
            "Archivist",

        institution:
            "Institution",

        student:
            "Student"

    };

    return roles[role] || "Community Member";
}


// =========================================================
// STATUS FORMATTER
// =========================================================

function formatStatus(status) {

    const statuses = {

        active:
            "Active",

        pending:
            "Pending Approval",

        approved:
            "Approved",

        suspended:
            "Suspended"

    };

    return statuses[status] || status || "Active";
}


// =========================================================
// LOAD USER
// =========================================================

onAuthStateChanged(
    auth,
    async user => {

        // ---------------------------------------------
        // Not authenticated
        // ---------------------------------------------

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        console.log(
            "Authenticated user:",
            user.email
        );


        try {

            // -----------------------------------------
            // Firestore user profile
            // -----------------------------------------

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const snapshot =
                await getDoc(userRef);


            if (!snapshot.exists()) {

                console.error(
                    "User profile not found."
                );

                return;
            }


            const data =
                snapshot.data();


            const name =
                data.name ||
                user.displayName ||
                "PARAMPARA User";


            const role =
                data.role ||
                "community";


            const status =
                data.status ||
                "active";


            const requestedRole =
                data.requestedRole ||
                role;


            // -----------------------------------------
            // Update UI
            // -----------------------------------------

            if (userName) {

                userName.textContent =
                    name;

            }


            if (userNameNav) {

                userNameNav.textContent =
                    name;

            }


            if (profileName) {

                profileName.textContent =
                    name;

            }


            if (profileEmail) {

                profileEmail.textContent =
                    data.email ||
                    user.email ||
                    "—";

            }


            if (profileRole) {

                profileRole.textContent =
                    formatRole(role);

            }


            if (profileStatus) {

                profileStatus.textContent =
                    formatStatus(status);

            }


            if (profileRequestedRole) {

                profileRequestedRole.textContent =
                    formatRole(requestedRole);

            }


            // -----------------------------------------
            // Pending elevated role
            // -----------------------------------------

            if (
                rolePendingNotice &&
                status === "pending" &&
                requestedRole !== "community" &&
                requestedRole !== "student"
            ) {

                rolePendingNotice.style.display =
                    "flex";

            }


            if (
                pendingRoleText &&
                requestedRole
            ) {

                pendingRoleText.textContent =
                    `Requested role: ${formatRole(requestedRole)}`;

            }

        }
        catch (error) {

            console.error(
                "Error loading user profile:",
                error
            );

        }

    }
);


// =========================================================
// LOGOUT
// =========================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                window.location.href =
                    "index.html";

            }
            catch (error) {

                console.error(
                    "Logout failed:",
                    error
                );

            }

        }
    );

}