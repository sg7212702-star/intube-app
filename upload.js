// upload.js - InstaPro Firebase + Cloudinary Upload | Story sticker tray refresh 2026-10-15

import { auth, db } from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
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

// The saved InstaPro profile is the source of truth for public identity.
// Never publish Google's account name/photo into new posts or stories when a profile exists.
async function getInstaProIdentity(user) {
  const fallbackName = user?.displayName || user?.email?.split("@")[0] || "InstaPro User";
  const fallbackPhoto = user?.photoURL || "";
  if (!user?.uid) return { username: fallbackName, displayName: fallbackName, photo: fallbackPhoto, photoURL: fallbackPhoto };
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : {};
    const username = profile.username || profile.displayName || profile.name || fallbackName;
    const displayName = profile.displayName || profile.name || username;
    const photo = profile.photoURL || profile.photoUrl || profile.profilePic || profile.photo || profile.avatar || fallbackPhoto;
    return { username, displayName, photo, photoURL: photo };
  } catch (error) {
    console.warn("Could not load saved InstaPro profile before upload:", error);
    return { username: fallbackName, displayName: fallbackName, photo: fallbackPhoto, photoURL: fallbackPhoto };
  }
}


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

  // Posts support Instagram-style multi-photo selection; Reels remain video-only.
  const uploadType = input.dataset.instaProUploadType ||
    (inputId === "reelFile" ? "reel" : inputId === "storyFile" ? "story" : "post");
  input.setAttribute("accept", uploadType === "reel" ? "video/*" : "image/*,video/*");
  if (uploadType === "post") input.multiple = true;
  else input.multiple = false;
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
  if (type === "post") input.multiple = true;

  input.addEventListener("change", async () => {
    const selectedFiles = Array.from(input.files || []);
    const file = selectedFiles[0];

    if (!file) return;

    try {
      const chosenType = input.dataset.instaProUploadType || type;
      const cameraRecordedVideo = input.dataset.instaProCameraRecordedVideo === "true";
      delete input.dataset.instaProCameraRecordedVideo;
      delete input.dataset.instaProUploadType;
      window.__instaProPendingMusicFile = null;
      window.__instaProPendingMusicTrack = null;
      if (chosenType === "post" && selectedFiles.length > 1 && selectedFiles.every(f => f.type.startsWith("image/"))) {
        await handleMultiplePhotoFiles(selectedFiles, window.__instaProPostCaption || "", null, null);
      } else {
        await handleFile(file, chosenType);
      }
    } finally {
      input.value = "";
    }
  });
}

