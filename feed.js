// ======================================================
// InstaPro Professional Feed System
// Part 1 of 3
// Firebase + Real-time Feed + Profile Header
// ======================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------

const FEED_COLLECTION = "posts";
const USERS_COLLECTION = "users";
const SAVED_COLLECTION = "savedPosts";
const COMMENTS_COLLECTION = "comments";

const feed = document.getElementById("feed");

const $ = id => document.getElementById(id);

// ------------------------------------------------------
// STATE
// ------------------------------------------------------

let unsubscribeFeed = null;
let unsubscribeComments = null;
let unsubscribeCurrentProfile = null;
let currentFollowing = new Set();

let currentPosts = [];
let profileCache = new Map();
const profileWatchers = new Map();
let activeStoryOwnerUids = new Set();
let unsubscribeFeedStories = null;

let feedStarted = false;
let activeCommentsPostId = null;
let renderingFeed = false;
let feedRenderPending = false;

// ------------------------------------------------------
// AUTH
// ------------------------------------------------------

function getCurrentUser() {
  return auth.currentUser;
}

// ------------------------------------------------------
// SAFE HELPERS
// ------------------------------------------------------

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function getUsername(user) {
  return (
    user?.username ||
    user?.displayName ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "InstaPro User"
  );
}

function getAvatar(user) {
  return (
    user?.photoURL ||
    user?.photoUrl ||
    user?.photo ||
    user?.avatar ||
    user?.userPhoto ||
    "https://www.gravatar.com/avatar/?d=mp"
  );
}

// Store activity in the same per-user collection read by notifications.js.
async function createActivityNotification(targetUid, details) {
  const actor = getCurrentUser();
  if (!actor || !targetUid || targetUid === actor.uid) return;

  try {
    await addDoc(collection(db, "users", targetUid, "notifications"), {
      ...details,
      fromUid: actor.uid,
      fromUsername: getUsername(actor),
      fromPhoto: getAvatar(actor),
      createdAt: serverTimestamp(),
      read: false
    });
  } catch (error) {
    // A notification failure must not undo a successful Like/Follow/Comment.
    console.warn("Activity notification could not be saved:", error);
  }
}

function getOwnerUid(post) {
  return (
    post?.uid ||
    post?.userId ||
    post?.authorId ||
    post?.ownerUid ||
    ""
  );
}

function getPostMedia(post) {
  return (
    post?.mediaUrl ||
    post?.imageUrl ||
    post?.url ||
    post?.videoUrl ||
    ""
  );
}

function getPostType(post) {
  const value = String(
    post?.currentType ||
    post?.mediaType ||
    post?.contentType ||
    post?.type ||
    "image"
  ).toLowerCase();

  if (
    value.includes("video") ||
    value === "reel"
  ) {
    return "video";
  }

  return "image";
}

function formatDate(timestamp) {
  try {
    const date = timestamp?.toDate
      ? timestamp.toDate()
      : timestamp
        ? new Date(timestamp)
        : null;

    if (!date || Number.isNaN(date.getTime())) {
      return "Just now";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);

  } catch (error) {
    return "Just now";
  }
}

function showMessage(message) {
  alert(message);
}

function getPostRef(postId) {
  return doc(db, FEED_COLLECTION, postId);
}

function getUserRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

function getCommentRef(postId) {
  return collection(
    db,
    FEED_COLLECTION,
    postId,
    COMMENTS_COLLECTION
  );
}

function isOwnPost(post) {
  const user = getCurrentUser();

  if (!user) return false;

  return getOwnerUid(post) === user.uid;
}

// ------------------------------------------------------
// PROFILE CACHE + LIVE USER PROFILE UPDATES
// ------------------------------------------------------

function watchUserProfile(uid) {
  if (!uid || profileWatchers.has(uid)) return;

  const unsubscribe = onSnapshot(
    getUserRef(uid),
    snapshot => {
      if (!snapshot.exists()) {
        profileCache.delete(uid);
        return;
      }

      const data = snapshot.data();
      const nextProfile = {
        ...data,
        username: data.username || data.displayName || data.name || "InstaPro User",
        photoURL: data.photoURL || data.photoUrl || data.profilePic || data.photo || data.avatar || ""
      };

      const previous = profileCache.get(uid);
      const changed = !previous ||
        previous.username !== nextProfile.username ||
        previous.displayName !== nextProfile.displayName ||
        previous.name !== nextProfile.name ||
        previous.photoURL !== nextProfile.photoURL ||
        previous.photoUrl !== nextProfile.photoUrl ||
        previous.photo !== nextProfile.photo ||
        previous.profilePic !== nextProfile.profilePic ||
        previous.bio !== nextProfile.bio ||
        previous.isPrivate !== nextProfile.isPrivate ||
        previous.privateAccount !== nextProfile.privateAccount ||
        JSON.stringify(previous.followers || []) !== JSON.stringify(nextProfile.followers || []);

      profileCache.set(uid, nextProfile);

      // Name/username/photo changes appear in other users' feed without reload.
      if (changed && feedStarted && auth.currentUser) renderFeed();
    },
    error => console.warn("Live user profile update listener error:", uid, error)
  );

  profileWatchers.set(uid, unsubscribe);
}

function stopProfileWatchers() {
  profileWatchers.forEach(unsubscribe => {
    try { unsubscribe(); } catch {}
  });
  profileWatchers.clear();
}

// ------------------------------------------------------
// PROFILE CACHE
// ------------------------------------------------------

async function getUserProfile(uid, post = {}) {
  if (!uid) {
    return {
      username:
        post.username ||
        post.displayName ||
        "InstaPro User",

      photoURL:
        post.photoURL ||
        post.photo ||
        post.userPhoto ||
        ""
    };
  }

  watchUserProfile(uid);

  if (profileCache.has(uid)) {
    const cached = profileCache.get(uid);

    return {
      ...cached,

      username:
        cached.username ||
        post.username ||
        post.displayName ||
        "InstaPro User",

      photoURL:
        cached.photoURL ||
        cached.photoUrl ||
        cached.profilePic ||
        cached.photo ||
        post.photoURL ||
        post.photo ||
        post.userPhoto ||
        ""
    };
  }

  try {
    const snapshot = await getDoc(getUserRef(uid));

    if (snapshot.exists()) {
      const data = snapshot.data();

      const profile = {
        ...data,

        username:
          data.username ||
          data.displayName ||
          data.name ||
          post.username ||
          post.displayName ||
          "InstaPro User",

        photoURL:
          data.photoURL ||
          data.photoUrl ||
          data.photo ||
          data.avatar ||
          post.photoURL ||
          post.photo ||
          post.userPhoto ||
          ""
      };

      profileCache.set(uid, profile);

      return profile;
    }

  } catch (error) {
    console.warn(
      "Profile load error:",
      uid,
      error.message
    );
  }

  const fallback = {
    username:
      post.username ||
      post.displayName ||
      "InstaPro User",

    photoURL:
      post.photoURL ||
      post.photo ||
      post.userPhoto ||
      ""
  };

  profileCache.set(uid, fallback);

  return fallback;
}

// ------------------------------------------------------
// PROFILE HEADER CSS
// ------------------------------------------------------

