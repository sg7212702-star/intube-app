import { firebaseConfig } from "./firebase.js";

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const db = getFirestore(app);

const CLOUD_NAME = "kujnbe0a";
const UPLOAD_PRESET = "intube_free";

const $ = id => document.getElementById(id);

let currentType = "post";
let isUploading = false;

async function uploadToCloudinary(file) {
  if (!file) {
    throw new Error("पहले फोटो या वीडियो चुनें।");
  }

  if (!file.type.startsWith("image/") &&
      !file.type.startsWith("video/")) {
    throw new Error("केवल फोटो या वीडियो अपलोड करें।");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const resourceType = file.type.startsWith("video/")
    ? "video"
    : "image";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Cloudinary अपलोड विफल हुआ।"
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type
  };
}

function showStatus(message) {
  const status = $("upStatus");

  if (status) {
    status.textContent = message;
    status.style.display = "block";
  }
}

function closeUploadSheet() {
  const sheet = $("createSheet");
  const overlay = $("overlay");
  const status = $("upStatus");

  if (sheet) sheet.style.display = "none";
  if (overlay) overlay.style.display = "none";
  if (status) status.style.display = "none";
}

async function createPost(file) {
  const myId = localStorage.getItem("my_user_id");

  if (!myId) {
    throw new Error("यूज़र ID नहीं मिली। पेज रिफ्रेश करें।");
  }

  showStatus("मीडिया Cloudinary पर अपलोड हो रहा है...");

  const media = await uploadToCloudinary(file);

  showStatus("पोस्ट Firestore में सेव हो रही है...");

  await addDoc(collection(db, "posts"), {

    publicId: media.publicId,
    resourceType: media.resourceType,
    type: currentType,
    mediaType: file.type.startsWith("video/")
      ? "video"
      : "image",
    userId: myId,
    caption: "",
    likes: [],
    likesCount: 0,
    comments: [],
    time: Date.now(),
    createdAt: serverTimestamp()
  });

  showStatus("पोस्ट सफलतापूर्वक अपलोड हो गई! ✅");

  const fileInput = $("fileInput");
  if (fileInput) fileInput.value = "";

  setTimeout(closeUploadSheet, 900);
}

function initializeUploadSystem() {
  const fileInput = $("fileInput");
  const postOption = $("optPost");
  const reelOption = $("optReel");

  if (!fileInput || !postOption || !reelOption) {
    console.error("Upload के लिए HTML elements नहीं मिले।");
    return;
  }

  postOption.addEventListener("click", () => {
    currentType = "post";
    fileInput.accept = "image/*,video/*";
    fileInput.click();
  });

  reelOption.addEventListener("click", () => {
    currentType = "reel";
    fileInput.accept = "video/*";
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];

    if (!file || isUploading) return;

    isUploading = true;

    try {
      await createPost(file);
    } catch (error) {
      console.error("Upload error:", error);
      showStatus("अपलोड विफल: " + error.message);
      alert("Upload Error: " + error.message);
    } finally {
      isUploading = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeUploadSystem
  );
} else {
  initializeUploadSystem();
}
