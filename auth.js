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

// Firebase user profile create/update.
// Preserve user-edited profile fields while normalizing fields used by Feed,
// Follow, Profile, Stories and Chat.
async function saveUserProfile(user) {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.exists() ? userSnap.data() : {};
  const fallbackName =
    user.displayName ||
    user.email?.split("@")[0] ||
    "InstaPro User";
  const fallbackUsername = (
    user.email?.split("@")[0] ||
    user.uid
  ).toLowerCase().replace(/[^a-z0-9._]/g, "");

  const profile = {
    uid: user.uid,
    email: user.email || existing.email || "",
    username: existing.username || fallbackUsername,
    name: existing.name || existing.displayName || fallbackName,
    displayName: existing.displayName || existing.name || fallbackName,
    photoURL: existing.photoURL || existing.photoUrl || existing.profilePic || existing.photo || existing.avatar || user.photoURL || "",
    photo: existing.profilePic || existing.photo || existing.photoURL || existing.photoUrl || existing.avatar || user.photoURL || "",
    avatar: existing.avatar || existing.profilePic || existing.photoURL || existing.photoUrl || existing.photo || user.photoURL || "",
    bio: typeof existing.bio === "string" ? existing.bio : "",
    // Follow logic requires arrays of UIDs, not numeric counters.
    followers: Array.isArray(existing.followers) ? existing.followers : [],
    following: Array.isArray(existing.following) ? existing.following : [],
    posts: Number.isFinite(Number(existing.posts)) ? Number(existing.posts) : 0,
    updatedAt: serverTimestamp()
  };

  if (!userSnap.exists()) {
    profile.createdAt = serverTimestamp();
  }

  // Keep legacy counters if an older version stored numbers instead of UID arrays.
  if (typeof existing.followers === "number") {
    profile.followersCount = existing.followers;
  } else if (Array.isArray(existing.followers)) {
    profile.followersCount = existing.followers.length;
  }
  if (typeof existing.following === "number") {
    profile.followingCount = existing.following;
  } else if (Array.isArray(existing.following)) {
    profile.followingCount = existing.following.length;
  }

  await setDoc(userRef, profile, { merge: true });
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
