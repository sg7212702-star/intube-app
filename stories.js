// InstaPro Stories — real-time Firestore stories with 24-hour expiry
import { db, auth } from "./firebase.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const box = document.getElementById("otherStories");
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
  box.innerHTML = "";
  storyItems.forEach(story => {
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
document.getElementById("addStoryBtn")?.addEventListener("click", () => {
  const button = document.getElementById("optStory");
  if (button) button.click();
  else alert("Story upload option nahi mila.");
});
window.addEventListener("pagehide", () => { if (unsubscribeStories) unsubscribeStories(); });
