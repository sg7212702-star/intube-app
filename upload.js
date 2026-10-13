// upload.js - InstaPro Firebase + Cloudinary Upload

import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -------------------------------------
// CONFIGURATION
// -------------------------------------

const CLOUDINARY_CLOUD_NAME = "kujnbe0a";
const CLOUDINARY_UPLOAD_PRESET = "intube_free";

const $ = (id) => document.getElementById(id);

let uploadInProgress = false;

// -------------------------------------
// SAFE UPLOAD INITIALIZATION
// -------------------------------------

function startInstaProUploadSystem() {
  if (window.__instaProUploadInitialized) return;

  window.__instaProUploadInitialized = true;
  initializeUploadSystem();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startInstaProUploadSystem,
    { once: true }
  );
} else {
  startInstaProUploadSystem();
}

// -------------------------------------
// INITIALIZE BUTTONS AND INPUTS
// -------------------------------------

function initializeUploadSystem() {
  const postButton = $("optPost");
  const storyButton = $("optStory");

  console.log("Post button:", postButton);
  console.log("Story button:", storyButton);
  console.log("Post file input:", $("postFile"));
  console.log("Story file input:", $("storyFile"));

  if (postButton) {
    postButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("Post Upload clicked");
      openGallery("postFile");
    });
  }

  if (storyButton) {
    storyButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("Story Share clicked");
      openGallery("storyFile");
    });
  }

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

console.log("Gallery input:", input);
console.log("Gallery input ID:", input.id);

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
// CLOUDINARY PHOTO AND VIDEO UPLOAD
// -------------------------------------

async function uploadToCloudinary(file, onProgress) {
  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", endpoint, true);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        const progress = Math.round(
          (event.loaded / event.total) * 100
        );

        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      let response;

      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Cloudinary ka response read nahi ho paya."));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        console.error("Cloudinary upload error:", response);

        reject(
          new Error(
            response.error?.message ||
            `Cloudinary upload fail: HTTP ${xhr.status}`
          )
        );

        return;
      }

      resolve(response);
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Network error: Cloudinary connection fail. Internet aur Cloudinary settings check karein."
        )
      );
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancel ho gaya."));
    });

    xhr.send(formData);
  });

  if (!result.secure_url) {
    throw new Error("Cloudinary ne media URL nahi diya.");
  }

  if (typeof onProgress === "function") {
    onProgress(100);
  }

  return result;
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

  const status = {
  set textContent(message) {
    console.log("Upload:", message);
  },
  remove() {}
};

const notice = window.InstaProUploadNotification;
  try {
    // Notification start
    if (notice) {
      notice.show();
      notice.progress(0);
    }

    status.textContent = isVideo
      ? "Cloudinary par video upload ho raha hai..."
      : "Cloudinary par photo upload ho rahi hai...";

    // Upload media and show real progress
    const result = await uploadToCloudinary(file, (progress) => {
      status.textContent =
        `${isVideo ? "Video" : "Photo"} upload ho rahi hai: ${progress}%`;

      if (notice) {
        notice.progress(progress);
      }
    });

    const mediaUrl =
      typeof result === "string" ? result : result?.secure_url;

    if (!mediaUrl) {
      throw new Error("Cloudinary se media URL nahi mila.");
    }

    // Firestore save starts
    status.textContent =
      "Firebase Firestore mein data save ho raha hai...";

    if (notice) {
      notice.progress(100);
    }

    const data = {
      uid: user.uid,
      userId: user.uid,
      email: user.email || "",
      username:
        user.displayName ||
        user.email?.split("@")[0] ||
        "InstaPro User",
      photo: user.photoURL || "",
      imageUrl: mediaUrl,
      mediaUrl: mediaUrl,
      url: mediaUrl,
      type: isVideo ? "video" : "image",
      contentType: isVideo ? "video" : "image",
      mediaType: isVideo ? "video" : "image",
      caption: "",
      likes: [],
      likesCount: 0,
      comments: [],
      // Story-only metadata is omitted from regular posts.
      ...(postType === "story" ? {
        privacy: { audience: "everyone", replies: "everyone" },
        audience: "everyone",
        mentionedUids: [],
        mentionedUsernames: [],
        seenBy: [],
        likedBy: []
      } : {}),
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

    // Success only after Firestore save
    status.textContent =
      postType === "story"
        ? "Story successfully upload ho gayi! ✅"
        : "Post successfully share ho gayi! ✅";

    if (notice) {
      notice.success();
    }

    window.dispatchEvent(
      new CustomEvent("instapro-upload-success", {
        detail: {
          id: savedDocument.id,
          type: postType,
          mediaType: isVideo ? "video" : "image",
          mediaUrl: mediaUrl
        }
      })
    );

    console.log(
      "InstaPro upload successful:",
      savedDocument.id
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

  } catch (error) {
    console.error("InstaPro upload error:", error);

    const errorMessage =
      error.message || "Unknown error";

    status.textContent =
      "Upload fail ho gaya: " + errorMessage;

    if (notice) {
      notice.error(errorMessage);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    alert(
      "Upload fail ho gaya.\n\n" + errorMessage
    );

  } finally {
    status.remove();
    uploadInProgress = false;
  }
}
