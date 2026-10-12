// -------------------------------------
// InstaPro Firebase Configuration
// -------------------------------------

import {
  initializeApp,
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDibgzp64G1QB7Pma-7Zx4yMAV06go8cNU",
  authDomain: "intube-61cca.firebaseapp.com",
  projectId: "intube-61cca",
  messagingSenderId: "627409965607",
  appId: "1:627409965607:web:a1d71800d812fe668b7402"
};

// Initialize Firebase only once
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Export Firebase app
export { app };

console.log("InstaPro Firebase initialized successfully.");
