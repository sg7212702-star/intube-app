import { db, auth } from "./firebase-config.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUD = "kujnbe0a";
const PRESET_STORY = "intube_stories";

// REQUIRED HTML IDS (index.html me hone chahiye)
// <div id="storyTray"></div>
// <div id="storyViewer" hidden>
// <div id="storyProgress"></div>
// <img id="storyImg"/><video id="storyVideo"></video>
// <button id="closeViewer">X</button><button id="prevStory"></button><button id="nextStory"></button>
// <span id="viewerUser"></span><span id="viewerTime"></span>
// </div>

const tray = document.getElementById("storyTray");
const viewer = document.getElementById("storyViewer");
const progressBox = document.getElementById("storyProgress");
const storyImg = document.getElementById("storyImg");
const storyVideo = document.getElementById("storyVideo");
const closeBtn = document.getElementById("closeViewer");
const nextBtn = document.getElementById("nextStory");
const prevBtn = document.getElementById("prevStory");

let groupedStories = []; // [{uid, userName, userPhoto, stories: []}]
let currentUserIndex = 0;
let currentStoryIndex = 0;
let progressInterval = null;
let progress = 0;
let isPaused = false;

// 1. REAL-TIME LOAD STORIES
const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  const all = [];
  snap.forEach(d => {
    const data = { id: d.id,...d.data() };
    if (data.expiresAt && data.expiresAt < Date.now()) {
      deleteDoc(doc(db, "stories", d.id)); // auto delete expired
      return;
    }
    all.push(data);
  });

  // Group by uid like Instagram
  const map = {};
  all.forEach(s => {
    if (!map[s.uid]) map[s.uid] = { uid: s.uid, userName: s.userName, userPhoto: s.userPhoto, stories: [] };
    map[s.uid].stories.push(s);
  });
  // Sort stories inside user by time ASC
  Object.values(map).forEach(g => g.stories.sort((a,b) => (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0)));

  groupedStories = Object.values(map).sort((a,b) => {
    // unseen first
    const aSeen = a.stories.every(s => s.views?.includes(auth.currentUser?.uid));
    const bSeen = b.stories.every(s => s.views?.includes(auth.currentUser?.uid));
    return aSeen - bSeen;
  });

  renderTray();
});

function renderTray() {
  if (!tray) return;
  tray.innerHTML = "";

  // Your Add button
  const addDiv = document.createElement("div");
  addDiv.className = "story-item add-story";
  addDiv.innerHTML = `<div class="story-ring my-ring"><img src="${auth.currentUser?.photoURL || 'https://i.imgur.com/6VBx3io.png'}"><span class="plus">+</span></div><p>Your Story</p>`;
  addDiv.onclick = (e) => { e.preventDefault(); document.getElementById("storyFile")?.click(); };
  tray.appendChild(addDiv);

  groupedStories.forEach((group, idx) => {
    const isSeen = group.stories.every(s => s.views?.includes(auth.currentUser?.uid));
    const div = document.createElement("div");
    div.className = `story-item ${isSeen? 'seen' : 'unseen'}`;
    div.innerHTML = `<div class="story-ring ${isSeen? '' : 'unseen-ring'}"><img src="${group.userPhoto || 'https://i.imgur.com/6VBx3io.png'}"></div><p>${group.uid===auth.currentUser?.uid?'You':group.userName?.split(' ')[0]}</p>`;
    div.onclick = () => openViewer(idx, 0);
    tray.appendChild(div);
  });
}

function openViewer(userIdx, storyIdx) {
  currentUserIndex = userIdx;
  currentStoryIndex = storyIdx;
  viewer.hidden = false;
  document.body.style.overflow = "hidden";
  showStory();
}

function showStory() {
  const group = groupedStories[currentUserIndex];
  const story = group.stories[currentStoryIndex];
  if (!story) { closeViewer(); return; }

  // Mark as viewed
  if (auth.currentUser &&!story.views?.includes(auth.currentUser.uid)) {
    updateDoc(doc(db, "stories", story.id), { views: arrayUnion(auth.currentUser.uid) });
  }

  // UI
  document.getElementById("viewerUser").innerText = group.userName;
  document.getElementById("viewerTime").innerText = timeAgo(story.createdAt);
  renderProgress();

  if (story.type === "video") {
    storyImg.hidden = true;
    storyVideo.hidden = false;
    storyVideo.src = story.storyUrl;
    storyVideo.play();
    storyVideo.onended = () => nextStory();
    startProgress(storyVideo.duration || 10);
  } else {
    storyVideo.hidden = true;
    storyVideo.pause();
    storyImg.hidden = false;
    storyImg.src = story.storyUrl;
    startProgress(5); // 5 sec for image
  }
}

function renderProgress() {
  progressBox.innerHTML = "";
  const group = groupedStories[currentUserIndex];
  group.stories.forEach((_, i) => {
    const bar = document.createElement("div");
    bar.className = "prog-bar";
    const fill = document.createElement("div");
    fill.className = "prog-fill";
    if (i < currentStoryIndex) fill.style.width = "100%";
    if (i === currentStoryIndex) fill.id = "activeFill";
    bar.appendChild(fill);
    progressBox.appendChild(bar);
  });
}

function startProgress(duration) {
  clearInterval(progressInterval);
  progress = 0;
  const fill = document.getElementById("activeFill");
  const step = 50;
  const increment = (step / (duration * 1000)) * 100;
  progressInterval = setInterval(() => {
    if (isPaused) return;
    progress += increment;
    if (fill) fill.style.width = progress + "%";
    if (progress >= 100) nextStory();
  }, step);
}

function nextStory() {
  const group = groupedStories[currentUserIndex];
  if (currentStoryIndex < group.stories.length - 1) {
    currentStoryIndex++; showStory();
  } else if (currentUserIndex < groupedStories.length - 1) {
    currentUserIndex++; currentStoryIndex = 0; showStory();
  } else {
    closeViewer();
  }
}
function prevStory() {
  if (currentStoryIndex > 0) { currentStoryIndex--; showStory(); }
  else if (currentUserIndex > 0) { currentUserIndex--; currentStoryIndex = groupedStories[currentUserIndex].stories.length-1; showStory(); }
}

function closeViewer() {
  viewer.hidden = true;
  document.body.style.overflow = "";
  clearInterval(progressInterval);
  storyVideo.pause();
}
function timeAgo(ts){ if(!ts) return "now"; const d = ts.seconds? new Date(ts.seconds*1000) : new Date(); const diff = (Date.now()-d)/1000; if(diff<60) return "now"; if(diff<3600) return Math.floor(diff/60)+"m"; if(diff<86400) return Math.floor(diff/3600)+"h"; return Math.floor(diff/86400)+"d"; }

// Events
nextBtn?.addEventListener("click", nextStory);
prevBtn?.addEventListener("click", prevStory);
closeBtn?.addEventListener("click", closeViewer);
// Tap left/right
viewer?.addEventListener("click", (e) => {
  const w = window.innerWidth; if(e.clientX > w*0.7) nextStory(); else if(e.clientX < w*0.3) prevStory();
});
// Pause on hold
viewer?.addEventListener("touchstart", () => isPaused = true);
viewer?.addEventListener("touchend", () => isPaused = false);
viewer?.addEventListener("mousedown", () => isPaused = true);
viewer?.addEventListener("mouseup", () => isPaused = false);
document.addEventListener("keydown", (e)=>{ if(viewer.hidden) return; if(e.key==="Escape") closeViewer(); if(e.key==="ArrowRight") nextStory(); if(e.key==="ArrowLeft") prevStory(); });
