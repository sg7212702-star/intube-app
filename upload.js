// upload.js - InstaPro Firebase + Cloudinary Upload | Story sticker tray refresh 2026-10-15

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
  const reelButton = $("optReel");

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

  if (reelButton) {
    reelButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const input = $("reelFile");
      if (input) {
        input.setAttribute("accept", "video/*");
        input.dataset.instaProUploadType = "reel";
      }
      openGallery("reelFile");
    });
  }

  connectFileInput("postFile", "post");
  connectFileInput("storyFile", "story");
  connectFileInput("reelFile", "reel");

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
      } else if (file.type.startsWith("video/")) {
        const reelResult = await openPremiumReelEditor(file);
        if (!reelResult) return;
        window.__instaProReelCaption = reelResult.caption || "";
        window.__instaProPendingMusicFile = null;
        window.__instaProPendingMusicTrack = reelResult.musicTrack || null;
        await handleFile(reelResult.file, "reel");
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
        </div>
        <div class="ips-media" id="ip-story-preview-wrap">
          ${isVideo ? '<video id="ip-story-preview" playsinline controls></video>' : '<img id="ip-story-preview" alt="Story preview">'}
          <div id="ip-story-overlay-text"></div>
          <div class="ips-text-canvas" id="ip-story-text-canvas"></div>
          <div class="ips-sticker-canvas" id="ip-story-sticker-canvas"></div>
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
          <div class="ips-text-panel" aria-label="Story text editor">
            <div class="ips-text-head"><button type="button" data-act="close-text">‹ Back</button><b>Text editor</b><button type="button" data-act="close-text">×</button></div>
            <textarea id="ip-story-text-input" maxlength="500" placeholder="Type something..." aria-label="Story text"></textarea>
            <div class="ips-text-tools">
              <button type="button" data-text-style="classic">Classic</button><button type="button" data-text-style="modern">Modern</button><button type="button" data-text-style="strong">Strong</button><button type="button" data-text-style="typewriter">Type</button><button type="button" data-text-style="neon">Neon</button>
            </div>
            <div class="ips-text-tools ips-text-colors">
              <button type="button" data-text-color="#ffffff" style="background:#fff"></button><button type="button" data-text-color="#ff4267" style="background:#ff4267"></button><button type="button" data-text-color="#ffb52e" style="background:#ffb52e"></button><button type="button" data-text-color="#ffe94a" style="background:#ffe94a"></button><button type="button" data-text-color="#4de5a0" style="background:#4de5a0"></button><button type="button" data-text-color="#42b9ff" style="background:#42b9ff"></button><button type="button" data-text-color="#b78aff" style="background:#b78aff"></button><button type="button" data-text-color="#111111" style="background:#111"></button>
            </div>
            <div class="ips-text-tools">
              <button type="button" data-text-align="left">☰ Left</button><button type="button" data-text-align="center">☰ Center</button><button type="button" data-text-align="right">☰ Right</button>
              <button type="button" data-text-bg="none">A Clear</button><button type="button" data-text-bg="solid">A Box</button><button type="button" data-text-bg="fade">A Fade</button>
            </div>
            <div class="ips-text-tools">
              <button type="button" data-text-size="-">A−</button><button type="button" data-text-size="+">A+</button><button type="button" data-act="apply-text" class="ips-text-done">Done ✓</button>
            </div>
          </div>
          <div class="ips-sticker-panel" aria-label="Story stickers">
            <div class="ips-sticker-head"><button type="button" data-act="close-stickers" class="ips-sticker-back" aria-label="Back to story">‹ <span>Back</span></button><b>Stickers</b><button type="button" data-act="close-stickers" aria-label="Close stickers">×</button></div>
            <div class="ips-sticker-grid">
              <button type="button" data-sticker="❤️"><span>❤️</span><small>Love</small></button>
              <button type="button" data-sticker="😍"><span>😍</span><small>Crush</small></button>
              <button type="button" data-sticker="✨"><span>✨</span><small>Sparkle</small></button>
              <button type="button" data-sticker="🔥"><span>🔥</span><small>Fire</small></button>
              <button type="button" data-sticker="🎉"><span>🎉</span><small>Party</small></button>
              <button type="button" data-sticker="💖"><span>💖</span><small>Shine</small></button>
              <button type="button" data-sticker="🦋"><span>🦋</span><small>Butterfly</small></button>
              <button type="button" data-sticker="🌈"><span>🌈</span><small>Rainbow</small></button>
              <button type="button" data-sticker="☁️"><span>☁️</span><small>Cloud</small></button>
              <button type="button" data-sticker="🌸"><span>🌸</span><small>Bloom</small></button>
              <button type="button" data-sticker="📍"><span>📍</span><small>Location</small></button>
              <button type="button" data-sticker="💯"><span>💯</span><small>100</small></button>
              <button type="button" data-sticker="GOOD VIBES"><span>GOOD VIBES</span><small>Vibes</small></button>
              <button type="button" data-sticker="NEW POST"><span>NEW POST</span><small>New post</small></button>
              <button type="button" data-sticker="✨ yours ✨"><span>✨ yours ✨</span><small>Yours</small></button>
              <button type="button" data-sticker="♥︎"><span>♥︎</span><small>Classic</small></button>
            </div>
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
      #ip-story-editor .ips-sticker-canvas{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
      #ip-story-editor .ips-placed-sticker{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);min-width:44px;min-height:44px;padding:4px 9px;border:1px dashed transparent;border-radius:12px;background:transparent;color:white;font-size:42px;line-height:1.1;text-align:center;text-shadow:0 2px 8px #0009;white-space:pre;touch-action:none;pointer-events:auto;user-select:none;cursor:move}
      #ip-story-editor .ips-placed-sticker.selected{border-color:#fff;background:#0002}
      #ip-story-editor .ips-sticker-controls{position:absolute;right:-12px;top:-12px;display:none;gap:4px}
      #ip-story-editor .ips-placed-sticker.selected .ips-sticker-controls{display:flex}
      #ip-story-editor .ips-sticker-controls button{width:26px;height:26px;border:1px solid #fff;border-radius:50%;background:#25212f;color:#fff;font-size:15px;line-height:1}
      #ip-story-editor .ips-sticker-resize{position:absolute;right:-11px;bottom:-11px;width:24px;height:24px;border:2px solid #fff;border-radius:50%;background:#8d5cff;display:none;touch-action:none}
      #ip-story-editor .ips-placed-sticker.selected .ips-sticker-resize{display:block}
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
      #ip-story-editor .ips-text-panel{display:none;max-height:42vh;overflow:auto;padding:12px;border:1px solid #ffffff24;border-radius:20px;background:rgba(20,18,28,.96);backdrop-filter:blur(22px);box-shadow:0 12px 35px #0008}
      #ip-story-editor .ips-text-panel.open{display:block}
      #ip-story-editor .ips-text-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;font-size:14px}
      #ip-story-editor .ips-text-head button{border:0;border-radius:18px;background:#ffffff18;color:white;padding:7px 10px}
      #ip-story-editor #ip-story-text-input{display:block;width:100%;min-height:58px;max-height:100px;resize:vertical;padding:12px;border:1px solid #ffffff33;border-radius:12px;background:#ffffff12;color:white;font-size:17px;outline:none}
      #ip-story-editor .ips-text-tools{display:flex;gap:7px;overflow-x:auto;align-items:center;padding:8px 0 2px;scrollbar-width:none}
      #ip-story-editor .ips-text-tools button{flex:0 0 auto;min-height:34px;padding:6px 11px;border:1px solid #ffffff2a;border-radius:18px;background:#ffffff12;color:#fff;font-size:12px}
      #ip-story-editor .ips-text-colors button{width:27px;height:27px;min-height:27px;padding:0;border:2px solid #ffffff90;border-radius:50%;font-size:0}
      #ip-story-editor .ips-text-tools button.active{border-color:#c1a4ff;background:#7950ff66}
      #ip-story-editor .ips-text-tools .ips-text-done{background:linear-gradient(100deg,#7657ff,#b94cff);font-weight:800}
      #ip-story-editor .ips-text-canvas{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}
      #ip-story-editor .ips-placed-text{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);min-width:40px;max-width:82%;padding:4px 8px;color:#fff;font-size:32px;font-weight:700;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;text-shadow:0 2px 8px #0009;pointer-events:auto;touch-action:none;user-select:none;border:1px dashed transparent;border-radius:8px}
      #ip-story-editor .ips-placed-text.selected{border-color:#fff;background:#0002}
      #ip-story-editor .ips-placed-text[data-bg="solid"]{background:#fff;color:#111;text-shadow:none}
      #ip-story-editor .ips-placed-text[data-bg="fade"]{background:linear-gradient(90deg,#0000,#000a,#0000);text-shadow:0 2px 8px #000}
      #ip-story-editor .ips-draw-panel{display:none;position:relative;z-index:7;padding:10px 12px;border:1px solid #ffffff24;border-radius:18px;background:rgba(20,18,28,.96);backdrop-filter:blur(22px)}
      #ip-story-editor .ips-draw-panel.open{display:block}
      #ip-story-editor .ips-draw-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      #ip-story-editor .ips-draw-head b{flex:1}
      #ip-story-editor .ips-draw-head button{border:1px solid #ffffff2a;border-radius:15px;background:#ffffff15;color:#fff;padding:6px 10px}
      #ip-story-editor .ips-draw-colors{display:flex;gap:10px;padding:4px 0}
      #ip-story-editor .ips-draw-colors button{width:25px;height:25px;border-radius:50%;border:2px solid #ffffff99}
      #ip-story-editor .ips-draw-size{display:flex;align-items:center;gap:10px;font-size:12px}
      #ip-story-editor .ips-draw-size input{flex:1}
      #ip-story-editor .ips-sticker-panel{display:none;max-height:34vh;overflow:auto;padding:12px;border:1px solid #ffffff24;border-radius:20px;background:rgba(20,18,28,.94);backdrop-filter:blur(22px);box-shadow:0 12px 35px #0008}
      #ip-story-editor .ips-sticker-panel.open{display:block}
      #ip-story-editor .ips-sticker-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:14px}
      #ip-story-editor .ips-sticker-head button{width:30px;height:30px;border:0;border-radius:50%;background:#ffffff18;color:#fff;font-size:23px}
      #ip-story-editor .ips-sticker-head .ips-sticker-back{width:auto;padding:0 10px;display:flex;align-items:center;gap:4px;font-size:21px}
      #ip-story-editor .ips-sticker-head .ips-sticker-back span{font-size:11px;font-weight:650}
      #ip-story-editor .ips-sticker-panel{touch-action:pan-y}
      #ip-story-editor .ips-sticker-panel.dragging{transition:none!important}
      #ip-story-editor .ips-sticker-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      #ip-story-editor .ips-sticker-grid button{min-height:65px;padding:7px 3px;border:1px solid #ffffff17;border-radius:14px;background:linear-gradient(145deg,#ffffff16,#ffffff08);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
      #ip-story-editor .ips-sticker-grid button:active{background:#8e65ff66}
      #ip-story-editor .ips-sticker-grid button span{font-size:25px;line-height:30px;max-width:100%;overflow-wrap:anywhere}
      #ip-story-editor .ips-sticker-grid button[data-sticker="GOOD VIBES"] span,#ip-story-editor .ips-sticker-grid button[data-sticker="NEW POST"] span,#ip-story-editor .ips-sticker-grid button[data-sticker="✨ yours ✨"] span{font-size:11px;font-weight:900;letter-spacing:.4px}
      #ip-story-editor .ips-sticker-grid button small{font-size:9px;opacity:.75}
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
    const textPanel = modal.querySelector(".ips-text-panel");
    const textInput = modal.querySelector("#ip-story-text-input");
    const textCanvas = modal.querySelector("#ip-story-text-canvas");
    let textStyle = "modern", textColor = "#ffffff", textAlign = "center", textBg = "none", textSize = 32;
    let activeText = null;
    const textItems = [];
    const createStoryText = (value) => {
      const node=document.createElement("div"); node.className="ips-placed-text selected"; node.textContent=value;
      node.dataset.bg=textBg; node.style.color=textColor; node.style.textAlign=textAlign; node.style.fontSize=textSize+"px";
      if(textStyle==="classic"){node.style.fontFamily="Georgia,serif";node.style.fontWeight="500";node.style.textShadow="0 2px 7px #000"}
      if(textStyle==="modern"){node.style.fontFamily="Arial,sans-serif";node.style.fontWeight="700"}
      if(textStyle==="strong"){node.style.fontFamily="Arial Black,Arial,sans-serif";node.style.fontWeight="900";node.style.textTransform="uppercase"}
      if(textStyle==="typewriter"){node.style.fontFamily="monospace";node.style.fontWeight="500"}
      if(textStyle==="neon"){node.style.fontFamily="Arial,sans-serif";node.style.color=textColor;node.style.textShadow="0 0 5px "+textColor+",0 0 15px "+textColor+",0 2px 8px #000"}
      node.style.left="50%";node.style.top="44%";
      node.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;activeText=node;textCanvas.querySelectorAll(".ips-placed-text").forEach(n=>n.classList.toggle("selected",n===node));const rect=textCanvas.getBoundingClientRect(),r=node.getBoundingClientRect();const drag={x:e.clientX,y:e.clientY,left:r.left-rect.left+r.width/2,top:r.top-rect.top+r.height/2};node.setPointerCapture?.(e.pointerId);e.preventDefault();const move=ev=>{const b=textCanvas.getBoundingClientRect();node.style.left=Math.max(0,Math.min(b.width,drag.left+ev.clientX-drag.x))/b.width*100+"%";node.style.top=Math.max(0,Math.min(b.height,drag.top+ev.clientY-drag.y))/b.height*100+"%"};const end=()=>{node.removeEventListener("pointermove",move);node.removeEventListener("pointerup",end);node.removeEventListener("pointercancel",end)};node.addEventListener("pointermove",move);node.addEventListener("pointerup",end);node.addEventListener("pointercancel",end)});
      textCanvas.appendChild(node);textItems.push(node);activeText=node;return node;
    };
    const stickerCanvas = modal.querySelector("#ip-story-sticker-canvas");
    const stickerPanel = modal.querySelector(".ips-sticker-panel");
    const effectsPanel = modal.querySelector(".ips-effects-panel");
    // Instagram-like swipe-down-to-dismiss for every bottom editing tray.
    const addSwipeToClose = (panel) => {
      let startY=null, startX=null;
      panel.addEventListener("touchstart", e => {
        if (!panel.classList.contains("open")) return;
        const t=e.touches[0]; startY=t.clientY; startX=t.clientX;
      }, {passive:true});
      panel.addEventListener("touchend", e => {
        if (startY===null || !panel.classList.contains("open")) return;
        const t=e.changedTouches[0], dy=t.clientY-startY, dx=t.clientX-startX;
        if (dy>45 && Math.abs(dy)>Math.abs(dx)*1.1) panel.classList.remove("open");
        startY=null; startX=null;
      }, {passive:true});
    };
    addSwipeToClose(stickerPanel);
    addSwipeToClose(textPanel);
    addSwipeToClose(effectsPanel);
    let activeSticker = null;
    const stickerState = [];
    const selectSticker = (node) => {
      stickerCanvas.querySelectorAll(".ips-placed-sticker").forEach(n => n.classList.toggle("selected", n === node));
      activeSticker = node;
    };
    const makeSticker = (value) => {
      const node = document.createElement("div");
      node.className = "ips-placed-sticker selected";
      node.textContent = value;
      node.dataset.sticker = value;
      const controls = document.createElement("div");
      controls.className = "ips-sticker-controls";
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label","Delete sticker");
      del.addEventListener("pointerdown", e => e.stopPropagation());
      del.addEventListener("click", e => { e.stopPropagation(); node.remove(); const i=stickerState.indexOf(node); if(i>=0) stickerState.splice(i,1); activeSticker=null; });
      controls.appendChild(del);
      const resize = document.createElement("button");
      resize.type = "button"; resize.className = "ips-sticker-resize"; resize.setAttribute("aria-label","Resize sticker");
      node.append(controls, resize);
      stickerCanvas.appendChild(node);
      stickerState.push(node);
      selectSticker(node);
      let drag = null;
      node.addEventListener("pointerdown", e => {
        if (e.target.closest("button")) return;
        selectSticker(node);
        const rect=stickerCanvas.getBoundingClientRect(), r=node.getBoundingClientRect();
        drag={x:e.clientX,y:e.clientY,left:r.left-rect.left+ r.width/2,top:r.top-rect.top+r.height/2};
        node.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      });
      node.addEventListener("pointermove", e => {
        if(!drag || e.target.closest("button")) return;
        const rect=stickerCanvas.getBoundingClientRect();
        const x=Math.max(0,Math.min(rect.width,drag.left+e.clientX-drag.x));
        const y=Math.max(0,Math.min(rect.height,drag.top+e.clientY-drag.y));
        node.style.left=(x/rect.width*100)+"%"; node.style.top=(y/rect.height*100)+"%"; node.style.transform="translate(-50%,-50%)";
      });
      const stopDrag=()=>{drag=null};
      node.addEventListener("pointerup",stopDrag); node.addEventListener("pointercancel",stopDrag);
      resize.addEventListener("pointerdown",e=>{
        e.preventDefault();e.stopPropagation();selectSticker(node);
        const startY=e.clientY,startSize=parseFloat(getComputedStyle(node).fontSize);
        const move=ev=>{node.style.fontSize=Math.max(18,Math.min(120,startSize+(ev.clientY-startY)))+"px"};
        const end=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end)};
        window.addEventListener("pointermove",move);window.addEventListener("pointerup",end,{once:true});
      });
    };
    stickerCanvas.addEventListener("pointerdown",e=>{if(e.target===stickerCanvas){stickerCanvas.querySelectorAll(".ips-placed-sticker").forEach(n=>n.classList.remove("selected"));activeSticker=null}});
    const filterRow = modal.querySelector("#ip-story-filters");
    STORY_FILTERS.forEach(([name, filter], i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "flex:0 0 62px;width:62px;padding:0;background:transparent;color:white;border:0;font-size:10px;";
      btn.className = i === 0 ? "active" : "";
      btn.innerHTML = '<span style="display:block;width:62px;height:62px;border-radius:10px;background:#333;margin-bottom:5px;overflow:hidden"><img src="'+(isVideo ? "" : url)+'" style="width:100%;height:100%;object-fit:cover;filter:'+filter+'"></span>'+name;
      if (isVideo) btn.querySelector("span").style.filter = filter;
      btn.addEventListener("click", () => {
        selectedFilter = i;
        preview.style.filter = filter;
        filterRow.querySelectorAll("button").forEach(b => { b.style.opacity = ".78"; b.classList.remove("active"); });
        btn.style.opacity = "1";
        btn.classList.add("active");
      });
      filterRow.appendChild(btn);
    });
    filterRow.firstElementChild?.click();
    const close = (value) => { URL.revokeObjectURL(url); modal.remove(); resolve(value); };
    modal.addEventListener("click", async (e) => {
      const stickerButton = e.target.closest("[data-sticker]");
      if (stickerButton) {
        makeSticker(stickerButton.dataset.sticker);
        modal.querySelector(".ips-sticker-panel").classList.remove("open");
        return;
      }
      const drawColor=e.target.closest("[data-draw-color]");
      if(drawColor){const cv=modal.querySelector(".ips-draw-canvas");if(cv){cv.getContext("2d").strokeStyle=drawColor.dataset.drawColor;cv.style.pointerEvents="auto";}return;}
      const textControl=e.target.closest("[data-text-style],[data-text-color],[data-text-align],[data-text-bg],[data-text-size]");
      if(textControl){
        if(textControl.dataset.textStyle){textStyle=textControl.dataset.textStyle;textPanel.querySelectorAll("[data-text-style]").forEach(b=>b.classList.toggle("active",b===textControl))}
        if(textControl.dataset.textColor){textColor=textControl.dataset.textColor;textPanel.querySelectorAll("[data-text-color]").forEach(b=>b.classList.toggle("active",b===textControl));if(activeText){activeText.style.color=textColor;activeText.style.textShadow=textStyle==="neon"?"0 0 5px "+textColor+",0 0 15px "+textColor+",0 2px 8px #000":""}}
        if(textControl.dataset.textAlign){textAlign=textControl.dataset.textAlign;textPanel.querySelectorAll("[data-text-align]").forEach(b=>b.classList.toggle("active",b===textControl));if(activeText)activeText.style.textAlign=textAlign}
        if(textControl.dataset.textBg){textBg=textControl.dataset.textBg;textPanel.querySelectorAll("[data-text-bg]").forEach(b=>b.classList.toggle("active",b===textControl));if(activeText)activeText.dataset.bg=textBg}
        if(textControl.dataset.textSize){textSize=Math.max(16,Math.min(72,textSize+(textControl.dataset.textSize==="+"?4:-4)));if(activeText)activeText.style.fontSize=textSize+"px"}
        return;
      }
      const button = e.target.closest("[data-act]");
      if (!button) return;
      const act = button.dataset.act;
      if (act === "cancel") { close(null); return; }
      if (act === "text") {
        textPanel.classList.add("open"); modal.querySelector(".ips-sticker-panel").classList.remove("open"); modal.querySelector(".ips-effects-panel").classList.remove("open");
        textInput.value=activeText?.textContent || "";
        textInput.focus();
      }
      if (act === "close-text") textPanel.classList.remove("open");
      if (act === "apply-text") {
        const value=textInput.value.trim();
        if(value){ if(activeText && activeText.isConnected){activeText.textContent=value;activeText.style.color=textColor;activeText.style.textAlign=textAlign;activeText.dataset.bg=textBg;activeText.style.fontSize=textSize+"px"} else createStoryText(value); }
        textPanel.classList.remove("open");
      }
      if (act === "stickers") {
        modal.querySelector(".ips-sticker-panel").classList.toggle("open");
        modal.querySelector(".ips-effects-panel").classList.remove("open");
      }
      if (act === "close-stickers") {
        modal.querySelector(".ips-sticker-panel").classList.remove("open");
      }
      if (act === "effects") {
        const panel = modal.querySelector(".ips-effects-panel");
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) panel.scrollIntoView({behavior:"smooth",block:"end"});
      }
      if (act === "save") {
        if (isVideo) {
          const link = document.createElement("a"); link.href = url; link.download = file.name || "instapro-story-video"; link.click();
        } else {
          const image = new Image(); image.src = url;
          try {
            await image.decode();
            const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d"); ctx.filter = STORY_FILTERS[selectedFilter][1]; ctx.drawImage(image,0,0);
            canvas.toBlob(blob => { if (!blob) return; const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="instapro-story.jpg"; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),1500); }, "image/jpeg", .94);
          } catch(error) { alert("Story save nahi ho payi: "+error.message); }
        }
      }
      if (act === "draw") {
        let drawPanel=modal.querySelector(".ips-draw-panel");
        if(!drawPanel){
          drawPanel=document.createElement("div"); drawPanel.className="ips-draw-panel open";
          drawPanel.innerHTML='<div class="ips-draw-head"><b>Draw</b><button type="button" data-act="clear-draw">Clear</button><button type="button" data-act="close-draw">Done ✓</button></div><div class="ips-draw-colors"><button data-draw-color="#ffffff" style="background:#fff"></button><button data-draw-color="#ff4267" style="background:#ff4267"></button><button data-draw-color="#ffb52e" style="background:#ffb52e"></button><button data-draw-color="#4de5a0" style="background:#4de5a0"></button><button data-draw-color="#42b9ff" style="background:#42b9ff"></button><button data-draw-color="#b78aff" style="background:#b78aff"></button></div><label class="ips-draw-size">Brush size <input type="range" min="2" max="28" value="6" data-draw-size></label>';
          modal.querySelector(".ips-bottom").prepend(drawPanel);
          const canvas=document.createElement("canvas");canvas.className="ips-draw-canvas";canvas.width=modal.clientWidth*2;canvas.height=modal.clientHeight*2;
          canvas.style.width="100%";canvas.style.height="100%";canvas.style.position="absolute";canvas.style.inset="0";canvas.style.zIndex="4";canvas.style.pointerEvents="auto";canvas.style.touchAction="none";
          modal.querySelector(".ips-stage").appendChild(canvas);
          const ctx=canvas.getContext("2d");ctx.scale(2,2);ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#ffffff";ctx.lineWidth=6;
          let drawing=false;
          const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
          canvas.addEventListener("pointerdown",e=>{drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);canvas.setPointerCapture(e.pointerId)});
          canvas.addEventListener("pointermove",e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()});
          const stop=()=>drawing=false;canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);
          drawPanel.querySelectorAll("[data-draw-color]").forEach(b=>b.addEventListener("click",()=>ctx.strokeStyle=b.dataset.drawColor));
          drawPanel.querySelector("[data-draw-size]").addEventListener("input",e=>ctx.lineWidth=Number(e.target.value));
          drawPanel.dataset.ready="1";
        } else {drawPanel.classList.add("open");}
      }
      if (act === "close-draw") {modal.querySelector(".ips-draw-panel")?.classList.remove("open");const cv=modal.querySelector(".ips-draw-canvas");if(cv)cv.style.pointerEvents="none";}
      if (act === "clear-draw") {const cv=modal.querySelector(".ips-draw-canvas");if(cv){const ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);}}
      if (act === "close-draw") {const cv=modal.querySelector(".ips-draw-canvas");if(cv)cv.style.pointerEvents="none";}
      if (act === "music") {
        // Searchable public song catalogue plus local-device music picker.
        let musicInput = modal.querySelector("#ip-story-music-input");
        if (!musicInput) {
          musicInput = document.createElement("input");
          musicInput.id = "ip-story-music-input";
          musicInput.type = "file";
          musicInput.accept = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac";
          musicInput.style.display = "none";
          modal.appendChild(musicInput);
          musicInput.addEventListener("change", () => {
            const trackFile = musicInput.files && musicInput.files[0];
            if (!trackFile) return;
            if (!trackFile.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(trackFile.name)) {
              alert("Audio/music file select karein."); musicInput.value = ""; return;
            }
            window.__instaProPendingMusicFile = trackFile;
            window.__instaProPendingMusicTrack = {title:trackFile.name.replace(/\.[^.]+$/, ""),artistName:"",source:"device-library"};
            const status = modal.querySelector("#ip-story-music-status");
            if(status) status.textContent = "Selected: " + trackFile.name + " — Story share karne par audio file upload hogi.";
          });
        }
        let panel = modal.querySelector("#ip-story-music-panel");
        if (!panel) {
          panel = document.createElement("div");
          panel.id = "ip-story-music-panel";
          panel.style.cssText = "position:absolute;z-index:12;left:10px;right:10px;top:58px;bottom:110px;overflow:auto;padding:15px;border:1px solid #ffffff30;border-radius:18px;background:rgba(18,18,24,.98);box-shadow:0 12px 35px #0009;color:#fff;";
          panel.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><b style="font-size:18px;flex:1">♫ Insta Pro Music</b><button type="button" data-music-close style="border:0;border-radius:50%;width:32px;height:32px;background:#ffffff20;color:#fff;font-size:20px">×</button></div><form id="ip-story-music-search-form" style="display:flex;gap:7px"><input id="ip-story-music-search" type="search" placeholder="Song, singer, language..." style="min-width:0;flex:1;padding:11px;border:1px solid #ffffff35;border-radius:12px;background:#ffffff12;color:#fff;outline:none"><button type="submit" style="padding:10px 13px;border:0;border-radius:12px;background:#8b5cf6;color:#fff;font-weight:700">Search</button></form><div style="display:flex;gap:7px;overflow-x:auto;padding:10px 0;scrollbar-width:none"><button type="button" data-music-query="Hindi Bollywood songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">🇮🇳 Hindi</button><button type="button" data-music-query="Punjabi songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Punjabi</button><button type="button" data-music-query="Bhojpuri songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Bhojpuri</button><button type="button" data-music-query="Tamil songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Tamil</button><button type="button" data-music-query="Telugu songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Telugu</button><button type="button" data-music-query="English pop songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">English</button><button type="button" data-music-query="Korean pop songs" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">K-pop</button><button type="button" data-music-query="Top songs India" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Top India</button><button type="button" data-music-query="lofi music" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Lo-fi</button><button type="button" data-music-query="relaxing piano music" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Piano</button><button type="button" data-music-query="acoustic guitar music" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Acoustic</button><button type="button" data-music-query="Indian classical music" style="white-space:nowrap;padding:8px 11px;border:1px solid #ffffff30;border-radius:18px;background:#ffffff12;color:#fff">Indian classical</button></div><button type="button" data-music-local style="width:100%;margin:0 0 9px;padding:10px;border:1px solid #ffffff30;border-radius:12px;background:#ffffff10;color:#fff">＋ Choose audio from my phone</button><div id="ip-story-music-status" style="font-size:12px;opacity:.8;margin:8px 0">Search free music by genre, mood, or artist. Results depend on what creators have shared with an open reuse license.</div><div id="ip-story-music-results" style="display:grid;gap:8px"></div><div style="font-size:11px;opacity:.65;margin-top:12px">Song names and short previews are searched from the Apple iTunes catalog. Preview clips are usually short samples, not full songs; full-song availability and rights depend on the music provider.</div>';
          modal.appendChild(panel);
          // Close the music picker reliably, including while a preview is playing.
          const closeMusicPicker = event => {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const previewAudio = panel.querySelector("#ip-story-music-audio-preview");
            if (previewAudio) { previewAudio.pause(); previewAudio.removeAttribute("src"); previewAudio.load(); previewAudio.remove(); }
            panel.remove();
            document.removeEventListener("keydown", musicPickerEscapeHandler);
          };
          const musicPickerEscapeHandler = event => {
            if (event.key === "Escape" && panel.isConnected) closeMusicPicker(event);
          };
          document.addEventListener("keydown", musicPickerEscapeHandler);
          panel.querySelector("[data-music-close]")?.addEventListener("click", closeMusicPicker);
          panel.addEventListener("click", ev => {
            const quickQuery = ev.target.closest("[data-music-query]");
            if (quickQuery) {
              const searchBox = panel.querySelector("#ip-story-music-search");
              const searchForm = panel.querySelector("#ip-story-music-search-form");
              if (searchBox && searchForm) {
                searchBox.value = quickQuery.dataset.musicQuery;
                searchForm.requestSubmit();
              }
              return;
            }
            if (ev.target.closest("[data-music-close]")) { closeMusicPicker(ev); return; }
            if (ev.target.closest("[data-music-local]")) { musicInput.value = ""; musicInput.click(); return; }
            const pick = ev.target.closest("[data-music-pick]");
            if (pick) {
              ev.preventDefault();
              ev.stopPropagation();
              let track = window.__instaProMusicSearchResults?.[Number(pick.dataset.musicPick)];
              if (!track && pick.dataset.musicTrack) {
                try { track = JSON.parse(pick.dataset.musicTrack); } catch (_) {}
              }
              if (!track || !track.previewUrl) {
                const s = panel.querySelector("#ip-story-music-status");
                if (s) s.textContent = "Is song ka audio link available nahi hai. Dusra song choose karein.";
                return;
              }
              window.__instaProPendingMusicFile = null;
              window.__instaProPendingMusicTrack = {
                title: track.trackName || track.title || "Selected song",
                artistName: track.artistName || "",
                audioUrl: track.previewUrl,
                id: String(track.trackId || track.id || ""),
                source: "commons-free",
                license: track.license || "",
                licenseUrl: track.licenseUrl || "",
                filePage: track.filePage || ""
              };
              closeMusicPicker(ev);
              return;
            }
          });
          panel.querySelector("#ip-story-music-search-form").addEventListener("submit", async ev => {
            ev.preventDefault();
            const query=panel.querySelector("#ip-story-music-search").value.trim();
            const status=panel.querySelector("#ip-story-music-status"), results=panel.querySelector("#ip-story-music-results");
            if(!query){status.textContent="Song ya artist ka naam likhein.";return;}
            status.textContent="Searching music…"; results.replaceChildren();
            try {
              const apiUrl="https://itunes.apple.com/search?term="+encodeURIComponent(query)+"&country=IN&media=music&entity=song&limit=50";
              const response=await fetch(apiUrl);
              if(!response.ok) throw new Error("Music search abhi available nahi hai.");
              const data=await response.json();
              const tracks=(data.results||[]).map(track=>({
                trackName:track.trackName||"Unknown song",
                artistName:track.artistName||"Unknown artist",
                collectionName:track.collectionName||"",
                previewUrl:track.previewUrl||"",
                artworkUrl100:(track.artworkUrl100||"").replace("100x100bb","300x300bb"),
                trackId:track.trackId,
                license:"",
                licenseUrl:"",
                filePage:track.trackViewUrl||""
              })).filter(track=>track.trackName&&track.previewUrl);
              window.__instaProMusicSearchResults=tracks;
              if(!tracks.length){status.textContent="Is naam se playable song preview nahi mila. Hindi, Bollywood ya singer ka naam search karein, ya phone se audio choose karein.";return;}
              status.textContent=tracks.length+" song previews found. Play karke sunein, phir Use dabayein. Preview aksar sirf chhota sample hota hai.";
              tracks.forEach((track,index)=>{
                const row=document.createElement("div");
                row.style.cssText="display:flex;align-items:center;gap:9px;padding:9px;border:1px solid #ffffff20;border-radius:12px;background:#ffffff08";
                if(track.artworkUrl100){const img=document.createElement("img");img.src=track.artworkUrl100;img.alt="";img.style.cssText="width:46px;height:46px;border-radius:8px;object-fit:cover";row.appendChild(img);}
                const info=document.createElement("div");info.style.cssText="flex:1;min-width:0";
                const title=document.createElement("b");title.textContent=track.trackName;title.style.cssText="display:block;font-size:13px;overflow-wrap:anywhere";
                const artist=document.createElement("small");artist.textContent=track.artistName+" · "+(track.license||"Check license");artist.style.cssText="display:block;font-size:11px;opacity:.7;overflow-wrap:anywhere";
                info.append(title,artist);row.appendChild(info);
                const choose=document.createElement("button");choose.type="button";choose.dataset.musicPick=String(index);choose.dataset.musicTrack=JSON.stringify(track);choose.textContent=track.previewUrl?"Use":"Unavailable";choose.disabled=!track.previewUrl;choose.style.cssText="padding:8px;border:1px solid #ffffff20;border-radius:10px;background:#ffffff12;color:#fff";
                row.appendChild(choose);
                if(track.previewUrl){
                  const play=document.createElement("button");
                  play.type="button";play.textContent="▶";play.title="Play / pause";
                  play.style.cssText="padding:8px;border:0;border-radius:10px;background:#ffffff15;color:#fff";
                  play.addEventListener("click",()=>{
                    let audio=panel.querySelector("#ip-story-music-audio-preview");
                    if(!audio){audio=document.createElement("audio");audio.id="ip-story-music-audio-preview";audio.preload="none";audio.style.display="none";panel.appendChild(audio);}
                    if(audio.src!==track.previewUrl){audio.pause();audio.src=track.previewUrl;}
                    if(!audio.paused){audio.pause();play.textContent="▶";return;}
                    panel.querySelectorAll("[data-music-play]").forEach(b=>{b.textContent="▶";});
                    play.dataset.musicPlay="1";
                    audio.play().then(()=>{play.textContent="Ⅱ";}).catch(()=>{const s=panel.querySelector("#ip-story-music-status");if(s)s.textContent="Is audio ko browser play nahi kar paaya. Dusra track try karein.";});
                    audio.onended=()=>{play.textContent="▶";};
                  });
                  play.dataset.musicPlay="1";
                  row.appendChild(play);
                }
                results.appendChild(row);
              });
            } catch(error) {status.textContent="Music search connect nahi ho paya. Internet check karein ya phone se audio choose karein.";console.warn("Story music search:",error);}
          });
        }
        panel.style.display = "block";
        panel.querySelector("#ip-story-music-search")?.focus();
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
          window.__instaProStoryTexts = textItems.filter(n=>n.isConnected).map(n=>({text:n.textContent,x:n.style.left||"50%",y:n.style.top||"44%",size:n.style.fontSize||"32px",color:n.style.color||"#fff",align:n.style.textAlign||"center",background:n.dataset.bg||"none",font:n.style.fontFamily||"sans-serif"}));
          window.__instaProStoryStickers = stickerState.filter(n=>n.isConnected).map(n=>({text:n.dataset.sticker,x:n.style.left||"50%",y:n.style.top||"42%",size:n.style.fontSize||"42px"}));
          window.__instaProStoryFilter = STORY_FILTERS[selectedFilter][0];
          close(outputFile);
        } catch (err) { alert("Effect apply nahi hua: " + err.message); }
      }
    });
  });
}

