// FINAL FIREBASE.JS - Aapka intube-61cca Project - Real-Time
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Aapka Config - intube-61cca
const firebaseConfig = {
  apiKey: "AIzaSyDibgzp64G1QB7Pma-7Zx4yMAV06go8cNU",
  authDomain: "intube-61cca.firebaseapp.com",
  projectId: "intube-61cca",
  storageBucket: "intube-61cca.firebasestorage.app",
  messagingSenderId: "627409965607",
  appId: "1:627409965607:web:a1d71800d812fe668b7402"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

console.log("Firebase intube-61cca Real-Time Connected ✅");
