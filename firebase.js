import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDibgzp64G1QB7Pma-7Zx4yMAV06go8cNU",
  authDomain: "intube-61cca.firebaseapp.com",
  projectId: "intube-61cca",
  storageBucket: "intube-61cca.firebasestorage.app",
  messagingSenderId: "627409965607",
  appId: "1:627409965607:web:a1d71800d812fe668b7402"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
