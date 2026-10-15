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
      const chosenType = input.dataset.instaProUploadType || type;
      delete input.dataset.instaProUploadType;
      if (chosenType === "story") {
        const editedFile = await openStoryEditor(file);
        if (!editedFile) return;
        await handleFile(editedFile, chosenType);
      } else {
        await handleFile(file, chosenType);
      }
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
  const resourceType = (isVideo || file.type.startsWith("audio/")) ? "video" : "image";

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


const STORY_FILTERS = [
  ["Normal","none"],["Clarendon","contrast(1.18) saturate(1.25)"],["Gingham","brightness(1.08) sepia(.12)"],
  ["Moon","grayscale(.85) contrast(1.12)"],["Lark","brightness(1.12) saturate(.82)"],["Reyes","sepia(.22) brightness(1.08)"],
  ["Juno","saturate(1.35) contrast(1.05)"],["Slumber","saturate(.72) brightness(1.08)"],["Crema","sepia(.18) contrast(.95)"],
  ["Ludwig","saturate(1.1) brightness(1.04)"],["Aden","sepia(.12) saturate(.85)"],["Perpetua","saturate(1.2) contrast(1.08)"],
  ["Amaro","sepia(.18) contrast(1.08)"],["Mayfair","contrast(1.08) saturate(1.1)"],["Rise","sepia(.14) brightness(1.12)"],
  ["Hudson","brightness(1.08) contrast(1.1)"],["Valencia","sepia(.2) saturate(1.15)"],["X-Pro II","contrast(1.25) saturate(1.2)"],
  ["Sierra","sepia(.12) contrast(.95)"],["Willow","grayscale(.35) contrast(.95)"],["Lo-Fi","contrast(1.3) saturate(1.25)"],
  ["Earlybird","sepia(.25) contrast(1.08)"],["Brannan","contrast(1.2) sepia(.12)"],["Inkwell","grayscale(1)"],
  ["Hefe","contrast(1.18) sepia(.12)"],["Nashville","sepia(.25) brightness(1.08)"],["1977","sepia(.15) hue-rotate(-10deg)"],
  ["Brooklyn","sepia(.1) brightness(1.08)"],["Maven","saturate(.8) contrast(1.08)"],["Ginza","sepia(.12) saturate(1.2)"],
  ["Skyline","saturate(1.35) brightness(1.08)"],["Vivid","saturate(1.65) contrast(1.1)"],["Warm","sepia(.18)"],
  ["Cool","hue-rotate(12deg) saturate(1.1)"],["Golden","sepia(.3) saturate(1.2)"],["Vintage","sepia(.35) contrast(.9)"],
  ["Retro","sepia(.2) hue-rotate(-8deg) contrast(1.08)"],["Fade","contrast(.82) brightness(1.12)"],
  ["Matte","contrast(.88) saturate(.85)"],["Pop","contrast(1.35) saturate(1.3)"],["Soft","brightness(1.1) contrast(.9)"],
  ["Dramatic","contrast(1.45) saturate(.9)"],["B&W","grayscale(1) contrast(1.15)"],["Noir","grayscale(1) contrast(1.4)"],
  ["Rose","sepia(.12) hue-rotate(325deg) saturate(1.15)"],["Lavender","hue-rotate(18deg) saturate(.85)"],
  ["Mint","hue-rotate(35deg) saturate(.9)"],["Ocean","hue-rotate(165deg) saturate(1.1)"],
  ["Sunset","sepia(.18) hue-rotate(-18deg) saturate(1.3)"],["Cinematic","contrast(1.25) saturate(.85) brightness(.95)"],
  ["Glow","brightness(1.18) saturate(1.15)"],["Deep","brightness(.88) contrast(1.2)"]
];

