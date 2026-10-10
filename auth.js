// auth.js - REAL REGISTRATION - 0 SE START
import { db } from "./firebase.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();

// Registration
window.registerUser = async () => {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const name = document.getElementById("regName").value;
  if(!email ||!pass ||!name) return alert("Sab bharo!");

  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  // Firestore me user ko 0 se create karo - NO FAKE DATA
  await setDoc(doc(db, "users", cred.user.uid), {
    name: name,
    email: email,
    bio: "",
    avatar: "",
    posts: 0,
    followers: 0,
    following: 0,
    createdAt: serverTimestamp()
  });
  alert("✅ Account ban gaya - Ab sab 0 se start hoga!");
  location.href = "index.html";
}

// Login
window.loginUser = async () => {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  await signInWithEmailAndPassword(auth, email, pass);
  location.href = "index.html";
}

// Check - Agar login nahi hai to auth.html pe bhejo
onAuthStateChanged(auth, (user)=>{
  if(!user &&!location.href.includes("auth.html")){
    location.href = "auth.html";
  }
  if(user && location.href.includes("auth.html")){
    location.href = "index.html";
  }
  // Real user ka naam dikhao
  if(user){
    const el = document.getElementById("realUserName");
    if(el) el.innerText = user.email.split("@")[0];
  }
}
