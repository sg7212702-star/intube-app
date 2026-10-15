import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CLOUD_NAME = "kujnbe0a";
const UPLOAD_PRESET = "intube_free";

let profileUnsub = null;
let viewerUnsub = null;
let postsUnsub = null;
let repostsUnsub = null;
let ownedProfilePosts = [];
let repostedProfilePosts = [];
let storiesUnsub = null;
let postViewerUnsub = null;
let commentsViewerUnsub = null;

let viewingUid = null;
let profileData = {};
let profilePosts = [];
let profileStories = [];
let viewerFollowing = [];
let activeTab = "posts";

const $ = (selector, root = document) =>
  root.querySelector(selector);

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

function myId() {
  // Firebase Auth is the source of truth; localStorage may contain a stale UID.
  return auth.currentUser?.uid || localStorage.getItem("my_user_id") || null;
}

function usernameFor(data, uid) {
  return String(
    data.username ||
    data.displayName ||
    data.name ||
    auth.currentUser?.displayName ||
    uid ||
    "instapro_user"
  );
}

function photoFor(data) {
  return data.photoURL ||
    data.photoUrl ||
    data.profilePic ||
    data.photo ||
    auth.currentUser?.photoURL ||
    "https://www.gravatar.com/avatar/?d=mp";
}

function postOwner(post) {
  return post.userId ||
    post.uid ||
    post.authorId ||
    post.ownerUid ||
    "";
}

function postUrl(post) {
  return post.mediaUrl ||
    post.mediaURL ||
    post.imageUrl ||
    post.imageURL ||
    post.videoUrl ||
    post.videoURL ||
    post.url ||
    post.image ||
    "";
}

function isReel(post) {
  return String(
    post.currentType || post.type || ""
  ).toLowerCase() === "reel";
}

function isVideo(post) {
  const type = String(
    post.mediaType ||
    post.resourceType ||
    post.type ||
    ""
  ).toLowerCase();

  return type.includes("video") ||
    type === "reel" ||
    isReel(post) ||
    /\.(mp4|webm|mov)(\?|$)/i.test(postUrl(post));
}

function stopListeners() {
  if (profileUnsub) profileUnsub();
  if (viewerUnsub) viewerUnsub();
  if (postsUnsub) postsUnsub();
  if (repostsUnsub) repostsUnsub();
  if (storiesUnsub) storiesUnsub();
  if (postViewerUnsub) postViewerUnsub();
  if (commentsViewerUnsub) commentsViewerUnsub();

  profileUnsub = null;
  viewerUnsub = null;
  postsUnsub = null;
  repostsUnsub = null;
  ownedProfilePosts = [];
  repostedProfilePosts = [];
  storiesUnsub = null;
  profileStories = [];
  postViewerUnsub = null;
  commentsViewerUnsub = null;
}

