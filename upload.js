// upload.js - InstaPro Firebase + Cloudinary Upload

import { auth, db, storage } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// -------------------------------------
// CONFIGURATION
// -------------------------------------

const CLOUDINARY_CLOUD_NAME = "kujnbe0a";
const CLOUDINARY_UPLOAD_PRESET = "intube_free";

const $ = (id) => document.getElementById(id);

let uploadInProgress = false;

// Prevent duplicate initialization if this module is imported twice.
if (!window.__instaProUploadInitialized) {
  window.__instaProUploadInitialized = true;
  initializeUploadSystem();
}

// -------------------------------------
// INITIALIZE BUTTONS AND INPUTS
// -------------------------------------

function initializeUploadSystem() {
  const postButton = $("optPost");
  const storyButton = $("optStory");

  postButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openGallery("postFile");
  });

  storyButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openGallery("storyFile");
  });

  connectFileInput("postFile", "post");
  connectFileInput("storyFile", "story");

  console.log("InstaPro upload system initialized.");
}

// -------------------------------------
// OPEN GALLERY
// -------------------------------------

function openGallery(inputId) {
  const input = $(inputId);

  if (!input) {
    alert(
      "File input nahi mila: " + inputId +
      "\nindex.html mein ID check karein."
    );
    console.error("Missing upload input:", inputId);
    return;
  }

  input.setAttribute("accept", "image/*,video/*");
  input.value = "";
  input.click();
}

// -------------------------------------
// CONNECT FILE INPUT
// -------------------------------------

function connectFileInput(inputId, type) {
  const input = $(inputId);

  if (!input) {
    console.error("Upload input nahi mila:", inputId);
    return;
  }

  // Avoid attaching this module's listener more than once.
  if (input.dataset.instaProUploadBound === "true") {
    return;
  }

  input.dataset.instaProUploadBound = "true";
  input.setAttribute("accept", "image/*,video/*");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];

    if (!file) return;

    try {
      await handleFile(file, type);
    } finally {
      input.value = "";
    }
  });
}

// -------------------------------------
// CLOUDINARY VIDEO UPLOAD
// -------------------------------------

async function uploadVideoToCloudinary(file, onProgress) {
  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("Cloudinary error:", result);

    throw new Error(
      result.error?.message ||
      "Cloudinary video upload fail ho gaya."
    );
  }

  if (typeof onProgress === "function") {
    onProgress(100);
  }

  if (!result.secure_url) {
    throw new Error("Cloudinary ne video URL nahi diya.");
  }

  return result.secure_url;
}

// -------------------------------------
// FIREBASE STORAGE PHOTO UPLOAD
// -------------------------------------

async function uploadPhotoToFirebase(file, onProgress) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const filePath =
    `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`;

  const fileRef = ref(storage, filePath);

  const task = uploadBytesResumable(fileRef, file, {
    contentType: file.type
  });

  const downloadURL = await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );

        if (typeof onProgress === "function") {
          onProgress(progress);
        }
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return downloadURL;
}

// -------------------------------------
// UPLOAD STATUS
// -------------------------------------

function showUploadStatus(message) {
  let status = $("instaProUploadStatus");

  if (!status) {
    status = document.createElement("div");
    status.id = "instaProUploadStatus";

    status.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      width: max-content;
      max-width: 85%;
      padding: 18px 24px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.92);
      color: white;
      font: 15px Arial, sans-serif;
      text-align: center;
      overflow-wrap: anywhere;
      box-shadow: 0 5px 25px rgba(0,0,0,.35);
    `;

    document.body.appendChild(status);
  }

  status.textContent = message;
  return status;
}

// -------------------------------------
// MAIN UPLOAD HANDLER
// -------------------------------------

async function handleFile(file, postType) {
  if (!file) return;

  if (uploadInProgress) {
    alert("Ek upload pehle se chal raha hai.");
    return;
  }

  const user = auth.currentUser;

  if (!user || user.isAnonymous) {
    alert("Pehle Google account se login karein.");
    return;
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) {
    alert("Sirf image ya video file select karein.");
    return;
  }

  if (file.size === 0) {
    alert("Selected file khaali hai.");
    return;
  }

  uploadInProgress = true;
  const status = showUploadStatus("Upload shuru ho raha hai...");

  try {
    status.textContent = isVideo
      ? "Cloudinary par video upload ho raha hai..."
      : "Cloudinary par photo upload ho rahi hai...";

    const result = await uploadToCloudinary(file, (progress) => {
      status.textContent =
        `${isVideo ? "Video" : "Photo"} upload ho rahi hai: ${progress}%`;
    });

    const mediaUrl =
      typeof result === "string" ? result : result?.secure_url;

    if (!mediaUrl) {
      throw new Error("Cloudinary se media URL nahi mila.");
    }

    status.textContent = "Firebase Firestore mein data save ho raha hai...";

    const data = {
      uid: user.uid,
      email: user.email || "",
      username:
        user.displayName ||
        user.email?.split("@")[0] ||
        "InstaPro User",
      photo: user.photoURL || "",
      imageUrl: mediaUrl,
      mediaUrl,
      type: isVideo ? "video" : "image",
      contentType: isVideo ? "video" : "image",
      caption: "",
      createdAt: serverTimestamp()
    };

    let savedDocument;

    if (postType === "story") {
      data.expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      savedDocument = await addDoc(
        collection(db, "stories"),
        data
      );
    } else {
      savedDocument = await addDoc(
        collection(db, "posts"),
        data
      );
    }

    status.textContent =
      postType === "story"
        ? "Story successfully upload ho gayi! ✅"
        : "Post successfully share ho gayi! ✅";

    window.dispatchEvent(
      new CustomEvent("instapro-upload-success", {
        detail: {
          id: savedDocument.id,
          type: postType,
          mediaType: isVideo ? "video" : "image",
          mediaUrl
        }
      })
    );

    console.log("InstaPro upload successful:", savedDocument.id);

    await new Promise((resolve) => setTimeout(resolve, 1000));

  } catch (error) {
    console.error("InstaPro upload error:", error);

    status.textContent =
      "Upload fail ho gaya: " +
      (error.message || "Unknown error");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    alert(
      "Upload fail ho gaya.\n\n" +
      (error.message || "Unknown error")
    );

  } finally {
    status.remove();
    uploadInProgress = false;
  }
                   }