function injectFeedStyles() {
  if (document.getElementById("instaproProfessionalFeedCSS")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "instaproProfessionalFeedCSS";

  style.textContent = `
    .instapro-feed-post {
      width: 100%;
      min-width: 0;
      margin: 12px 0;
      overflow: hidden;
      border-radius: 14px;
      box-sizing: border-box;
      background: var(--card-bg, rgba(255,255,255,.045));
      border: 1px solid rgba(128,128,128,.20);
      color: inherit;
    }

    .ip-feed-header {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      box-sizing: border-box;
    }

    .ip-feed-avatar {
      display: block;
      width: 44px;
      height: 44px;
      min-width: 44px;
      flex-shrink: 0;
      border-radius: 50%;
      object-fit: cover;
      background: #252525;
      border: 1px solid rgba(255,255,255,.18);
      cursor: pointer;
    }

    .ip-feed-user-info {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .ip-feed-username {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
      cursor: pointer;
    }

    .ip-feed-date {
      display: block;
      font-size: 11px;
      opacity: .65;
      line-height: 17px;
      overflow-wrap: anywhere;
    }

    .ip-feed-follow {
      flex-shrink: 0;
      padding: 7px 12px;
      border: 0;
      border-radius: 8px;
      background: #0095f6;
      color: white;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .ip-feed-follow.following {
      background: rgba(128,128,128,.20);
      color: inherit;
      border: 1px solid rgba(128,128,128,.30);
    }

    .ip-feed-more {
      flex-shrink: 0;
      width: 34px;
      height: 36px;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 25px;
      cursor: pointer;
    }

    .ip-feed-media {
      display: block;
      width: 100%;
      max-height: 75vh;
      object-fit: contain;
      background: #080808;
    }

    .ip-feed-reel-post .ip-feed-header { gap:10px; padding:14px 16px; }
    /* Instagram-style creator header on regular feed posts and Reels. */
    .instapro-feed-post .ip-feed-header { display:flex;align-items:center;gap:8px;padding:9px 11px; }
    .instapro-feed-post .ip-feed-user-info { min-width:0;flex:1; }
    .instapro-feed-post .ip-feed-username { display:block;font-size:13px;font-weight:700;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .instapro-feed-post .ip-feed-date { display:block;font-size:11px;opacity:.72;line-height:1.3;margin-top:2px; }
    .instapro-feed-post .ip-feed-follow { flex-shrink:0;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.75);border-radius:7px;padding:5px 11px;font-size:12px;font-weight:600;line-height:1.1;min-height:27px; }
    .instapro-feed-post .ip-feed-follow.following { opacity:.78; }
    .ip-feed-story-avatar { width:42px;height:42px;min-width:42px;padding:2px;border-radius:50%;box-sizing:border-box;flex-shrink:0; }
    .ip-feed-story-avatar.has-story { background:conic-gradient(#ffb347,#ff3d9a,#a855f7,#ff3d9a,#ffb347); }
    .ip-feed-story-avatar img { display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;border:2px solid #111;box-sizing:border-box; }
    .instapro-feed-post .ip-feed-story-avatar:not(.has-story) { background:transparent;padding:0; }
    .ip-feed-reel-post .ip-feed-username { font-size:13px; }
    .ip-feed-reel-post .ip-feed-date { color:#fff;opacity:.92;font-size:11px; }
    .ip-feed-reel-post .ip-feed-follow { background:rgba(0,0,0,.18);color:#fff;border:1px solid rgba(255,255,255,.82);border-radius:8px;padding:5px 11px;font-size:12px;min-height:27px; }
    .ip-feed-reel-post .ip-feed-follow.following { background:rgba(0,0,0,.25);color:#fff; }
    .ip-feed-reel-post .ip-feed-more { color:#fff;font-size:28px; }
    .ip-feed-reel-musicline { display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:12px;line-height:19px; }
    .ip-feed-reel-post .ip-feed-music-toggle { right:16px !important;bottom:92px !important;width:32px !important;height:32px !important;background:rgba(20,20,20,.62) !important;font-size:18px !important; }
    /* Immersive Instagram-style vertical Reel cards inside Home Feed */
    .instapro-feed-post.ip-feed-reel-post {
      position: relative;
      width: 100%;
      height: 100svh;
      min-height: 100vh;
      margin: 0;
      overflow: hidden;
      border: 0;
      border-radius: 0;
      background: #000;
    }
    .ip-feed-reel-post .ip-feed-media-wrap {
      position: absolute !important;
      inset: 0;
      width: 100%;
      height: 100%;
      background: #000;
    }
    .ip-feed-reel-post .ip-feed-media {
      width: 100%;
      height: 100%;
      max-height: none;
      object-fit: cover;
      background: #000;
    }
    .ip-feed-reel-post > .ip-feed-header {
      position: absolute;
      z-index: 5;
      top: max(8px, env(safe-area-inset-top));
      left: 0;
      right: 0;
      color: #fff;
      background: linear-gradient(180deg,rgba(0,0,0,.48),transparent);
    }
    .ip-feed-reel-post > div[style*="padding:12px"] {
      position: absolute;
      z-index: 5;
      left: 0;
      right: 0;
      bottom: calc(12px + env(safe-area-inset-bottom));
      padding: 14px 12px 20px !important;
      color: #fff;
      background: linear-gradient(0deg,rgba(0,0,0,.62),transparent);
    }
    .ip-feed-reel-post .ip-feed-caption {
      max-width: calc(100% - 4px);
      color: #fff;
    }
    .ip-feed-reel-post .ip-feed-view-comments {
      color: #fff;
    }
    .ip-feed-reel-post .ip-feed-actions {
      gap: 18px;
    }
    .ip-feed-reel-post .ip-feed-icon-action svg {
      filter: drop-shadow(0 1px 3px #0008);
    }
    @media (max-width: 600px) {
      .instapro-feed-post.ip-feed-reel-post {
        width: 100vw !important;
        max-width: none !important;
        min-width: 100vw;
        box-sizing: border-box !important;
        margin-left: calc(50% - 50vw) !important;
        margin-right: 0 !important;
        padding-left: 0;
        padding-right: 0;
      }
    }

    .ip-feed-actions {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
    }

    .ip-feed-action {
      padding: 5px 0;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .ip-feed-caption {
      margin: 12px 0 4px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .ip-feed-actions {
      display:flex; align-items:center; gap:18px; flex-wrap:nowrap;
    }
    .ip-feed-actions .ip-feed-icon-action {
      display:inline-flex; align-items:center; justify-content:center; gap:5px;
      min-width:24px; padding:0; border:0; background:transparent; color:inherit;
      font-size:14px; line-height:1; cursor:pointer;
    }
    .ip-feed-icon-action svg {
      width:27px; height:27px; fill:none; stroke:currentColor; stroke-width:1.8;
      stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;
    }
    .ip-feed-icon-action[aria-pressed="true"] svg { color:#ff3040; }
    .ip-feed-icon-action[data-feed-action="repost"][aria-pressed="true"] svg { color:#22c55e; }
    .ip-feed-icon-action span { font-size:13px; }
    .ip-feed-save-action { margin-left:auto; }
    @media (max-width:360px) { .ip-feed-actions { gap:13px; } .ip-feed-icon-action svg { width:25px; height:25px; } }

    /* Force Instagram-sized sound control on regular posts and Reel posts. */
    .instapro-feed-post button.ip-feed-music-toggle,
    .instapro-feed-post .ip-feed-music-toggle {
      position: absolute !important;
      z-index: 6 !important;
      right: 12px !important;
      bottom: 12px !important;
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      max-width: 36px !important;
      max-height: 36px !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 0 !important;
      border-radius: 50% !important;
      color: #fff !important;
      background: rgba(26,26,26,.68) !important;
      box-shadow: 0 1px 4px rgba(0,0,0,.22) !important;
      line-height: 1 !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .instapro-feed-post .ip-feed-music-toggle svg {
      display: block !important;
      width: 18px !important;
      height: 18px !important;
      min-width: 18px !important;
      min-height: 18px !important;
      max-width: 18px !important;
      max-height: 18px !important;
      flex: 0 0 18px !important;
    }
    .instapro-feed-post .ip-feed-music-toggle:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
    .instapro-feed-post .ip-feed-music-toggle:active { transform: scale(.96); }
    .ip-feed-reel-post .ip-feed-music-toggle {
      right: 12px !important;
      bottom: 92px !important;
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      max-width: 36px !important;
      max-height: 36px !important;
      background: rgba(20,20,20,.62) !important;
    }

    .ip-feed-view-comments {
      display: block;
      padding: 10px 0 4px;
      border: 0;
      background: transparent;
      color: inherit;
      opacity: .65;
      cursor: pointer;
    }

    .ip-feed-follow:disabled {
      opacity: .6;
      cursor: wait;
    }

    @media (max-width: 360px) {
      .ip-feed-header {
        gap: 7px;
        padding: 9px;
      }

      .ip-feed-avatar {
        width: 38px;
        height: 38px;
        min-width: 38px;
      }

      .ip-feed-follow {
        padding: 6px 9px;
      }
    }
  `;

  document.head.appendChild(style);
}

injectFeedStyles();

console.log("InstaPro Feed Part 1 loaded.");
// ======================================================
// PART 2 OF 3
// Professional Post Cards + Follow + Likes + Save + Share
// ======================================================

// ------------------------------------------------------
// REAL-TIME FEED
// ------------------------------------------------------

function startFeedStories() {
  if (unsubscribeFeedStories) return;
  unsubscribeFeedStories = onSnapshot(collection(db, "stories"), snapshot => {
    const now = Date.now();
    const next = new Set();
    snapshot.docs.forEach(item => {
      const story = item.data();
      const uid = story.uid || story.userId || story.authorId || story.ownerUid || story.userUID || "";
      const url = story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
      const created = story.createdAt?.toDate ? story.createdAt.toDate().getTime() : (typeof story.createdAt === "number" ? story.createdAt : Date.parse(story.createdAt || "") || 0);
      const expiry = Number(story.expiresAt) || ((created || now) + 86400000);
      if (uid && url && expiry > now) next.add(uid);
    });
    const changed = next.size !== activeStoryOwnerUids.size || [...next].some(uid => !activeStoryOwnerUids.has(uid));
    activeStoryOwnerUids = next;
    if (changed && feedStarted) renderFeed();
  }, error => console.warn("Feed story ring listener error:", error));
}

function startFeed() {
  if (!feed || feedStarted) return;

  feedStarted = true;

  if (unsubscribeFeed) {
    unsubscribeFeed();
    unsubscribeFeed = null;
  }

  const postsQuery = query(
    collection(db, FEED_COLLECTION),
    orderBy("createdAt", "desc")
  );

  unsubscribeFeed = onSnapshot(
    postsQuery,

    snapshot => {
      currentPosts = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      profileCache.clear();

      renderFeed();

    },

    error => {
      console.error("Feed error:", error);

      feed.innerHTML = `
        <div style="padding:28px;text-align:center">
          <h3>Feed load nahi ho payi</h3>
          <p>Internet aur Firebase Firestore Rules check karein.</p>
          <button type="button" data-feed-action="retry">
            Retry
          </button>
        </div>
      `;
    }
  );
}

// Creator analytics: count one view per signed-in viewer per post per day.
const creatorViewObserverCards = new WeakSet();
function trackCreatorPostView(card, post) {
  if (!card || !post?.id || creatorViewObserverCards.has(card) || !("IntersectionObserver" in window)) return;
  creatorViewObserverCards.add(card);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
      observer.unobserve(card);
      const viewer = getCurrentUser();
      const ownerUid = getOwnerUid(post);
      if (!viewer || viewer.isAnonymous || !ownerUid || viewer.uid === ownerUid) return;
      const day = new Date().toISOString().slice(0, 10);
      const viewId = viewer.uid + "_" + day;
      (async () => {
        try {
          const { runTransaction } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
          const postRef = getPostRef(post.id);
          const viewRef = doc(db, FEED_COLLECTION, post.id, "views", viewId);
          await runTransaction(db, async transaction => {
            const viewSnap = await transaction.get(viewRef);
            if (viewSnap.exists()) return;
            transaction.set(viewRef, { uid: viewer.uid, day, viewedAt: serverTimestamp() });
            transaction.update(postRef, {
              viewCount: increment(1),
              ["viewsByDay." + day]: increment(1)
            });
          });
        } catch (error) {
          console.warn("Creator post view count could not be saved:", error);
        }
      })();
    }
  }, { threshold: [0.6] });
  observer.observe(card);
}

