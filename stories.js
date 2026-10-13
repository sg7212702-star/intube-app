// InstaPro Stories — real-time Firestore stories with 24-hour expiry
import { db, auth } from "./firebase.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const box = document.getElementById("otherStories");
// Make the stories container transparent to the parent story row so each story
// appears beside "Your story" in the same horizontal strip, not inside a nested box.
if (box) box.style.display = "contents";
let storyItems = [];
let unsubscribeStories = null;

const storyEscape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));

function storyMedia(story) {
  return story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
}
function storyIsVideo(story) {
  const type = String(story.mediaType || story.contentType || story.type || "").toLowerCase();
  return type.includes("video") || type.includes("reel") || /\.(mp4|webm|mov)(\?|$)/i.test(storyMedia(story));
}
function storyExpiry(story) {
  if (Number(story.expiresAt) > 0) return Number(story.expiresAt);
  const created = story.createdAt?.toDate ? story.createdAt.toDate().getTime() : Number(story.createdAt) || 0;
  return created ? created + 24 * 60 * 60 * 1000 : Date.now() + 24 * 60 * 60 * 1000;
}
function showStory(story) {
  const url = storyMedia(story);
  if (!url) return;
  const viewer = document.createElement("div");
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:#000;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;";
  const media = document.createElement(storyIsVideo(story) ? "video" : "img");
  media.src = url;
  media.style.cssText = "max-width:100%;max-height:88vh;object-fit:contain;";
  if (storyIsVideo(story)) { media.controls = true; media.autoplay = true; media.playsInline = true; }
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕";
  close.style.cssText = "position:absolute;top:22px;right:18px;border:0;background:#222;color:#fff;border-radius:50%;width:42px;height:42px;font-size:20px;";
  close.onclick = () => { media.pause?.(); viewer.remove(); };
  viewer.addEventListener("click", event => { if (event.target === viewer) { media.pause?.(); viewer.remove(); } });
  viewer.append(media, close);
  document.body.appendChild(viewer);
}
function renderStories() {
  if (!box) return;

  const user = auth.currentUser;
  const myStories = user
    ? storyItems.filter(story => (story.uid || story.userId || story.authorId) === user.uid)
    : [];
  const otherUsersStories = storyItems.filter(story => {
    const ownerUid = story.uid || story.userId || story.authorId;
    return !user || !ownerUid || ownerUid !== user.uid;
  });

  // Apni story ko alag ring banane ke bajay "Your story" ring mein dikhayein.
  const addStoryRing = document.getElementById("addStoryBtn");
  if (addStoryRing) {
    const latestOwnStory = myStories[0];
    const existingImage = addStoryRing.querySelector("img");
    if (latestOwnStory && storyMedia(latestOwnStory)) {
      if (!existingImage) {
        const image = document.createElement("img");
        image.alt = "Your latest story";
        image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;";
        addStoryRing.style.position = "relative";
        addStoryRing.style.overflow = "hidden";
        addStoryRing.prepend(image);
      }
      const image = addStoryRing.querySelector("img");
      image.src = storyMedia(latestOwnStory);
      const plus = addStoryRing.querySelector("span");
      if (plus) {
        plus.style.cssText = "position:absolute;right:-1px;bottom:-1px;z-index:2;background:#0095f6;color:#fff;border:2px solid #111;border-radius:50%;width:21px;height:21px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;";
      }
      addStoryRing.title = "Tap to view your story; tap + to add another";
      addStoryRing.onclick = event => {
        if (event.target.closest("span")) {
          const uploadButton = document.getElementById("optStory");
          if (uploadButton) uploadButton.click();
          return;
        }
        showStory(latestOwnStory);
      };
    } else {
      existingImage?.remove();
      addStoryRing.onclick = () => {
        const uploadButton = document.getElementById("optStory");
        if (uploadButton) uploadButton.click();
        else alert("Story upload option nahi mila.");
      };
    }
  }

  box.innerHTML = "";
  otherUsersStories.forEach(story => {
    const url = storyMedia(story);
    if (!url) return;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "sItem";
    item.style.cssText = "border:0;background:transparent;color:inherit;padding:0;cursor:pointer;flex:0 0 auto;";
    item.innerHTML = `<div class="sRing"><img src="${storyEscape(url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div><p>${storyEscape(story.username || story.displayName || "user")}</p>`;
    item.addEventListener("click", () => showStory(story));
    box.appendChild(item);
  });
}
if (box) {
  unsubscribeStories = onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), snapshot => {
    const now = Date.now();
    storyItems = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(story => storyExpiry(story) > now);
    renderStories();
  }, error => {
    console.error("Stories load error:", error);
  });
}
// The Your story ring click behavior is configured inside renderStories().
window.addEventListener("pagehide", () => { if (unsubscribeStories) unsubscribeStories(); });