function addStyles() {
  if ($("#ipProfileStyle")) return;

  const style = document.createElement("style");
  style.id = "ipProfileStyle";

  style.textContent = `
    #ipProfileOverlay {
      position:fixed;
      inset:0;
      z-index:9999;
      overflow:auto;
      color:#fff;
      background:
        radial-gradient(
          ellipse at 5% 0%,
          rgba(221,45,160,.23),
          transparent 38%
        ),
        radial-gradient(
          ellipse at 100% 22%,
          rgba(63,113,255,.2),
          transparent 38%
        ),
        rgba(7,7,16,.94);
      backdrop-filter:blur(26px);
      -webkit-backdrop-filter:blur(26px);
      font-family:inherit;
    }

    #ipProfileOverlay * {
      box-sizing:border-box;
    }

    #ipProfileOverlay .ipp-wrap {
      max-width:720px;
      margin:0 auto;
      min-height:100%;
      padding-bottom:28px;
    }

    #ipProfileOverlay .ipp-top {
      position:sticky;
      top:0;
      z-index:4;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:13px 16px;
      background:rgba(13,12,26,.78);
      border-bottom:1px solid rgba(255,255,255,.12);
      backdrop-filter:blur(24px);
    }

    #ipProfileOverlay .ipp-glass {
      border:1px solid rgba(255,255,255,.13);
      background:linear-gradient(
        135deg,
        rgba(255,255,255,.105),
        rgba(255,255,255,.035)
      );
      box-shadow:0 12px 32px rgba(0,0,0,.16);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
      border-radius:18px;
    }

    /* Compact back/refresh controls in the profile header */
    #ipProfileOverlay .ipp-top #ippBack,
    #ipProfileOverlay .ipp-top #ippRefresh,
    #ipProfileOverlay .ipp-top #ippInitialBack {
      width:auto;
      min-width:0;
      min-height:32px;
      padding:5px 9px;
      gap:3px;
      border-radius:9px;
      font-size:12px;
      line-height:1;
      white-space:nowrap;
    }

    #ipProfileOverlay .ipp-btn {
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      width:100%;
      min-width:0;
      min-height:43px;
      padding:10px 9px;
      border:1px solid rgba(255,255,255,.16);
      border-radius:11px;
      background:rgba(255,255,255,.075);
      color:#fff;
      font-family:inherit;\n      font-size:13px;\n      font-weight:700;\n      line-height:1.2;
      text-align:center;
      white-space:normal;
      overflow-wrap:anywhere;
      cursor:pointer;
      transition:transform .16s ease,background .16s ease,border-color .16s ease;
      -webkit-tap-highlight-color:transparent;
    }
    #ipProfileOverlay .ipp-btn:hover { background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.28); }
    #ipProfileOverlay .ipp-btn:active { transform:scale(.98); }
    #ipProfileOverlay .ipp-actions {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:9px;
      padding:4px 16px 0;
      align-items:stretch;
    }
    #ipProfileOverlay .ipp-actions .ipp-btn { margin:0; }
    #ipProfileOverlay .ipp-actions .ipp-primary {
      background:linear-gradient(110deg,#8b5cf6,#ec4899);
      border-color:transparent;
      box-shadow:0 5px 16px rgba(168,85,247,.18);
    }
    @media (max-width:360px) {
      #ipProfileOverlay .ipp-actions { gap:7px;padding-left:12px;padding-right:12px; }
      #ipProfileOverlay .ipp-actions .ipp-btn { min-height:41px;font-size:12px;padding:9px 6px; }
    }

    #ipProfileOverlay .ipp-btn:disabled {
      opacity:.6;
      cursor:wait;
    }

    #ipProfileOverlay .ipp-primary {
      border:0;
      background:linear-gradient(
        110deg,
        #8b5cf6,
        #ec4899
      );
    }

    #ipProfileOverlay .ipp-head {
      display:flex;
      align-items:center;
      gap:20px;
      padding:22px 17px 8px;
    }

    #ipProfileOverlay .ipp-avatar {
      width:98px;
      height:98px;
      flex:0 0 98px;
      padding:3px;
      border-radius:50%;
      background:transparent;
      box-shadow:none;
    }

    #ipProfileOverlay .ipp-avatar.has-story {
      background:conic-gradient(#ffb347,#ff3d9a,#a855f7,#ff3d9a,#ffb347);
      box-shadow:0 0 18px rgba(236,72,153,.25);
      cursor:pointer;
      animation:ippStoryRingPulse 2.2s ease-in-out infinite;
    }

    @keyframes ippStoryRingPulse {
      0%,100% { filter:brightness(1); }
      50% { filter:brightness(1.16); }
    }

    #ipProfileOverlay .ipp-avatar:not(.has-story) img {
      border-color:transparent;
    }

    #ipProfileOverlay .ipp-avatar img {
      width:100%;
      height:100%;
      object-fit:cover;
      border-radius:50%;
      border:3px solid #11121c;
      background:#222;
    }

    #ipProfileOverlay .ipp-stats {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      padding:16px;
    }

    #ipProfileOverlay .ipp-stat {
      text-align:center;
      padding:12px 4px;
      border:0;cursor:pointer;color:inherit;font:inherit;background:transparent;border-radius:14px;
      transition:transform .16s ease,background .16s ease;
    }
    #ipProfileOverlay .ipp-stat:active{transform:scale(.96)}
    #ipProfileOverlay .ipp-stat:hover{background:rgba(255,255,255,.07)}
    #ippFollowList{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.68);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(8px)}
    #ippFollowList .ipp-fl-card{width:min(420px,100%);max-height:min(72vh,620px);background:#17171d;color:#fff;border:1px solid #34343c;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 70px #0009}
    #ippFollowList .ipp-fl-head{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #333}
    #ippFollowList .ipp-fl-title{font-size:17px;font-weight:750}
    #ippFollowList .ipp-fl-close{border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}
    #ippFollowList .ipp-fl-list{overflow:auto;padding:6px 12px 14px}
    #ippFollowList .ipp-fl-row{display:flex;align-items:center;gap:12px;width:100%;padding:10px;border:0;background:transparent;color:#fff;text-align:left;border-radius:14px;cursor:pointer}
    #ippFollowList .ipp-fl-row:active{background:#303039}
    #ippFollowList .ipp-fl-row img{width:46px;height:46px;object-fit:cover;border-radius:50%;border:1px solid #555}
    #ippFollowList .ipp-fl-name{font-weight:700;font-size:14px}
    #ippFollowList .ipp-fl-handle{font-size:12px;opacity:.65;margin-top:3px}

    #ipProfileOverlay .ipp-stat strong {
      display:block;
      font-size:19px;
    }

    #ipProfileOverlay .ipp-stat span {
      display:block;
      font-size:11px;
      opacity:.7;
      margin-top:3px;
    }

    #ipProfileOverlay .ipp-tabs {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      margin-top:20px;
      border-top:1px solid rgba(255,255,255,.12);
      border-bottom:1px solid rgba(255,255,255,.12);
    }

    #ipProfileOverlay .ipp-tab {
      padding:14px 4px;
      background:transparent;
      border:0;
      border-bottom:2px solid transparent;
      color:rgba(255,255,255,.55);
      font-weight:800;
      cursor:pointer;
    }

    #ipProfileOverlay .ipp-tab.active {
      color:#fff;
      border-bottom-color:#e879f9;
    }

    #ipProfileOverlay .ipp-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:3px;
    }

    #ipProfileOverlay .ipp-tile {
      position:relative;
      aspect-ratio:3/4;
      overflow:hidden;
      background:rgba(255,255,255,.06);
      cursor:pointer;
    }

    #ipProfileOverlay .ipp-tile img,
    #ipProfileOverlay .ipp-tile video {
      width:100%;
      height:100%;
      object-fit:cover;
    }

    #ipProfileOverlay .ipp-reelTag {
      position:absolute;
      right:7px;
      top:7px;
      background:#0009;
      padding:4px 7px;
      border-radius:8px;
    }

    #ipProfileOverlay .ipp-empty {
      grid-column:1/-1;
      text-align:center;
      padding:45px 18px;
      opacity:.7;
    }

    #ipProfileOverlay .ipp-modal {
      position:fixed;
      inset:0;
      z-index:10001;
      background:#000a;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
    }

    #ipProfileOverlay .ipp-modalCard {
      width:min(100%,440px);
      padding:19px;
    }

    #ipProfileOverlay .ipp-input {
      width:100%;
      margin:7px 0 14px;
      padding:12px;
      border-radius:11px;
      border:1px solid rgba(255,255,255,.16);
      background:rgba(0,0,0,.25);
      color:#fff;
      font:inherit;
    }

    #ipProfileOverlay .ipp-highlight {
      display:flex;
      gap:10px;
      overflow:auto;
      padding:12px 16px;
    }

    #ipProfileOverlay .ipp-highlightBubble {
      min-width:65px;
      text-align:center;
      font-size:10px;
      opacity:.8;
    }

    #ipProfileOverlay .ipp-highlightBubble i {
      display:grid;
      place-items:center;
      width:52px;
      height:52px;
      margin:0 auto 6px;
      border-radius:50%;
      border:1px solid #ffffff55;
      background:#ffffff0c;
      font-style:normal;
      font-size:20px;
    }

    @media(max-width:380px) {
      #ipProfileOverlay .ipp-head {
        gap:13px;
      }

      #ipProfileOverlay .ipp-avatar {
        width:82px;
        height:82px;
        flex-basis:82px;
      }
    }
  `;

  document.head.appendChild(style);
}