function openStoryEditor(file) {
  return new Promise((resolve) => {
    document.getElementById("ip-story-editor")?.remove();
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    let selectedFilter = 0;
    let caption = "";
    let overlayText = "";
    const modal = document.createElement("div");
    modal.id = "ip-story-editor";
    modal.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;font-family:Arial,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);";
    modal.innerHTML = `
      <header style="height:54px;display:flex;align-items:center;gap:18px;padding:0 16px;flex-shrink:0">
        <button data-act="cancel" aria-label="Back" style="background:none;border:0;color:white;font-size:30px">‹</button>
        <strong style="font-size:17px;flex:1">Story editor</strong>
        <button data-act="text" style="border:0;background:#ffffff22;color:white;border-radius:20px;padding:9px 13px">Aa Text</button>
      </header>
      <div style="position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#111">
        <div id="ip-story-preview-wrap" style="position:relative;max-width:100%;max-height:100%;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
          ${isVideo ? '<video id="ip-story-preview" playsinline controls style="max-width:100%;max-height:100%;object-fit:contain"></video>' : '<img id="ip-story-preview" style="max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain">'}
          <div id="ip-story-overlay-text" style="position:absolute;left:8%;right:8%;top:45%;text-align:center;font-size:30px;font-weight:700;text-shadow:0 2px 8px #000;overflow-wrap:anywhere"></div>
        </div>
      </div>
      <div style="padding:10px 12px 4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><b>Effects</b><small>50+ filters · swipe horizontally</small></div>
        <div id="ip-story-filters" style="display:flex;gap:10px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none"></div>
        <input id="ip-story-caption" placeholder="Add a caption..." maxlength="2200" style="box-sizing:border-box;width:100%;padding:13px 12px;background:#171717;color:white;border:1px solid #444;border-radius:12px;font-size:15px;margin:5px 0 12px">
        <div style="display:flex;gap:10px;padding-bottom:10px">
          <button data-act="stickers" style="flex:1;background:#222;color:white;border:1px solid #444;border-radius:24px;padding:12px">☻ Stickers</button>
          <button data-act="music" style="flex:1;background:#222;color:white;border:1px solid #444;border-radius:24px;padding:12px">♫ Music</button>
          <button data-act="draw" style="flex:1;background:#222;color:white;border:1px solid #444;border-radius:24px;padding:12px">〰 Draw</button>
        </div>
        <button data-act="share" style="width:100%;border:0;border-radius:28px;background:#4058f5;color:white;font-weight:700;font-size:17px;padding:15px;margin-bottom:8px">Your story  ›</button>
      </div>`;
    const premiumStyle = document.createElement("style");
    premiumStyle.textContent = `
      #ip-story-editor{background:radial-gradient(ellipse at 50% 18%,#24202f 0%,#09090d 46%,#000 100%)!important;font-family:Inter,system-ui,-apple-system,sans-serif!important}
      #ip-story-editor header{height:58px!important;padding:0 16px!important;border-bottom:1px solid #ffffff12;background:#09090dcc;backdrop-filter:blur(18px)}
      #ip-story-editor header strong{font-size:16px!important;letter-spacing:.2px}
      #ip-story-editor button{font-family:inherit;cursor:pointer;transition:transform .16s ease,background .16s ease,border-color .16s ease}
      #ip-story-editor button:active{transform:scale(.96)}
      #ip-story-editor [data-act="cancel"]{width:38px;height:38px;border-radius:50%;font-size:28px!important;background:#ffffff12!important;border:1px solid #ffffff20!important;display:grid;place-items:center;line-height:1}
      #ip-story-editor [data-act="text"]{background:#ffffff16!important;border:1px solid #ffffff28!important;border-radius:22px!important;font-weight:700}
      #ip-story-editor #ip-story-preview-wrap{max-width:430px!important;width:calc(100% - 28px)!important;height:100%!important;max-height:100%!important;border-radius:20px;overflow:hidden;background:#14141a;box-shadow:0 18px 55px #0009;border:1px solid #ffffff16}
      #ip-story-editor #ip-story-preview{width:100%;height:100%;object-fit:contain}
      #ip-story-editor>div:nth-of-type(2){padding:12px 14px 4px!important;background:linear-gradient(180deg,#08080a00,#08080a 20%)}
      #ip-story-editor #ip-story-filters{gap:12px!important;padding:4px 2px 12px!important;scroll-snap-type:x mandatory}
      #ip-story-editor #ip-story-filters button{flex-basis:70px!important;scroll-snap-align:start;opacity:.78;white-space:nowrap}
      #ip-story-editor #ip-story-filters button span{height:66px!important;width:66px!important;border-radius:14px!important;border:2px solid #ffffff20;box-shadow:0 5px 14px #0005}
      #ip-story-editor #ip-story-filters button:focus span{border-color:#fff;box-shadow:0 0 0 2px #8b5cf6}
      #ip-story-editor #ip-story-caption{background:#ffffff0d!important;border:1px solid #ffffff20!important;border-radius:14px!important;outline:none}
      #ip-story-editor #ip-story-caption:focus{border-color:#9b8aff!important;box-shadow:0 0 0 3px #8b5cf622}
      #ip-story-editor [data-act="stickers"],#ip-story-editor [data-act="music"],#ip-story-editor [data-act="draw"]{background:#ffffff0d!important;border:1px solid #ffffff20!important;border-radius:24px!important;font-weight:650}
      #ip-story-editor [data-act="share"]{background:linear-gradient(100deg,#7657ff,#b94cff)!important;box-shadow:0 8px 24px #7950ff45;border-radius:28px!important;letter-spacing:.1px}
      @media(max-height:740px){#ip-story-editor header{height:48px!important}#ip-story-editor>div:nth-of-type(2){padding-top:5px!important}#ip-story-editor #ip-story-filters button span{height:52px!important;width:58px!important}}
      @media(min-width:700px){#ip-story-editor #ip-story-preview-wrap{max-width:380px!important}}
    `;
    modal.appendChild(premiumStyle);
    document.body.appendChild(modal);
    const preview = modal.querySelector("#ip-story-preview");
    if (isVideo) { preview.src = url; preview.muted = true; } else preview.src = url;
    const filterRow = modal.querySelector("#ip-story-filters");
    STORY_FILTERS.forEach(([name, filter], i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "flex:0 0 68px;width:68px;padding:0;background:transparent;color:white;border:0;font-size:11px;";
      btn.innerHTML = '<span style="display:block;width:62px;height:62px;border-radius:10px;background:#333;margin-bottom:5px;overflow:hidden"><img src="'+(isVideo ? "" : url)+'" style="width:100%;height:100%;object-fit:cover;filter:'+filter+'"></span>'+name;
      if (isVideo) btn.querySelector("span").style.filter = filter;
      btn.addEventListener("click", () => {
        selectedFilter = i;
        preview.style.filter = filter;
        filterRow.querySelectorAll("button").forEach(b => b.style.opacity = ".65");
        btn.style.opacity = "1";
      });
      filterRow.appendChild(btn);
    });
    filterRow.firstElementChild?.click();
    const close = (value) => { URL.revokeObjectURL(url); modal.remove(); resolve(value); };
    modal.addEventListener("click", async (e) => {
      const button = e.target.closest("[data-act]");
      if (!button) return;
      const act = button.dataset.act;
      if (act === "cancel") { close(null); return; }
      if (act === "text") {
        const value = prompt("Story par text likhein", overlayText);
        if (value !== null) { overlayText = value; modal.querySelector("#ip-story-overlay-text").textContent = value; }
      }
      if (act === "stickers") {
        const value = prompt("Sticker choose karein: ❤️ 😂 🔥 ✨ 😍 🎉", "❤️");
        if (value) modal.querySelector("#ip-story-overlay-text").textContent += " " + value;
        overlayText = modal.querySelector("#ip-story-overlay-text").textContent;
      }
      if (act === "draw") alert("Draw tool agle update mein add hoga. Abhi text aur effects use kar sakte hain.");
      if (act === "music") {
        const title = prompt("Music track ka naam ya URL daalein");
        if (title) {
          const audioUrl = /^https?:\/\//i.test(title) ? title : "";
          window.__instaProPendingMusicTrack = audioUrl ? {title:"Story soundtrack",audioUrl} : {title};
          alert(audioUrl ? "Music reference select ho gaya." : "Music ka naam note hua; playable track URL chahiye hota hai.");
        }
      }
      if (act === "share") {
        caption = modal.querySelector("#ip-story-caption").value.trim();
        try {
          let outputFile = file;
          if (!isVideo && selectedFilter !== 0) {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.filter = STORY_FILTERS[selectedFilter][1];
            ctx.drawImage(image, 0, 0);
            const blob = await new Promise(r => canvas.toBlob(r, file.type === "image/png" ? "image/png" : "image/jpeg", .94));
            if (blob) outputFile = new File([blob], file.name.replace(/\.[^.]+$/, "")+"-story.jpg", {type:blob.type});
          }
          window.__instaProStoryCaption = caption;
          window.__instaProStoryOverlayText = overlayText;
          window.__instaProStoryFilter = STORY_FILTERS[selectedFilter][0];
          close(outputFile);
        } catch (err) { alert("Effect apply nahi hua: " + err.message); }
      }
    });
  });
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

    // If music was selected in the editor, upload its audio file separately.
    // The post stores musicUrl as a soundtrack reference; it is not re-encoded into the video.
    let soundtrackUrl = "";
    const soundtrackFile = window.__instaProPendingMusicFile || null;
    const soundtrackTrack = window.__instaProPendingMusicTrack || null;
    if (soundtrackFile) {
      status.textContent = "Editor music upload ho raha hai...";
      const soundtrackResult = await uploadToCloudinary(soundtrackFile);
      soundtrackUrl = soundtrackResult.secure_url;
    } else if (soundtrackTrack?.audioUrl) {
      // Library audio is already hosted; save its reference rather than re-uploading it.
      soundtrackUrl = soundtrackTrack.audioUrl;
    }
    window.__instaProPendingMusicFile = null;
    window.__instaProPendingMusicTrack = null;
    window.__instaProStoryCaption = "";
    window.__instaProStoryOverlayText = "";
    window.__instaProStoryFilter = "Normal";

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
      caption: postType === "story" ? (window.__instaProStoryCaption || "") : "",
      ...(postType === "story" ? { storyText: window.__instaProStoryOverlayText || "", storyFilter: window.__instaProStoryFilter || "Normal" } : {}),
      postType: postType === "reel" ? "reel" : postType,
      isReel: postType === "reel",
      ...(soundtrackUrl ? {
        musicUrl: soundtrackUrl,
        musicName: soundtrackTrack?.title || soundtrackFile?.name || "Soundtrack",
        ...(soundtrackTrack?.artistName ? { musicArtist: soundtrackTrack.artistName } : {}),
        ...(soundtrackTrack?.id ? { musicTrackId: soundtrackTrack.id } : {}),
        ...(soundtrackTrack?.language ? { musicLanguage: soundtrackTrack.language } : {})
      } : {}),
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