// -------------------------------------
// PREMIUM REELS EDITOR — gallery videos open here before uploading.
function openPremiumReelEditor(file) {
  return new Promise(resolve => {
    document.getElementById("ip-premium-reel-editor")?.remove();
    const sourceUrl=URL.createObjectURL(file), modal=document.createElement("div");
    modal.id="ip-premium-reel-editor";
    modal.style.cssText="position:fixed;inset:0;z-index:2147483001;background:#08080b;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden";
    modal.innerHTML='<style>#ip-premium-reel-editor *{box-sizing:border-box}#ip-premium-reel-editor .head{height:52px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#111116;border-bottom:1px solid #ffffff20}#ip-premium-reel-editor button{color:#fff;cursor:pointer}#ip-premium-reel-editor .title{font-weight:800;flex:1}#ip-premium-reel-editor .pro{font-size:10px;letter-spacing:1px;padding:5px 8px;border-radius:8px;background:linear-gradient(120deg,#8d5cff,#ff398a)}#ip-premium-reel-editor .stage{position:relative;flex:1;min-height:140px;background:#000;display:flex;justify-content:center;align-items:center;overflow:hidden}#ip-premium-reel-editor video{width:100%;height:100%;object-fit:contain}#ip-premium-reel-editor .overlay{position:absolute;top:43%;left:8%;right:18%;text-align:center;font-weight:850;font-size:30px;white-space:pre-wrap;text-shadow:0 2px 9px #000;pointer-events:none}#ip-premium-reel-editor .tools{display:flex;gap:7px;overflow:auto;padding:8px;background:#111116}#ip-premium-reel-editor .tools button{flex-shrink:0;padding:9px;border-radius:11px;border:1px solid #ffffff20;background:#24242c;font-size:11px}#ip-premium-reel-editor .tools button.active{border-color:#b58cff;background:#392452}#ip-premium-reel-editor .panel{padding:9px 13px;background:#15151b;max-height:28vh;overflow:auto}#ip-premium-reel-editor .row{display:flex;align-items:center;gap:8px;margin:8px 0}#ip-premium-reel-editor label{font-size:12px;min-width:58px}#ip-premium-reel-editor input[type=range]{flex:1;min-width:0;accent-color:#b58cff}#ip-premium-reel-editor input[type=text],#ip-premium-reel-editor textarea{width:100%;padding:9px;background:#24242c;color:#fff;border:1px solid #ffffff20;border-radius:9px}#ip-premium-reel-editor .foot{padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#111116}#ip-premium-reel-editor .next{width:100%;height:45px;border:0;border-radius:13px;background:linear-gradient(100deg,#914cff,#ff398a);font-weight:850;font-size:15px}</style><div class="head"><button data-act="cancel" style="font-size:25px;background:none;border:0">‹</button><div class="title">Reels editor</div><span class="pro">PREMIUM</span></div><div class="stage"><video id="ipr-video" playsinline controls></video><div class="overlay" id="ipr-overlay"></div></div><div class="tools"><button data-tool="trim" class="active">✂ Trim</button><button data-tool="filter">🎨 Filters</button><button data-tool="text">Aa Text</button><button data-tool="music">♫ Music</button><button data-tool="speed">⏩ Speed</button><button data-tool="audio">🔊 Audio</button></div><div class="panel"><section data-panel="trim"><div class="row"><label>Start</label><input id="ipr-start" type="range" min="0" max="100" value="0" step=".1"><b id="ipr-st">0:00</b></div><div class="row"><label>End</label><input id="ipr-end" type="range" min="0" max="100" value="100" step=".1"><b id="ipr-en">0:00</b></div><small id="ipr-dur">Clip duration loading…</small></section><section data-panel="filter" hidden><div class="tools" style="padding:0"><button data-filter="none" class="active">Normal</button><button data-filter="contrast(1.15) saturate(1.2)">Vivid</button><button data-filter="sepia(.35) saturate(1.2)">Warm</button><button data-filter="grayscale(1)">Mono</button><button data-filter="brightness(1.12) saturate(.8)">Fade</button><button data-filter="hue-rotate(25deg) saturate(1.25)">Dream</button></div></section><section data-panel="text" hidden><div class="row"><textarea id="ipr-caption" maxlength="2200" rows="2" placeholder="Write a Reel caption…"></textarea></div><div class="row"><input id="ipr-text" type="text" maxlength="120" placeholder="Add text over video (optional)"></div></section><section data-panel="music" hidden><div class="row"><input id="ipr-music-search" type="search" placeholder="Search songs, singers, Bollywood…" style="min-width:0;flex:1"><button type="button" id="ipr-music-search-btn">Search</button></div><div id="ipr-music-status" style="font-size:11px;color:#bbb;margin:6px 0">Search music library, play a preview, then tap Use.</div><div id="ipr-music-results" style="display:grid;gap:8px"></div><audio id="ipr-music-preview" controls style="width:100%;height:36px;margin-top:8px"></audio></section><section data-panel="speed" hidden><div class="row"><label>Speed</label><input id="ipr-speed" type="range" min=".5" max="2" step=".25" value="1"><b id="ipr-speed-label">1×</b></div></section><section data-panel="audio" hidden><div class="row"><label>Original audio</label><button id="ipr-mute">On</button></div></section></div><div class="foot"><button class="next" data-act="next">Next →</button><div style="text-align:center;font-size:10px;color:#aaa;margin-top:6px">Preview · edit · export · upload</div></div>';
    document.body.appendChild(modal);
    const video=modal.querySelector("#ipr-video"), start=modal.querySelector("#ipr-start"), end=modal.querySelector("#ipr-end"), cap=modal.querySelector("#ipr-caption"), txt=modal.querySelector("#ipr-text"), overlay=modal.querySelector("#ipr-overlay");
    let duration=0,filter="none",musicTrack=null,muted=false,closed=false;
    video.src=sourceUrl;
    const fmt=n=>{n=Math.max(0,Math.floor(Number(n)||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
    const finish=result=>{if(closed)return;closed=true;video.pause();URL.revokeObjectURL(sourceUrl);modal.remove();resolve(result);};
    const labels=()=>{modal.querySelector("#ipr-st").textContent=fmt(start.value);modal.querySelector("#ipr-en").textContent=fmt(end.value);modal.querySelector("#ipr-dur").textContent="Clip duration: "+fmt(Number(end.value)-Number(start.value));};
    video.addEventListener("loadedmetadata",()=>{duration=Number.isFinite(video.duration)?video.duration:0;start.max=end.max=String(duration);end.value=String(duration);labels();video.play().catch(()=>{});});
    start.addEventListener("input",()=>{if(+start.value>=+end.value)end.value=String(Math.min(duration,+start.value+.2));labels();});
    end.addEventListener("input",()=>{if(+end.value<=+start.value)start.value=String(Math.max(0,+end.value-.2));labels();});
    start.addEventListener("change",()=>{video.currentTime=+start.value||0;});
    video.addEventListener("timeupdate",()=>{if(duration&&video.currentTime>=+end.value)video.pause();});
    txt.addEventListener("input",()=>overlay.textContent=txt.value);
    modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));modal.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==b.dataset.tool);}));
    modal.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;modal.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));video.style.filter=filter;}));
    modal.querySelector("#ipr-speed").addEventListener("input",e=>{video.playbackRate=+e.target.value;modal.querySelector("#ipr-speed-label").textContent=e.target.value+"×";});
    modal.querySelector("#ipr-mute").addEventListener("click",e=>{muted=!muted;video.muted=muted;e.currentTarget.textContent=muted?"Off":"On";});
    const musicSearch=modal.querySelector("#ipr-music-search"), musicStatus=modal.querySelector("#ipr-music-status"), musicResults=modal.querySelector("#ipr-music-results"), musicPreview=modal.querySelector("#ipr-music-preview");
    const searchLibrary=async()=>{
      const term=musicSearch.value.trim();
      if(!term){musicStatus.textContent="Song ya singer ka naam likhein.";return;}
      musicStatus.textContent="Music library search ho rahi hai…";musicResults.replaceChildren();
      try{
        const response=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(term)+"&country=IN&media=music&entity=song&limit=30");
        if(!response.ok)throw new Error("Music search request failed");
        const data=await response.json();
        const tracks=(data.results||[]).filter(t=>t.trackName&&t.previewUrl).map(t=>({trackName:t.trackName,artistName:t.artistName||"Unknown artist",collectionName:t.collectionName||"",previewUrl:t.previewUrl,artworkUrl100:(t.artworkUrl100||"").replace("100x100bb","300x300bb"),trackId:t.trackId,license:"Preview only",filePage:t.trackViewUrl||""}));
        if(!tracks.length){musicStatus.textContent="Is search ke liye playable preview nahi mila. Dusra song ya singer search karein.";return;}
        musicStatus.textContent=tracks.length+" tracks mile. Preview sun kar Use dabayein.";
        tracks.forEach((track,index)=>{
          const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #ffffff20;border-radius:11px;background:#202027";
          if(track.artworkUrl100){const img=document.createElement("img");img.src=track.artworkUrl100;img.alt="";img.style.cssText="width:44px;height:44px;object-fit:cover;border-radius:8px";row.appendChild(img);}
          const info=document.createElement("div");info.style.cssText="flex:1;min-width:0";
          const title=document.createElement("b");title.textContent=track.trackName;title.style.cssText="display:block;font-size:12px;overflow-wrap:anywhere";
          const artist=document.createElement("small");artist.textContent=track.artistName;artist.style.cssText="display:block;font-size:10px;opacity:.7";
          info.append(title,artist);row.appendChild(info);
          const play=document.createElement("button");play.type="button";play.textContent="▶";play.style.cssText="padding:7px;border:1px solid #ffffff20;border-radius:8px;background:#333";
          play.addEventListener("click",async()=>{try{musicPreview.src=track.previewUrl;await musicPreview.play();musicStatus.textContent="Playing preview: "+track.trackName;}catch(err){musicStatus.textContent="Preview play nahi ho paya. Dusra track try karein.";}});
          const use=document.createElement("button");use.type="button";use.textContent="Use";use.style.cssText="padding:8px;border:0;border-radius:8px;background:linear-gradient(120deg,#8d5cff,#ff398a);font-weight:800";
          use.addEventListener("click",()=>{musicTrack=track;window.__instaProPendingMusicFile=null;window.__instaProPendingMusicTrack={title:track.trackName,artistName:track.artistName,audioUrl:track.previewUrl,id:String(track.trackId||""),license:track.license,licenseUrl:"",filePage:track.filePage,source:"music-library"};musicStatus.textContent="Selected: "+track.trackName+" — "+track.artistName;musicPreview.pause();});
          row.append(play,use);musicResults.appendChild(row);
        });
      }catch(err){console.warn("Reels music library search:",err);musicStatus.textContent="Music library connect nahi ho payi. Internet check karke dobara try karein.";}
    };
    modal.querySelector("#ipr-music-search-btn").addEventListener("click",searchLibrary);
    musicSearch.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchLibrary();}});
    musicPreview.addEventListener("ended",()=>{musicPreview.currentTime=0;});
    modal.querySelector('[data-act="cancel"]').addEventListener("click",()=>finish(null));
    modal.querySelector('[data-act="next"]').addEventListener("click",async e=>{
      const btn=e.currentTarget;btn.disabled=true;btn.textContent="Rendering Reel…";
      try{
        const st=Math.max(0,+start.value||0),en=Math.min(duration,+end.value||duration);
        if(!duration||en-st<.25)throw new Error("Trim range must be at least 0.25 seconds.");
        if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){finish({file,caption:cap.value.trim(),musicTrack});return;}
        video.pause();video.currentTime=st;
        await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(new Error("Video seek timeout")),5000);video.addEventListener("seeked",()=>{clearTimeout(timer);res();},{once:true});});
        const canvas=document.createElement("canvas"),vw=video.videoWidth||720,vh=video.videoHeight||1280,scale=Math.min(1,1080/Math.max(vw,vh));
        canvas.width=Math.max(2,Math.round(vw*scale/2)*2);canvas.height=Math.max(2,Math.round(vh*scale/2)*2);
        const ctx=canvas.getContext("2d"),stream=canvas.captureStream(30);let ac=null,musicEl=null;
        try{ac=new(window.AudioContext||window.webkitAudioContext)();const dest=ac.createMediaStreamDestination();if(!muted){const vs=video.captureStream?video.captureStream():null;if(vs)vs.getAudioTracks().forEach(t=>ac.createMediaStreamSource(new MediaStream([t])).connect(dest));}if(musicTrack&&musicTrack.previewUrl){musicEl=new Audio(musicTrack.previewUrl);musicEl.loop=true;const ms=ac.createMediaElementSource(musicEl);ms.connect(dest);await ac.resume();await musicEl.play().catch(()=>{});}dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));}catch(err){console.warn("Audio mix unavailable",err);}
        const draw=()=>{if(closed)return;ctx.save();ctx.filter=filter;ctx.drawImage(video,0,0,canvas.width,canvas.height);ctx.restore();if(txt.value.trim()){ctx.save();ctx.font="800 "+Math.max(24,canvas.width*.055)+"px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=9;const words=txt.value.trim().split(/\s+/),rows=[];let row="";for(const word of words){const test=row?row+" "+word:word;if(ctx.measureText(test).width>canvas.width*.78&&row){rows.push(row);row=word;}else row=test;}if(row)rows.push(row);rows.slice(0,5).forEach((line,i)=>ctx.fillText(line,canvas.width/2,canvas.height*.43+(i-(Math.min(rows.length,5)-1)/2)*Math.max(28,canvas.width*.065),canvas.width*.78));ctx.restore();}if(!video.paused&&!video.ended)requestAnimationFrame(draw);};
        const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported(t))||"",chunks=[],recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
        recorder.ondataavailable=ev=>{if(ev.data&&ev.data.size)chunks.push(ev.data);};const stopped=new Promise(res=>recorder.onstop=res);recorder.start(250);await video.play();draw();
        await new Promise(res=>{const check=()=>{if(video.currentTime>=en||video.ended){video.pause();res();}else setTimeout(check,40);};check();});
        if(recorder.state!=="inactive")recorder.stop();await stopped;if(musicEl){musicEl.pause();URL.revokeObjectURL(musicEl.src);}if(ac)await ac.close().catch(()=>{});stream.getTracks().forEach(t=>t.stop());
        const type=chunks[0]&&chunks[0].type||mime||"video/webm",ext=type.includes("mp4")?"mp4":"webm",blob=new Blob(chunks,{type});if(!blob.size)throw new Error("Edited video export failed.");
        finish({file:new File([blob],file.name.replace(/\.[^.]+$/,"")+"-instapro-reel."+ext,{type,lastModified:Date.now()}),caption:cap.value.trim(),musicTrack});
      }catch(err){console.error("Reels editor export failed",err);btn.disabled=false;btn.textContent="Retry Export";alert("Export fail: "+(err.message||"Unknown error")+". Please retry.");}
    });
  });
}

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
    window.__instaProReelCaption = "";
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
      caption: postType === "story" ? (window.__instaProStoryCaption || "") : postType === "reel" ? (window.__instaProReelCaption || "") : "",
      ...(postType === "story" ? { storyText: window.__instaProStoryOverlayText || "", storyFilter: window.__instaProStoryFilter || "Normal" } : {}),
      postType: postType === "reel" ? "reel" : postType,
      isReel: postType === "reel",
      ...(soundtrackUrl ? {
        musicUrl: soundtrackUrl,
        musicName: soundtrackTrack?.title || soundtrackFile?.name || "Soundtrack",
        ...(soundtrackTrack?.artistName ? { musicArtist: soundtrackTrack.artistName } : {}),
        ...(soundtrackTrack?.id ? { musicTrackId: soundtrackTrack.id } : {}),
        ...(soundtrackTrack?.language ? { musicLanguage: soundtrackTrack.language } : {}),
        ...(soundtrackTrack?.license ? { musicLicense: soundtrackTrack.license } : {}),
        ...(soundtrackTrack?.licenseUrl ? { musicLicenseUrl: soundtrackTrack.licenseUrl } : {}),
        ...(soundtrackTrack?.filePage ? { musicSourcePage: soundtrackTrack.filePage } : {})
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
