// upload.js - InstaPro Photo + Video Upload
import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let selectedType = "post";
let uploadInProgress = false;

// -------------------------------------
// OPEN FILE PICKER
// -------------------------------------

function openGallery(inputId, type) {
  const input = $(inputId);

  if (!input) {
    alert(
      "File input nahi mila: " +
      inputId +
      "\nindex.html mein is ID ko check karein."
    );
    console.error("Missing file input:", inputId);
    return;
  }

  selectedType = type;

  input.setAttribute("accept", "image/*,video/*");

  // Allow selecting the same file again
  input.value = "";

  // Open gallery
  input.click();
}

// -------------------------------------
// POST BUTTON
// -------------------------------------

$("optPost")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  openGallery("postFile", "post");
});

// -------------------------------------
// STORY BUTTON
// -------------------------------------

$("optStory")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  openGallery("storyFile", "story");
});

// -------------------------------------
// COMPRESS IMAGE
// -------------------------------------

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target.result;

      // Keep videos unchanged
      if (!file.type.startsWith("image/")) {
        resolve(result);
        return;
      }

      // Compress larger images
      if (result.length <= 900000) {
        resolve(result);
        return;
      }

      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");

          const maxSize = 1080;

          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(
              maxSize / width,
              maxSize / height
            );

            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Image compression failed."));
            return;
          }

          context.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Image read nahi ho payi."));
      };

      img.src = result;
    };

    reader.onerror = () => {
      reject(new Error("File read nahi ho payi."));
    };

    reader.readAsDataURL(file);
  });
}

// -------------------------------------
// UPLOAD FILE TO FIRESTORE
// -------------------------------------

async function handleFile(file, type) {
  if (!file) return;

  if (uploadInProgress) {
    alert("Ek upload pehle se chal raha hai.");
    return;
  }

  const user = auth.currentUser;

  if (!user || user.isAnonymous) {
    alert("Pehle apne account se login karein.");
    return;
  }

  // Firestore documents have a size limit.
  // Large videos should use Firebase Storage.
  if (file.size > 700000) {
    alert(
      "Yeh file Firestore ke liye bahut badi hai.\n\n" +
      "Chhoti photo (700 KB se kam) try karein. " +
      "Video upload ke liye Firebase Storage chahiye."
    );

    return;
  }

  uploadInProgress = true;

  const loading = document.createElement("div");

  loading.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.92);
    color: white;
    padding: 20px 30px;
    border-radius: 14px;
    z-index: 999999;
    max-width: 85%;
    overflow-wrap: anywhere;
  `;

  loading.textContent = `Uploading ${type}: ${file.name}`;

  document.body.appendChild(loading);

  try {
    const base64 = await fileToBase64(file);
    const isVideo = file.type.startsWith("video/");

    const data = {
      uid: user.uid,
      email: user.email || "",
      username:
        user.displayName ||
        user.email?.split("@")[0] ||
        "InstaPro User",
      photo: user.photoURL || "",
      imageUrl: base64,
      type: isVideo ? "video" : "image",
      caption: "",
      createdAt: serverTimestamp()
    };

    if (type === "story") {
      data.expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      await addDoc(collection(db, "stories"), data);

      alert("Story Firestore mein save ho gayi!");
    } else {
      await addDoc(collection(db, "posts"), data);

      alert("Post Firestore mein save ho gayi!");
    }

    // Notify other app modules
    window.dispatchEvent(
      new CustomEvent("instapro-upload-success", {
        detail: {
          type,
          mediaType: isVideo ? "video" : "image"
        }
      })
    );

  } catch (error) {
    console.error("Upload error:", error);

    alert(
      "Upload fail ho gaya:\n" +
      (error.message || "Unknown error")
    );

  } finally {
    loading.remove();
    uploadInProgress = false;
  }
}

// -------------------------------------
// FILE INPUT EVENTS
// -------------------------------------

function connectFileInput(inputId, type) {
  const input = $(inputId);

  if (!input) {
    console.error(
      `Upload input #${inputId} index.html mein nahi mila.`
    );
    return;
  }

  input.setAttribute("accept", "image/*,video/*");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];

    if (!file) return;

    await handleFile(file, type);

    // Allow selecting the same file again
    input.value = "";
  });
}

connectFileInput("postFile", "post");
connectFileInput("storyFile", "story");

console.log("InstaPro upload.js initialized.");