// ------------------------------------------------------
// RENDER FEED
// ------------------------------------------------------

async function renderFeed() {
  if (!feed) return;
  // If Firestore emits another snapshot while profile lookups are awaiting,
  // schedule one fresh render after the current render finishes.
  if (renderingFeed) {
    feedRenderPending = true;
    return;
  }

  const user = getCurrentUser();

  if (!user) {
    feed.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <h3>Login required</h3>
        <p>Posts dekhne ke liye login karein.</p>
      </div>
    `;
    return;
  }

  // Home Feed is for photo/image posts only. Video/Reel content belongs in Reels.
  const feedPhotoPosts = currentPosts.filter(post =>
    !!getPostMedia(post) && getPostType(post) !== "video"
  );

  if (!feedPhotoPosts.length) {
    feed.innerHTML = `
      <div style="text-align:center;padding:55px 20px">
        <div style="font-size:46px">📸</div>
        <h3>No Photo Posts Yet</h3>
        <p>Photo posts yahan dikhengi. Video Reels tab mein dekhein.</p>
      </div>
    `;
    return;
  }

  renderingFeed = true;

  try {
    const fragment = document.createDocumentFragment();

    for (const post of feedPhotoPosts) {
      const mediaUrl = getPostMedia(post);

      if (!mediaUrl) continue;

      const ownerUid = getOwnerUid(post);

      const profile = await getUserProfile(ownerUid, post);

      const ownerName = escapeHTML(
        profile.username || "InstaPro User"
      );
      const ownerVerifiedName = ownerName + ' <span class="instapro-verified-badge" title="Insta Pro Verified" aria-label="Insta Pro Verified">✓</span>';

      const avatar = escapeHTML(
        profile.photoURL ||
        "https://www.gravatar.com/avatar/?d=mp"
      );

      const ownPost = !!user && ownerUid === user.uid;
      const ownerHasStory = !!ownerUid && activeStoryOwnerUids.has(ownerUid);

      const isFollowing = currentFollowing.has(ownerUid);

      const mediaType = getPostType(post);
      const reelTypeText = String(post.currentType || post.mediaType || post.contentType || post.type || post.kind || "").toLowerCase();
      // In the Home Feed, every video is shown with the immersive Reel header.
      // Image posts and the existing Like/Comment/Repost/Share/Save row remain unchanged.
      const isReelPost = mediaType === "video";

      const likes = Array.isArray(post.likes)
        ? post.likes
        : [];

      const liked = likes.includes(user.uid);

      const saved =
        Array.isArray(post.savedBy) &&
        post.savedBy.includes(user.uid);

      const likeCount = safeCount(
        post.likesCount ??
        post.likeCount ??
        likes.length
      );

      const commentCount = safeCount(
        post.commentsCount ??
        post.commentCount
      );

      const shareCount = safeCount(post.shareCount);

      const card = document.createElement("article");

      card.className = "instapro-feed-post" + (isReelPost ? " ip-feed-reel-post" : "");

      card.dataset.postId = post.id;
      if (isReelPost) card.dataset.contentType = "reel";
      trackCreatorPostView(card, post);

      const musicUrl = typeof post.musicUrl === "string" ? post.musicUrl : "";
      const reelMusicTitle = post.musicName || post.musicTitle || post.audioTitle || post.songName || post.musicTrack?.title || post.musicTrack?.name || "";
      const reelMusicArtist = post.musicArtist || post.artistName || post.musicTrack?.artistName || post.musicTrack?.artist || "";
      const musicHTML = musicUrl
        ? `
          <audio class="ip-feed-music" src="${escapeHTML(musicUrl)}" loop preload="auto"></audio>
          <button type="button" class="ip-feed-music-toggle" data-music-toggle aria-label="Turn post music on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="M15 9a5 5 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        `
        : "";

      const carouselUrls = Array.isArray(post.mediaUrls)
        ? post.mediaUrls.filter(url => typeof url === "string" && url.trim())
        : Array.isArray(post.mediaItems)
          ? post.mediaItems.map(item => typeof item === "string" ? item : item?.url).filter(url => typeof url === "string" && url.trim())
          : [];
      if (carouselUrls.length < 2 && mediaUrl) carouselUrls.length = 0;
      const mediaHTML = `
        <div class="ip-feed-media-wrap" style="position:relative;line-height:0">
          ${mediaType === "video"
            ? `
              <video class="ip-feed-media" src="${escapeHTML(mediaUrl)}" controls playsinline preload="metadata" ${musicUrl ? "muted" : ""}></video>
            `
            : carouselUrls.length > 1
              ? `
                <div class="ip-feed-photo-carousel" data-photo-carousel role="group" aria-label="Photo carousel, ${carouselUrls.length} photos" style="display:flex;flex-flow:row nowrap;width:100%;min-width:0;overflow-x:scroll;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;touch-action:pan-x;line-height:0">
                  ${carouselUrls.map((url,i)=>`<img class="ip-feed-media ip-feed-carousel-image" src="${escapeHTML(url)}" alt="Photo ${i+1} of ${carouselUrls.length} by ${ownerName}" loading="lazy" decoding="async" draggable="false" style="display:block!important;flex:0 0 100%!important;width:100%!important;min-width:100%!important;max-width:100%!important;height:auto;max-height:75vh;scroll-snap-align:start;object-fit:contain;touch-action:pan-x;user-select:none;-webkit-user-drag:none" onerror="this.style.background='#222'">`).join("")}
                </div>
                <span class="ip-feed-carousel-count" style="position:absolute;top:12px;right:12px;z-index:2;padding:5px 9px;border-radius:20px;background:#0009;color:#fff;font:12px system-ui;line-height:1.2">1/${carouselUrls.length}</span>
                <div style="display:flex;justify-content:center;gap:4px;padding:8px 0;line-height:0;background:#000">${carouselUrls.map((_,i)=>`<span data-carousel-dot="${i}" style="width:5px;height:5px;border-radius:50%;background:${i===0?"#0095f6":"#777"};display:block"></span>`).join("")}</div>
              `
              : `
                <img class="ip-feed-media" src="${escapeHTML(mediaUrl)}" alt="Post by ${ownerName}" loading="lazy" onerror="this.style.background='#222'">
              `}
          ${musicHTML}
        </div>
      `;

      card.innerHTML = `
        <div class="ip-feed-header">

          <div class="ip-feed-story-avatar ${ownerHasStory ? "has-story" : ""}">
            <img
              class="ip-feed-avatar"
              src="${avatar}"
              alt="${ownerName}"
              data-feed-action="profile"
              data-uid="${escapeHTML(ownerUid)}"
            >
          </div>

          <div class="ip-feed-user-info">

            <strong
              class="ip-feed-username"
              data-feed-action="profile"
              data-uid="${escapeHTML(ownerUid)}"
            >${ownerVerifiedName}</strong>

            <span class="ip-feed-date">
              ${isReelPost && (reelMusicTitle || post.musicUrl) ? "♫ " + escapeHTML([reelMusicTitle || "Original audio", reelMusicArtist].filter(Boolean).join(" · ")) : escapeHTML(formatDate(post.createdAt || post.time))}
            </span>

          </div>

          ${
            !ownPost && ownerUid && !isFollowing
              ? `
                <button
                  type="button"
                  class="ip-feed-follow"
                  data-feed-action="follow"
                  data-uid="${escapeHTML(ownerUid)}"
                  aria-pressed="false"
                >Follow</button>
              `
              : ""
          }

          ${
            ownPost
              ? `
                <button
                  type="button"
                  class="ip-feed-more"
                  data-feed-action="post-menu"
                  data-id="${escapeHTML(post.id)}"
                  aria-label="Post options"
                  title="Post options"
                >☰</button>
              `
              : ""
          }

        </div>

        ${mediaHTML}

        <div style="padding:12px">

          <div class="ip-feed-actions">

            <button type="button" class="ip-feed-action ip-feed-icon-action" data-feed-action="like"
              data-id="${escapeHTML(post.id)}" aria-label="Like" aria-pressed="${liked}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg><span>${likeCount}</span>
            </button>
            <button type="button" class="ip-feed-action ip-feed-icon-action" data-feed-action="comments"
              data-id="${escapeHTML(post.id)}" aria-label="Comment">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.1a9 9 0 0 1-.9-4.4A8.5 8.5 0 1 1 21 11.5Z"/></svg><span>${commentCount}</span>
            </button>
            <button type="button" class="ip-feed-action ip-feed-icon-action" data-feed-action="repost"
              data-id="${escapeHTML(post.id)}" aria-label="Repost" aria-pressed="${Array.isArray(post.repostedBy) && post.repostedBy.includes(user.uid)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4V7H7a3 3 0 0 0-3 3v1H2v-1a5 5 0 0 1 5-5h10V2ZM7 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3Z"/></svg><span>${safeCount(post.repostCount)}</span>
            </button>
            <button type="button" class="ip-feed-action ip-feed-icon-action" data-feed-action="share"
              data-id="${escapeHTML(post.id)}" aria-label="Share">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 9 15M22 2l-8 20-5-7-7-5 20-8Z"/></svg>
            </button>
            <button type="button" class="ip-feed-action ip-feed-icon-action ip-feed-save-action" data-feed-action="save"
              data-id="${escapeHTML(post.id)}" aria-label="Save" aria-pressed="${saved}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>
            </button>

          </div>

          ${
            post.caption
              ? `
                <p class="ip-feed-caption">
                  <strong>${ownerVerifiedName}</strong>
                  ${escapeHTML(post.caption)}
                </p>
              `
              : ""
          }

          <button
            type="button"
            class="ip-feed-view-comments"
            data-feed-action="comments"
            data-id="${escapeHTML(post.id)}"
          >View comments / Add comment</button>

        </div>
      `;

      const photoCarousel = card.querySelector("[data-photo-carousel]");
      if (photoCarousel) {
        const countLabel = card.querySelector(".ip-feed-carousel-count");
        const dots = card.querySelectorAll("[data-carousel-dot]");
        photoCarousel.addEventListener("scroll", () => {
          const width = photoCarousel.clientWidth || 1;
          const activeIndex = Math.max(0, Math.min(dots.length - 1, Math.round(photoCarousel.scrollLeft / width)));
          if (countLabel) countLabel.textContent = (activeIndex + 1) + "/" + dots.length;
          dots.forEach((dot, i) => { dot.style.background = i === activeIndex ? "#0095f6" : "#777"; });
        }, { passive: true });
      }
      fragment.appendChild(card);
    }

    feed.replaceChildren(fragment);

    // Clean up observers from the previous feed render.
    (window.__instaProFeedMusicObservers || []).forEach(observer => observer.disconnect());
    window.__instaProFeedMusicObservers = [];
    (window.__instaProFeedVideoObservers || []).forEach(observer => observer.disconnect());
    window.__instaProFeedVideoObservers = [];

    // Instagram-style Home feed video autoplay: play only the video that is
    // mostly visible, pause videos as they leave the screen, and keep autoplay
    // muted so Android/mobile browser autoplay policies allow it.
    const feedVideos = Array.from(feed.querySelectorAll("video.ip-feed-media"));
    feedVideos.forEach(video => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = "metadata";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.setAttribute("loop", "");
      video.setAttribute("aria-label", "Feed video; sound can be enabled using video controls");
      video.addEventListener("error", () => {
        console.warn("InstaPro feed video failed to load:", video.currentSrc || video.src);
      }, { once: true });
    });

    if ("IntersectionObserver" in window) {
      const activeFeedVideoObserver = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.target instanceof HTMLVideoElement)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const candidate = visible.find(entry => entry.isIntersecting && entry.intersectionRatio >= 0.6);
        if (candidate) {
          feedVideos.forEach(video => {
            if (video !== candidate.target && !video.paused) video.pause();
          });
          const video = candidate.target;
          if (video.paused) {
            const playAttempt = video.play();
            if (playAttempt && typeof playAttempt.catch === "function") {
              playAttempt.catch(error => console.warn("Feed autoplay was blocked by the browser:", error));
            }
          }
        }
        visible.forEach(entry => {
          if ((!entry.isIntersecting || entry.intersectionRatio < 0.25) && !entry.target.paused) {
            entry.target.pause();
          }
        });
      }, { threshold: [0, 0.25, 0.6, 0.85] });
      feedVideos.forEach(video => activeFeedVideoObserver.observe(video));
      window.__instaProFeedVideoObservers.push(activeFeedVideoObserver);
    } else if (feedVideos.length) {
      feedVideos[0].play().catch(() => {});
    }

    // Each visible post should try to play its own soundtrack automatically.
    feed.querySelectorAll(".instapro-feed-post").forEach(card => {
      const audio = card.querySelector(".ip-feed-music");
      const button = card.querySelector("[data-music-toggle]");
      const video = card.querySelector("video.ip-feed-media");
      if (!audio || !button || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      audio.volume = 1;
      audio.muted = true;

      const setSoundButton = () => {
        const muted = audio.muted;
        button.innerHTML = muted
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        button.setAttribute("aria-label", muted ? "Turn post music on" : "Mute post music");
      };

      const stopOtherPostMusic = () => {
        feed.querySelectorAll(".instapro-feed-post").forEach(otherCard => {
          if (otherCard === card) return;
          const otherAudio = otherCard.querySelector(".ip-feed-music");
          const otherVideo = otherCard.querySelector("video.ip-feed-media");
          if (otherAudio) {
            otherAudio.pause();
            otherAudio.muted = true;
            const otherButton = otherCard.querySelector("[data-music-toggle]");
            if (otherButton) {
              otherButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
              otherButton.setAttribute("aria-label", "Turn post music on");
            }
          }
          if (otherVideo && !otherVideo.paused) otherVideo.pause();
        });
      };

      if (video) {
        video.addEventListener("play", async () => {
          // Each playing post uses its own soundtrack; stop the previous post's audio.
          stopOtherPostMusic();
          audio.muted = false;
          setSoundButton();
          try {
            await audio.play();
          } catch (error) {
            audio.muted = true;
            setSoundButton();
            console.warn("Tap Sound to play this post's soundtrack:", error);
          }
        });
        video.addEventListener("pause", () => audio.pause());
        video.addEventListener("ended", () => {
          audio.pause();
          audio.currentTime = 0;
        });
      }

      button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        if (audio.muted) {
          stopOtherPostMusic();
          audio.muted = false;
          try {
            await audio.play();
            if (video && video.paused) video.play().catch(() => {});
          } catch (error) {
            audio.muted = true;
            console.warn("Post music playback failed:", error);
          }
        } else {
          audio.muted = true;
          audio.pause();
        }
        setSoundButton();
      });

      setSoundButton();

      if ("IntersectionObserver" in window) {
        const musicObserver = new IntersectionObserver(async entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
              if (audio && !audio.paused) audio.pause();
              continue;
            }

            stopOtherPostMusic();
            audio.currentTime = 0;
            audio.muted = false;
            setSoundButton();

            try {
              await audio.play();
            } catch (error) {
              // Mobile browsers may block autoplay with sound. Start muted if allowed;
              // the Sound button remains available to enable audible playback.
              audio.muted = true;
              setSoundButton();
              audio.play().catch(() => {});
              console.warn("Autoplay with sound was blocked by the browser; tap Sound.", error);
            }
          }
        }, { threshold: [0, 0.6, 0.85] });

        musicObserver.observe(card);
        window.__instaProFeedMusicObservers.push(musicObserver);
      }
    });

  } catch (error) {
    console.error("Render feed error:", error);
  } finally {
    renderingFeed = false;
    if (feedRenderPending) {
      feedRenderPending = false;
      queueMicrotask(() => renderFeed());
    }
  }
}