function closeProfile() {
  stopListeners();

  $("#ipProfileOverlay")?.remove();

  document.body.style.overflow = "";

  // Main InstaPro profile ko automatically open na karein.
  document.querySelectorAll(".page").forEach(page => {
    if (page.id === "homePage") {
      page.style.display = "block";
    }
  });
}
function render(data = profileData, posts = profilePosts) {
  const page = $("#ipProfileOverlay");

  if (!page) return;

  const uid = viewingUid;
  const own = myId() === uid;
  const privateLocked = !own && (data.isPrivate === true || data.privateAccount === true) && !viewerFollowing.includes(uid);

  const name =
    data.displayName ||
    data.name ||
    usernameFor(data, uid);

  const username = usernameFor(data, uid)
    .replace(/^@/, "");

  const photo = photoFor(data);
  const now = Date.now();
  const activeProfileStories = profileStories
    .filter(story => {
      const url = story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
      const created = story.createdAt?.toMillis?.() || story.createdAt?.toDate?.().getTime?.() || Number(story.createdAt || story.time || 0);
      const expires = Number(story.expiresAt || 0) || ((created || now) + 86400000);
      return !!url && expires > now;
    })
    .sort((a, b) => {
      const time = story => story.createdAt?.toMillis?.() || story.createdAt?.toDate?.().getTime?.() || Number(story.createdAt || story.time || 0);
      return time(b) - time(a);
    });
  const latestProfileStory = activeProfileStories[0] || null;

  const bio =
    data.bio ||
    data.about ||
    "Welcome to my InstaPro profile ✨";

  const followers = Array.isArray(data.followers)
    ? data.followers.length
    : Number(data.followersCount || data.followers || 0);

  const following = Array.isArray(data.following)
    ? data.following.length
    : Number(data.followingCount || data.following || 0);

  // Hide locally tombstoned posts immediately, including stale repost/profile caches.
  const deletedIds = (() => {
    try { return new Set(JSON.parse(localStorage.getItem("instapro-deleted-post-ids") || "[]").map(String)); }
    catch (_) { return new Set(); }
  })();
  const availablePosts = posts.filter(post => !deletedIds.has(String(post.id)));
  // Strictly scope profile media to the profile being viewed; never infer ownership from the signed-in user.
  const ownPosts = availablePosts.filter(post => {
    const ownerUid = post.uid || post.userId || post.authorId || post.ownerUid || "";
    return String(ownerUid) === String(uid);
  });
  const ownReposts = availablePosts.filter(
    post => postOwner(post) !== uid &&
      Array.isArray(post.repostedBy) &&
      post.repostedBy.includes(uid)
  );

  const postCount = privateLocked ? 0 : ownPosts.filter(
    post => !isReel(post)
  ).length;

  const reelCount = privateLocked ? 0 : ownPosts.filter(
    post => isReel(post)
  ).length;

  const isFollowing = viewerFollowing.includes(uid);
  const myUid = myId();
  // "Follow back" appears when this profile already follows the signed-in user.
  const targetFollowing = Array.isArray(data.following) ? data.following : [];
  const theyFollowMe = Boolean(myUid && myUid !== uid && targetFollowing.includes(myUid));
  const isMutualFollow = Boolean(myUid && myUid !== uid && isFollowing && theyFollowMe);

  page.innerHTML = `
    <div class="ipp-wrap">

      <header class="ipp-top">
        <button class="ipp-btn" id="ippBack">‹ Back</button>
        <strong style="font-size:17px">InstaPro ✦</strong>
        <button class="ipp-btn" id="ippRefresh">↻</button>
      </header>

      <main>
        <div class="ipp-head">

          <div class="ipp-avatar ${latestProfileStory ? "has-story" : ""}" id="ippStoryAvatar" title="${latestProfileStory ? "View story" : "Profile photo"}">
            <img
              id="ippPhoto"
              src="${esc(photo)}"
              alt="Profile photo"
            >
          </div>

          <div style="flex:1;min-width:0">
            <div style="
              font-size:19px;
              font-weight:850;
              overflow-wrap:anywhere
            ">
              ${esc(name)}
            </div>

            <div style="font-size:12px;opacity:.68;margin-top:4px">
              @${esc(username)}
            </div>

            <div style="
              font-size:11px;
              margin-top:8px;
              color:#e6a7ff
            ">
              ${esc(data.category || "CREATOR")}
            </div>
          </div>

        </div>

        <div style="
          padding:7px 17px 0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          font-size:13px;
          line-height:1.65
        ">
          ${esc(bio)}
        </div>

        ${data.website ? `
          <div style="
            padding:5px 17px;
            color:#a5d8ff;
            font-size:12px;
            overflow-wrap:anywhere
          ">
            ${esc(data.website)}
          </div>
        ` : ""}

        <div class="ipp-stats">

          <div class="ipp-stat ipp-glass">
            <strong>${postCount}</strong>
            <span>Posts</span>
          </div>

          <button type="button" class="ipp-stat ipp-glass" id="ippFollowersStat" aria-label="View followers">
            <strong>${followers}</strong>
            <span>Followers</span>
          </button>

          <button type="button" class="ipp-stat ipp-glass" id="ippFollowingStat" aria-label="View following">
            <strong>${following}</strong>
            <span>Following</span>
          </button>

        </div>

        <div class="ipp-actions">

          ${own ? `
            <button
              id="ippEdit"
              class="ipp-btn ipp-primary"
            >
              ✦ Edit profile
            </button>


            <button
              id="ippPhotoBtn"
              class="ipp-btn"
            >
              📷 Change photo
            </button>
          ` : `
            <button
              id="ippFollow"
              class="ipp-btn ipp-primary"
            >
              ${isFollowing ? "Following ✓" : (theyFollowMe ? "Follow back ↩" : "Follow +")}
            </button>
            ${isMutualFollow ? `
              <button
                id="ippMessage"
                class="ipp-btn"
              >
                ✉ Message
              </button>
            ` : ""}
          `}

          <button
            id="ippShare"
            class="ipp-btn"
          >
            ↗ Share
          </button>

        </div>

        <div class="ipp-highlight">

          <div class="ipp-highlightBubble">
            <i>＋</i>
            New
          </div>

          ${(Array.isArray(data.highlights) ? data.highlights : [])
            .slice(0, 12)
            .map(h => {
              const story = profileStories.find(item => item.id === h.storyId);
              const cover = h.mediaUrl || (story ? postUrl(story) : "");
              return `
                <button type="button" class="ipp-highlightBubble" data-story-id="${esc(h.storyId || "")}" aria-label="Open highlight ${esc(h.title || "Highlight")}" style="border:0;background:transparent;color:inherit;cursor:pointer;padding:0;">
                  <i style="overflow:hidden;position:relative;">${cover ? `<img src="${esc(cover)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` : esc(h.emoji || "✦")}</i>
                  ${esc(h.title || "Highlight")}
                </button>
              `;
            }).join("")}

        </div>

        <div class="ipp-tabs">

          <button
            class="ipp-tab ${activeTab === "posts" ? "active" : ""}"
            data-tab="posts"
          >
            ▦ POSTS (${postCount})
          </button>

          <button
            class="ipp-tab ${activeTab === "reels" ? "active" : ""}"
            data-tab="reels"
          >
            ▷ REELS (${reelCount})
          </button>

          <button
            class="ipp-tab ${activeTab === "reposts" ? "active" : ""}"
            data-tab="reposts"
          >
            ↻ REPOSTS (${privateLocked ? 0 : ownReposts.length})
          </button>

          <button
            class="ipp-tab ${activeTab === "tagged" ? "active" : ""}"
            data-tab="tagged"
          >
            ♙ TAGGED
          </button>

        </div>

        <div id="ippGrid" class="ipp-grid"></div>

      </main>
    </div>
  `;

  const storyAvatar = $("#ippStoryAvatar", page);

  // Instagram-style long-press preview (works on both own and other profiles).
  const profilePhoto = $("#ippPhoto", page);
  if (profilePhoto && storyAvatar && !page.querySelector("#ippPhotoPreview")) {
    let holdTimer = null;
    let holdStarted = false;
    let startX = 0;
    let startY = 0;
    const clearHold = () => {
      if (holdTimer !== null) clearTimeout(holdTimer);
      holdTimer = null;
    };
    const openPhotoPreview = () => {
      if (document.getElementById("ippPhotoPreview")) return;
      const preview = document.createElement("div");
      preview.id = "ippPhotoPreview";
      preview.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);";
      preview.innerHTML = `<button type="button" aria-label="Close profile photo" style="position:absolute;top:18px;right:20px;width:44px;height:44px;border:0;border-radius:50%;background:#ffffff22;color:#fff;font-size:30px;cursor:pointer">×</button><img src="${esc(photo)}" alt="Profile photo preview" style="width:min(82vw,420px);height:min(82vw,420px);max-height:75vh;object-fit:cover;border-radius:50%;border:3px solid #ffffff55;box-shadow:0 12px 60px #0009;">`;
      document.body.appendChild(preview);
      const closePreview = () => preview.remove();
      preview.querySelector("button").onclick = closePreview;
      preview.addEventListener("click", event => { if (event.target === preview) closePreview(); });
      const onKey = event => {
        if (event.key === "Escape") {
          closePreview();
          document.removeEventListener("keydown", onKey);
        }
      };
      document.addEventListener("keydown", onKey);
    };
    // Attach to the whole circular avatar, not just the image element.
    storyAvatar.style.touchAction = "none";
    storyAvatar.style.webkitUserSelect = "none";
    storyAvatar.style.userSelect = "none";
    storyAvatar.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      holdStarted = false;
      clearHold();
      startX = event.clientX;
      startY = event.clientY;
      holdTimer = setTimeout(() => {
        holdStarted = true;
        openPhotoPreview();
      }, 2000);
    });
    storyAvatar.addEventListener("pointermove", event => {
      if (holdTimer !== null && (Math.abs(event.clientX - startX) > 18 || Math.abs(event.clientY - startY) > 18)) clearHold();
    });
    ["pointerup", "pointercancel"].forEach(type => storyAvatar.addEventListener(type, clearHold));
    storyAvatar.addEventListener("contextmenu", event => event.preventDefault());
    storyAvatar.addEventListener("click", event => {
      if (holdStarted) {
        event.preventDefault();
        event.stopImmediatePropagation();
        holdStarted = false;
      }
    }, true);
  }
  if (storyAvatar && latestProfileStory) {
    storyAvatar.setAttribute("role", "button");
    storyAvatar.setAttribute("tabindex", "0");
    storyAvatar.setAttribute("aria-label", "View profile story");
    const openLatestStory = () => document.dispatchEvent(new CustomEvent("open-notification-story", { detail: { storyId: latestProfileStory.id } }));
    storyAvatar.onclick = openLatestStory;
    storyAvatar.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLatestStory();
      }
    };
  }

  page.querySelectorAll(".ipp-highlightBubble[data-story-id]").forEach(button => {
    button.onclick = () => document.dispatchEvent(new CustomEvent("open-highlight-story", {
      detail: { storyId: button.dataset.storyId }
    }));
  });

  const grid = $("#ippGrid", page);

  let filtered = [];

  if (privateLocked) {
    grid.innerHTML = '<div class="ipp-empty" style="padding:38px 18px"><div style="font-size:42px">🔒</div><strong>This account is private</strong><p>Posts aur Reels dekhne ke liye follow request bhejein aur approval ka wait karein.</p></div>';
  } else if (activeTab === "posts") {
    filtered = ownPosts.filter(post => !isReel(post));
  } else if (activeTab === "reels") {
    filtered = ownPosts.filter(post => isReel(post));
  } else if (activeTab === "reposts") {
    filtered = ownReposts.map(post => ({ ...post, __profileRepost: true }));
  }

  if (activeTab === "tagged") {
    grid.innerHTML = `
      <div class="ipp-empty">
        Tagged posts ke liye tagging system abhi alag se add karna hoga.
      </div>
    `;
  } else if (!filtered.length) {
    grid.innerHTML = `
      <div class="ipp-empty">
        <div style="font-size:38px">▧</div>
        <strong>No ${activeTab} yet</strong>
        <p>Uploaded media yahan dikhai dega.</p>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(post => {
      const url = postUrl(post);

      if (!url) return "";

      return `
  <div
    class="ipp-tile"
    data-post-id="${esc(post.id)}"
    role="button"
    tabindex="0"
    aria-label="Open post"
    style="cursor:pointer"
  >
    ${post.__profileRepost ? '<span style="position:absolute;z-index:2;left:6px;top:6px;padding:4px 6px;border-radius:7px;background:#111b;color:#fff;font-size:10px;font-weight:800">↻ Reposted</span>' : ""}
    ${isVideo(post) ? `
      <video
        src="${esc(url)}"
        muted
        playsinline
        preload="metadata"
      ></video>
      <span class="ipp-reelTag">▷ ${Number(post.viewCount ?? post.viewsCount ?? post.playCount ?? post.views) || 0}</span>
    ` : `
      <img
        src="${esc(url)}"
        loading="lazy"
        alt="Post"
      >
    `}
  </div>
`;
}).join("");
  }

// Instagram-style post/reel viewer with likes, comments, save, share and delete.
async function openSelectedPost(post) {
  if (!post) return;
  closePostViewer();

  const user = auth.currentUser;
  const own = Boolean(user && postOwner(post) === user.uid);
  const viewer = document.createElement("div");
  viewer.id = "ippActivePostViewer";
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:#000;overflow-y:auto;color:#fff;font-family:inherit;";
  const url = postUrl(post);
  const video = isVideo(post);
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const liked = Boolean(user && likes.includes(user.uid));
  const caption = post.caption || post.description || "";
  viewer.innerHTML = `
    <div style="position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:14px;padding:14px 16px;background:#111;border-bottom:1px solid #333;">
      <button type="button" id="ippViewerClose" aria-label="Close" style="border:0;background:transparent;color:white;font-size:27px;">‹</button>
      <strong style="font-size:16px;">Post</strong>
      <span style="flex:1"></span>
      <button type="button" id="ippPostMore" style="border:0;background:transparent;color:white;font-size:24px;" aria-label="Post options">⋯</button>
    </div>
    <div style="max-width:650px;margin:0 auto;padding-bottom:30px;">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;">
        <img src="${esc(post.photo || post.photoURL || "https://www.gravatar.com/avatar/?d=mp")}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
        <div style="flex:1;min-width:0;"><strong>${esc(post.username || post.displayName || post.email?.split("@")[0] || "InstaPro User")}</strong><div style="font-size:11px;opacity:.6;">InstaPro</div></div>
        ${own ? '<button id="ippDeletePostTop" type="button" style="border:0;background:transparent;color:#ff6b8a;font-weight:700;">Delete</button>' : ""}
      </div>
      <div style="background:#080808;display:flex;align-items:center;justify-content:center;min-height:180px;max-height:72vh;">
        ${video ? `<video id="ippViewerMedia" src="${esc(url)}" controls autoplay playsinline style="display:block;max-width:100%;max-height:72vh;object-fit:contain;"></video>` : `<img id="ippViewerMedia" src="${esc(url)}" alt="Post" style="display:block;max-width:100%;max-height:72vh;object-fit:contain;">`}
      </div>
      <div style="padding:12px 14px;">
        <div style="display:flex;align-items:center;gap:18px;font-size:27px;">
          <button id="ippPostLike" type="button" aria-label="Like" style="border:0;background:transparent;color:${liked ? "#ff3158" : "#fff"};font-size:28px;padding:0;">${liked ? "♥" : "♡"}</button>
          <button id="ippPostCommentFocus" type="button" aria-label="Comment" style="border:0;background:transparent;color:#fff;font-size:25px;padding:0;">♧</button>
          <button id="ippPostShare" type="button" aria-label="Share" style="border:0;background:transparent;color:#fff;font-size:25px;padding:0;">➤</button>
          <span style="flex:1"></span>
          <button id="ippPostSave" type="button" aria-label="Save post" style="border:0;background:transparent;color:#fff;font-size:25px;padding:0;">▱</button>
        </div>
        <div id="ippLikeCount" style="font-weight:800;margin-top:9px;">${likes.length} likes</div>
        <div style="margin-top:8px;line-height:1.5;overflow-wrap:anywhere;">${caption ? `<strong>${esc(post.username || post.displayName || "user")}</strong> ${esc(caption)}` : '<span style="opacity:.6">No caption</span>'}</div>
        <button id="ippShowComments" type="button" style="border:0;background:transparent;color:#aaa;padding:10px 0 6px;">View all comments</button>
        <div id="ippPostComments" style="max-height:240px;overflow:auto;border-top:1px solid #252525;padding-top:4px;"></div>
        <form id="ippPostCommentForm" style="display:flex;gap:8px;align-items:center;border-top:1px solid #252525;padding-top:12px;margin-top:8px;">
          <input id="ippPostCommentInput" maxlength="2000" placeholder="Add a comment..." style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:#fff;font:inherit;padding:10px 0;">
          <button type="submit" style="border:0;background:transparent;color:#4aa8ff;font-weight:800;">Post</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(viewer);

  const close = () => closePostViewer();
  $("#ippViewerClose", viewer).onclick = close;
  viewer.addEventListener("click", event => { if (event.target === viewer) close(); });
  $("#ippPostMore", viewer).onclick = () => {
    const options = own ? "Choose: OK = Delete post, Cancel = Keep post" : "Choose OK to copy/share this post";
    if (own && confirm(options)) deleteProfilePost(post.id, viewer);
    else if (!own) shareProfilePost(post);
  };
  $("#ippDeletePostTop", viewer)?.addEventListener("click", () => deleteProfilePost(post.id, viewer));

  $("#ippPostLike", viewer).onclick = async () => {
    if (!user || user.isAnonymous) { alert("Like karne ke liye login karein."); return; }
    const button = $("#ippPostLike", viewer);
    button.disabled = true;
    try {
      const ref = doc(db, "posts", post.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Post ab available nahi hai.");
      const currentLikes = Array.isArray(snap.data().likes) ? snap.data().likes : [];
      const already = currentLikes.includes(user.uid);
      const nextCount = Math.max(0, Number(snap.data().likesCount ?? currentLikes.length) + (already ? -1 : 1));
      await updateDoc(ref, {
        likes: already ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: nextCount,
        likeCount: nextCount
      });
      button.textContent = already ? "♡" : "♥";
      button.style.color = already ? "#fff" : "#ff3158";
      button.setAttribute("aria-pressed", String(!already));
      $("#ippLikeCount", viewer).textContent = nextCount + (nextCount === 1 ? " like" : " likes");
      if (!already && postOwner(post) && postOwner(post) !== user.uid) {
        try {
          await addDoc(collection(db, "users", postOwner(post), "notifications"), {
            type: "like",
            message: "liked your post",
            fromUid: user.uid,
            fromUsername: user.displayName || user.email?.split("@")[0] || "InstaPro User",
            fromPhoto: user.photoURL || "",
            postId: post.id,
            createdAt: serverTimestamp(),
            read: false
          });
        } catch (notificationError) {
          console.warn("Profile post Like notification could not be saved:", notificationError);
        }
      }
    } catch (error) {
      console.error("Profile post like error:", error);
      alert("Like save nahi hua. Firebase Rules check karein.");
    } finally { button.disabled = false; }
  };

  $("#ippPostSave", viewer).onclick = async () => {
    if (!user || user.isAnonymous) { alert("Post save karne ke liye login karein."); return; }
    const savedRef = doc(db, "savedPosts", user.uid, "posts", post.id);
    try {
      const saved = await getDoc(savedRef);
      if (saved.exists()) {
        await deleteDoc(savedRef);
        await updateDoc(doc(db, "posts", post.id), { savedBy: arrayRemove(user.uid) }).catch(() => {});
        $("#ippPostSave", viewer).textContent = "▱";
        alert("Saved posts se hata diya.");
      } else {
        await setDoc(savedRef, { postId: post.id, uid: user.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, "posts", post.id), { savedBy: arrayUnion(user.uid) }).catch(() => {});
        $("#ippPostSave", viewer).textContent = "▣";
        alert("Post save ho gayi.");
      }
    } catch (error) {
      console.error("Profile post save error:", error);
      alert("Post save nahi hui. Firebase Rules check karein.");
    }
  };

  $("#ippPostShare", viewer).onclick = () => shareProfilePost(post);
  $("#ippPostCommentFocus", viewer).onclick = () => $("#ippPostCommentInput", viewer)?.focus();
  $("#ippShowComments", viewer).onclick = () => $("#ippPostCommentInput", viewer)?.focus();

  $("#ippPostCommentForm", viewer).onsubmit = async event => {
    event.preventDefault();
    const input = $("#ippPostCommentInput", viewer);
    const text = input.value.trim();
    if (!user || user.isAnonymous) { alert("Comment karne ke liye login karein."); return; }
    if (!text) return;
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        uid: user.uid,
        username: user.displayName || user.email?.split("@")[0] || "InstaPro User",
        photo: user.photoURL || "",
        text,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", post.id), { commentCount: increment(1), commentsCount: increment(1) }).catch(() => {});
      const ownerUid = postOwner(post);
      if (ownerUid && ownerUid !== user.uid) {
        try {
          await addDoc(collection(db, "users", ownerUid, "notifications"), {
            type: "comment",
            message: "commented on your post",
            fromUid: user.uid,
            fromUsername: user.displayName || user.email?.split("@")[0] || "InstaPro User",
            fromPhoto: user.photoURL || "",
            postId: post.id,
            createdAt: serverTimestamp(),
            read: false
          });
        } catch (notificationError) {
          console.warn("Profile comment notification could not be saved:", notificationError);
        }
      }
      input.value = "";
    } catch (error) {
      console.error("Profile post comment error:", error);
      alert("Comment save nahi hua. Firebase Rules check karein.");
    }
  };

  postViewerUnsub = onSnapshot(doc(db, "posts", post.id), snapshot => {
    if (!snapshot.exists()) { closePostViewer(); return; }
    const latest = snapshot.data();
    const latestLikes = Array.isArray(latest.likes) ? latest.likes : [];
    const isLiked = Boolean(auth.currentUser && latestLikes.includes(auth.currentUser.uid));
    const likeButton = $("#ippPostLike", viewer);
    const likeCount = $("#ippLikeCount", viewer);
    if (likeButton) { likeButton.textContent = isLiked ? "♥" : "♡"; likeButton.style.color = isLiked ? "#ff3158" : "#fff"; }
    if (likeCount) likeCount.textContent = `${Number(latest.likesCount ?? latestLikes.length)} likes`;
  }, error => console.error("Profile post realtime listener:", error));

  commentsViewerUnsub = onSnapshot(query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc")), snapshot => {
    const list = $("#ippPostComments", viewer);
    if (!list) return;
    if (snapshot.empty) { list.innerHTML = '<p style="font-size:13px;opacity:.6;padding:8px 0;">No comments yet. Be the first to comment.</p>'; return; }
    list.innerHTML = snapshot.docs.map(item => {
      const comment = item.data();
      return `<div style="display:flex;gap:8px;padding:8px 0;overflow-wrap:anywhere;"><img src="${esc(comment.photo || comment.photoURL || "https://www.gravatar.com/avatar/?d=mp")}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;"><div style="font-size:13px;line-height:1.45;"><strong>${esc(comment.username || "user")}</strong> ${esc(comment.text || "")}</div></div>`;
    }).join("");
  }, error => {
    console.error("Profile comments listener:", error);
    const list = $("#ippPostComments", viewer);
    if (list) list.innerHTML = '<p style="font-size:13px;opacity:.6;">Comments load nahi hue. Firebase Rules check karein.</p>';
  });
}

