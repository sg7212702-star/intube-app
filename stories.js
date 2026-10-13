// InstaPro Stories — Instagram-style realtime stories
import { db, auth } from "./firebase.js";
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove,
  setDoc, addDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const otherStoriesBox = document.getElementById("otherStories");
const yourRing = document.getElementById("addStoryBtn");
const yourStoryItem = yourRing?.closest(".sItem");
let expiryTimer = null;
let stopCurrentStory = null;
let currentLiked = false;
let allStories = [];
let stopStories = null;
let signedInUser = auth.currentUser || null;
let viewer = null;
let viewerTimer = null;
let currentGroup = [];
let currentIndex = 0;
let seenStoryIds = new Set();

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));

function mediaUrl(story) {
  return story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
}
function ownerId(story) {
  return story.uid || story.userId || story.authorId || story.ownerUid || story.userUID || "";
}
function chatIdFor(a, b) { return [a, b].sort().join("_"); }
async function sendReplyToDM(text) {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  const receiverUid = ownerId(story);
  if (!user || user.isAnonymous) throw new Error("DM bhejne ke liye Google login karein.");
  if (!receiverUid || receiverUid === user.uid) throw new Error("Apni story par DM reply nahi bhej sakte.");
  const chatId = chatIdFor(user.uid, receiverUid);
  await setDoc(doc(db, "chats", chatId), {
    participants: [user.uid, receiverUid],
    lastMessage: "Story reply: " + text,
    lastSenderUid: user.uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await addDoc(collection(db, "chats", chatId, "messages"), {
    text, message: text, senderUid: user.uid, receiverUid, uid: user.uid,
    createdAt: serverTimestamp(), read: false, messageType: "story_reply",
    storyId: story.id, storyMediaUrl: mediaUrl(story), storyOwnerUid: receiverUid
  });
}
async function toggleStoryLike() {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  if (!user || user.isAnonymous) { alert("Story like karne ke liye Google login karein."); return; }
  const btn = viewer?.querySelector(".is-like");
  if (btn) btn.disabled = true;
  try {
    const likes = Array.isArray(story.likedBy) ? story.likedBy : [];
    currentLiked = likes.includes(user.uid);
    await updateDoc(doc(db, "stories", story.id), {
      likedBy: currentLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    currentLiked = !currentLiked;
    updateLikeButton();
  } catch (error) {
    console.error("Story like save error:", error);
    alert("Like Firebase mein save nahi hua. Firestore Rules check karein.");
  } finally { if (btn) btn.disabled = false; }
}
function updateLikeButton() {
  const btn = viewer?.querySelector(".is-like");
  if (btn) {
    btn.textContent = currentLiked ? "♥" : "♡";
    btn.style.background = "transparent";
    btn.style.color = currentLiked ? "#ff3040" : "#fff";
  }
}
function ownerName(story) {
  return story.username || story.displayName || story.email?.split("@")[0] || "InstaPro User";
}
function isVideo(story) {
  const type = String(story.mediaType || story.contentType || story.type || "").toLowerCase();
  return type.includes("video") || type.includes("reel") || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl(story));
}
function timestamp(story) {
  const value = story.createdAt;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
}
function expiry(story) {
  const exp = Number(story.expiresAt);
  return exp > 0 ? exp : (timestamp(story) || Date.now()) + 86400000;
}
function activeStories() {
  const now = Date.now();
  return allStories.filter(s => mediaUrl(s) && expiry(s) > now)
    .sort((a, b) => timestamp(b) - timestamp(a));
}
function groupsByUser(stories) {
  const groups = new Map();
  for (const story of stories) {
    const key = ownerId(story) || ("unknown:" + (story.email || ownerName(story)));
    if (!groups.has(key)) groups.set(key, { key, uid: ownerId(story), name: ownerName(story), photo: story.photo || story.photoURL || "", stories: [] });
    const group = groups.get(key);
    group.stories.push(story);
    if ((!group.photo || group.photo.length < 5) && (story.photo || story.photoURL)) group.photo = story.photo || story.photoURL;
  }
  return [...groups.values()].map(group => {
    group.stories.sort((a, b) => timestamp(a) - timestamp(b));
    group.latest = group.stories[group.stories.length - 1];
    return group;
  });
}
function setRingPreview(ring, story, label) {
  if (!ring) return;
  const url = story ? mediaUrl(story) : "";
  let image = ring.querySelector(":scope > img.insta-story-preview");
  if (url) {
    if (!image) {
      image = document.createElement("img");
      image.className = "insta-story-preview";
      image.alt = label;
      image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:0;";
      ring.prepend(image);
    }
    image.src = url;
    image.style.display = "block";
    ring.style.position = "relative";
    ring.style.overflow = "hidden";
    const plus = ring.querySelector("span");
    if (plus) plus.style.cssText = "position:absolute;right:-1px;bottom:-1px;z-index:3;background:#0095f6;color:#fff;border:2px solid #111;border-radius:50%;width:21px;height:21px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;";
  } else {
    image?.remove();
    const plus = ring.querySelector("span");
    if (plus) plus.removeAttribute("style");
  }
}
function openUpload() {
  const button = document.getElementById("optStory");
  if (button) button.click();
  else alert("Story upload option nahi mila.");
}
function renderStories() {
  if (!otherStoriesBox) return;

  // Auth can resolve after Firestore's first snapshot; always recalculate ownership.
  const stories = activeStories();
  const groups = groupsByUser(stories);
  const myUid = signedInUser?.uid || auth.currentUser?.uid || "";
  const ownGroup = myUid ? groups.find(g => g.uid === myUid) : null;
  const otherGroups = groups.filter(g => g.uid !== myUid);

  // Hide "Your story" entirely when this account has no unexpired story.
  if (yourStoryItem) yourStoryItem.style.display = ownGroup ? "" : "none";
  // Keep active own stories in the existing ring only; upload via the create menu.
  setRingPreview(yourRing, ownGroup?.latest || null, "Your latest story");
  if (yourRing) {
    yourRing.title = ownGroup ? "View your story · + to add another" : "Add to your story";
    yourRing.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      if (ownGroup) openStoryGroup(ownGroup);
    };
  }

  // Make wrapper visually transparent; each account gets exactly one ring.
  otherStoriesBox.style.display = "contents";
  otherStoriesBox.style.border = "0";
  otherStoriesBox.style.background = "transparent";
  otherStoriesBox.style.padding = "0";
  otherStoriesBox.style.margin = "0";
  otherStoriesBox.innerHTML = "";

  for (const group of otherGroups) {
    const item = document.createElement("div");
    item.className = "sItem insta-story-account";
    item.style.cssText = "flex:0 0 auto;cursor:pointer;";
    const ring = document.createElement("button");
    ring.type = "button";
    ring.className = "sRing";
    ring.setAttribute("aria-label", "View " + group.name + "'s story");
    ring.style.cssText = "position:relative;overflow:hidden;padding:0;cursor:pointer;";
    const preview = document.createElement("img");
    preview.src = mediaUrl(group.latest);
    preview.alt = "";
    preview.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;";
    ring.appendChild(preview);
    const caption = document.createElement("p");
    caption.textContent = group.name;
    caption.style.cssText = "margin:4px 0 0;text-align:center;";
    ring.addEventListener("click", () => openStoryGroup(group));
    caption.addEventListener("click", () => openStoryGroup(group));
    item.append(ring, caption);
    otherStoriesBox.appendChild(item);
  }
}

function closeViewer() {
  if (viewerTimer) clearTimeout(viewerTimer);
  viewerTimer = null;
  if (stopCurrentStory) stopCurrentStory();
  stopCurrentStory = null;
  if (viewer) {
    const video = viewer.querySelector("video");
    if (video) video.pause();
    viewer.remove();
  }
  viewer = null;
  currentGroup = [];
}
function openStoryGroup(group) {
  if (!group?.stories?.length) return;
  closeViewer();
  currentGroup = group.stories.slice();
  currentIndex = 0;
  viewer = document.createElement("div");
  viewer.className = "instapro-story-viewer";
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;";
  viewer.innerHTML = `
    <div class="is-progress" style="position:absolute;top:12px;left:10px;right:10px;display:flex;gap:4px;z-index:5;"></div>
    <div class="is-head" style="position:absolute;top:24px;left:14px;right:14px;z-index:5;display:flex;align-items:center;gap:9px;text-shadow:0 1px 4px #000;">
      <img class="is-avatar" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:#333;">
      <span class="is-name" style="font-size:14px;font-weight:600;flex:1;"></span>
      <button class="is-close" aria-label="Close story" style="background:transparent;border:0;color:#fff;font-size:27px;padding:0 5px;">×</button>
    </div>
    <div class="is-media" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
    <button class="is-prev" aria-label="Previous story" style="position:absolute;left:0;top:15%;bottom:15%;width:35%;border:0;background:transparent;"></button>
    <button class="is-next" aria-label="Next story" style="position:absolute;right:0;top:15%;bottom:15%;width:35%;border:0;background:transparent;"></button>
    <div class="is-footer" style="position:absolute;bottom:18px;left:14px;right:14px;z-index:6;display:flex;gap:8px;align-items:center;">
      <input class="is-reply" placeholder="Reply to story..." style="min-width:0;flex:1;background:transparent;border:1px solid #aaa;border-radius:22px;padding:12px;color:#fff;outline:none;">
      <button class="is-send" aria-label="Send reply" style="background:transparent!important;border:0;color:#fff;font-size:22px;">➤</button>
      <button class="is-like" aria-label="Like story" style="background:transparent!important;border:0;color:#fff;font-size:27px;">♡</button>
      <button class="is-share" aria-label="Share story" style="background:transparent!important;border:0;color:#fff;font-size:22px;">↗</button>
    </div>`;
  document.body.appendChild(viewer);
  viewer.querySelector(".is-close").onclick = closeViewer;
  viewer.querySelector(".is-prev").onclick = () => showAt(currentIndex - 1);
  viewer.querySelector(".is-next").onclick = () => showAt(currentIndex + 1);
  viewer.querySelector(".is-like").onclick = toggleStoryLike;
  viewer.querySelector(".is-send").onclick = async () => {
    const input = viewer?.querySelector(".is-reply");
    const value = input?.value.trim();
    if (!value) return;
    const btn = viewer.querySelector(".is-send");
    btn.disabled = true;
    try {
      await sendReplyToDM(value);
      input.value = "";
      alert("Story reply DM mein send ho gaya.");
    } catch (error) {
      console.error("Story DM reply error:", error);
      alert(error.message || "DM reply send nahi hua. Firestore Rules check karein.");
    } finally { if (btn?.isConnected) btn.disabled = false; }
  };
  viewer.querySelector(".is-reply").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); viewer.querySelector(".is-send").click(); }
  });
  viewer.querySelector(".is-share").onclick = async () => {
    const story = currentGroup[currentIndex];
    const url = mediaUrl(story);
    try {
      if (navigator.share) await navigator.share({ title: "InstaPro Story", url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); alert("Story link copied."); }
      else window.prompt("Copy story link:", url);
    } catch (e) { if (e?.name !== "AbortError") console.warn("Story share:", e); }
  };
  viewer.querySelector(".is-reply").addEventListener("keydown", event => {
    if (event.key === "Enter" && event.currentTarget.value.trim()) {
      const story = currentGroup[currentIndex];
      const text = event.currentTarget.value.trim();
      const url = mediaUrl(story);
      const shareText = "Reply to " + group.name + "'s story: " + text + " " + url;
      if (navigator.share) navigator.share({ text: shareText }).catch(() => {});
      else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareText).then(() => alert("Reply text copied.")).catch(() => {});
      event.currentTarget.value = "";
    }
  });
  viewer.addEventListener("click", event => {
    if (event.target === viewer) closeViewer();
  });
  showAt(0);
}
function showAt(index) {
  if (!viewer) return;
  if (viewerTimer) clearTimeout(viewerTimer);
  viewerTimer = null;
  if (index >= currentGroup.length) { closeViewer(); return; }
  if (index < 0) { closeViewer(); return; }
  currentIndex = index;
  const story = currentGroup[currentIndex];
  const mediaBox = viewer.querySelector(".is-media");
  const oldMedia = mediaBox.querySelector("img,video");
  if (oldMedia?.tagName === "VIDEO") oldMedia.pause();
  mediaBox.innerHTML = "";
  const url = mediaUrl(story);
  const media = document.createElement(isVideo(story) ? "video" : "img");
  media.src = url;
  media.alt = "Story";
  media.style.cssText = "max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;";
  if (media.tagName === "VIDEO") {
    media.autoplay = true;
    media.playsInline = true;
    media.controls = false;
    media.onended = () => showAt(currentIndex + 1);
    media.onerror = () => { viewerTimer = setTimeout(() => showAt(currentIndex + 1), 2500); };
  }
  mediaBox.appendChild(media);

  const avatar = viewer.querySelector(".is-avatar");
  const photo = currentGroup[0]?.photo || story.photo || story.photoURL || "";
  if (photo) avatar.src = photo; else avatar.removeAttribute("src");
  viewer.querySelector(".is-name").textContent = currentGroup[0]?.name || ownerName(story);

  const progress = viewer.querySelector(".is-progress");
  progress.innerHTML = "";
  currentGroup.forEach((_, i) => {
    const track = document.createElement("div");
    track.style.cssText = "height:3px;flex:1;border-radius:3px;background:rgba(255,255,255,.4);overflow:hidden;";
    const fill = document.createElement("div");
    fill.style.cssText = "height:100%;width:" + (i < index ? "100%" : "0%") + ";background:#fff;";
    track.appendChild(fill);
    progress.appendChild(track);
  });
  seenStoryIds.add(story.id);
  const user = signedInUser || auth.currentUser;
  const isOwnStory = !!user && ownerId(story) === user.uid;
  const replyInput = viewer.querySelector(".is-reply");
  const sendButton = viewer.querySelector(".is-send");
  const likeButton = viewer.querySelector(".is-like");
  if (replyInput) replyInput.style.display = isOwnStory ? "none" : "";
  if (sendButton) sendButton.style.display = isOwnStory ? "none" : "";
  if (likeButton) likeButton.style.display = isOwnStory ? "none" : "";
  currentLiked = !!user && (Array.isArray(story.likedBy) ? story.likedBy : []).includes(user.uid);
  updateLikeButton();
  if (user && !user.isAnonymous) {
    const storyRef = doc(db, "stories", story.id);
    const seenBy = Array.isArray(story.seenBy) ? story.seenBy : [];
    if (!seenBy.includes(user.uid)) {
      updateDoc(storyRef, { seenBy: arrayUnion(user.uid), viewsCount: increment(1) })
        .catch(error => console.warn("Story view save error:", error));
    }
    stopCurrentStory = onSnapshot(storyRef, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      currentLiked = (Array.isArray(data.likedBy) ? data.likedBy : []).includes(user.uid);
      updateLikeButton();
    }, error => console.warn("Story stats listener error:", error));
  }
  if (!isVideo(story)) {
    let elapsed = 0;
    const duration = 5000;
    const start = Date.now();
    const fill = progress.children[index]?.firstElementChild;
    const animate = () => {
      if (!viewer || currentIndex !== index) return;
      elapsed = Date.now() - start;
      if (fill) fill.style.width = Math.min(100, elapsed / duration * 100) + "%";
      if (elapsed >= duration) showAt(index + 1);
      else viewerTimer = setTimeout(animate, 60);
    };
    animate();
  } else {
    const fill = progress.children[index]?.firstElementChild;
    media.ontimeupdate = () => {
      if (fill && media.duration && Number.isFinite(media.duration)) fill.style.width = Math.min(100, media.currentTime / media.duration * 100) + "%";
    };
    media.onended = () => showAt(index + 1);
    viewerTimer = setTimeout(() => { if (viewer && currentIndex === index) showAt(index + 1); }, 30000);
  }
}

// Re-render when login state resolves, not only when the Firestore listener fires.
onAuthStateChanged(auth, user => {
  signedInUser = user || null;
  renderStories();
});

function refreshExpiry() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  const active = allStories.filter(s => expiry(s) > Date.now());
  if (!active.length) return;
  const next = Math.min(...active.map(expiry));
  expiryTimer = setTimeout(() => {
    allStories = allStories.filter(s => expiry(s) > Date.now());
    renderStories();
  }, Math.max(100, next - Date.now() + 100));
}
if (otherStoriesBox) {
  otherStoriesBox.style.display = "contents";
  stopStories = onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), snapshot => {
    const now = Date.now();
    allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(story => expiry(story) > now && mediaUrl(story));
    renderStories();
    refreshExpiry();
  }, error => {
    console.error("InstaPro stories load error:", error);
  });
}
window.addEventListener("pagehide", () => {
  if (stopStories) stopStories();
  if (expiryTimer) clearTimeout(expiryTimer);
  closeViewer();
});