// Instagram-style multi-photo post editor: swipe previews, then add one shared caption.
async function handleMultiplePhotoFiles(files, caption, musicFile = null, musicTrack = null) {
  if(uploadInProgress){alert("Ek upload pehle se chal raha hai.");return;}
  const user=auth.currentUser;
  if(!user||user.isAnonymous){alert("Pehle Google account se login karein.");return;}
  if(!files.length||files.some(f=>!f.type.startsWith("image/"))){alert("Multiple selection mein sirf photos select karein.");return;}
  uploadInProgress=true;
  const hud=document.createElement("div");
  hud.id="instapro-multi-upload-hud";
  hud.style.cssText="position:fixed;left:14px;right:14px;bottom:20px;z-index:2147483646;padding:16px;border-radius:16px;background:#181820;color:#fff;font:14px system-ui;box-shadow:0 8px 36px #0009";
  hud.innerHTML='<b>Uploading photos…</b><div id="ip-multi-upload-status" style="margin-top:7px;opacity:.8">Preparing…</div>';
  document.body.appendChild(hud);
  try{
    const mediaItems=[];
    for(let i=0;i<files.length;i++){
      hud.querySelector("#ip-multi-upload-status").textContent="Photo "+(i+1)+" of "+files.length+" uploading…";
      const result=await uploadToCloudinary(files[i]);
      mediaItems.push({url:result.secure_url,fileName:files[i].name||"",fileSize:Number(files[i].size||0),publicId:result.public_id||"",assetId:result.asset_id||"",width:Number(result.width||0),height:Number(result.height||0),format:result.format||""});
    }
    let soundtrackUrl="";
    if(musicFile){
      hud.querySelector("#ip-multi-upload-status").textContent="Uploading song…";
      const musicResult=await uploadToCloudinary(musicFile);
      soundtrackUrl=musicResult.secure_url||"";
    }else if(musicTrack?.audioUrl){
      soundtrackUrl=musicTrack.audioUrl;
    }
    hud.querySelector("#ip-multi-upload-status").textContent="Publishing post to Firebase…";
    const first=mediaItems[0];
    const identity=await getInstaProIdentity(user);
    const data={
      uid:user.uid,userId:user.uid,email:user.email||"",
      username:identity.username,displayName:identity.displayName,
      photo:identity.photo,photoURL:identity.photoURL,imageUrl:first.url,mediaUrl:first.url,url:first.url,
      mediaUrls:mediaItems.map(item=>item.url),mediaItems,mediaCount:mediaItems.length,
      type:"image",contentType:"image",mediaType:"image",postType:"post",isReel:false,
      fileName:first.fileName,fileSize:first.fileSize,caption:caption||"",
      ...(soundtrackUrl?{musicUrl:soundtrackUrl,musicName:musicTrack?.title||musicFile?.name||"Soundtrack",...(musicTrack?.artistName?{musicArtist:musicTrack.artistName}:{}),...(musicTrack?.id?{musicTrackId:musicTrack.id}:{}),...(musicTrack?.filePage?{musicSourcePage:musicTrack.filePage}:{})}:{}),
      likes:[],likesCount:0,comments:[],createdAt:serverTimestamp()
    };
    const saved=await addDoc(collection(db,"posts"),data);
    hud.querySelector("#ip-multi-upload-status").textContent="Post shared successfully ✓";
    window.dispatchEvent(new CustomEvent("instapro-upload-success",{detail:{id:saved.id,type:"post",mediaType:"image",mediaUrl:first.url,mediaUrls:data.mediaUrls}}));
    await new Promise(resolve=>setTimeout(resolve,700));
  }catch(error){
    console.error("InstaPro multi-photo upload failed:",error);
    alert("Photo post upload fail ho gaya: "+(error.message||"Unknown error"));
  }finally{
    hud.remove();
    uploadInProgress=false;
  }
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
  ["Glow","brightness(1.18) saturate(1.15)"],["Deep","brightness(.88) contrast(1.2)"],
  ["PREMIUM GLITCH 01","contrast(1.35) saturate(1.7) hue-rotate(18deg)"],["PREMIUM GLITCH 02","contrast(1.4) saturate(1.55) hue-rotate(315deg)"],["RGB SPLIT","contrast(1.3) saturate(1.6) hue-rotate(35deg)"],["NEON CYBER","brightness(1.08) contrast(1.5) saturate(1.8) hue-rotate(145deg)"],["CHROMA BURST","contrast(1.45) saturate(1.9) hue-rotate(70deg)"],["VHS DREAM","sepia(.16) contrast(1.25) saturate(1.6) hue-rotate(330deg)"],["LASER PINK","contrast(1.35) saturate(1.7) hue-rotate(285deg)"],["ELECTRIC BLUE","contrast(1.4) saturate(1.65) hue-rotate(175deg)"],["ACID RAINBOW","contrast(1.25) saturate(2) hue-rotate(95deg)"],["PRISM GLITCH","contrast(1.5) saturate(1.8) hue-rotate(220deg)"],["PIXEL PULSE","contrast(1.35) saturate(1.5) hue-rotate(260deg)"],["HOLOGRAM","brightness(1.12) contrast(1.25) saturate(1.65) hue-rotate(160deg)"]
];

// -------------------------------------
// INSTAGRAM-STYLE PHOTO POST EDITOR — image posts are edited before upload.
// -------------------------------------
// PREMIUM REELS EDITOR — gallery videos open here before uploading.
// Reel editor implementation moved to editor.js; upload.js retains upload and Firestore logic.


// MAIN UPLOAD HANDLER
// -------------------------------------