function closePostViewer() {
  if (postViewerUnsub) postViewerUnsub();
  if (commentsViewerUnsub) commentsViewerUnsub();
  postViewerUnsub = null;
  commentsViewerUnsub = null;
  const viewer = $("#ippActivePostViewer");
  viewer?.querySelector("video")?.pause();
  viewer?.remove();
}

async function deleteProfilePost(postId, viewer) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    alert("Pehle login karein.");
    return;
  }

  try {
    // Latest Firestore document se ownership verify karein.
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
      alert("Yeh post pehle hi delete ho chuki hai.");
      closePostViewer();
      return;
    }

    const post = { id: snap.id, ...snap.data() };
    if (postOwner(post) !== user.uid) {
      alert("Aap sirf apni post delete kar sakte hain.");
      return;
    }

    if (!confirm("Kya aap is post ko hamesha ke liye delete karna chahte hain?")) return;

    // Tombstone the ID before deleting so stale feed/profile caches cannot show a black Reel.
    try {
      const deleted = new Set(JSON.parse(localStorage.getItem("instapro-deleted-post-ids") || "[]").map(String));
      deleted.add(String(postId));
      localStorage.setItem("instapro-deleted-post-ids", JSON.stringify([...deleted].slice(-1000)));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("instapro:post-deleted", { detail: { postId: String(postId) } }));
    await deleteDoc(postRef);
    // Immediately purge deleted content from local profile caches; the realtime listener will confirm it.
    ownedProfilePosts = ownedProfilePosts.filter(item => String(item.id) !== String(postId));
    repostedProfilePosts = repostedProfilePosts.filter(item => String(item.id) !== String(postId));
    profilePosts = profilePosts.filter(item => String(item.id) !== String(postId));
    render(profileData, profilePosts);
    closePostViewer();
    alert("Post/Reel delete ho gayi.");
  } catch (error) {
    console.error("Profile post delete error:", error);
    alert("Post delete nahi hui. Firebase Rules mein owner-delete permission check karein.");
  }
}