// ------------------------------------------------------
// FOLLOW / UNFOLLOW
// Uses users/{uid}.following and users/{uid}.followers
// ------------------------------------------------------

async function toggleFollow(targetUid, button) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Follow karne ke liye login karein.");
    return;
  }

  if (!targetUid || targetUid === user.uid) {
    return;
  }

  if (button) button.disabled = true;

  try {
    const currentRef = getUserRef(user.uid);
    const targetRef = getUserRef(targetUid);

    const [currentSnap, targetSnap] = await Promise.all([
      getDoc(currentRef),
      getDoc(targetRef)
    ]);

    if (!targetSnap.exists()) {
      showMessage("Is user ki profile nahi mili.");
      return;
    }

    const currentData = currentSnap.exists()
      ? currentSnap.data()
      : {};

    const targetData = targetSnap.data();

    const following = Array.isArray(currentData.following)
      ? currentData.following
      : [];

    const followers = Array.isArray(targetData.followers)
      ? targetData.followers
      : [];

    const alreadyFollowing = following.includes(targetUid);

    const batch = writeBatch(db);
    const followDay = new Date().toISOString().slice(0, 10);

    if (alreadyFollowing) {
      batch.set(
        currentRef,
        {
          following: arrayRemove(targetUid)
        },
        { merge: true }
      );

      batch.set(
        targetRef,
        {
          followers: arrayRemove(user.uid)
        },
        { merge: true }
      );
      batch.update(targetRef, { ["followsByDay." + followDay]: increment(-1) });

    } else {
      batch.set(
        currentRef,
        {
          following: arrayUnion(targetUid)
        },
        { merge: true }
      );

      batch.set(
        targetRef,
        {
          followers: arrayUnion(user.uid)
        },
        { merge: true }
      );
      batch.set(targetRef, { ["followsByDay." + followDay]: increment(1) }, { merge: true });
    }

    await batch.commit();

    if (!alreadyFollowing) {
      await createActivityNotification(targetUid, {
        type: "follow",
        message: "started following you"
      });
    }

    profileCache.delete(user.uid);
    profileCache.delete(targetUid);

    await renderFeed();

  } catch (error) {
    console.error("Follow error:", error);

    showMessage(
      "Follow update nahi hua. Firebase Rules aur users data check karein."
    );

  } finally {
    if (button) button.disabled = false;
  }
}

