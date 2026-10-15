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
      <div class="ips-stage">
        <div class="ips-topbar">
          <button data-act="cancel" aria-label="Back">‹</button>
          <span class="ips-top-title">Story</span>
          <button data-act="text" aria-label="Add text">Aa</button>
        </div>
        <div class="ips-media" id="ip-story-preview-wrap">
          ${isVideo ? '<video id="ip-story-preview" playsinline controls></video>' : '<img id="ip-story-preview" alt="Story preview">'}
          <div id="ip-story-overlay-text"></div>
        </div>
        <nav class="ips-side-tools" aria-label="Story editing tools">
          <button data-act="text"><span>Aa</span><small>Text</small></button>
          <button data-act="stickers"><span>☻</span><small>Stickers</small></button>
          <button data-act="music"><span>♫</span><small>Music</small></button>
          <button data-act="effects"><span>✧</span><small>Effects</small></button>
          <button data-act="draw"><span>〰</span><small>Draw</small></button>
          <button data-act="save"><span>↓</span><small>Save</small></button>
        </nav>
        <div class="ips-bottom">
          <div class="ips-effects-panel">
            <div class="ips-effects-heading"><b>Effects</b><small>Swipe to explore 50+</small></div>
            <div id="ip-story-filters"></div>
          </div>
          <input id="ip-story-caption" placeholder="Add a caption..." maxlength="2200" aria-label="Story caption">
          <button data-act="share" class="ips-share">Your story <span>›</span></button>
        </div>
      </div>`
    const premiumStyle = document.createElement("style");
    premiumStyle.textContent = `
      #ip-story-editor{position:fixed!important;inset:0!important;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)!important;background:#000!important;color:#fff!important;font-family:Inter,system-ui,-apple-system,sans-serif!important;overflow:hidden!important}
      #ip-story-editor *{box-sizing:border-box}
      #ip-story-editor .ips-stage{position:relative;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;background:#000;overflow:hidden}
      #ip-story-editor .ips-media{position:absolute;inset:0;width:100%;height:100%;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;background:#000!important;box-shadow:none!important;overflow:hidden;display:flex;align-items:center;justify-content:center}
      #ip-story-editor #ip-story-preview{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;background:#000}
      #ip-story-editor #ip-story-overlay-text{position:absolute;left:8%;right:18%;top:45%;text-align:center;font-size:30px;font-weight:750;text-shadow:0 2px 10px #000;overflow-wrap:anywhere;white-space:pre-wrap;pointer-events:none}
      #ip-story-editor .ips-topbar{position:absolute;z-index:5;top:0;left:0;right:0;height:58px;padding:5px 12px;display:flex;align-items:center;gap:12px;background:linear-gradient(#0008,transparent)}
      #ip-story-editor .ips-topbar button{width:40px;height:40px;border-radius:50%;border:1px solid #ffffff2b;background:#17171780;color:white;font-size:25px;display:grid;place-items:center;backdrop-filter:blur(12px)}
      #ip-story-editor .ips-top-title{flex:1;font-size:15px;font-weight:700;text-shadow:0 1px 5px #000}
      #ip-story-editor .ips-side-tools{position:absolute;z-index:6;right:10px;top:68px;display:flex;flex-direction:column;gap:11px;align-items:center;max-height:calc(100% - 255px);overflow-y:auto;scrollbar-width:none}
      #ip-story-editor .ips-side-tools::-webkit-scrollbar{display:none}
      #ip-story-editor .ips-side-tools button{width:48px;min-height:48px;padding:5px 2px;border:1px solid #ffffff26;border-radius:16px;background:#1010149c;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;backdrop-filter:blur(14px);box-shadow:0 3px 12px #0003}
      #ip-story-editor .ips-side-tools button span{font-size:23px;line-height:24px}
      #ip-story-editor .ips-side-tools button small{font-size:9px;font-weight:600}
      #ip-story-editor .ips-bottom{position:absolute;z-index:5;left:0;right:0;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(transparent,#000b 18%,#000e);display:flex;flex-direction:column;gap:9px}
      #ip-story-editor .ips-effects-panel{display:none}
      #ip-story-editor .ips-effects-panel.open{display:block}
      #ip-story-editor .ips-effects-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;font-size:13px}
      #ip-story-editor .ips-effects-heading small{opacity:.7;font-size:10px}
      #ip-story-editor #ip-story-filters{display:flex;gap:10px;overflow-x:auto;padding:2px 1px 5px;scrollbar-width:none;scroll-snap-type:x mandatory}
      #ip-story-editor #ip-story-filters::-webkit-scrollbar{display:none}
      #ip-story-editor #ip-story-filters button{flex:0 0 62px;width:62px;padding:0;background:transparent;color:white;border:0;font-size:10px;scroll-snap-align:start;opacity:.78;white-space:nowrap}
      #ip-story-editor #ip-story-filters button span{display:block!important;width:56px!important;height:56px!important;border-radius:50%!important;border:2px solid #ffffff45;margin:0 auto 4px!important;overflow:hidden;box-shadow:0 3px 10px #0008}
      #ip-story-editor #ip-story-filters button.active{opacity:1!important;font-weight:750}
      #ip-story-editor #ip-story-filters button.active span{border:2px solid #fff!important;box-shadow:0 0 0 2px #9b75ff}
      #ip-story-editor #ip-story-caption{width:100%;min-height:43px;padding:11px 14px;background:#ffffff19;border:1px solid #ffffff38;border-radius:24px;color:#fff;font-size:14px;outline:none}
      #ip-story-editor #ip-story-caption::placeholder{color:#ffffffd0}
      #ip-story-editor #ip-story-caption:focus{border-color:#fff}
      #ip-story-editor .ips-share{width:100%;height:47px;border:0;border-radius:14px;background:linear-gradient(100deg,#7657ff,#b94cff);color:white;font-weight:750;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 5px 20px #7950ff38}
      #ip-story-editor .ips-share span{font-size:23px}
      #ip-story-editor button{font-family:inherit;cursor:pointer;touch-action:manipulation;transition:transform .14s ease}
      #ip-story-editor button:active{transform:scale(.95)}
      @media(max-height:700px){#ip-story-editor .ips-side-tools{top:56px;gap:6px;max-height:calc(100% - 210px)}#ip-story-editor .ips-side-tools button{width:42px;min-height:42px;border-radius:13px}#ip-story-editor .ips-side-tools button span{font-size:20px;line-height:20px}#ip-story-editor .ips-side-tools button small{font-size:8px}#ip-story-editor .ips-bottom{gap:6px;padding-bottom:calc(6px + env(safe-area-inset-bottom))}#ip-story-editor #ip-story-filters button span{width:46px!important;height:46px!important}}
      @media(min-width:700px){#ip-story-editor .ips-stage{max-width:520px;margin:auto;border-left:1px solid #222;border-right:1px solid #222}}
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