async function shareProfilePost(post) {
  const url = new URL(location.href);
  url.hash = "post-" + encodeURIComponent(post.id);
  try {
    if (navigator.share) await navigator.share({ title: "InstaPro post", text: post.caption || "Check out this post", url: url.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); alert("Post link copied."); }
    else prompt("Copy post link:", url.href);
    await updateDoc(doc(db, "posts", post.id), { shareCount: increment(1) }).catch(() => {});
  } catch (error) { if (error.name !== "AbortError") console.error("Post share error:", error); }
}

const postTiles = grid.querySelectorAll(".ipp-tile");
postTiles.forEach(tile => {
  async function openFromTile() {
    const post = filtered.find(item => item.id === tile.dataset.postId);
    if (!post) return;

    // Profile grid must reuse the app's existing Home feed / Reels feed,
    // not create a second, profile-specific post viewer.
    // Anything opened from the Profile Reels tab must use the existing Reels feed,
    // including uploads whose stored type is "video" instead of "reel".
    const isProfileReel = activeTab === "reels" || isReel(post) || isVideo(post);
    closePostViewer();
    closeProfile();

    document.querySelectorAll(".page").forEach(section => {
      section.style.display = "none";
    });

    if (isProfileReel) {
      const reelsPage = document.getElementById("reelsPage");
      if (!reelsPage) {
        alert("Reels feed nahi mila. reels.js check karein.");
        return;
      }
      reelsPage.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Wait for the existing realtime Reels grid to render, then use its
      // normal click handler so the standard Reels viewer/actions are used.
      for (let attempt = 0; attempt < 20; attempt++) {
        const reelTile = document.querySelector('#ipReelsGrid [data-reel-id="' + CSS.escape(post.id) + '"]');
        if (reelTile) {
          reelTile.click();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      alert("Yeh Reel abhi Reels feed mein nahi mili. Feed refresh karke dobara try karein.");
      return;
    }

    const homePage = document.getElementById("homePage");
    if (!homePage) return;
    homePage.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.InstaProFeed?.refresh?.();

    // The Home feed owns its normal post cards and their like/comment/share
    // controls. Scroll to the matching card instead of opening a duplicate UI.
    for (let attempt = 0; attempt < 20; attempt++) {
      const card = document.querySelector('.instapro-feed-post[data-post-id="' + CSS.escape(post.id) + '"]');
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    alert("Yeh Post abhi Home feed mein nahi mili. Feed refresh karke dobara try karein.");
  }
  tile.addEventListener("click", openFromTile);
  tile.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openFromTile(); }
  });
});
  $("#ippBack", page).onclick = closeProfile;

  $("#ippRefresh", page).onclick = () =>
    openProfile(uid);

  page.querySelectorAll("[data-tab]").forEach(button => {
    button.onclick = () => {
      activeTab = button.dataset.tab;
      render();
    };
  });

  $("#ippShare", page).onclick = async () => {
    const link = new URL(location.href);

    link.searchParams.set("user", uid);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name} on InstaPro`,
          text: `Check out @${username}`,
          url: link.href
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link.href);
        alert("Profile link copied.");
      } else {
        prompt("Copy profile link:", link.href);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(error);
      }
    }
  };

  $("#ippEdit", page)?.addEventListener(
    "click",
    () => showEdit(data)
  );

  $("#ippPhotoBtn", page)?.addEventListener(
    "click",
    () => $("#ippPhotoInput")?.click()
  );

  $("#ippFollow", page)?.addEventListener(
    "click",
    toggleFollow
  );

  const followersButton = $("#ippFollowersStat", page);
  const followingButton = $("#ippFollowingStat", page);
  if (followersButton) {
    followersButton.style.position = "relative";
    followersButton.style.zIndex = "5";
    followersButton.style.pointerEvents = "auto";
    followersButton.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openFollowList(String(uid), "followers");
    };
  }
  if (followingButton) {
    followingButton.style.position = "relative";
    followingButton.style.zIndex = "5";
    followingButton.style.pointerEvents = "auto";
    followingButton.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openFollowList(String(uid), "following");
    };
  }

  $("#ippMessage", page)?.addEventListener("click", async () => {
    const target = viewingUid;
    try {
      closeProfile();
      if (typeof window.openChatWithUser === "function") {
        await window.openChatWithUser(target);
      } else {
        alert("Chat system load nahi hua. Chat page ek baar open karke phir try karein.");
      }
    } catch (error) {
      console.error("Open profile chat error:", error);
      alert("Chat open nahi hui. Internet aur Firestore Rules check karein.");
    }
  });

  // Keep the post viewer click handler installed above; do not overwrite tile.onclick.

  $("#ippPhoto", page).onerror = () => {
    $("#ippPhoto").src =
      "https://www.gravatar.com/avatar/?d=mp";
  };
}
function showEdit(data) {
  const page = $("#ipProfileOverlay");

  const modal = document.createElement("div");
  modal.className = "ipp-modal";

  modal.innerHTML = `
    <div class="ipp-modalCard ipp-glass">

      <h3 style="margin:0 0 16px">
        Edit profile
      </h3>

      <label>Name</label>
      <input
        class="ipp-input"
        id="ippName"
        maxlength="60"
        value="${esc(data.displayName || data.name || "")}"
      >

      <label>Username</label>
      <input
        class="ipp-input"
        id="ippUsername"
        maxlength="30"
        value="${esc(data.username || "")}"
      >

      <label>Bio</label>
      <textarea
        class="ipp-input"
        id="ippBio"
        maxlength="160"
        rows="3"
      >${esc(data.bio || "")}</textarea>

      <label>Category</label>
      <input
        class="ipp-input"
        id="ippCategory"
        maxlength="40"
        value="${esc(data.category || "Creator")}"
      >

      <label>Website</label>
      <input
        class="ipp-input"
        id="ippWebsite"
        maxlength="180"
        value="${esc(data.website || "")}"
      >

      <div
        id="ippEditStatus"
        style="font-size:12px;opacity:.8;margin:4px 0 12px"
      ></div>

      <div style="display:flex;gap:9px">

        <button
          id="ippCancel"
          class="ipp-btn"
          style="flex:1"
        >
          Cancel
        </button>

        <button
          id="ippSave"
          class="ipp-btn ipp-primary"
          style="flex:1"
        >
          Save changes
        </button>

      </div>

    </div>
  `;

  page.appendChild(modal);

  $("#ippCancel", modal).onclick = () =>
    modal.remove();

  modal.addEventListener("click", event => {
    if (event.target === modal) modal.remove();
  });

  $("#ippSave", modal).onclick = async () => {
    const status = $("#ippEditStatus", modal);

    const name = $("#ippName", modal)
      .value.trim();

    const username = $("#ippUsername", modal)
      .value.trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    const bio = $("#ippBio", modal)
      .value.trim();

    const category = $("#ippCategory", modal)
      .value.trim();

    const website = $("#ippWebsite", modal)
      .value.trim();

    if (!name) {
      status.textContent = "Name is required.";
      return;
    }

    if (
      username &&
      !/^[a-z0-9._]{3,30}$/.test(username)
    ) {
      status.textContent =
        "Username 3–30 characters ka hona chahiye.";
      return;
    }

    status.textContent = "Saving to Firebase…";

    try {
      await setDoc(
        doc(db, "users", viewingUid),
        {
          name,
          displayName: name,
          username: username ||
            name.toLowerCase().replace(/\s+/g, ""),
          bio,
          category,
          website,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      modal.remove();

    } catch (error) {
      console.error("Edit profile failed:", error);

      status.textContent =
        "Save failed. Login aur Firestore Rules check karein.";
    }
  };
}

async function uploadProfilePhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please select an image.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Photo 8 MB se chhoti honi chahiye.");
  }

  const form = new FormData();

  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Photo upload failed."
    );
  }

  await setDoc(
    doc(db, "users", viewingUid),
    {
      photoURL: result.secure_url,
      photoUrl: result.secure_url,
      photo: result.secure_url,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function toggleFollow() {
  const followerUid = myId();
  const targetUid = viewingUid;

  if (!followerUid) {
    alert("Pehle login karein.");
    return;
  }

  if (followerUid === targetUid) return;

  const button = $("#ippFollow");

  if (button) {
    button.disabled = true;
    button.textContent = "Please wait…";
  }

  try {
    // Private accounts must approve new followers before content is unlocked.
    const privacyApi = window.InstaProPrivate;
    if (privacyApi && !viewerFollowing.includes(targetUid)) {
      const privacy = await privacyApi.getAccountPrivacy(targetUid);
      if (privacy.isPrivate) {
        const result = await privacyApi.requestFollow(targetUid);
        if (button) button.textContent = result.status === "pending" ? "Requested ✓" : "Following ✓";
        return;
      }
    }
    const [mineSnap, targetSnap] = await Promise.all([
      getDoc(doc(db, "users", followerUid)),
      getDoc(doc(db, "users", targetUid))
    ]);

    const mine = mineSnap.exists() ? mineSnap.data() : {};
    const target = targetSnap.exists() ? targetSnap.data() : {};
    const following = Array.isArray(mine.following) ? mine.following : [];
    const already = following.includes(targetUid);

    // Atomic array operations avoid overwriting another follow/unfollow action
    // when multiple devices update the same account around the same time.
    const batch = writeBatch(db);
    const mineRef = doc(db, "users", followerUid);
    const targetRef = doc(db, "users", targetUid);

    if (already) {
      batch.update(mineRef, {
        following: arrayRemove(targetUid),
        updatedAt: serverTimestamp()
      });
      batch.update(targetRef, {
        followers: arrayRemove(followerUid),
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(mineRef, {
        following: arrayUnion(targetUid),
        updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(targetRef, {
        followers: arrayUnion(followerUid),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();

    if (!already) {
      try {
        const actor = auth.currentUser;
        if (actor) {
          await addDoc(collection(db, "users", targetUid, "notifications"), {
            type: "follow",
            message: "started following you",
            fromUid: actor.uid,
            fromUsername: actor.displayName || actor.email?.split("@")[0] || "InstaPro User",
            fromPhoto: actor.photoURL || "",
            createdAt: serverTimestamp(),
            read: false
          });
        }
      } catch (notificationError) {
        console.warn("Profile follow notification could not be saved:", notificationError);
      }
    }

  } catch (error) {
    console.error("Follow action failed:", error);

    alert(
      "Follow update fail hua. Login aur Firestore Rules check karein."
    );

  } finally {
    if (button) button.disabled = false;
  }
}


async function openFollowList(uid, type) {
  const title = type === "followers" ? "Followers" : "Following";
  const field = type === "followers" ? "followers" : "following";
  let overlay = document.getElementById("ippFollowList");
  if (overlay) overlay.remove();
  overlay = document.createElement("div");
  overlay.id = "ippFollowList";
  overlay.innerHTML = `<section class="ipp-fl-card" role="dialog" aria-modal="true" aria-label="${title}">
    <header class="ipp-fl-head"><span class="ipp-fl-title">${title}</span><button class="ipp-fl-close" type="button" aria-label="Close">×</button></header>
    <div class="ipp-fl-list"><div style="text-align:center;padding:28px;opacity:.7">Loading…</div></div>
  </section>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.style.zIndex = "2147483000";
  overlay.querySelector(".ipp-fl-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const rawValue = snap.exists() ? snap.data()[field] : [];
    const raw = Array.isArray(rawValue) ? rawValue : (rawValue && typeof rawValue === "object" ? Object.keys(rawValue).filter(key => rawValue[key]) : []);
    const ids = Array.isArray(raw) ? [...new Set(raw.filter(Boolean).map(String))] : [];
    const list = overlay.querySelector(".ipp-fl-list");
    if (!ids.length) {
      list.innerHTML = '<div style="text-align:center;padding:30px 12px;opacity:.65">No users yet</div>';
      return;
    }
    const people = await Promise.all(ids.map(async personUid => {
      try {
        const person = await getDoc(doc(db, "users", personUid));
        return person.exists() ? { uid: personUid, ...person.data() } : { uid: personUid, username: personUid };
      } catch { return { uid: personUid, username: personUid }; }
    }));
    if (!document.body.contains(overlay)) return;
    list.innerHTML = people.map(person => {
      const name = person.username || person.displayName || person.name || "User";
      const photo = person.photoURL || person.profilePic || person.photoUrl || person.avatar || "";
      return `<button class="ipp-fl-row" type="button" data-follow-person="${esc(person.uid)}">
        <img src="${esc(photo || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='100%25' height='100%25' fill='%23333'/%3E%3C/svg%3E")}" alt="">
        <span><div class="ipp-fl-name">${esc(name)}</div><div class="ipp-fl-handle">@${esc(person.username || person.uid)}</div></span>
      </button>`;
    }).join("");
    list.querySelectorAll("[data-follow-person]").forEach(row => row.addEventListener("click", async () => {
      const personUid = row.dataset.followPerson;
      close();
      await openProfile(personUid);
    }));
  } catch (error) {
    console.error("Followers/following list failed:", error);
    overlay.querySelector(".ipp-fl-list").innerHTML = '<div style="text-align:center;padding:28px;opacity:.7">List load nahi hui. Firebase Rules check karein.</div>';
  }
}

