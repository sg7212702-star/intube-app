import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === CLOUDINARY CONFIG ===
const CLOUD_NAME = "kujnbe0a";
const UPLOAD_PRESET = "intube_free";

// === ELEMENTS ===
const postBtn = document.getElementById("postBtn");
const uploadModal = document.getElementById("uploadModal");
const mediaFile = document.getElementById("mediaFile");
const caption = document.getElementById("caption");
const uploadBtn = document.getElementById("uploadBtn");

const addStory = document.getElementById("addStory");
const storyFile = document.getElementById("storyFile");
const storyModal = document.getElementById("storyModal");
const storyFileName = document.getElementById("storyFileName");
const uploadStoryBtn = document.getElementById("uploadStoryBtn");

const storiesContainer = document.getElementById("storiesContainer");
const storyViewer = document.getElementById("storyViewer");
const storyProgressBar = document.getElementById("storyProgressBar");
const storyViewerMedia = document.getElementById("storyViewerMedia");
const storyViewerUserImg = document.getElementById("storyViewerUserImg");
const storyViewerUsername = document.getElementById("storyViewerUsername");
const storyViewerTime = document.getElementById("storyViewerTime");
const storyViewerClose = document.getElementById("storyViewerClose");

let allStories = [];
let currentStoryIndex = 0;
let storyInterval = null;
let progress = 0;

// === CLOUDINARY UPLOAD ===
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const resourceType = file.type.startsWith("video")? "video" : "image";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
  return data.secure_url;
}

// === MODAL OPEN ===
postBtn?.addEventListener("click", () => uploadModal.hidden = false);
addStory?.addEventListener("click", () => storyFile.click());
storyFile?.addEventListener("change", () => {
  if (storyFile.files[0]) {
    storyFileName.textContent = storyFile.files[0].name;
    storyModal.hidden = false;
  }
});

// === UPLOAD POST ===
uploadBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");
  if (!mediaFile.files[0]) return alert("Select image/video!");
  uploadBtn.textContent = "Uploading..."; uploadBtn.disabled = true;
  try {
    const url = await uploadToCloudinary(mediaFile.files[0]);
    await addDoc(collection(db, "posts"), {
      uid: user.uid, username: user.displayName, userPhoto: user.photoURL,
      caption: caption.value, mediaUrl: url,
      mediaType: mediaFile.files[0].type.startsWith("video")? "video" : "image",
      createdAt: serverTimestamp(), likes: [], likesCount: 0
    });
    uploadModal.hidden = true; caption.value = ""; mediaFile.value = "";
    alert("Post Uploaded 💎");
  } catch (e) { alert("Error: " + e.message); }
  uploadBtn.textContent = "Upload"; uploadBtn.disabled = false;
});

// === UPLOAD STORY ===
uploadStoryBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");
  if (!storyFile.files[0]) return alert("Select story!");
  uploadStoryBtn.textContent = "Uploading..."; uploadStoryBtn.disabled = true;
  try {
    const url = await uploadToCloudinary(storyFile.files[0]);
    await addDoc(collection(db, "stories"), {
      uid: user.uid, username: user.displayName || "user",
      userPhoto: user.photoURL || "https://i.pravatar.cc/100",
      storyUrl: url,
      storyType: storyFile.files[0].type.startsWith("video")? "video" : "image",
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      seenBy: []
    });
    storyModal.hidden = true; storyFile.value = ""; storyFileName.textContent = "No file selected";
    alert("Story Added 🔥");
  } catch (e) { alert("Error: " + e.message); }
  uploadStoryBtn.textContent = "Upload Story"; uploadStoryBtn.disabled = false;
});

// === REAL TIME STORIES ===
const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  allStories = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.expiresAt && data.expiresAt.toDate && data.expiresAt.toDate() < new Date()) return;
    allStories.push({ id: docSnap.id,...data });
  });
  renderStories();
});

function renderStories() {
  if (!storiesContainer) return;
  storiesContainer.innerHTML = "";
  const usersMap = {};
  allStories.forEach(s => {
    if (!usersMap[s.uid]) usersMap[s.uid] = s;
  });
  Object.values(usersMap).forEach((story) => {
    const div = document.createElement("div");
    div.className = "flex flex-col items-center gap-1 min-w-[65px] cursor-pointer";
    div.innerHTML = `
      <div class="w-[60px] h-[60px] rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600">
        <img src="${story.userPhoto}" class="w-full h-full rounded-full border-2 border-black object-cover" />
      </div>
      <span class="text-[11px] text-white truncate w-[65px] text-center">${story.username}</span>
    `;
    div.onclick = () => openStoryViewer(allStories.findIndex(s => s.uid === story.uid));
    storiesContainer.appendChild(div);
  });
}

function openStoryViewer(index) {
  currentStoryIndex = index;
  if (!storyViewer) return;
  storyViewer.hidden = false;
  showStory(currentStoryIndex);
  startProgress();
}

function showStory(index) {
  const story = allStories[index];
  if (!story) { closeStoryViewer(); return; }
  if (auth.currentUser) {
    updateDoc(doc(db, "stories", story.id), { seenBy: arrayUnion(auth.currentUser.uid) }).catch(()=>{});
  }
  storyViewerUserImg.src = story.userPhoto;
  storyViewerUsername.textContent = story.username;
  storyViewerTime.textContent = "14h";
  if (story.storyType === "video") {
    storyViewerMedia.innerHTML = `<video src="${story.storyUrl}" autoplay playsinline class="w-full h-full object-cover"></video>`;
  } else {
    storyViewerMedia.innerHTML = `<img src="${story.storyUrl}" class="w-full h-full object-cover" />`;
  }
  progress = 0;
}

function startProgress() {
  clearInterval(storyInterval);
  storyInterval = setInterval(() => {
    progress += 0.5;
    if (storyProgressBar) storyProgressBar.style.width = `${progress}%`;
    if (progress >= 100) nextStory();
  }, 50);
}

function nextStory() {
  currentStoryIndex++;
  if (currentStoryIndex >= allStories.length) closeStoryViewer();
  else showStory(currentStoryIndex);
}

function prevStory() {
  currentStoryIndex--;
  if (currentStoryIndex < 0) currentStoryIndex = 0;
  showStory(currentStoryIndex);
}

function closeStoryViewer() {
  if (!storyViewer) return;
  storyViewer.hidden = true;
  clearInterval(storyInterval);
  storyViewerMedia.innerHTML = "";
}

// FIXED - YE HISSA KATA HUA THA
storyViewer?.addEventListener("click", (e) => {
  const rect = storyViewer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x < rect.width / 3) prevStory();
  else if (x > rect.width * 2 / 3) nextStory();
});

storyViewerClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  closeStoryViewer();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeStoryViewer();
});
