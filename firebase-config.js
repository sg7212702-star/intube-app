import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "intube-61cca.firebaseapp.com",
  projectId: "intube-61cca",
  storageBucket: "intube-61cca.firebasestorage.app",
  messagingSenderId: "627409965607",
  appId: "1:627409965607:web:a1d71800d812fe668b7402"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
