// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// FIREBASE CONFIGURATION
// =========================================================

const firebaseConfig = {

    apiKey: "AIzaSyCSLWMA7vBLF-pjRtletWB2ZD9ITUJbqd8",

    authDomain: "parampara-27428.firebaseapp.com",

    projectId: "parampara-27428",

    storageBucket: "parampara-27428.firebasestorage.app",

    messagingSenderId: "398125212245",

    appId: "1:398125212245:web:379cb5e6feaa02bb19eadc",

    measurementId: "G-5Y0L50WVE2"

};


// =========================================================
// INITIALIZE FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);


// =========================================================
// FIREBASE ANALYTICS
// =========================================================

const analytics = getAnalytics(app);


// =========================================================
// FIREBASE AUTHENTICATION
// =========================================================

const auth = getAuth(app);


// =========================================================
// FIRESTORE DATABASE
// =========================================================

const db = getFirestore(app);


// =========================================================
// EXPORT
// =========================================================

export {
    app,
    analytics,
    auth,
    db
};