async function openProfile(uid = null) {
  const currentId = myId();
  const targetUid = uid || currentId;

  if (!targetUid) {
    alert("Profile dekhne ke liye pehle login karein.");
    return;
  }

  viewingUid = targetUid;
  activeTab = "posts";

  stopListeners();
  addStyles();

  $("#ipProfileOverlay")?.remove();

  const page = document.createElement("section");
  page.id = "ipProfileOverlay";

  page.innerHTML = `
    <div class="ipp-wrap">

      <header class="ipp-top">
        <button class="ipp-btn" id="ippInitialBack">
          ‹ Back
        </button>

        <strong>InstaPro ✦</strong>

        <span></span>
      </header>

      <div style="padding:55px 20px;text-align:center">
        Loading glass profile…
      </div>

    </div>
  `;

  document.body.appendChild(page);
  document.body.style.overflow = "hidden";

  $("#ippInitialBack", page).onclick =
    closeProfile;

  const userRef = doc(db, "users", targetUid);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists() && targetUid === currentId) {
      const user = auth.currentUser;

      await setDoc(
        userRef,
        {
          name: user?.displayName || "InstaPro User",
          displayName: user?.displayName || "InstaPro User",

          username: (
            user?.email?.split("@")[0] ||
            targetUid
          ).toLowerCase().replace(/[^a-z0-9._]/g, ""),

          bio: "Welcome to my InstaPro profile ✨",
          photoURL: user?.photoURL || "",

          followers: [],
          following: [],

          createdAt: serverTimestamp()
        },
        { merge: true }
      );
    }

  } catch (error) {
    console.error(
      "Profile initialization error:",
      error
    );
  }

  // Current viewer ka following status realtime mein.
  if (currentId) {
    viewerUnsub = onSnapshot(
      doc(db, "users", currentId),

      snapshot => {
        viewerFollowing =
          snapshot.exists() &&
          Array.isArray(snapshot.data().following)
            ? snapshot.data().following
            : [];

        if ($("#ipProfileOverlay")) {
          render(profileData, profilePosts);
        }
      },

      error => {
        console.error(
          "Viewer follow state error:",
          error
        );
      }
    );
  }

  // Target profile realtime listener.
  profileUnsub = onSnapshot(
    userRef,

    snapshot => {
      if (!$("#ipProfileOverlay")) return;

      if (!snapshot.exists()) {
        const wrap = $(
          "#ipProfileOverlay .ipp-wrap"
        );

        if (wrap) {
          wrap.innerHTML += `
            <div style="padding:25px;text-align:center">
              Profile data nahi mila.
              User ID aur Firestore Rules check karein.
            </div>
          `;
        }

        return;
      }

      profileData = snapshot.data();

      render(profileData, profilePosts);
    },

    error => {
      console.error(
        "Profile listener error:",
        error
      );

      const wrap = $(
        "#ipProfileOverlay .ipp-wrap"
      );

      if (wrap) {
        wrap.innerHTML += `
          <div style="padding:24px;text-align:center">
            Profile load nahi hui.
            Firebase Rules check karein.
          </div>
        `;
      }
    }
  );

