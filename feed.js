// ======================================================
// InstaPro Feed System
// Firebase Firestore + Firebase Auth + Cloudinary Media
// Real-time posts, likes, comments, save, share, delete
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
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------------------------------
// Collection Names
// ------------------------------------------------------

const FEED_COLLECTION = "posts";
const SAVED_COLLECTION = "savedPosts";
const COMMENTS_COLLECTION = "comments";

// ------------------------------------------------------
// Feed Elements
// ------------------------------------------------------

const feed = document.getElementById("feed");

// ------------------------------------------------------
// Feed State
// ------------------------------------------------------

let unsubscribeFeed = null;
let currentPosts = [];
let feedStarted = false;

// ------------------------------------------------------
// Authentication Helper
// ------------------------------------------------------

function getCurrentUser() {
return auth.currentUser;
}

console.log("InstaPro Feed: Firebase modules loaded.");

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getUsername(user) {
return (
user?.displayName ||
user?.email?.split("@")[0] ||
"InstaPro User"
);
}

function getAvatar(user) {
  return (
    user?.photoURL ||
    "https://www.gravatar.com/avatar/?d=mp"
  );
}

function getPostMedia(post) {
  return post.mediaUrl || post.imageUrl || post.url || "";
}

function getPostType(post) {
  const type = String(
    post.mediaType ||
    post.contentType ||
    post.type ||
    "image"
  ).toLowerCase();

  return type.includes("video") ? "video" : "image";
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
  } catch {
    return "Just now";
  }
}

function showMessage(message) {
  alert(message);
}

function getPostRef(postId) {
  return doc(db, FEED_COLLECTION, postId);
}

function getCommentRef(postId) {
  return collection(db, FEED_COLLECTION, postId, COMMENTS_COLLECTION);
}

function getSafeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function isPostOwner(post) {
  const user = getCurrentUser();
  return !!user && post.uid === user.uid;
}

// ------------------------------------------------------
// Feed startup
// ------------------------------------------------------

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
    (snapshot) => {
      currentPosts = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderFeed();
    },
    (error) => {
      console.error("InstaPro feed error:", error);

      if (feed) {
        feed.innerHTML = `
          <div style="padding:24px;text-align:center">
            <h3>Feed load nahi ho payi</h3>
            <p>Firebase Firestore Rules aur internet connection check karein.</p>
            <button type="button" data-feed-action="retry">
              Retry
            </button>
          </div>
        `;
      }
    }
  );
}

// ------------------------------------------------------
// Render posts
// ------------------------------------------------------

