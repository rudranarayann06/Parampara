// PARAMPARA Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCSLWMA7vBLF-pjRtletWB2ZD9ITUJbqd8",
    authDomain: "parampara-27428.firebaseapp.com",
    projectId: "parampara-27428",
    storageBucket: "parampara-27428.firebasestorage.app",
    messagingSenderId: "398125212245",
    appId: "1:398125212245:web:379cb5e6feaa02bb19eadc",
    measurementId: "G-5Y0L50WVE2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