// Realtime profile posts listener
postsUnsub = onSnapshot(
  query(
    collection(db, "posts"),
    where("uid", "==", targetUid),
    limit(200)
  ),

    snapshot => {
      ownedProfilePosts = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));
      profilePosts = [...ownedProfilePosts, ...repostedProfilePosts];

      profilePosts.sort((a, b) => {
        const timeValue = value => {
          if (value?.toMillis) return value.toMillis();
          if (value?.toDate) return value.toDate().getTime();
          const numeric = Number(value || 0);
          return Number.isFinite(numeric) ? numeric : 0;
        };
        return timeValue(b.createdAt || b.time) - timeValue(a.createdAt || a.time);
      });

      render(profileData, profilePosts);
    },

    error => {
      console.error(
        "Profile posts listener error:",
        error
      );

      const grid = $("#ippGrid");

      if (grid) {
        grid.innerHTML = `
          <div class="ipp-empty">
            Posts load nahi ho sake.
            Firestore Rules aur query check karein.
          </div>
        `;
      }
    }
  );

  // Live Reposts tab: show original posts the profile owner has reposted.
  repostsUnsub = onSnapshot(
    query(collection(db, "posts"), where("repostedBy", "array-contains", targetUid), limit(200)),
    snapshot => {
      repostedProfilePosts = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(post => postOwner(post) !== targetUid);
      profilePosts = [...ownedProfilePosts, ...repostedProfilePosts];
      profilePosts.sort((a, b) => {
        const timeValue = value => value?.toMillis ? value.toMillis() : value?.toDate ? value.toDate().getTime() : Number(value || 0);
        return timeValue(b.createdAt || b.time) - timeValue(a.createdAt || a.time);
      });
      render(profileData, profilePosts);
    },
    error => console.warn("Profile reposts listener error:", error)
  );

  // Realtime profile story ring. Normalize Firebase timestamps and UID types
  // so stories uploaded by one account are recognized when viewed by another.
  storiesUnsub = onSnapshot(
    collection(db, "stories"),
    snapshot => {
      if (!$("#ipProfileOverlay") || String(viewingUid) !== String(targetUid)) return;

      const now = Date.now();
      const toMillis = value => {
        if (value?.toMillis) return value.toMillis();
        if (value?.toDate) return value.toDate().getTime();
        if (value instanceof Date) return value.getTime();
        if (typeof value === "string") return Date.parse(value) || Number(value) || 0;
        const numeric = Number(value || 0);
        return Number.isFinite(numeric) ? numeric : 0;
      };

      profileStories = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(story => {
          const owner = String(
            story.uid || story.userId || story.authorId ||
            story.ownerUid || story.userUID || ""
          );
          const url = story.mediaUrl || story.imageUrl || story.url ||
            story.videoUrl || story.image || "";
          const created = toMillis(story.createdAt) || toMillis(story.time);
          const expires = toMillis(story.expiresAt) || ((created || now) + 86400000);
          const privacy = story.privacy || {};
          const audience = privacy.audience || story.audience || "everyone";
          const viewerUid = String(myId() || "");
          const visibleToViewer = owner === viewerUid || (
            audience !== "onlyMe" &&
            !(Array.isArray(privacy.hiddenFromUids) &&
              privacy.hiddenFromUids.map(String).includes(viewerUid)) &&
            (audience !== "closeFriends" ||
              (Array.isArray(privacy.closeFriendsUids) &&
                privacy.closeFriendsUids.map(String).includes(viewerUid)))
          );

          return owner === String(targetUid) && !!url && expires > now && visibleToViewer;
        });

      render(profileData, profilePosts);
    },
    error => console.error("Profile story ring listener error:", error)
  );

  // Profile photo picker.
  let picker = $("#ippPhotoInput");

  if (!picker) {
    picker = document.createElement("input");

    picker.id = "ippPhotoInput";
    picker.type = "file";
    picker.accept = "image/*";
    picker.hidden = true;

    document.body.appendChild(picker);
  }

  picker.onchange = async () => {
    const file = picker.files?.[0];

    if (!file) return;

    try {
      await uploadProfilePhoto(file);

      alert("Profile photo updated.");

    } catch (error) {
      console.error(error);

      alert(
        "Photo update failed: " +
        error.message
      );

    } finally {
      picker.value = "";
    }
  };
}

export function closeProfilePage() {
  closeProfile();
}

// Existing HTML ke saath compatibility.
window.openProfile = openProfile;
window.closeProfilePage = closeProfilePage;

// Bottom navigation se profile open karna.
document.addEventListener("DOMContentLoaded", () => {
  const profileButton = $("#profileBtn");

  if (profileButton) {
    profileButton.addEventListener("click", () => {
      const requestedUid =
        new URLSearchParams(location.search)
          .get("user");

      openProfile(requestedUid || null);
    });
  }
});