// ------------------------------------------------------
// LIKE / UNLIKE
// ------------------------------------------------------

async function toggleLike(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Like karne ke liye login karein.");
    return;
  }

  try {
    const postRef = getPostRef(postId);

    const snapshot = await getDoc(postRef);

    if (!snapshot.exists()) {
      showMessage("Post available nahi hai.");
      return;
    }

    const post = snapshot.data();

    const likes = Array.isArray(post.likes)
      ? post.likes
      : [];

    const alreadyLiked = likes.includes(user.uid);

    const nextLikes = alreadyLiked
      ? arrayRemove(user.uid)
      : arrayUnion(user.uid);

    const count = safeCount(
      post.likesCount ??
      post.likeCount ??
      likes.length
    );

    await updateDoc(postRef, {
      likes: nextLikes,

      likesCount: alreadyLiked
        ? Math.max(0, count - 1)
        : count + 1,

      likeCount: alreadyLiked
        ? Math.max(0, count - 1)
        : count + 1
    });

    if (!alreadyLiked) {
      await createActivityNotification(getOwnerUid(post), {
        type: "like",
        message: "liked your post",
        postId
      });
    }

  } catch (error) {
    console.error("Like error:", error);
    showMessage("Like save nahi hua. Firebase Rules check karein.");
  }
}

