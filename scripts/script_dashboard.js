import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const profileRequestedRole =
    document.getElementById(
        "profileRequestedRole"
    );
profileRole.textContent =
    formatRole(role);
profileRequestedRole.textContent =
    formatRole(
        data.requestedRole || role
    );
profileStatus.textContent =
    formatStatus(status);
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

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================================================
// AUTHENTICATION GUARD
// =========================================================

onAuthStateChanged(
    auth,
    async user => {

        // No user logged in

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        console.log(
            "Authenticated user:",
            user.uid
        );


        try {

            // =============================================
            // GET USER PROFILE
            // =============================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(userRef);


            if (!userSnapshot.exists()) {

                console.error(
                    "User profile not found."
                );

                return;

            }


            const data =
                userSnapshot.data();


            // =============================================
            // DISPLAY USER INFORMATION
            // =============================================

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


            userName.textContent =
                name;


            userNameNav.textContent =
                name;


            profileName.textContent =
                name;


            profileEmail.textContent =
                data.email ||
                user.email ||
                "—";


            profileRole.textContent =
                formatRole(role);


            profileStatus.textContent =
                formatStatus(status);


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
// FORMAT ROLE
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
// FORMAT STATUS
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


    return statuses[status] || status;

}


// =========================================================
// LOGOUT
// =========================================================

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
const rolePendingNotice =
    document.getElementById(
        "rolePendingNotice"
    );
profileStatus.textContent =
    formatStatus(status);
if (
    status === "pending" &&
    data.requestedRole !== "community" &&
    data.requestedRole !== "student"
) {

    rolePendingNotice.style.display =
        "flex";

}
async function redirectUserByRole(user) {

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );

    const snapshot =
        await getDoc(userRef);


    if (!snapshot.exists()) {

        window.location.href =
            "dashboard.html";

        return;

    }


    const data =
        snapshot.data();


    const role =
        data.role || "community";


    const status =
        data.status || "active";


    // ------------------------------------------
    // PENDING ELEVATED ROLE
    // ------------------------------------------

    if (status === "pending") {

        window.location.href =
            "dashboard.html";

        return;

    }


    // ------------------------------------------
    // ROLE ROUTING
    // ------------------------------------------

    switch (role) {

        case "community":

            window.location.href =
                "dashboard.html";

            break;


        case "student":

            window.location.href =
                "student.html";

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


        default:

            window.location.href =
                "dashboard.html";

    }

}
showMessage(
    loginMessage,
    "Login successful! Redirecting...",
    "success"
);
setTimeout(async () => {

    await redirectUserByRole(user);

}, 1000);
showMessage(
    loginMessage,
    "Google login successful! Redirecting...",
    "success"
);
setTimeout(async () => {

    await redirectUserByRole(user);

}, 1000);

const pendingRoleText =
    document.getElementById("pendingRoleText");
const data = userSnapshot.data();

const role = data.role || "community";

const status = data.status || "active";
if (
    pendingRoleText &&
    data.requestedRole
) {

    pendingRoleText.textContent =
        `Requested role: ${formatRole(data.requestedRole)}`;

}