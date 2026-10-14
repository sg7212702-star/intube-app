// InstaPro Explore — real-time searchable posts grid
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const explorePage = document.getElementById("explorePage");
const searchInput = document.getElementById("searchInput");
const grid = document.getElementById("exploreGrid");
const empty = document.getElementById("exploreEmpty");
let explorePosts = [];
let unsubscribeExplore = null;

const escapeExplore = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));
const mediaOf = post => post.mediaUrl || post.imageUrl || post.url || post.videoUrl || post.image || "";
const videoOf = post => {
  const type = String(post.type || post.mediaType || post.contentType || "").toLowerCase();
  return type.includes("video") || type.includes("reel") || /\.(mp4|webm|mov)(\?|$)/i.test(mediaOf(post));
};
function openExplorePost(post) {
  const url = mediaOf(post);
  if (!url) return;
  const viewer = document.createElement("div");
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:rgba(7,9,16,.48);backdrop-filter:blur(28px) saturate(165%);-webkit-backdrop-filter:blur(28px) saturate(165%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;color:white;";
  const media = document.createElement(videoOf(post) ? "video" : "img");
  media.src = url;
  media.style.cssText = "max-width:100%;max-height:78vh;object-fit:contain;border:1px solid rgba(255,255,255,.18);border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.28);";
  if (videoOf(post)) { media.controls = true; media.autoplay = true; media.playsInline = true; }
  const caption = document.createElement("p");
  caption.textContent = post.caption || "";
  caption.style.cssText = "max-width:100%;overflow-wrap:anywhere;";
  const close = document.createElement("button");
  close.type = "button"; close.textContent = "✕ Close";
  close.style.cssText = "position:absolute;top:18px;left:16px;padding:10px 16px;border:1px solid rgba(255,255,255,.25);border-radius:22px;background:rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:white;";
  close.onclick = () => { media.pause?.(); viewer.remove(); };
  viewer.addEventListener("click", event => { if (event.target === viewer) { media.pause?.(); viewer.remove(); } });
  viewer.append(close, media, caption);
  document.body.appendChild(viewer);
}
function renderExplore() {
  if (!grid) return;
  const term = (searchInput?.value || "").trim().toLowerCase();
  const filtered = explorePosts.filter(post => {
    const haystack = [post.caption, post.username, post.displayName, post.name, post.email].join(" ").toLowerCase();
    return haystack.includes(term);
  });
  grid.innerHTML = "";
  if (empty) empty.style.display = filtered.length ? "none" : "block";
  filtered.forEach(post => {
    const url = mediaOf(post);
    if (!url) return;
    const tile = document.createElement("button");
    tile.type = "button";
    tile.style.cssText = "position:relative;display:block;width:100%;aspect-ratio:1;border:0;padding:0;background:#151515;overflow:hidden;cursor:pointer;";
    const media = document.createElement(videoOf(post) ? "video" : "img");
    media.src = url;
    media.alt = post.caption || "Post";
    media.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    if (videoOf(post)) { media.muted = true; media.playsInline = true; media.preload = "metadata"; }
    tile.appendChild(media);
    if (videoOf(post)) {
      const badge = document.createElement("span");
      badge.textContent = "▶";
      badge.style.cssText = "position:absolute;top:6px;right:7px;color:white;text-shadow:0 1px 4px #000;";
      tile.appendChild(badge);
    }
    tile.addEventListener("click", () => openExplorePost(post));
    grid.appendChild(tile);
  });
}
if (explorePage && grid) {
  searchInput?.addEventListener("input", renderExplore);
  unsubscribeExplore = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), snapshot => {
    explorePosts = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderExplore();
  }, error => {
    console.error("Explore load error:", error);
    if (empty) { empty.textContent = "Posts load nahi hue. Firestore Rules check karein."; empty.style.display = "block"; }
  });
}
window.addEventListener("pagehide", () => { if (unsubscribeExplore) unsubscribeExplore(); });