// ------------------------------------------------------
// REPOST / UNREPOST
// ------------------------------------------------------
async function toggleRepost(postId) {
  const user = getCurrentUser();
  if (!user || user.isAnonymous) {
    showMessage("Repost karne ke liye login karein.");
    return;
  }
  try {
    const ref = getPostRef(postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      showMessage("Post available nahi hai.");
      return;
    }
    const post = snap.data();
    const repostedBy = Array.isArray(post.repostedBy) ? post.repostedBy : [];
    const alreadyReposted = repostedBy.includes(user.uid);
    const count = safeCount(post.repostCount);
    await updateDoc(ref, {
      repostedBy: alreadyReposted ? arrayRemove(user.uid) : arrayUnion(user.uid),
      repostCount: alreadyReposted ? Math.max(0, count - 1) : count + 1
    });
    showMessage(alreadyReposted ? "Repost hata diya." : "Post repost ho gayi.");
  } catch (error) {
    console.error("Repost error:", error);
    showMessage("Repost save nahi hua. Firebase Rules check karein.");
  }
}

// ------------------------------------------------------
// SAVE / UNSAVE
// ------------------------------------------------------

async function toggleSave(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Post save karne ke liye login karein.");
    return;
  }

  const post = currentPosts.find(item => item.id === postId);

  if (!post) return;

  const savedRef = doc(
    db,
    SAVED_COLLECTION,
    user.uid,
    "posts",
    postId
  );

  try {
    const snapshot = await getDoc(savedRef);

    if (snapshot.exists()) {
      await deleteDoc(savedRef);

      await updateDoc(getPostRef(postId), {
        savedBy: arrayRemove(user.uid)
      });

    } else {
      await setDoc(savedRef, {
        postId,
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(getPostRef(postId), {
        savedBy: arrayUnion(user.uid)
      });
    }

  } catch (error) {
    console.error("Save error:", error);

    showMessage(
      "Post save nahi hui. Firebase Rules check karein."
    );
  }
}

// ------------------------------------------------------
// SHARE
// ------------------------------------------------------

async function sharePost(postId) {
  const url =
    window.location.origin +
    window.location.pathname +
    "#post-" +
    encodeURIComponent(postId);

  try {
    if (navigator.share) {
      await navigator.share({
        title: "InstaPro",
        text: "Yeh post dekhein!",
        url
      });

    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);

      showMessage("Post link copy ho gaya.");

    } else {
      prompt("Post link copy karein:", url);
    }

    await updateDoc(getPostRef(postId), {
      shareCount: increment(1)
    }).catch(error => {
      console.warn("Share count update:", error);
    });

  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Share error:", error);
    }
  }
}

// ------------------------------------------------------
// DELETE OWN POST
// ------------------------------------------------------

async function deletePost(postId) {
  const user = getCurrentUser();

  if (!user || user.isAnonymous) {
    showMessage("Pehle login karein.");
    return;
  }

  try {
    // Firestore se owner dobara verify karein; sirf UI data par bharosa nahi.
    const postRef = getPostRef(postId);
    const snapshot = await getDoc(postRef);

    if (!snapshot.exists()) {
      showMessage("Yeh post pehle hi delete ho chuki hai.");
      return;
    }

    const post = { id: snapshot.id, ...snapshot.data() };
    if (!isOwnPost(post)) {
      showMessage("Aap sirf apni post delete kar sakte hain.");
      return;
    }

    if (!confirm("Kya aap is post ko hamesha ke liye delete karna chahte hain?")) {
      return;
    }

    await deleteDoc(postRef);
    showMessage("Post delete ho gayi.");
  } catch (error) {
    console.error("Delete post error:", error);
    showMessage("Post delete nahi hui. Firebase Rules mein owner-delete permission check karein.");
  }
}
// ======================================================
// PART 3 OF 3
// Comments + Click Handlers + Authentication + Startup
// ======================================================

// ------------------------------------------------------
// COMMENTS PANEL
// Existing index.html commentsPanel IDs are supported.
// ------------------------------------------------------

function closeCommentsPanel() {
  if (unsubscribeComments) {
    unsubscribeComments();
    unsubscribeComments = null;
  }

  const panel = $("commentsPanel");

  if (panel) {
    panel.style.display = "none";
  }

  activeCommentsPostId = null;
}

