import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1234567890-REAL-KEY-YAHAN-DALO",
  authDomain: "intube-app.firebaseapp.com",
  projectId: "intube-app",
  storageBucket: "intube-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
