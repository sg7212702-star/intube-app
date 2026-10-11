import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let authInitialized = false;

// Firebase user profile create/update
async function saveUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  const profile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Insta Pro User",
    email: user.email || "",
    avatar: user.photoURL || "",
    updatedAt: serverTimestamp()
  };

  if (!userSnap.exists()) {
    profile.bio = "";
    profile.posts = 0;
    profile.followers = 0;
    profile.following = 0;
    profile.createdAt = serverTimestamp();

    await setDoc(userRef, profile);
  } else {
    await setDoc(userRef, profile, { merge: true });
  }
}

// Email/password registration
window.registerUser = async function () {
  try {
    const name =
      $("regName")?.value?.trim() ||
      $("signupName")?.value?.trim() ||
      "";

    const email =
      $("regEmail")?.value?.trim() ||
      $("signupEmail")?.value?.trim() ||
      "";

    const password =
      $("regPass")?.value ||
      $("signupPass")?.value ||
      "";

    if (!email || !password) {
      alert("Email aur password bhariye.");
      return;
    }

    if (password.length < 6) {
      alert("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await saveUserProfile(credential.user);

    alert("Insta Pro account ban gaya!");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Registration error:", error);
    alert(error.message);
  }
};

// Email/password login
window.loginUser = async function () {
  try {
    const email =
      $("logEmail")?.value?.trim() ||
      $("loginEmail")?.value?.trim() ||
      "";

    const password =
      $("logPass")?.value ||
      $("loginPass")?.value ||
      "";

    if (!email || !password) {
      alert("Email aur password bhariye.");
      return;
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await saveUserProfile(credential.user);

    window.location.href = "index.html";
  } catch (error) {
    console.error("Login error:", error);
    alert(error.message);
  }
};

// Logout
window.logoutUser = async function () {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert(error.message);
  }
};

// Authentication state
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname;

  const isLoginPage =
    currentPage.endsWith("/login.html") ||
    currentPage.endsWith("login.html");

  if (!user && !isLoginPage) {
    window.location.replace("login.html");
    return;
  }

  if (user && isLoginPage) {
    window.location.replace("index.html");
    return;
  }

  if (user) {
    try {
      await saveUserProfile(user);
    } catch (error) {
      console.error("Profile sync error:", error);
    }
  }

  authInitialized = true;

  window.dispatchEvent(
    new CustomEvent("instapro-auth-ready", {
      detail: { user }
    })
  );
});

window.getInstaProAuthStatus = () => authInitialized;