function openCommentsPanel(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Comment karne ke liye login karein.");
    return;
  }

  const panel = $("commentsPanel");
  const list = $("commentsList");
  const input = $("commentInput");
  const form = $("commentForm");
  const avatar = $("commentCurrentUserAvatar");

  if (!panel || !list || !input || !form) {
    showMessage("Comments panel ke HTML IDs check karein.");
    return;
  }

  if (unsubscribeComments) {
    unsubscribeComments();
    unsubscribeComments = null;
  }

  activeCommentsPostId = postId;

  panel.style.display = "block";

  if (avatar) {
    avatar.src = getAvatar(user);
  }

  list.innerHTML =
    '<p style="padding:15px;opacity:.7">Loading comments...</p>';

  const commentsQuery = query(
    getCommentRef(postId),
    orderBy("createdAt", "asc")
  );

  unsubscribeComments = onSnapshot(
    commentsQuery,

    snapshot => {
      if (activeCommentsPostId !== postId) return;

      if (snapshot.empty) {
        list.innerHTML = `
          <p style="padding:15px;opacity:.7">
            Abhi koi comment nahi hai. Pehla comment karein!
          </p>
        `;

        return;
      }

      const me = getCurrentUser();
      list.innerHTML = snapshot.docs.map(item => {
        const comment = item.data();
        const username = escapeHTML(comment.username || "InstaPro User");
        const text = escapeHTML(comment.text || "");
        const photo = escapeHTML(comment.photo || comment.photoURL || "https://www.gravatar.com/avatar/?d=mp");
        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const liked = !!me && likedBy.includes(me.uid);
        const cid = escapeHTML(item.id);
        return `
          <div data-feed-comment-row="${cid}" style="display:flex;align-items:flex-start;gap:10px;margin:12px;overflow-wrap:anywhere">
            <img src="${photo}" alt="" style="width:36px;height:36px;min-width:36px;border-radius:50%;object-fit:cover">
            <div style="min-width:0;flex:1">
              <strong>${username} <span class="instapro-verified-badge" title="Insta Pro Verified" aria-label="Insta Pro Verified">✓</span></strong> <span>${text}</span>
              <div style="display:flex;gap:14px;align-items:center;margin-top:6px;font-size:12px">
                <button type="button" data-feed-comment-like="${cid}" style="border:0;background:none;color:${liked ? "#ff4d86" : "inherit"};padding:2px 0;font:inherit;cursor:pointer">${liked ? "♥ Liked" : "♡ Like"}${likedBy.length ? " · "+likedBy.length : ""}</button>
                <button type="button" data-feed-comment-reply="${cid}" style="border:0;background:none;color:inherit;opacity:.75;padding:2px 0;font:inherit;cursor:pointer">Reply</button>
              </div>
              ${replies.map(reply => `<div style="margin:9px 0 0 10px;padding-left:10px;border-left:2px solid #999"><strong>${escapeHTML(reply.username || "User")}</strong><br><span>${escapeHTML(reply.text || "")}</span></div>`).join("")}
              <form data-feed-reply-form="${cid}" style="display:none;gap:6px;margin-top:8px">
                <input data-feed-reply-input maxlength="1000" placeholder="Write a reply..." style="flex:1;min-width:0;border:1px solid #999;border-radius:18px;padding:8px 10px;background:transparent;color:inherit">
                <button type="submit" style="border:0;border-radius:18px;padding:0 12px;background:#a855f7;color:white">Send</button>
              </form>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll("[data-feed-comment-like]").forEach(button => {
        button.onclick = async () => {
          const user = getCurrentUser();
          if (!user) return showMessage("Comment like karne ke liye login karein.");
          try {
            const ref = doc(db, "posts", postId, "comments", button.dataset.feedCommentLike);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;
            const commentData = snap.data();
            const likedBy = Array.isArray(commentData.likedBy) ? commentData.likedBy : [];
            const alreadyLiked = likedBy.includes(user.uid);

            // Save the like toggle first. Notify only when a new like is added,
            // never when the user removes their like.
            await updateDoc(ref, {
              likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });

            const commentOwnerUid = String(
              commentData.uid ||
              commentData.userId ||
              commentData.authorId ||
              commentData.ownerUid ||
              ""
            );

            if (!alreadyLiked && commentOwnerUid && commentOwnerUid !== user.uid) {
              await createActivityNotification(commentOwnerUid, {
                type: "comment_like",
                message: "liked your comment",
                postId,
                commentId: button.dataset.feedCommentLike
              });
            }
          } catch (error) {
            console.error("Feed comment like error:", error);
            showMessage("Comment like save nahi hua. Firebase Rules check karein.");
          }
        };
      });

      list.querySelectorAll("[data-feed-comment-reply]").forEach(button => {
        button.onclick = () => {
          const form = list.querySelector(`[data-feed-reply-form="${button.dataset.feedCommentReply}"]`);
          if (!form) return;
          form.style.display = form.style.display === "flex" ? "none" : "flex";
          form.querySelector("input")?.focus();
        };
      });

      list.querySelectorAll("[data-feed-reply-form]").forEach(form => {
        form.onsubmit = async event => {
          event.preventDefault();
          const user = getCurrentUser();
          if (!user) return showMessage("Reply karne ke liye login karein.");
          const input = form.querySelector("input");
          const replyText = input.value.trim();
          if (!replyText) return;
          try {
            await updateDoc(doc(db, "posts", postId, "comments", form.dataset.feedReplyForm), {
              replies: arrayUnion({ uid: user.uid, username: getUsername(user), photo: getAvatar(user), text: replyText, createdAt: new Date().toISOString() })
            });
            input.value = "";
            form.style.display = "none";
          } catch (error) {
            console.error("Feed comment reply error:", error);
            showMessage("Reply save nahi hua. Firebase Rules check karein.");
          }
        };
      });
    },

    error => {
      console.error("Comments error:", error);

      list.innerHTML = `
        <p style="padding:15px">
          Comments load nahi hue. Firebase Rules check karein.
        </p>
      `;
    }
  );
}

// ------------------------------------------------------
// SEND COMMENT
// ------------------------------------------------------

async function sendComment(event) {
  event.preventDefault();

  const user = getCurrentUser();

  const input = $("commentInput");
  const sendButton = $("sendCommentBtn");

  const postId = activeCommentsPostId;

  if (!user || !postId || !input) {
    showMessage("Pehle login karein aur post select karein.");
    return;
  }

  const text = input.value.trim();

  if (!text) return;

  if (text.length > 2000) {
    showMessage("Comment 2000 characters se chhota rakhein.");
    return;
  }

  if (sendButton) {
    sendButton.disabled = true;
  }

  try {
    await addDoc(getCommentRef(postId), {
      uid: user.uid,
      username: getUsername(user),
      photo: getAvatar(user),
      text,
      createdAt: serverTimestamp()
    });

    const commentedPost = currentPosts.find(item => item.id === postId);
    if (commentedPost) {
      await createActivityNotification(getOwnerUid(commentedPost), {
        type: "comment",
        message: "commented on your post",
        postId
      });
    }

    await updateDoc(getPostRef(postId), {
      commentCount: increment(1),
      commentsCount: increment(1)
    }).catch(error => {
      console.warn("Comment count update:", error);
    });

    input.value = "";

  } catch (error) {
    console.error("Send comment error:", error);

    showMessage(
      "Comment save nahi hua. Firebase Rules check karein."
    );

  } finally {
    if (sendButton) {
      sendButton.disabled = false;
    }
  }
}

// ------------------------------------------------------
// PROFILE OPEN
// Uses the profile.js global function if available.
// ------------------------------------------------------

function openPostOwnerProfile(uid) {
  if (!uid) return;

  const user = getCurrentUser();

  if (user && uid === user.uid) {
    if (typeof window.openProfile === "function") {
      window.openProfile(user.uid);
    } else {
      const profileButton = document.querySelector(
        '.bBtn[data-v="profile"]'
      );

      profileButton?.click();
    }

    return;
  }

  if (typeof window.openProfile === "function") {
    window.openProfile(uid);
  } else {
    showMessage(
      "Profile page abhi load nahi hua. Thodi der baad try karein."
    );
  }
}

// ------------------------------------------------------
// FEED CLICK HANDLER
// ------------------------------------------------------

if (feed) {
  feed.addEventListener("click", event => {
    // Tapping a video in Home Feed opens that exact post in the full-screen Reels viewer.
    const video = event.target.closest("video.ip-feed-media");
    if (!video) return;
    const card = video.closest(".instapro-feed-post");
    const postId = card?.dataset.postId;
    if (!postId) return;
    event.preventDefault();
    event.stopPropagation();
    const feedPost = currentPosts.find(post => String(post.id) === String(postId));
    const openReel = () => window.InstaProReels?.openPost?.(postId, feedPost);
    if (typeof window.InstaProReels?.openPost === "function") {
      openReel();
    } else {
      import("./reels.js").then(() => setTimeout(openReel, 250)).catch(error => {
        console.error("Could not open video in Reels feed:", error);
        alert("Reels feed open nahi ho payi. App refresh karke dobara try karein.");
      });
    }
  });

feed.addEventListener("click", async event => {
    const button = event.target.closest("[data-feed-action]");

    if (!button) return;

    const action = button.dataset.feedAction;

    const postId = button.dataset.id;

    const uid = button.dataset.uid;

    if (action === "retry") {
      feedStarted = false;
      startFeedStories();
    startFeed();
      return;
    }

    if (action === "profile") {
      openPostOwnerProfile(uid);
      return;
    }

    if (action === "follow") {
      await toggleFollow(uid, button);
      return;
    }

    if (action === "post-menu") {
      const post = currentPosts.find(item => String(item.id) === String(postId));
      if (!post) return;
      const menu = document.createElement("div");
      menu.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:14px;box-sizing:border-box;";
      const sheet = document.createElement("div");
      sheet.style.cssText = "width:100%;max-width:460px;background:#202024;color:#fff;border:1px solid #3a3a40;border-radius:22px;padding:14px;box-shadow:0 0 35px rgba(0,0,0,.4);";
      const heading = document.createElement("div");
      heading.textContent = "Post options";
      heading.style.cssText = "font-size:15px;font-weight:700;text-align:center;padding:8px 0 12px;";
      sheet.appendChild(heading);
      const addOption = (label, danger, fn) => {
        const option = document.createElement("button");
        option.type = "button";
        option.textContent = label;
        option.style.cssText = "display:block;width:100%;padding:14px;margin:5px 0;border-radius:12px;border:1px solid " + (danger ? "rgba(255,90,110,.35)" : "#393940") + ";background:" + (danger ? "rgba(255,60,80,.10)" : "#2a2a30") + ";color:" + (danger ? "#ff6878" : "#fff") + ";font-size:15px;font-weight:600;text-align:left;";
        option.addEventListener("click", async () => { menu.remove(); await fn(); });
        sheet.appendChild(option);
      };
      if (isOwnPost(post)) {
        addOption("🗑 Delete Post", true, () => deletePost(postId));
      } else {
        addOption("🚩 Report Post", true, async () => showMessage("Report feature abhi available nahi hai."));
        addOption("🔗 Copy Post Link", false, async () => {
          const link = location.origin + location.pathname + "#post-" + encodeURIComponent(postId);
          try { await navigator.clipboard.writeText(link); showMessage("Post link copy ho gaya."); }
          catch { showMessage(link); }
        });
      }
      addOption("Cancel", false, async () => {});
      menu.addEventListener("click", e => { if (e.target === menu) menu.remove(); });
      sheet.addEventListener("click", e => e.stopPropagation());
      menu.appendChild(sheet);
      document.body.appendChild(menu);
      return;
    }

    if (!postId) return;

    if (action === "like") {
      await toggleLike(postId);

    } else if (action === "comments") {
      openCommentsPanel(postId);

    } else if (action === "repost") {
      await toggleRepost(postId);

    } else if (action === "share") {
      await sharePost(postId);

    } else if (action === "save") {
      await toggleSave(postId);

    } else if (action === "delete") {
      await deletePost(postId);
    }
  });
}

// ------------------------------------------------------
// COMMENTS FORM EVENTS
// ------------------------------------------------------

$("commentForm")?.addEventListener(
  "submit",
  sendComment
);

$("closeCommentsBtn")?.addEventListener(
  "click",
  closeCommentsPanel
);

document
  .querySelector("#commentsPanel .comments-backdrop")
  ?.addEventListener("click", closeCommentsPanel);

// ------------------------------------------------------
// AUTH STATE
// ------------------------------------------------------

onAuthStateChanged(auth, user => {
  if (!feed) return;

  if (unsubscribeCurrentProfile) {
    unsubscribeCurrentProfile();
    unsubscribeCurrentProfile = null;
  }
  currentFollowing = new Set();

  if (user) {
    unsubscribeCurrentProfile = onSnapshot(
      getUserRef(user.uid),
      snapshot => {
        const data = snapshot.exists() ? snapshot.data() : {};
        currentFollowing = new Set(Array.isArray(data.following) ? data.following : []);
        renderFeed();
      },
      error => console.error("Current profile listener error:", error)
    );
    startFeed();

  } else {
    if (unsubscribeFeedStories) { unsubscribeFeedStories(); unsubscribeFeedStories = null; }
    activeStoryOwnerUids = new Set();
    stopProfileWatchers();
    profileCache.clear();

    if (unsubscribeFeed) {
      unsubscribeFeed();
      unsubscribeFeed = null;
    }
    if (unsubscribeComments) {
      unsubscribeComments();
      unsubscribeComments = null;
    }

    feedStarted = false;
    currentPosts = [];
    currentFollowing = new Set();

    feed.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <h3>Login required</h3>
        <p>Feed dekhne ke liye login karein.</p>
      </div>
    `;
  }
});

// ------------------------------------------------------
// PUBLIC API FOR OTHER MODULES
// ------------------------------------------------------

window.InstaProFeed = {
  refresh() {
    profileCache.clear();
    renderFeed();
  },

  getPosts() {
    return [...currentPosts];
  },

  async deletePost(postId) {
    return deletePost(postId);
  },

  async openComments(postId) {
    openCommentsPanel(postId);
  },

  closeComments() {
    closeCommentsPanel();
  }
};

// Stop feed sound/video when the app or browser tab goes into the background.
function instaProStopFeedMediaOnExit() {
  document.querySelectorAll(".ip-feed-music, video.ip-feed-media").forEach(media => {
    try {
      media.pause();
      if (media.matches(".ip-feed-music")) media.muted = true;
    } catch (error) {
      console.warn("Could not stop background feed media:", error);
    }
  });
  document.querySelectorAll("[data-music-toggle]").forEach(button => {
    button.innerHTML = '🔇 <span>Sound</span>';
    button.setAttribute("aria-label", "Turn post music on");
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") instaProStopFeedMediaOnExit();
});
window.addEventListener("pagehide", instaProStopFeedMediaOnExit);
window.addEventListener("beforeunload", instaProStopFeedMediaOnExit);

console.log("InstaPro Professional Feed System loaded.");