async function compressImageForUpload(file, maxBytes = 9 * 1024 * 1024) {
  if (!file || !file.type.startsWith("image/") || file.size <= maxBytes) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 2560;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56, 0.5]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) {
        const base = (file.name || "instapro-image").replace(/\.[^.]+$/, "");
        return new File([blob], base + "-compressed.jpg", { type: "image/jpeg", lastModified: Date.now() });
      }
    }
    throw new Error("Photo ko 10 MB se chhota nahi kar paye. Chhoti photo select karein.");
  } finally {
    bitmap.close?.();
  }
}

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

  // Cloudinary image uploads are limited to 10 MiB; compress oversized photos before sending.
  if (isImage && file.size > 9 * 1024 * 1024) {
    try { file = await compressImageForUpload(file); }
    catch (compressionError) { uploadInProgress = false; alert(compressionError.message || "Photo compress nahi ho payi."); return; }
  }

  // Small live upload HUD: editor closes only after export; this remains visible
  // through Cloudinary transfer and Firestore publication, with real progress.
  const uploadHudId = "instapro-live-upload-hud";
  document.getElementById(uploadHudId)?.remove();
  const hud = document.createElement("div");
  hud.id = uploadHudId;
  hud.style.cssText = "display:none !important;position:fixed;left:14px;right:14px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:2147483646;padding:15px 16px;border:1px solid #ffffff24;border-radius:18px;background:rgba(18,18,25,.96);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);color:#fff;font:14px system-ui,sans-serif;box-shadow:0 14px 44px #0008";
  hud.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><span id="ipuh-icon" style="width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:linear-gradient(130deg,#914cff,#ff398a);font-size:18px">↑</span><div style="flex:1;min-width:0"><b id="ipuh-title" style="display:block;font-size:14px">Preparing upload…</b><small id="ipuh-message" style="display:block;opacity:.7;margin-top:3px;overflow-wrap:anywhere">Please keep InstaPro open.</small></div><b id="ipuh-percent" style="font-size:13px">0%</b></div><div style="height:5px;border-radius:9px;background:#ffffff20;margin-top:13px;overflow:hidden"><div id="ipuh-bar" style="height:100%;width:0%;border-radius:9px;background:linear-gradient(90deg,#914cff,#ff398a);transition:width .18s"></div></div>';
  document.body.appendChild(hud);
  const status = {
    set textContent(message) {
      console.log("Upload:", message);
      const label = hud.querySelector("#ipuh-message");
      const title = hud.querySelector("#ipuh-title");
      const percent = hud.querySelector("#ipuh-percent");
      const bar = hud.querySelector("#ipuh-bar");
      if (label) label.textContent = String(message);
      const match = String(message).match(/(\\d{1,3})%/);
      if (match) {
        const value = Math.max(0, Math.min(100, Number(match[1])));
        if (percent) percent.textContent = value + "%";
        if (bar) bar.style.width = value + "%";
        if (title) title.textContent = "Uploading media…";
      } else if (/Firestore/i.test(String(message))) {
        if (title) title.textContent = "Publishing post…";
        if (percent) percent.textContent = "✓";
        if (bar) bar.style.width = "100%";
      } else if (/successfully/i.test(String(message))) {
        if (title) title.textContent = "Published successfully";
        if (percent) percent.textContent = "✓";
        if (bar) bar.style.width = "100%";
      } else if (/fail/i.test(String(message))) {
        if (title) title.textContent = "Upload failed";
      } else if (title) {
        title.textContent = "Preparing upload…";
      }
    },
    remove() {
      document.getElementById(uploadHudId)?.remove();
    }
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
    const reelTitle = postType === "reel" ? (window.__instaProReelTitle || "") : "";
    const reelCaption = postType === "reel" ? (window.__instaProReelCaption || "") : "";
    const reelHashtags = postType === "reel" ? (window.__instaProReelHashtags || "") : "";
    const reelTaggedPeople = postType === "reel" ? (window.__instaProReelTaggedPeople || "") : "";
    const reelCaptionWithHashtags = [reelCaption, reelHashtags].filter(Boolean).join("\n\n");
    window.__instaProReelTitle = "";
    window.__instaProReelHashtags = "";
    window.__instaProReelTaggedPeople = "";
    window.__instaProReelCaption = "";
    window.__instaProPostCaption = "";
    window.__instaProStoryOverlayText = "";
    window.__instaProStoryFilter = "Normal";
    // Firestore save starts
    status.textContent =
      "Firebase Firestore mein data save ho raha hai...";

    if (notice) {
      notice.progress(100);
    }

    const identity = await getInstaProIdentity(user);
    const data = {
      uid: user.uid,
      userId: user.uid,
      email: user.email || "",
      username: identity.username,
      displayName: identity.displayName,
      photo: identity.photo,
      photoURL: identity.photoURL,
      imageUrl: mediaUrl,
      mediaUrl: mediaUrl,
      url: mediaUrl,
      type: isVideo ? "video" : "image",
      contentType: isVideo ? "video" : "image",
      mediaType: isVideo ? "video" : "image",
      fileName: file.name || "",
      fileSize: Number(file.size || 0),
      ...(result?.public_id ? { cloudinaryPublicId: result.public_id } : {}),
      ...(result?.asset_id ? { cloudinaryAssetId: result.asset_id } : {}),
      ...(result?.format ? { mediaFormat: result.format } : {}),
      ...(result?.width ? { mediaWidth: Number(result.width) } : {}),
      ...(result?.height ? { mediaHeight: Number(result.height) } : {}),
      ...(result?.duration ? { mediaDuration: Number(result.duration) } : {}),
      caption: postType === "story"
        ? (window.__instaProStoryCaption || "")
        : postType === "reel"
          ? reelCaptionWithHashtags
          : (window.__instaProPostCaption || ""),
      ...(postType === "story" ? { storyText: window.__instaProStoryOverlayText || "", storyFilter: window.__instaProStoryFilter || "Normal" } : {}),
      ...(postType === "reel" ? {
        title: reelTitle,
        hashtags: reelHashtags,
        tags: reelTaggedPeople,
        taggedPeople: reelTaggedPeople.split(",").map(tag => tag.trim().replace(/^@/, "")).filter(Boolean)
      } : {}),
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
        ...(soundtrackTrack?.filePage ? { musicSourcePage: soundtrackTrack.filePage } : {}),
        ...(postType === "story" ? { musicStartTime: Number(window.__instaProStoryMusicStart || 0), musicEndTime: Number(window.__instaProStoryMusicEnd || 15), ...(window.__instaProStoryMusicArtwork || soundtrackTrack?.artworkUrl ? { musicArtwork: window.__instaProStoryMusicArtwork || soundtrackTrack?.artworkUrl } : {}) } : {})
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
    window.__instaProStoryMusicStart = 0; window.__instaProStoryMusicEnd = 15; window.__instaProStoryMusicArtwork = "";

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
        : postType === "reel"
          ? "Reel successfully publish ho gayi! ✅"
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
