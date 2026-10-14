// reels.js — InstaPro Reels System
import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const reelsPage = document.getElementById("reelsPage");

let unsubscribeReels = null;
let reelsData = [];
let activeIndex = 0;
let reelsObserver = null;

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
    .ipr-action.ipr-liked {color:#ff3b78}
    .ipr-action.ipr-delete-reel {color:#ff6b8a}
    .ipr-bottom {
      padding:10px 12px;border:1px solid rgba(255,255,255,.15);border-radius:20px;
      background:rgba(12,12,16,.18);backdrop-filter:blur(16px) saturate(145%);
      -webkit-backdrop-filter:blur(16px) saturate(145%);
    }
    .ipr-delete-reel {color:#ff6b8a}
    .ipr-bottom {
      position:absolute;left:15px;right:80px;bottom:28px;
      z-index:3;text-shadow:0 1px 5px #000;
    }
    .ipr-user {
      display:flex;align-items:center;gap:9px;
      margin-bottom:12px;font-size:14px;font-weight:bold;
    }
    .ipr-user img {width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid white}
    .ipr-caption {font-size:13px;line-height:1.5;overflow-wrap:anywhere}
    .ipr-heart {
      position:absolute;left:50%;top:45%;
      transform:translate(-50%,-50%) scale(.2);
      font-size:100px;opacity:0;pointer-events:none;z-index:6;
    }
    .ipr-heart.ipr-heart-pop {animation:iprHeartPop .8s ease forwards}
    @keyframes iprHeartPop {
      0% {opacity:0;transform:translate(-50%,-50%) scale(.2)}
      25% {opacity:1;transform:translate(-50%,-50%) scale(1.2)}
      65% {opacity:1;transform:translate(-50%,-50%) scale(1)}
      100% {opacity:0;transform:translate(-50%,-50%) scale(.8)}
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
  try {
    const ref = getPostRef(postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      showReelsMessage("Yeh Reel pehle hi delete ho chuki hai.");
      return;
    }
    const post = snap.data();
    const ownerUid = post.uid || post.userId || post.authorId || post.ownerUid;
    if (ownerUid !== user.uid) {
      showReelsMessage("Aap sirf apni Reel delete kar sakte hain.");
      return;
    }
    if (!confirm("Kya aap is Reel ko hamesha ke liye delete karna chahte hain?")) return;
    await deleteDoc(ref);
    closeReelsViewer();
    showReelsMessage("Aapki Reel delete ho gayi.");
  } catch (error) {
    console.error("Reel delete error:", error);
    showReelsMessage("Reel delete nahi hui. Firestore Rules mein owner delete permission check karein.");
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
      <video src="${escapeHTML(mediaURL(post))}" muted playsinline preload="metadata"></video>
      <div class="ipr-grid-label">▶ ${Number(post.playCount) || 0}</div>
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
          playsinline loop preload="metadata"></video>
        <div class="ipr-shade"></div>
        <div class="ipr-heart">❤️</div>
        <div class="ipr-pause">▶</div>

        <div class="ipr-actions">
          <button class="ipr-action ipr-like ${liked ? "ipr-liked" : ""}" data-like="${id}">
            ${liked ? "♥" : "♡"}<small>${count}</small>
          </button>
          <button class="ipr-action" data-comment="${id}">💬<small>${Number(post.commentCount) || 0}</small></button>
          <button class="ipr-action ipr-repost" data-repost="${id}" aria-label="Repost Reel">🔁<small>${Number(post.repostCount) || 0}</small></button>
          <button class="ipr-action" data-share="${id}">➤<small>${Number(post.shareCount) || "Share"}</small></button>
          <button class="ipr-action" data-mute="${id}">🔇<small>Sound</small></button>
          ${currentUser() && (post.uid || post.userId || post.authorId || post.ownerUid) === currentUser().uid ? '<button class="ipr-action ipr-delete-reel" data-delete-reel="${id}" aria-label="Delete your Reel">🗑️<small>Delete</small></button>' : ""}
        </div>

        <div class="ipr-bottom">
          <div class="ipr-user">
            <img src="${escapeHTML(photoURL(post))}" alt="">
            <span>@${escapeHTML(username(post))}</span>
          </div>
          <div class="ipr-caption">${escapeHTML(post.caption || "")}</div>
        </div>
      </section>
    `;
  }).join("");

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

  track.querySelectorAll("[data-delete-reel]").forEach(button => {
    button.addEventListener("click", () => deleteOwnReel(button.dataset.deleteReel));
  });

  track.querySelectorAll("[data-repost]").forEach(button => {
    const post = reelsData.find(item => item.id === button.dataset.repost);
    if (post?.repostedBy?.includes(currentUser()?.uid)) button.classList.add("ipr-liked");
    button.addEventListener("click", () => toggleReelRepost(button.dataset.repost, button));
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

        video.play().catch(() => {});
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

  const slides = track.querySelectorAll(".ipr-slide");
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));

  slides[activeIndex]?.scrollIntoView({ block: "start" });

  setTimeout(() => {
    const video = slides[activeIndex]?.querySelector("video");
    if (video) video.play().catch(() => {});
  }, 150);
}

function closeReelsViewer() {
  const viewer = document.getElementById("ipReelsViewer");
  if (!viewer) return;

  viewer.classList.remove("ipr-open");
  viewer.querySelectorAll("video").forEach(video => video.pause());

  const box = viewer.querySelector("#iprCommentBox");
  box?.classList.remove("ipr-comments-open");

  document.body.style.overflow = "";

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

        return `
          <div class="ipr-comment-row">
            <img src="${escapeHTML(comment.photo || "https://www.gravatar.com/avatar/?d=mp")}" alt="">
            <div><strong>${escapeHTML(comment.username || "User")}</strong><br>
            ${escapeHTML(comment.text || "")}</div>
          </div>
        `;
      }).join("");
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
    closeButton.addEventListener("click", closeReelsViewer);
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

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  unsubscribeReels = onSnapshot(
    postsQuery,
    snapshot => {
      reelsData = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      // Rank available Reels using freshness and existing engagement signals.
      // Firestore onSnapshot remains the source of truth and refreshes this ranking live.
      reelsData = rankReelsForViewer(reelsData);

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startReelsSystem, { once: true });
} else {
  startReelsSystem();
}
