// reels.js — InstaPro Reels System
import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  increment,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const reelsPage = document.getElementById("reelsPage");

let unsubscribeReels = null;
let reelsData = [];
let activeIndex = 0;
let reelsObserver = null;
let reelsOpenedFromBottomTab = false;
let reelsOpenedFromProfile = false;
let reelsHistoryEntryAdded = false;
let activeStoryOwners = new Set();
let unsubscribeReelStories = null;
let reelFollowCache = new Map();
const countedReelViewsThisSession = new Set();

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

function mediaURL(post) {
  return post.mediaUrl ||
    post.mediaURL ||
    post.imageUrl ||
    post.imageURL ||
    post.url ||
    post.image ||
    "";
}

function isVideo(post) {
  const url = mediaURL(post);
  const type = String(post.type || post.mediaType || post.contentType || "")
    .toLowerCase();

  return type.includes("video") ||
    type.includes("reel") ||
    /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function username(post) {
  return post.username ||
    post.displayName ||
    "InstaPro User";
}

function photoURL(post) {
  return post.photo ||
    post.photoURL ||
    post.photoUrl ||
    "https://www.gravatar.com/avatar/?d=mp";
}

// Additive recommendation ranking: uses only signals already available on posts.
// It does not remove posts, change the database schema, or replace Firestore realtime sync.
function reelCreatedAt(post) {
  const value = post.createdAt || post.time || 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = Number(value) || Date.parse(value) || 0;
  return Number.isFinite(parsed) ? parsed : 0;
}
function rankReelsForViewer(posts) {
  const now = Date.now();
  const uid = currentUser()?.uid || "";
  return [...posts].sort((a, b) => {
    const score = post => {
      const ageHours = Math.max(0, (now - reelCreatedAt(post)) / 3600000);
      const likes = Array.isArray(post.likes) ? post.likes.length : Number(post.likesCount || 0);
      const comments = Array.isArray(post.comments) ? post.comments.length : Number(post.commentsCount || 0);
      const views = Number(post.viewsCount || post.playCount || post.views || 0);
      const saves = Array.isArray(post.savedBy) ? post.savedBy.length : Number(post.savesCount || 0);
      const author = post.uid || post.userId || post.authorId || post.ownerUid || "";
      const alreadyLiked = uid && Array.isArray(post.likes) && post.likes.includes(uid);
      // Recent posts get a freshness boost; meaningful interactions help quality signals.
      return (Math.log1p(Math.max(0, likes)) * 2.4) +
        (Math.log1p(Math.max(0, comments)) * 3.2) +
        (Math.log1p(Math.max(0, saves)) * 3.5) +
        (Math.log1p(Math.max(0, views)) * 0.45) +
        (ageHours < 24 ? 3.5 : ageHours < 72 ? 1.5 : 0) +
        (alreadyLiked ? -0.35 : 0) +
        (author && uid && author === uid ? -0.2 : 0);
    };
    const delta = score(b) - score(a);
    return delta || reelCreatedAt(b) - reelCreatedAt(a);
  });
}

function showReelsMessage(message) {
  let toast = document.getElementById("ipReelsToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ipReelsToast";
    toast.style.cssText = `
      position:fixed;bottom:90px;left:50%;
      transform:translateX(-50%);
      z-index:999999;background:#222;color:white;
      padding:12px 18px;border-radius:25px;
      font-size:13px;max-width:85%;text-align:center;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}

function installReelsStyles() {
  if (document.getElementById("ipReelsStyles")) return;

  const style = document.createElement("style");
  style.id = "ipReelsStyles";

  style.textContent = `
    #reelsPage { position:relative; }
    #ipReelsGrid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:3px;
      padding:3px;
    }
    .ipr-grid-item {
      position:relative;
      aspect-ratio:9/16;
      overflow:hidden;
      background:#151515;
      cursor:pointer;
    }
    .ipr-grid-item img,.ipr-grid-item video {
      width:100%;height:100%;object-fit:cover;
    }
    .ipr-grid-label {
      position:absolute;bottom:7px;left:7px;
      color:white;font-size:11px;
      text-shadow:0 1px 5px black;
    }
    #ipReelsViewer {
      position:fixed;inset:0;z-index:99990;
      background:#000;color:white;
      display:none;overflow:hidden;
      font-family:Arial,sans-serif;
    }
    #ipReelsViewer.ipr-open { display:block; }
    #ipReelsTrack {
      position:absolute;inset:0;overflow-y:auto;
      scroll-snap-type:y mandatory;
      scrollbar-width:none;
    }
    #ipReelsTrack::-webkit-scrollbar {display:none}
    .ipr-slide {
      position:relative;width:100%;height:100%;
      height:100dvh;scroll-snap-align:start;
      overflow:hidden;background:#000;
    }
    .ipr-media {
      position:absolute;inset:0;width:100%;height:100%;
      object-fit:contain;background:#000;
    }
    .ipr-shade {
      position:absolute;inset:0;pointer-events:none;
      background:linear-gradient(0deg,rgba(0,0,0,.75),transparent 38%,rgba(0,0,0,.22));
    }
    .ipr-close {
      position:absolute;top:18px;left:15px;z-index:5;
      border:1px solid rgba(255,255,255,.24);border-radius:50%;width:42px;height:42px;
      color:white;background:rgba(255,255,255,.09);font-size:25px;
      backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 4px 18px rgba(0,0,0,.14);
    }
    .ipr-actions {
      position:absolute;right:12px;bottom:110px;
      display:flex;flex-direction:column;gap:17px;
      align-items:center;z-index:4;
    }
    .ipr-action {
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-width:44px;min-height:48px;padding:2px 4px;
      border:0;border-radius:0;
      background:transparent;color:#fff;
      text-align:center;font-size:29px;cursor:pointer;
      text-shadow:0 1px 5px #000;
      transition:transform .16s ease,color .16s ease;
      touch-action:manipulation;
    }
     .ipr-action:active,.ipr-close:active { transform:scale(.92); }
    .ipr-action small {display:block;font-size:11px;margin-top:3px;color:rgba(255,255,255,.94)}
    .ipr-icon-action svg {width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .ipr-icon-action[aria-pressed="true"] svg {color:#ff3040}
    .ipr-icon-action.ipr-repost[aria-pressed="true"] svg {color:#22c55e}
    .ipr-action.ipr-liked {color:#ff3b78}
    .ipr-action.ipr-delete-reel {color:#ff6b8a}
    .ipr-bottom {
      padding:10px 12px;border:1px solid rgba(255,255,255,.15);border-radius:20px;
      background:rgba(12,12,16,.18);backdrop-filter:blur(16px) saturate(145%);
      -webkit-backdrop-filter:blur(16px) saturate(145%);
    }
    .ipr-delete-reel {color:#ff6b8a}
    .ipr-action.ipr-more-reel {font-size:32px;line-height:1;color:#fff}
    .ipr-reel-more-menu {position:absolute;right:58px;bottom:104px;z-index:12;min-width:150px;padding:6px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(20,20,24,.82);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:0 8px 28px rgba(0,0,0,.35)}
    .ipr-reel-more-menu button {display:block;width:100%;padding:12px 14px;border:0;border-radius:9px;background:transparent;color:#ff7188;text-align:left;font-size:14px;font-weight:650}
    /* Keep Reel profile details directly on the video; remove the glass box behind them. */
    .ipr-bottom{
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
    }
    .ipr-bottom {
      position:absolute;left:15px;right:88px;bottom:calc(34px + env(safe-area-inset-bottom));
      z-index:8;text-shadow:0 1px 5px #000;
      max-width:calc(100% - 108px);min-width:0;
      animation:iprDetailsFloat 3.8s ease-in-out infinite;
      pointer-events:auto;
    }
    .ipr-user{position:relative;z-index:9;display:flex;align-items:center;gap:9px;min-width:0;overflow:visible}
    .ipr-user-meta{position:relative;z-index:10;display:flex;align-items:center;gap:9px;min-width:0;flex-wrap:wrap;overflow:visible}
    .ipr-author{position:relative;z-index:11;display:inline-block;max-width:calc(100vw - 190px);overflow:hidden;text-overflow:ellipsis;color:#fff!important;opacity:1!important;text-shadow:0 1px 5px #000;white-space:nowrap}
    .ipr-caption{position:relative;z-index:8;max-height:4.5em;overflow:hidden;color:#fff;text-shadow:0 1px 5px #000}
    @keyframes iprDetailsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
    .ipr-user {
      display:flex;align-items:center;gap:9px;
      margin-bottom:12px;font-size:14px;font-weight:bold;
    }
    .ipr-user img {width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.75);box-sizing:border-box}\n    .ipr-user img.ipr-story-ring {border:2px solid transparent;background:linear-gradient(#111,#111) padding-box,conic-gradient(#ffb347,#ff2d95,#8b5cf6,#ffb347) border-box;padding:2px}\n    .ipr-user-meta{display:flex;align-items:center;gap:9px;min-width:0;flex-wrap:wrap}\n    .ipr-author{border:0;background:transparent;color:#fff;font:inherit;font-weight:750;padding:5px 0;cursor:pointer;text-align:left;white-space:nowrap}\n    .ipr-follow{border:1px solid rgba(255,255,255,.78);background:transparent;color:#fff;border-radius:7px;padding:5px 13px;font-size:13px;font-weight:600;line-height:1.2;backdrop-filter:none;-webkit-backdrop-filter:none;cursor:pointer;white-space:nowrap}\n    .ipr-follow.is-following{background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.5)}\n    .ipr-user img,.ipr-author,.ipr-follow{transition:transform .16s ease,filter .16s ease}\n    .ipr-user img:active,.ipr-author:active,.ipr-follow:active{transform:scale(.96)}
    .ipr-like-faces{position:absolute;left:18px;bottom:112px;z-index:9;display:flex;align-items:flex-end;gap:12px;max-width:48%;pointer-events:auto}
    .ipr-like-face{position:relative;width:38px;height:38px;flex:0 0 38px;border:0;padding:0;border-radius:50%;background:transparent;cursor:pointer;filter:drop-shadow(0 2px 5px rgba(0,0,0,.55))}
    .ipr-like-face img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,.85);box-sizing:border-box}
    .ipr-like-face .ipr-like-badge{position:absolute;right:-4px;bottom:-3px;font-size:16px;line-height:1;text-shadow:0 1px 4px #000}
    .ipr-like-face:active{transform:scale(.94)}
    .ipr-caption {font-size:13px;line-height:1.5;overflow-wrap:anywhere}
    /* Compact Instagram-DM-sized like animation, lifted above profile details */
    .ipr-heart {
      position:absolute;left:50%;top:calc(33% - 96px);
      transform:translate(-50%,-50%) scale(.2);
      font-size:48px;line-height:1;opacity:0;pointer-events:none;z-index:6;
      filter:drop-shadow(0 2px 8px rgba(0,0,0,.28));
    }
    .ipr-heart.ipr-heart-pop {animation:iprHeartPop .72s cubic-bezier(.2,.8,.25,1) forwards}
    @keyframes iprHeartPop {
      0% {opacity:0;transform:translate(-50%,-50%) scale(.2)}
      25% {opacity:1;transform:translate(-50%,-50%) scale(1.08)}
      65% {opacity:1;transform:translate(-50%,-50%) scale(1)}
      100% {opacity:0;transform:translate(-50%,-50%) scale(.82)}
    }
    .ipr-pause {
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font-size:65px;opacity:0;pointer-events:none;z-index:5;
    }
    .ipr-comment-box {
      position:absolute;left:0;right:0;bottom:0;z-index:20;
      background:#171717;border-radius:18px 18px 0 0;
      padding:18px 14px calc(16px + env(safe-area-inset-bottom));
      max-height:70%;display:none;overflow:auto;
    }
    .ipr-comment-box.ipr-comments-open {display:block}
    .ipr-comment-head {display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .ipr-comment-list {max-height:35vh;overflow:auto;font-size:13px}
    .ipr-comment-row {display:flex;gap:9px;margin:12px 0;overflow-wrap:anywhere}
    .ipr-comment-row img {width:30px;height:30px;border-radius:50%;object-fit:cover}
    .ipr-comment-form {display:flex;gap:7px;margin-top:12px}
    .ipr-comment-form input {
      flex:1;min-width:0;background:#292929;color:white;
      border:1px solid #444;border-radius:22px;padding:12px;
    }
    .ipr-comment-form button {
      background:#a855f7;color:white;border:0;
      border-radius:22px;padding:0 15px;
    }
    @media(min-width:700px) {
      #ipReelsViewer {max-width:480px;left:50%;transform:translateX(-50%)}
    }
  `;

  document.head.appendChild(style);
}

function ensureReelsUI() {
  installReelsStyles();

  let grid = document.getElementById("ipReelsGrid");

  if (!grid) {
    reelsPage.innerHTML = `
      <div style="padding:12px 15px;font-weight:800;font-size:18px">
        🎬 Reels
      </div>
      <div id="ipReelsGrid"></div>
    `;
    grid = document.getElementById("ipReelsGrid");
  }

  let viewer = document.getElementById("ipReelsViewer");

  if (!viewer) {
    viewer = document.createElement("div");
    viewer.id = "ipReelsViewer";
    viewer.innerHTML = `
      <button class="ipr-close" id="iprClose" aria-label="Close">‹</button>
      <div id="ipReelsTrack"></div>
      <div id="iprCommentBox" class="ipr-comment-box">
        <div class="ipr-comment-head">
          <strong>Comments</strong>
          <button id="iprCommentClose" class="ipr-action">✕</button>
        </div>
        <div id="iprCommentList" class="ipr-comment-list"></div>
        <form id="iprCommentForm" class="ipr-comment-form">
          <input id="iprCommentInput" maxlength="2000" placeholder="Add a comment..." required>
          <button type="submit">Post</button>
        </form>
      </div>
    `;
    document.body.appendChild(viewer);
  }

  return {
    grid,
    viewer,
    track: viewer.querySelector("#ipReelsTrack")
  };
}

function getPostRef(postId) {
  return doc(db, "posts", postId);
}

function getCommentRef(postId) {
  return collection(db, "posts", postId, "comments");
}

function currentUser() {
  return auth.currentUser;
}

async function deleteOwnReel(postId) {
  const user = currentUser();
  if (!user || user.isAnonymous) {
    showReelsMessage("Apni Reel delete karne ke liye login karein.");
    return;
  }

  const ownerOf = data => String(data.uid || data.userId || data.authorId || data.ownerUid || "");
  const urlsOf = data => [...new Set([
    data.mediaUrl, data.mediaURL, data.imageUrl, data.imageURL,
    data.videoUrl, data.videoURL, data.url, data.image
  ].filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
  const normalizedUrl = value => {
    try {
      const url = new URL(value);
      // Cloudinary transformations can differ while referring to the same uploaded asset.
      const parts = url.pathname.split("/");
      const uploadAt = parts.indexOf("upload");
      if (uploadAt >= 0) {
        const afterUpload = parts.slice(uploadAt + 1);
        while (afterUpload.length && /^(w_|h_|c_|q_|f_|dpr_|ar_|g_|e_|fl_|t_)/i.test(afterUpload[0])) afterUpload.shift();
        return url.hostname + "/upload/" + afterUpload.join("/");
      }
      return url.hostname + url.pathname;
    } catch (_) { return String(value || "").split("?")[0]; }
  };

  try {
    let snap = await getDoc(getPostRef(String(postId)));
    let ref = snap.ref;

    if (!snap.exists()) {
      const cached = reelsData.find(item =>
        String(item.id) === String(postId) ||
        String(item.firestoreId || item.postId || "") === String(postId)
      );
      const cachedUrls = new Set(urlsOf(cached || {}).map(normalizedUrl));
      if (!cachedUrls.size) {
        showReelsMessage("Delete ke liye Reel ka media URL nahi mila. Profile refresh karke dobara try karein.");
        return;
      }

      const found = new Map();
      // Try every legacy owner field first; keep matching strictly to this user's uploads.
      for (const field of ["uid", "userId", "authorId", "ownerUid"]) {
        try {
          const ownSnap = await getDocs(query(collection(db, "posts"), where(field, "==", user.uid)));
          ownSnap.forEach(item => {
            const data = item.data();
            if (ownerOf(data) === user.uid && urlsOf(data).some(url => cachedUrls.has(normalizedUrl(url)))) {
              found.set(item.id, item);
            }
          });
        } catch (lookupError) {
          console.warn("Reel delete owner lookup failed:", field, lookupError);
        }
      }

      // Last-resort lookup uses readable posts, but still verifies both owner UID and media URL.
      if (found.size === 0) {
        try {
          const allPosts = await getDocs(collection(db, "posts"));
          allPosts.forEach(item => {
            const data = item.data();
            if (ownerOf(data) === user.uid && urlsOf(data).some(url => cachedUrls.has(normalizedUrl(url)))) {
              found.set(item.id, item);
            }
          });
        } catch (lookupError) {
          console.error("Reel delete full lookup failed:", lookupError);
        }
      }

      if (found.size !== 1) {
        console.error("Reel delete record resolution failed", {
          requestedPostId: String(postId), uid: user.uid,
          cachedHasUrl: cachedUrls.size > 0, matchingOwnRecords: found.size
        });
        showReelsMessage(found.size > 1
          ? "Is media ki multiple matching entries hain; safety ke liye delete nahi ki. Profile refresh karke dobara try karein."
          : "Firestore mein is Reel ka matching record nahi mila. Upload record ya Firebase Rules ki jaanch zaroori hai.");
        return;
      }
      snap = [...found.values()][0];
      ref = snap.ref;
    }

    const post = snap.data();
    if (ownerOf(post) !== user.uid) {
      showReelsMessage("Aap sirf apni Reel delete kar sakte hain.");
      return;
    }
    if (!confirm("Kya aap is Reel ko hamesha ke liye delete karna chahte hain?")) return;

    await deleteDoc(ref);
    try {
      const deleted = new Set(JSON.parse(localStorage.getItem("instapro-deleted-post-ids") || "[]").map(String));
      deleted.add(String(snap.id));
      deleted.add(String(postId));
      localStorage.setItem("instapro-deleted-post-ids", JSON.stringify([...deleted].slice(-1000)));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("instapro:post-deleted", { detail: { postId: String(snap.id) } }));
    reelsData = reelsData.filter(item => String(item.id) !== String(snap.id) && String(item.id) !== String(postId));
    closeReelsViewer();
    showReelsMessage("Aapki Reel Firestore se delete ho gayi.");
  } catch (error) {
    console.error("Reel delete error:", error);
    showReelsMessage(error?.code === "permission-denied"
      ? "Delete permission denied. Firebase Firestore Rules mein owner ko delete permission deni hogi."
      : "Reel delete nahi hui: " + (error?.message || "Firestore error"));
  }
}

function setLikeCount(post) {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  return Math.max(0, Number(post.likeCount ?? likes.length) || 0);
}

async function toggleReelLike(postId, button, countLabel) {
  const user = currentUser();

  if (!user || user.isAnonymous) {
    showReelsMessage("Like karne ke liye login karein.");
    return;
  }

  try {
    const ref = getPostRef(postId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      showReelsMessage("Yeh Reel ab available nahi hai.");
      return;
    }

    const post = snap.data();
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const alreadyLiked = likes.includes(user.uid);
    const oldCount = setLikeCount(post);

    await updateDoc(ref, {
      likes: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      likeCount: alreadyLiked ? Math.max(0, oldCount - 1) : oldCount + 1
    });

    button.classList.toggle("ipr-liked", !alreadyLiked);
    button.innerHTML = `${alreadyLiked ? "♡" : "♥"}<small>${alreadyLiked ? Math.max(0, oldCount - 1) : oldCount + 1}</small>`;

    const item = reelsData.find(reel => reel.id === postId);
    if (item) {
      item.likes = alreadyLiked
        ? likes.filter(uid => uid !== user.uid)
        : [...likes, user.uid];

      item.likeCount = alreadyLiked ? Math.max(0, oldCount - 1) : oldCount + 1;
    }

    if (!alreadyLiked) {
      const ownerUid = post.uid || post.userId || post.authorId;

      if (ownerUid && ownerUid !== user.uid) {
        try {
          await addDoc(collection(db, "users", ownerUid, "notifications"), {
            type: "like",
            fromUid: user.uid,
            fromUsername: user.displayName || user.email?.split("@")[0] || "user",
            fromPhoto: user.photoURL || "",
            postId,
            message: "liked your Reel",
            createdAt: serverTimestamp(),
            read: false
          });
        } catch (notificationError) {
          console.error("Reel like notification error:", notificationError);
        }
      }
    }
  } catch (error) {
    console.error("Reel like error:", error);
    showReelsMessage("Like save nahi hua. Firestore Rules check karein.");
  }
}

async function toggleReelRepost(postId, button) {
  const user = currentUser();
  if (!user || user.isAnonymous) {
    showReelsMessage("Repost karne ke liye login karein.");
    return;
  }
  try {
    const ref = getPostRef(postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      showReelsMessage("Yeh Reel ab available nahi hai.");
      return;
    }
    const post = snap.data();
    const repostedBy = Array.isArray(post.repostedBy) ? post.repostedBy : [];
    const already = repostedBy.includes(user.uid);
    const count = Math.max(0, Number(post.repostCount) || 0);
    await updateDoc(ref, {
      repostedBy: already ? arrayRemove(user.uid) : arrayUnion(user.uid),
      repostCount: already ? Math.max(0, count - 1) : count + 1
    });
    if (button) {
      button.classList.toggle("ipr-liked", !already);
      const small = button.querySelector("small");
      if (small) small.textContent = String(already ? Math.max(0, count - 1) : count + 1);
    }
    const item = reelsData.find(reel => reel.id === postId);
    if (item) {
      item.repostedBy = already ? repostedBy.filter(uid => uid !== user.uid) : [...repostedBy, user.uid];
      item.repostCount = already ? Math.max(0, count - 1) : count + 1;
    }
    showReelsMessage(already ? "Repost hata diya." : "Reel repost ho gayi.");
  } catch (error) {
    console.error("Reel repost error:", error);
    showReelsMessage("Repost save nahi hua. Firestore Rules check karein.");
  }
}

function animateHeart(heart) {
  heart.classList.remove("ipr-heart-pop");
  void heart.offsetWidth;
  heart.classList.add("ipr-heart-pop");
}

function renderReelsGrid(grid) {
  const visible = reelsData.filter(post => isVideo(post) && mediaURL(post));

  if (!visible.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px 15px;opacity:.65">
        <div style="font-size:40px">🎬</div>
        <p>Abhi koi video Reel nahi hai.</p>
        <small>Video upload karne ke baad yahan dikhega.</small>
      </div>
    `;
    return;
  }

  grid.innerHTML = visible.map(post => `
    <div class="ipr-grid-item" data-reel-id="${escapeHTML(post.id)}">
      <video src="${escapeHTML(mediaURL(post))}" muted playsinline preload="auto"></video>
      <div class="ipr-grid-label">▶ ${Number(post.viewCount ?? post.viewsCount ?? post.playCount ?? post.views) || 0} views</div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-reel-id]").forEach(tile => {
    tile.addEventListener("click", () => {
      const index = reelsData.findIndex(post => post.id === tile.dataset.reelId);
      openReelsViewer(Math.max(0, index));
    });
  });
}

function renderReelsSlides(track) {
  const visible = reelsData.filter(post => isVideo(post) && mediaURL(post));

  track.innerHTML = visible.map(post => {
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const user = currentUser();
    const liked = !!user && likes.includes(user.uid);
    const count = setLikeCount(post);
    const id = escapeHTML(post.id);

    return `
      <section class="ipr-slide" data-slide-id="${id}">
        <video class="ipr-media" src="${escapeHTML(mediaURL(post))}"
          playsinline loop preload="auto" disablepictureinpicture></video>
        <div class="ipr-shade"></div>
        <div class="ipr-heart">❤️</div>
        <div class="ipr-like-faces" data-like-faces="${id}" aria-label="People who liked this Reel"></div>
        <div class="ipr-pause">▶</div>

        <div class="ipr-actions">
          <button class="ipr-action ipr-like ipr-icon-action ${liked ? "ipr-liked" : ""}" data-like="${id}" aria-label="Like Reel" aria-pressed="${liked}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg><small>${count}</small>
          </button>
          <button class="ipr-action ipr-icon-action" data-comment="${id}" aria-label="Comments">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.1a9 9 0 0 1-.9-4.4A8.5 8.5 0 1 1 21 11.5Z"/></svg><small>${Number(post.commentCount) || 0}</small>
          </button>
          <button class="ipr-action ipr-icon-action ipr-repost" data-repost="${id}" aria-label="Repost Reel" aria-pressed="${!!user && Array.isArray(post.repostedBy) && post.repostedBy.includes(user.uid)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4V7H7a3 3 0 0 0-3 3v1H2v-1a5 5 0 0 1 5-5h10V2ZM7 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3Z"/></svg><small>${Number(post.repostCount) || 0}</small>
          </button>
          <button class="ipr-action ipr-icon-action" data-share="${id}" aria-label="Share Reel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 9 15M22 2l-8 20-5-7-7-5 20-8Z"/></svg><small>Share</small>
          </button>
          <button class="ipr-action ipr-icon-action" data-save-reel="${id}" aria-label="Save Reel" aria-pressed="${!!user && Array.isArray(post.savedBy) && post.savedBy.includes(user.uid)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg><small>${!!user && Array.isArray(post.savedBy) && post.savedBy.includes(user.uid) ? "Saved" : "Save"}</small>
          </button>
          <button class="ipr-action ipr-icon-action" data-mute="${id}" aria-label="Toggle sound">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/></svg><small>Sound</small>
          </button>
          ${currentUser() && (post.uid || post.userId || post.authorId || post.ownerUid) === currentUser().uid ? `<button type="button" class="ipr-action ipr-more-reel" data-reel-more="${id}" aria-label="More Reel options">⋮<small>More</small></button>` : ""}
        </div>

        <div class="ipr-bottom">
          <div class="ipr-user">
            <img class="${activeStoryOwners.has(post.uid || post.userId || post.authorId || post.ownerUid) ? "ipr-story-ring" : ""}" data-open-reel-profile="${escapeHTML(post.uid || post.userId || post.authorId || post.ownerUid || "")}" src="${escapeHTML(photoURL(post))}" alt="Profile photo" loading="lazy">
            <div class="ipr-user-meta">
              <button class="ipr-author" type="button" data-open-reel-profile="${escapeHTML(post.uid || post.userId || post.authorId || post.ownerUid || "")}">@${escapeHTML(username(post))}</button>
              ${currentUser() && (post.uid || post.userId || post.authorId || post.ownerUid) && (post.uid || post.userId || post.authorId || post.ownerUid) !== currentUser().uid && reelFollowCache.get(post.uid || post.userId || post.authorId || post.ownerUid) !== true ? `<button type="button" class="ipr-follow" data-follow-reel="${escapeHTML(post.uid || post.userId || post.authorId || post.ownerUid)}">Follow</button>` : ""}
            </div>
          </div>
          <div class="ipr-caption">${escapeHTML(post.caption || "")}</div>
        </div>
      </section>
    `;
  }).join("");

  track.querySelectorAll("[data-like-faces]").forEach(async box => {
    const postId = box.dataset.likeFaces;
    const post = reelsData.find(item => item.id === postId);
    const likedUids = Array.isArray(post?.likes) ? [...new Set(post.likes)].slice(-2).reverse() : [];
    if (!likedUids.length) return;
    const faces = await Promise.all(likedUids.map(async uid => {
      const me = currentUser();
      if (me?.uid === uid) return {uid, username: me.displayName || "You", photo: me.photoURL || ""};
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {uid, username: data.username || data.displayName || data.name || "InstaPro User", photo: data.photoURL || data.photoUrl || data.photo || data.profilePhoto || ""};
      } catch (error) { console.warn("Like avatar load failed:", error); return null; }
    }));
    if (!box.isConnected) return;
    box.innerHTML = faces.filter(Boolean).map(person => `
      <button type="button" class="ipr-like-face" data-like-profile="${escapeHTML(person.uid)}" aria-label="Open ${escapeHTML(person.username)} profile" title="${escapeHTML(person.username)}">
        <img src="${escapeHTML(person.photo || "https://www.gravatar.com/avatar/?d=mp")}" alt="">
        <span class="ipr-like-badge">❤️</span>
      </button>`).join("");
    box.querySelectorAll("[data-like-profile]").forEach(button => button.addEventListener("click", async event => {
      event.stopPropagation();
      const uid = button.dataset.likeProfile;
      try {
        if (typeof window.openProfile !== "function") await import("./profile.js");
        if (typeof window.openProfile === "function") window.openProfile(uid);
      } catch (error) { console.error("Like profile open failed:", error); }
    }));
  });

  track.querySelectorAll("[data-open-reel-profile]").forEach(el => {
    el.addEventListener("click", async event => {
      event.stopPropagation();
      const uid = el.dataset.openReelProfile;
      if (!uid) return;
      try {
        if (typeof window.openProfile !== "function") await import("./profile.js");
        if (typeof window.openProfile === "function") window.openProfile(uid);
      } catch (error) { console.error("Reel profile open failed:", error); }
    });
  });
  track.querySelectorAll("[data-follow-reel]").forEach(button => {
    button.addEventListener("click", async event => {
      event.stopPropagation();
      const me = currentUser(), targetUid = button.dataset.followReel;
      if (!me || me.isAnonymous) { showReelsMessage("Follow karne ke liye login karein."); return; }
      if (!targetUid || targetUid === me.uid) return;
      button.disabled = true;
      const wasFollowing = reelFollowCache.get(targetUid) === true;
      try {
        const mineRef = doc(db, "users", me.uid);
        const targetRef = doc(db, "users", targetUid);
        const [mineSnap, targetSnap] = await Promise.all([getDoc(mineRef), getDoc(targetRef)]);
        if (!mineSnap.exists() || !targetSnap.exists()) throw new Error("User profile not found");
        const following = Array.isArray(mineSnap.data().following) ? mineSnap.data().following : [];
        const followers = Array.isArray(targetSnap.data().followers) ? targetSnap.data().followers : [];
        if (wasFollowing || following.includes(targetUid)) {
          await Promise.all([
            updateDoc(mineRef, { following: arrayRemove(targetUid), followingCount: Math.max(0, Number(mineSnap.data().followingCount || following.length) - 1) }),
            updateDoc(targetRef, { followers: arrayRemove(me.uid), followersCount: Math.max(0, Number(targetSnap.data().followersCount || followers.length) - 1) })
          ]);
          reelFollowCache.set(targetUid, false);
        } else {
          await Promise.all([
            updateDoc(mineRef, { following: arrayUnion(targetUid), followingCount: Number(mineSnap.data().followingCount ?? following.length) + 1 }),
            updateDoc(targetRef, { followers: arrayUnion(me.uid), followersCount: Number(targetSnap.data().followersCount ?? followers.length) + 1 })
          ]);
          reelFollowCache.set(targetUid, true);
        }
        renderReelsSlides(track);
      } catch (error) { console.error("Reel follow failed:", error); showReelsMessage("Follow save nahi hua. Firebase Rules check karein."); }
      finally { button.disabled = false; }
    });
  });

  track.querySelectorAll(".ipr-slide").forEach(slide => {
    const video = slide.querySelector("video");
    const heart = slide.querySelector(".ipr-heart");
    const pauseIcon = slide.querySelector(".ipr-pause");
    let lastTap = 0;

    slide.addEventListener("click", event => {
      if (event.target.closest("button")) return;

      const now = Date.now();

      if (now - lastTap < 320) {
        const postId = slide.dataset.slideId;
        const item = reelsData.find(post => post.id === postId);
        const user = currentUser();

        animateHeart(heart);

        if (!user || !user.isAnonymous) {
          if (user && !(item?.likes || []).includes(user.uid)) {
            const likeButton = slide.querySelector("[data-like]");
            const countLabel = likeButton.querySelector("small");
            toggleReelLike(postId, likeButton, countLabel);
          }
        } else {
          showReelsMessage("Like karne ke liye login karein.");
        }
      } else {
        if (video.paused) {
          video.play().catch(() => {});
          pauseIcon.textContent = "▶";
        } else {
          video.pause();
          pauseIcon.textContent = "Ⅱ";
        }

        pauseIcon.style.opacity = "1";
        setTimeout(() => pauseIcon.style.opacity = "0", 450);
      }

      lastTap = now;
    });
  });

  track.querySelectorAll("[data-like]").forEach(button => {
    button.addEventListener("click", () => {
      toggleReelLike(
        button.dataset.like,
        button,
        button.querySelector("small")
      );
    });
  });

  track.querySelectorAll("[data-mute]").forEach(button => {
    button.addEventListener("click", () => {
      const slide = button.closest(".ipr-slide");
      const video = slide.querySelector("video");
      video.muted = !video.muted;
      button.innerHTML = `${video.muted ? "🔇" : "🔊"}<small>Sound</small>`;
    });
  });

  track.querySelectorAll("[data-reel-more]").forEach(button => {
    button.addEventListener("click", () => {
      const slide = button.closest(".ipr-slide");
      const existing = slide.querySelector(".ipr-reel-more-menu");
      if (existing) {
        existing.remove();
        button.setAttribute("aria-expanded", "false");
        return;
      }
      track.querySelectorAll(".ipr-reel-more-menu").forEach(menu => menu.remove());
      track.querySelectorAll("[data-reel-more]").forEach(other => other.setAttribute("aria-expanded", "false"));
      const menu = document.createElement("div");
      menu.className = "ipr-reel-more-menu";
      menu.innerHTML = '<button type="button" data-delete-reel="' + escapeHTML(button.dataset.reelMore) + '">🗑️ &nbsp; Delete Reel</button>';
      slide.appendChild(menu);
      button.setAttribute("aria-expanded", "true");
      menu.querySelector("[data-delete-reel]").addEventListener("click", () => {
        menu.remove();
        button.setAttribute("aria-expanded", "false");
        deleteOwnReel(button.dataset.reelMore);
      });
    });
  });

  track.querySelectorAll("[data-repost]").forEach(button => {
    const post = reelsData.find(item => item.id === button.dataset.repost);
    if (post?.repostedBy?.includes(currentUser()?.uid)) button.classList.add("ipr-liked");
    button.addEventListener("click", () => toggleReelRepost(button.dataset.repost, button));
  });

  track.querySelectorAll("[data-save-reel]").forEach(button => {
    button.addEventListener("click", async () => {
      const user = currentUser();
      if (!user) { showReelsMessage("Reel save karne ke liye login karein."); return; }
      const postId = button.dataset.saveReel;
      const post = reelsData.find(item => item.id === postId);
      if (!post) return;
      const already = Array.isArray(post.savedBy) && post.savedBy.includes(user.uid);
      button.disabled = true;
      try {
        await updateDoc(doc(db, "posts", postId), {
          savedBy: already ? arrayRemove(user.uid) : arrayUnion(user.uid),
          savesCount: Math.max(0, Number(post.savesCount || 0) + (already ? -1 : 1))
        });
        post.savedBy = already ? (post.savedBy || []).filter(uid => uid !== user.uid) : [...(post.savedBy || []), user.uid];
        post.savesCount = Math.max(0, Number(post.savesCount || 0) + (already ? -1 : 1));
        button.setAttribute("aria-pressed", String(!already));
        button.querySelector("small").textContent = already ? "Save" : "Saved";
        showReelsMessage(already ? "Saved reels se hata diya." : "Reel Saved.");
      } catch (error) {
        console.error("Reel save error:", error);
        showReelsMessage("Reel save nahi hui. Firestore Rules check karein.");
      } finally { button.disabled = false; }
    });
  });

  track.querySelectorAll("[data-share]").forEach(button => {
    button.addEventListener("click", async () => {
      const post = reelsData.find(item => item.id === button.dataset.share);
      const url = mediaURL(post || {});

      try {
        if (navigator.share) {
          await navigator.share({
            title: "InstaPro Reel",
            text: post?.caption || "Check out this Reel!",
            url
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          showReelsMessage("Reel link copied.");
        } else {
          showReelsMessage("Share is not supported on this browser.");
        }
      } catch (error) {
        if (error.name !== "AbortError") console.error("Reel share error:", error);
      }
    });
  });

  track.querySelectorAll("[data-comment]").forEach(button => {
    button.addEventListener("click", () => openReelComments(button.dataset.comment));
  });

  if (reelsObserver) reelsObserver.disconnect();

  reelsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target.querySelector("video");

      if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
        activeIndex = [...track.children].indexOf(entry.target);

        track.querySelectorAll("video").forEach(other => {
          if (other !== video) {
            other.pause();
            other.muted = true;
          }
        });

        video.play().then(() => countReelView(entry.target.dataset.slideId)).catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { root: track, threshold: [0.3, 0.7, 0.95] });

  track.querySelectorAll(".ipr-slide").forEach(slide => reelsObserver.observe(slide));
}

function openReelsViewer(index) {
  const { viewer, track } = ensureReelsUI();
  const visible = reelsData.filter(post => isVideo(post) && mediaURL(post));

  if (!visible.length) {
    showReelsMessage("Abhi koi video Reel nahi hai.");
    return;
  }

  renderReelsSlides(track);
  viewer.classList.add("ipr-open");
  document.body.style.overflow = "hidden";
  // Hide the intermediate Reels grid when launched from the Reels tab.
  if (reelsOpenedFromBottomTab) reelsPage.style.display = "none";

  // Add a history entry for BOTH launch paths. Android/browser Back then closes
  // only this full-screen player, preserving the exact profile underneath.
  if ((reelsOpenedFromBottomTab || reelsOpenedFromProfile) && !reelsHistoryEntryAdded) {
    try {
      history.pushState({
        instaproReelsPlayer: true,
        source: reelsOpenedFromProfile ? "profile" : "reels"
      }, "", location.href);
      reelsHistoryEntryAdded = true;
    } catch (_) {}
  }

  const slides = track.querySelectorAll(".ipr-slide");
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));

  slides[activeIndex]?.scrollIntoView({ block: "start" });

  setTimeout(() => {
    const video = slides[activeIndex]?.querySelector("video");
    if (video) video.play().then(() => countReelView(slides[activeIndex]?.dataset.slideId)).catch(() => {});
  }, 150);
}

async function countReelView(postId) {
  if (!postId || countedReelViewsThisSession.has(String(postId))) return;
  countedReelViewsThisSession.add(String(postId));
  try {
    await updateDoc(doc(db, "posts", String(postId)), { viewCount: increment(1) });
  } catch (error) {
    countedReelViewsThisSession.delete(String(postId));
    console.warn("Reel view count could not be saved:", error);
  }
}

function closeReelsViewer() {
  const viewer = document.getElementById("ipReelsViewer");
  if (!viewer) return;

  viewer.classList.remove("ipr-open");
  viewer.querySelectorAll("video").forEach(video => video.pause());

  const box = viewer.querySelector("#iprCommentBox");
  box?.classList.remove("ipr-comments-open");

  document.body.style.overflow = "";

  // If a Reel was opened from a profile, close only the player and reveal
  // the same profile overlay. Do not route to the standalone Reels page/Home.
  if (reelsOpenedFromProfile) {
    reelsOpenedFromProfile = false;
    if (reelsPage) reelsPage.style.display = "none";
  } else if (reelsOpenedFromBottomTab) {
    reelsOpenedFromBottomTab = false;
    reelsPage.style.display = "none";
    // One Back/close action returns straight to the main Home entry.
    const homeTab = document.querySelector('.bBtn[data-v="home"]');
    if (homeTab) homeTab.click();
    else {
      document.querySelectorAll(".page").forEach(page => { page.style.display = "none"; });
      const homePage = document.getElementById("homePage");
      if (homePage) homePage.style.display = "block";
      try { sessionStorage.setItem("instapro-last-page", "home"); } catch (_) {}
    }
  }

  if (reelsObserver) {
    reelsObserver.disconnect();
    reelsObserver = null;
  }
}

let unsubscribeActiveComments = null;
let activeCommentPostId = null;

function openReelComments(postId) {
  const user = currentUser();

  if (!user || user.isAnonymous) {
    showReelsMessage("Comment karne ke liye login karein.");
    return;
  }

  const viewer = document.getElementById("ipReelsViewer");
  const box = viewer.querySelector("#iprCommentBox");
  const list = viewer.querySelector("#iprCommentList");
  const input = viewer.querySelector("#iprCommentInput");
  const form = viewer.querySelector("#iprCommentForm");

  activeCommentPostId = postId;
  box.classList.add("ipr-comments-open");
  list.innerHTML = "Loading comments...";

  if (unsubscribeActiveComments) unsubscribeActiveComments();

  const commentsRef = getCommentRef(postId);

  unsubscribeActiveComments = onSnapshot(
    query(commentsRef, orderBy("createdAt", "asc")),
    snapshot => {
      if (activeCommentPostId !== postId) return;

      if (snapshot.empty) {
        list.innerHTML = "<p>No comments yet. Be the first!</p>";
        return;
      }

      list.innerHTML = snapshot.docs.map(docSnap => {
        const comment = docSnap.data();
        const commentId = docSnap.id;
        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const me = currentUser();
        const liked = !!me && likedBy.includes(me.uid);
        return `
          <div class="ipr-comment-row" data-comment-id="${escapeHTML(commentId)}">
            <img src="${escapeHTML(comment.photo || "https://www.gravatar.com/avatar/?d=mp")}" alt="">
            <div style="flex:1;min-width:0">
              <strong>${escapeHTML(comment.username || "User")}</strong><br>
              <span>${escapeHTML(comment.text || "")}</span>
              <div style="display:flex;gap:14px;align-items:center;margin-top:6px;font-size:12px">
                <button type="button" data-comment-like="${escapeHTML(commentId)}" style="border:0;background:none;color:${liked ? "#ff4d86" : "#bbb"};padding:2px 0;font:inherit;cursor:pointer">${liked ? "♥ Liked" : "♡ Like"}${likedBy.length ? " · "+likedBy.length : ""}</button>
                <button type="button" data-comment-reply="${escapeHTML(commentId)}" data-reply-name="${escapeHTML(comment.username || "User")}" style="border:0;background:none;color:#bbb;padding:2px 0;font:inherit;cursor:pointer">Reply</button>
              </div>
              ${replies.map(reply => `<div style="margin:9px 0 0 10px;padding-left:10px;border-left:2px solid #555"><strong>${escapeHTML(reply.username || "User")}</strong><br><span>${escapeHTML(reply.text || "")}</span></div>`).join("")}
              <form data-reply-form="${escapeHTML(commentId)}" style="display:none;gap:6px;margin-top:8px">
                <input data-reply-input="${escapeHTML(commentId)}" maxlength="1000" placeholder="Reply to ${escapeHTML(comment.username || "User")}..." style="flex:1;min-width:0;background:#292929;color:white;border:1px solid #444;border-radius:18px;padding:8px 10px">
                <button type="submit" style="border:0;border-radius:18px;padding:0 12px;background:#a855f7;color:white">Send</button>
              </form>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll("[data-comment-like]").forEach(button => {
        button.onclick = async () => {
          const me = currentUser();
          if (!me || me.isAnonymous) return showReelsMessage("Comment like karne ke liye login karein.");
          try {
            const ref = doc(db, "posts", postId, "comments", button.dataset.commentLike);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;
            const likedBy = Array.isArray(snap.data().likedBy) ? snap.data().likedBy : [];
            await updateDoc(ref, { likedBy: likedBy.includes(me.uid) ? arrayRemove(me.uid) : arrayUnion(me.uid) });
          } catch (error) {
            console.error("Comment like error:", error);
            showReelsMessage("Comment like save nahi hua. Firestore Rules check karein.");
          }
        };
      });

      list.querySelectorAll("[data-comment-reply]").forEach(button => {
        button.onclick = () => {
          const form = list.querySelector(`[data-reply-form="${button.dataset.commentReply}"]`);
          if (!form) return;
          form.style.display = form.style.display === "flex" ? "none" : "flex";
          form.querySelector("input")?.focus();
        };
      });

      list.querySelectorAll("[data-reply-form]").forEach(form => {
        form.onsubmit = async event => {
          event.preventDefault();
          const me = currentUser();
          if (!me || me.isAnonymous) return showReelsMessage("Reply karne ke liye login karein.");
          const commentId = form.dataset.replyForm;
          const input = form.querySelector("input");
          const replyText = input.value.trim();
          if (!replyText) return;
          try {
            await updateDoc(doc(db, "posts", postId, "comments", commentId), {
              replies: arrayUnion({
                uid: me.uid,
                username: me.displayName || me.email?.split("@")[0] || "User",
                photo: me.photoURL || "",
                text: replyText,
                createdAt: new Date().toISOString()
              })
            });
            input.value = "";
            form.style.display = "none";
            showReelsMessage("Reply added");
          } catch (error) {
            console.error("Comment reply error:", error);
            showReelsMessage("Reply save nahi hua. Firestore Rules check karein.");
          }
        };
      });
    },
    error => {
      console.error("Reel comments error:", error);
      list.innerHTML = "<p>Comments load nahi hue. Firestore Rules check karein.</p>";
    }
  );

  form.onsubmit = async event => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    try {
      await addDoc(commentsRef, {
        uid: user.uid,
        username: user.displayName || user.email?.split("@")[0] || "User",
        photo: user.photoURL || "",
        text,
        createdAt: serverTimestamp()
      });

      const postRef = getPostRef(postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        await updateDoc(postRef, {
          commentCount: increment(1)
        });

        const post = postSnap.data();
        const ownerUid = post.uid || post.userId || post.authorId;

        if (ownerUid && ownerUid !== user.uid) {
          try {
            await addDoc(
              collection(db, "users", ownerUid, "notifications"),
              {
                type: "comment",
                fromUid: user.uid,
                fromUsername:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "User",
                fromPhoto: user.photoURL || "",
                postId,
                message: "commented on your Reel",
                createdAt: serverTimestamp(),
                read: false
              }
            );
          } catch (notificationError) {
            console.error("Reel notification error:", notificationError);
          }
        }
      }

      input.value = "";
      showReelsMessage("Comment added successfully");
    } catch (error) {
      console.error("Reel comment error:", error);
      showReelsMessage("Comment save nahi hua. Firestore Rules check karein.");
    }
  };
}

window.addEventListener("pagehide", () => {
  if (unsubscribeReelStories) { unsubscribeReelStories(); unsubscribeReelStories = null; }
  unsubscribeReelStories = onSnapshot(collection(db, "stories"), snapshot => {
    const now = Date.now(), owners = new Set();
    snapshot.docs.forEach(item => {
      const story = item.data();
      const uid = story.uid || story.userId || story.authorId || story.ownerUid || story.userUID;
      const toMillis = value => {
        if (value?.toMillis) return value.toMillis();
        if (value?.toDate) return value.toDate().getTime();
        if (typeof value === "number") return value;
        if (typeof value === "string") return Date.parse(value) || Number(value) || 0;
        return 0;
      };
      const created = toMillis(story.createdAt || story.timestamp || story.time);
      const expires = toMillis(story.expiresAt) || ((created || now) + 86400000);
      const url = story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
      if (uid && url && expires > now) owners.add(uid);
    });
    activeStoryOwners = owners;
    const track = document.getElementById("ipReelsTrack");
    if (track && track.querySelector(".ipr-slide")) renderReelsSlides(track);
  }, error => console.warn("Reel story ring listener:", error));

  // Keep Reel Follow buttons in sync with the signed-in user's Firestore following list.
  onAuthStateChanged(auth, async user => {
    reelFollowCache = new Map();
    if (user && !user.isAnonymous) {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const following = snap.exists() && Array.isArray(snap.data().following) ? snap.data().following : [];
        reelFollowCache = new Map(following.map(uid => [String(uid), true]));
      } catch (error) {
        console.warn("Reel follow state:", error);
      }
    }
    const track = document.getElementById("ipReelsTrack");
    if (track && track.querySelector(".ipr-slide")) renderReelsSlides(track);
  });

  if (unsubscribeReels) {
    unsubscribeReels();
  }

  if (unsubscribeActiveComments) {
    unsubscribeActiveComments();
  }

  if (reelsObserver) {
    reelsObserver.disconnect();
  }
});


// Open a specific feed video inside the same full-screen Reels viewer.
window.InstaProReels = window.InstaProReels || {};
window.InstaProReels.openPost = function(postId, feedPost = null) {
  // Remember the source screen so Android/browser Back returns to the profile.
  reelsOpenedFromProfile = !!document.getElementById("ipProfileOverlay");
  let visible = reelsData.filter(post => isVideo(post) && mediaURL(post));
  let index = visible.findIndex(post => String(post.id) === String(postId));

  // Home Feed may contain a video that has not entered the Reels query/cache yet.
  // Add that exact post temporarily so the same full-screen Reels player can play it.
  if (index < 0 && feedPost && String(feedPost.id) === String(postId) && mediaURL(feedPost)) {
    const playablePost = {
      ...feedPost,
      id: String(postId),
      type: feedPost.type || feedPost.mediaType || "video"
    };
    reelsData = [playablePost, ...reelsData.filter(post => String(post.id) !== String(postId))];
    visible = reelsData.filter(post => isVideo(post) && mediaURL(post));
    index = visible.findIndex(post => String(post.id) === String(postId));
  }

  if (index < 0) {
    showReelsMessage("Yeh video play nahi ho paayi. Feed refresh karke dobara try karein.");
    return false;
  }
  openReelsViewer(index);
  return true;
};

// ------------------------------------------------------
// START REALTIME REELS FEED
// ------------------------------------------------------

function startReelsSystem() {
  if (!reelsPage) {
    console.error("Reels page element #reelsPage nahi mila.");
    return;
  }

  const { grid, viewer } = ensureReelsUI();

  // Close controls ko sirf ek baar bind karein.
  const closeButton = viewer.querySelector("#iprClose");
  if (closeButton && closeButton.dataset.bound !== "true") {
    closeButton.dataset.bound = "true";
    closeButton.addEventListener("click", () => {
      // Consume the player history entry so the next Back doesn't navigate away
      // from the profile the user originally opened this Reel from.
      if (reelsHistoryEntryAdded) {
        reelsHistoryEntryAdded = false;
        history.back();
        return;
      }
      closeReelsViewer();
    });
  }

  const commentClose = viewer.querySelector("#iprCommentClose");
  if (commentClose && commentClose.dataset.bound !== "true") {
    commentClose.dataset.bound = "true";
    commentClose.addEventListener("click", () => {
      viewer.querySelector("#iprCommentBox")?.classList.remove("ipr-comments-open");
      if (unsubscribeActiveComments) {
        unsubscribeActiveComments();
        unsubscribeActiveComments = null;
      }
      activeCommentPostId = null;
    });
  }

  if (unsubscribeReels) {
    unsubscribeReels();
    unsubscribeReels = null;
  }

  // Immediately remove deleted Reel cards/viewers if another page deletes one in this tab.
  window.addEventListener("instapro:post-deleted", event => {
    const deletedId = String(event.detail?.postId || "");
    if (!deletedId) return;
    reelsData = reelsData.filter(post => String(post.id) !== deletedId);
    const grid = document.getElementById("reelsGrid");
    if (grid) renderReelsGrid(grid);
    const viewer = document.getElementById("ipReelsViewer");
    const active = viewer?.querySelector(".ipr-slide");
    if (active && String(active.dataset.slideId) === deletedId) closeReelsViewer();
  });

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  unsubscribeReels = onSnapshot(
    postsQuery,
    async snapshot => {
      const deletedIds = (() => {
        try { return new Set(JSON.parse(localStorage.getItem("instapro-deleted-post-ids") || "[]").map(String)); }
        catch (_) { return new Set(); }
      })();
      const rawReels = snapshot.docs
        .filter(item => !deletedIds.has(String(item.id)))
        .map(item => ({ ...item.data(), id: item.id }));
      const privacyApi = window.InstaProPrivate;
      const viewerUid = currentUser()?.uid || "";
      const visibleReels = [];
      for (const reel of rawReels) {
        const owner = reel.uid || reel.userId || reel.authorId || reel.ownerUid || "";
        if (owner && owner !== viewerUid && privacyApi) {
          try {
            const privacy = await privacyApi.getAccountPrivacy(owner);
            if (privacy.isPrivate && !(await privacyApi.canViewAccountContent(owner, viewerUid))) continue;
          } catch (privacyError) {
            console.warn("Could not verify Reel account privacy; hiding Reel:", privacyError);
            continue;
          }
        } else if (owner && owner !== viewerUid && !privacyApi) {
          // Fail closed until privacy helpers have initialized.
          continue;
        }
        visibleReels.push(reel);
      }
      reelsData = rankReelsForViewer(visibleReels);
      // If a Reel was deleted in Profile/another tab, immediately remove it from the open viewer too.
      const viewer = document.getElementById("ipReelsViewer");
      const track = viewer?.querySelector("#iprTrack");
      const activeSlide = track?.querySelector(".ipr-slide");
      const activePostId = activeSlide?.dataset.slideId;
      if (viewer?.classList.contains("ipr-open") && activePostId && !reelsData.some(post => String(post.id) === String(activePostId) && isVideo(post) && mediaURL(post))) {
        closeReelsViewer();
      }
      renderReelsGrid(grid);
    },
    error => {
      console.error("Realtime Reels load error:", error);
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px 16px;color:white">
          <p>Reels load nahi ho paayi.</p>
          <small>Internet aur Firestore Rules check karein.</small>
        </div>
      `;
    }
  );
}

// Tapping the bottom Reels tab opens the full-screen, vertically scrollable player directly.
// The existing viewer contains all available video Reels; each swipe snaps to and plays the next one.
document.addEventListener("click", event => {
  const reelsTab = event.target.closest('.bBtn[data-v="reels"]');
  if (!reelsTab) return;
  // Open the full-screen player on the first tap, without showing the grid page.
  reelsOpenedFromBottomTab = true;
  setTimeout(() => {
    const videoReels = reelsData.filter(post => isVideo(post) && mediaURL(post));
    if (videoReels.length) openReelsViewer(0);
    else {
      reelsOpenedFromBottomTab = false;
      showReelsMessage("Abhi koi video Reel nahi hai.");
    }
  }, 0);
}, true);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startReelsSystem, { once: true });
} else {
  startReelsSystem();
}


// Android/browser Back closes the player and restores its source screen.
window.addEventListener("popstate", event => {
  const viewer = document.getElementById("ipReelsViewer");
  if (!viewer?.classList.contains("ipr-open")) return;
  if (event.state?.instaproReelsPlayer) return;
  reelsHistoryEntryAdded = false;
  closeReelsViewer();
});