function renderFeed() {
  if (!feed) return;

  if (!getCurrentUser()) {
    feed.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <h3>Login required</h3>
        <p>Posts dekhne ke liye pehle login karein.</p>
      </div>
    `;
    return;
  }

  if (!currentPosts.length) {
    feed.innerHTML = `
      <div style="text-align:center;padding:60px 20px;opacity:.75">
        <div style="font-size:48px">📸</div>
        <h3>No Posts Yet</h3>
        <p>Sabse pehle post upload karein.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  currentPosts.forEach((post) => {
    const mediaUrl = getPostMedia(post);

    if (!mediaUrl) {
      console.warn("Post media URL missing:", post.id);
      return;
    }

    const card = document.createElement("article");
    card.className = "instapro-feed-post";
    card.dataset.postId = post.id;

    card.style.cssText = `
      margin:12px 0;
      overflow:hidden;
      border-radius:14px;
      background:var(--card-bg, rgba(255,255,255,.06));
      border:1px solid rgba(128,128,128,.18);
      color:inherit;
    `;

    const ownerName = escapeHTML(
      post.username || "InstaPro User"
    );

    const avatar = escapeHTML(
      post.photo || post.photoURL || ""
    );

    const mediaType = getPostType(post);

    const mediaHTML = mediaType === "video"
      ? `
        <video
          class="feed-media"
          src="${escapeHTML(mediaUrl)}"
          controls
          playsinline
          preload="metadata"
          style="display:block;width:100%;max-height:75vh;object-fit:contain;background:#000"
        ></video>
      `
      : `
        <img
          class="feed-media"
          src="${escapeHTML(mediaUrl)}"
          alt="Post by ${ownerName}"
          loading="lazy"
          style="display:block;width:100%;height:auto;max-height:75vh;object-fit:contain;background:#111"
        >
      `;

    const likes = Array.isArray(post.likes) ? post.likes : [];
    const liked = likes.includes(getCurrentUser()?.uid);

    const saved = Array.isArray(post.savedBy)
      && post.savedBy.includes(getCurrentUser()?.uid);

    const likeCount = getSafeCount(
      post.likeCount ?? likes.length
    );

    const commentCount = getSafeCount(post.commentCount);

    const shareCount = getSafeCount(post.shareCount);

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px">
        <img
          src="${avatar || escapeHTML(getAvatar(null))}"
          alt=""
          style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#333"
          onerror="this.style.display='none'"
        >

        <div style="flex:1;min-width:0">
          <strong>${ownerName}</strong>
          <div style="font-size:12px;opacity:.65">
            ${escapeHTML(formatDate(post.createdAt))}
          </div>
        </div>

        ${
          isPostOwner(post)
            ? `<button type="button" data-feed-action="delete" data-id="${escapeHTML(post.id)}" aria-label="Delete post">⋮</button>`
            : ""
        }
      </div>

      ${mediaHTML}

      <div style="padding:12px">
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
          <button
            type="button"
            data-feed-action="like"
            data-id="${escapeHTML(post.id)}"
            aria-pressed="${liked}"
            style="border:0;background:transparent;color:inherit;font-size:16px;cursor:pointer"
          >${liked ? "❤️" : "🤍"} ${likeCount}</button>

          <button
            type="button"
            data-feed-action="comments"
            data-id="${escapeHTML(post.id)}"
            style="border:0;background:transparent;color:inherit;cursor:pointer"
          >💬 ${commentCount}</button>

          <button
            type="button"
            data-feed-action="share"
            data-id="${escapeHTML(post.id)}"
            style="border:0;background:transparent;color:inherit;cursor:pointer"
          >↗️ Share ${shareCount || ""}</button>

          <button
            type="button"
            data-feed-action="save"
            data-id="${escapeHTML(post.id)}"
            aria-pressed="${saved}"
            style="border:0;background:transparent;color:inherit;cursor:pointer"
          >${saved ? "🔖 Saved" : "🔖 Save"}</button>
        </div>

        ${
          post.caption
            ? `<p style="overflow-wrap:anywhere;margin:12px 0 4px"><strong>${ownerName}</strong> ${escapeHTML(post.caption)}</p>`
            : ""
        }

        <button
          type="button"
          data-feed-action="comments"
          data-id="${escapeHTML(post.id)}"
          style="border:0;background:transparent;color:inherit;opacity:.7;padding:8px 0;cursor:pointer"
        >View comments / Add comment</button>
      </div>
    `;

    fragment.appendChild(card);
  });

  feed.replaceChildren(fragment);
}

// ------------------------------------------------------
// Like / Unlike
// Uses likes array in each post document
// ------------------------------------------------------

async function toggleLike(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Like karne ke liye login karein.");
    return;
  }

  const postRef = getPostRef(postId);

  try {
    const snapshot = await getDoc(postRef);

    if (!snapshot.exists()) {
      showMessage("Yeh post ab available nahi hai.");
      return;
    }

    const post = snapshot.data();
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const alreadyLiked = likes.includes(user.uid);

    await updateDoc(postRef, {
      likes: alreadyLiked
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid),
      likeCount: alreadyLiked
        ? Math.max(0, getSafeCount(post.likeCount ?? likes.length) - 1)
        : getSafeCount(post.likeCount ?? likes.length) + 1
    });
  } catch (error) {
    console.error("Like error:", error);
    showMessage("Like save nahi hua. Firestore Rules check karein.");
  }
}

// ------------------------------------------------------
// Comments
// Stores each comment in posts/{postId}/comments
// ------------------------------------------------------

async function openComments(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Comment karne ke liye login karein.");
    return;
  }

  const commentText = prompt("Apna comment likhein:");

  if (commentText === null) return;

  const text = commentText.trim();

  if (!text) {
    showMessage("Comment khali nahi ho sakta.");
    return;
  }

  if (text.length > 2000) {
    showMessage("Comment 2000 characters se chhota rakhein.");
    return;
  }

  try {
    await addDoc(getCommentRef(postId), {
      uid: user.uid,
      username: getUsername(user),
      photo: user.photoURL || "",
      text,
      createdAt: serverTimestamp()
    });

    const postRef = getPostRef(postId);

    await updateDoc(postRef, {
      commentCount: increment(1)
    });

    showMessage("Comment post ho gaya.");
  } catch (error) {
    console.error("Comment error:", error);
    showMessage("Comment save nahi hua. Firestore Rules check karein.");
  }
}

// ------------------------------------------------------
// Saved posts
// Saves under savedPosts/{uid}/posts/{postId}
// ------------------------------------------------------

async function toggleSave(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Post save karne ke liye login karein.");
    return;
  }

  const post = currentPosts.find((item) => item.id === postId);

  if (!post) return;

  const savedRef = doc(
    db,
    SAVED_COLLECTION,
    user.uid,
    "posts",
    postId
  );

  try {
    const savedSnapshot = await getDoc(savedRef);

    if (savedSnapshot.exists()) {
      await deleteDoc(savedRef);

      if (Array.isArray(post.savedBy) && post.savedBy.includes(user.uid)) {
        await updateDoc(getPostRef(postId), {
          savedBy: arrayRemove(user.uid)
        });
      }

      showMessage("Saved posts se hata diya.");
    } else {
      await setDoc(savedRef, {
        postId,
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(getPostRef(postId), {
        savedBy: arrayUnion(user.uid)
      });

      showMessage("Post save ho gayi.");
    }
  } catch (error) {
    console.error("Save post error:", error);
    showMessage("Post save nahi hui. Firestore Rules check karein.");
  }
}

// ------------------------------------------------------
// Share
// ------------------------------------------------------

async function sharePost(postId) {
  const postUrl = `${window.location.origin}${window.location.pathname}#post-${encodeURIComponent(postId)}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "InstaPro Post",
        text: "Yeh post dekhein!",
        url: postUrl
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(postUrl);
      showMessage("Post link copy ho gaya.");
    } else {
      prompt("Post link copy karein:", postUrl);
    }

    try {
      await updateDoc(getPostRef(postId), {
        shareCount: increment(1)
      });
    } catch (countError) {
      console.warn("Share count update failed:", countError);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Share error:", error);
      showMessage("Share nahi ho paya.");
    }
  }
}

// ------------------------------------------------------
// Delete own post
// Cloudinary media is not deleted by this operation.
// ------------------------------------------------------

async function deletePost(postId) {
  const user = getCurrentUser();

  if (!user) {
    showMessage("Pehle login karein.");
    return;
  }

  const post = currentPosts.find((item) => item.id === postId);

  if (!post || post.uid !== user.uid) {
    showMessage("Aap sirf apni post delete kar sakte hain.");
    return;
  }

  if (!confirm("Kya aap is post ko delete karna chahte hain?")) {
    return;
  }

  try {
    await deleteDoc(getPostRef(postId));
    showMessage("Post delete ho gayi.");
  } catch (error) {
    console.error("Delete post error:", error);
    showMessage("Post delete nahi hui. Firestore Rules check karein.");
  }
}

// ------------------------------------------------------
// Feed event delegation
// ------------------------------------------------------

if (feed) {
  feed.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-feed-action]");

    if (!button) return;

    const action = button.dataset.feedAction;
    const postId = button.dataset.id;

    if (action === "retry") {
      feedStarted = false;
      startFeed();
      return;
    }

    if (!postId) return;

    if (action === "like") {
      await toggleLike(postId);
    } else if (action === "comments") {
      openCommentsPanel(postId);
    } else if (action === "save") {
      await toggleSave(postId);
    } else if (action === "share") {
      await sharePost(postId);
    } else if (action === "delete") {
      await deletePost(postId);
    }
  });
}

// ------------------------------------------------------
// Authentication changes
// ------------------------------------------------------

onAuthStateChanged(auth, (user) => {
  if (!feed) return;

  if (user) {
    startFeed();
  } else {
    currentPosts = [];
    feed.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <h3>Login required</h3>
        <p>Feed dekhne ke liye login karein.</p>
      </div>
    `;
  }
});

// ------------------------------------------------------
// Optional global helper for other modules
// ------------------------------------------------------

window.InstaProFeed = {
  refresh() {
    renderFeed();
  },

  getPosts() {
    return [...currentPosts];
  },

  async deletePost(postId) {
    return deletePost(postId);
  }
};

console.log("InstaPro Feed System loaded.");
