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
let postViewerUnsub = null;
let commentsViewerUnsub = null;

let viewingUid = null;
let profileData = {};
let profilePosts = [];
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
  if (postViewerUnsub) postViewerUnsub();
  if (commentsViewerUnsub) commentsViewerUnsub();

  profileUnsub = null;
  viewerUnsub = null;
  postsUnsub = null;
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

    #ipProfileOverlay .ipp-btn {
      border:1px solid rgba(255,255,255,.15);
      border-radius:12px;
      padding:10px 13px;
      background:rgba(255,255,255,.08);
      color:#fff;
      font-weight:700;
      font-size:12px;
      cursor:pointer;
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
      background:linear-gradient(
        135deg,
        #ff3d9a,
        #8b5cf6,
        #16d9ff,
        #ffcc70
      );
      box-shadow:0 0 28px rgba(190,75,255,.22);
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
    }

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

  const name =
    data.displayName ||
    data.name ||
    usernameFor(data, uid);

  const username = usernameFor(data, uid)
    .replace(/^@/, "");

  const photo = photoFor(data);

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

  const ownPosts = posts.filter(
    post => postOwner(post) === uid
  );

  const postCount = ownPosts.filter(
    post => !isReel(post)
  ).length;

  const reelCount = ownPosts.filter(
    post => isReel(post)
  ).length;

  const isFollowing = viewerFollowing.includes(uid);

  page.innerHTML = `
    <div class="ipp-wrap">

      <header class="ipp-top">
        <button class="ipp-btn" id="ippBack">‹ Back</button>
        <strong style="font-size:17px">InstaPro ✦</strong>
        <button class="ipp-btn" id="ippRefresh">↻</button>
      </header>

      <main>
        <div class="ipp-head">

          <div class="ipp-avatar">
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

          <div class="ipp-stat ipp-glass">
            <strong>${followers}</strong>
            <span>Followers</span>
          </div>

          <div class="ipp-stat ipp-glass">
            <strong>${following}</strong>
            <span>Following</span>
          </div>

        </div>

        <div style="display:flex;gap:8px;padding:0 16px">

          ${own ? `
            <button
              id="ippEdit"
              class="ipp-btn ipp-primary"
              style="flex:1"
            >
              ✦ Edit profile
            </button>

            <button
              id="ippPhotoBtn"
              class="ipp-btn"
              style="flex:1"
            >
              📷 Change photo
            </button>
          ` : `
            <button
              id="ippFollow"
              class="ipp-btn ipp-primary"
              style="flex:1"
            >
              ${isFollowing ? "Following ✓" : "Follow +"}
            </button>
          `}

          <button
            id="ippShare"
            class="ipp-btn"
            style="flex:1"
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
            .map(h => `
              <div class="ipp-highlightBubble">
                <i>${esc(h.emoji || "✦")}</i>
                ${esc(h.title || "Highlight")}
              </div>
            `).join("")}

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

  const grid = $("#ippGrid", page);

  let filtered = [];

  if (activeTab === "posts") {
    filtered = ownPosts.filter(post => !isReel(post));
  } else if (activeTab === "reels") {
    filtered = ownPosts.filter(post => isReel(post));
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
    ${isVideo(post) ? `
      <video
        src="${esc(url)}"
        muted
        playsinline
        preload="metadata"
      ></video>
      <span class="ipp-reelTag">▷</span>
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
      await updateDoc(ref, {
        likes: already ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: Math.max(0, Number(snap.data().likesCount ?? currentLikes.length) + (already ? -1 : 1)),
        likeCount: Math.max(0, Number(snap.data().likesCount ?? currentLikes.length) + (already ? -1 : 1))
      });
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

    await deleteDoc(postRef);
    closePostViewer();
    alert("Post delete ho gayi.");
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
  function openFromTile() {
    const post = filtered.find(item => item.id === tile.dataset.postId);
    openSelectedPost(post);
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
    const [mineSnap, targetSnap] =
      await Promise.all([
        getDoc(doc(db, "users", followerUid)),
        getDoc(doc(db, "users", targetUid))
      ]);

    const mine = mineSnap.exists()
      ? mineSnap.data()
      : {};

    const target = targetSnap.exists()
      ? targetSnap.data()
      : {};

    const following = Array.isArray(mine.following)
      ? mine.following
      : [];

    const followers = Array.isArray(target.followers)
      ? target.followers
      : [];

    const already = following.includes(targetUid);

    const batch = writeBatch(db);

    batch.set(
      doc(db, "users", followerUid),
      {
        following: already
          ? following.filter(id => id !== targetUid)
          : [...following, targetUid],
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    batch.set(
      doc(db, "users", targetUid),
      {
        followers: already
          ? followers.filter(id => id !== followerUid)
          : [
              ...new Set([
                ...followers,
                followerUid
              ])
            ],
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

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
      profilePosts = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

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
