import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === CLOUDINARY CONFIG ===
const CLOUD_NAME = "kujnbe0a";
const UPLOAD_PRESET = "intube_free";

// === ELEMENTS ===
const postBtn = document.getElementById("postBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const mediaFile = document.getElementById("mediaFile");
const caption = document.getElementById("caption");
const uploadBtn = document.getElementById("uploadBtn");

// Line 15-16 me change: addStory hataya, myStoryItem lagaya
const storyFile = document.getElementById("storyFile");
const storyModal = document.getElementById("storyModal");
const closeStoryModal = document.getElementById("closeStoryModal");
const storyFileName = document.getElementById("storyFileName");
const uploadStoryBtn = document.getElementById("uploadStoryBtn");

// === CLOUDINARY UPLOAD - FIXED ===
async function uploadToCloudinary(file) {
    if (!file) throw new Error("No file selected");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    let resourceType = "image";
    if (file.type && file.type.startsWith("video/")) resourceType = "video";
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok ||!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
}

// === MODAL ===
postBtn?.addEventListener("click", () => { if(uploadModal) uploadModal.hidden = false; });
closeModal?.addEventListener("click", () => { if(uploadModal) uploadModal.hidden = true; });
closeStoryModal?.addEventListener("click", () => { if(storyModal) storyModal.hidden = true; });

// === FIX 1: SINGLE BUTTON LOGIC - Line 45 se 60 tak NAYA CODE ===
async function checkMyStoryRing() {
    const user = auth.currentUser;
    if (!user) return;
    const ring = document.getElementById("myStoryRing");
    const plusIcon = document.getElementById("plusIcon");
    const img = document.getElementById("myStoryImg");
    const text = document.getElementById("myStoryText");
    if (img) img.src = user.photoURL || "https://i.pravatar.cc/150?u=" + user.uid;
    const ago24 = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const q = query(collection(db, "stories"), where("uid", "==", user.uid), where("createdAt", ">", ago24));
    const snap = await getDocs(q);
    if (snap.empty) {
        if (ring) ring.className = "ring-none";
        if (plusIcon) plusIcon.style.display = "flex";
        if (text) text.textContent = "Add Story";
    } else {
        if (ring) ring.className = "ring-active";
        if (plusIcon) plusIcon.style.display = "none";
        if (text) text.textContent = "Your Story";
    }
}

// Ek hi button click - Line 65 se 78 NAYA
document.addEventListener("click", (e) => {
    const item = e.target.closest("#myStoryItem");
    if (!item) return;
    const ring = document.getElementById("myStoryRing");
    const isActive = ring?.classList.contains("ring-active");
    if (isActive) {
        // Story hai to viewer kholo (yahan aapka story viewer code aayega)
        const viewer = document.getElementById("storyViewer");
        if(viewer) viewer.style.display = "flex";
        else alert("Story Viewer - yahan aapki saari stories chalegi");
    } else {
        storyFile?.click(); // Koi story nahi to gallery
    }
});

storyFile?.addEventListener("change", () => {
    if (storyFile.files[0] && storyModal) {
        if (storyFileName) storyFileName.textContent = storyFile.files[0].name;
        storyModal.hidden = false;
        // Upload se pehle hi ring dikha do
        const ring = document.getElementById("myStoryRing");
        if(ring) ring.className = "ring-active";
    }
});

// === UPLOAD POST (Same) ===
uploadBtn?.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Pehle Login karo!");
    const file = mediaFile?.files[0]; if (!file) return alert("Photo/Video select karo!");
    uploadBtn.textContent = "Uploading..."; uploadBtn.disabled = true;
    try {
        const uploadedUrl = await uploadToCloudinary(file);
        await addDoc(collection(db, "posts"), { uid: user.uid, username: user.displayName || user.email, userPhoto: user.photoURL || "", caption: caption?.value || "", mediaUrl: uploadedUrl, mediaType: file.type?.startsWith("video/")? "video" : "image", createdAt: serverTimestamp(), likes: [], likesCount: 0 });
        if (uploadModal) uploadModal.hidden = true; if (caption) caption.value = ""; if (mediaFile) mediaFile.value = ""; alert("Post Uploaded 💎");
    } catch (e) { alert("Error: " + e.message); }
    uploadBtn.textContent = "Upload"; uploadBtn.disabled = false;
});

// === UPLOAD STORY (FIXED) ===
uploadStoryBtn?.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Pehle Login karo!");
    const file = storyFile?.files[0]; if (!file) return alert("Pehle Story select karo!");
    uploadStoryBtn.textContent = "Uploading..."; uploadStoryBtn.disabled = true;
    try {
        const uploadedUrl = await uploadToCloudinary(file);
        await addDoc(collection(db, "stories"), { uid: user.uid, username: user.displayName || user.email, userPhoto: user.photoURL || "", storyUrl: uploadedUrl, mediaType: file.type?.startsWith("video/")? "video" : "image", createdAt: serverTimestamp() });
        if (storyModal) storyModal.hidden = true; if (storyFile) storyFile.value = ""; alert("Story Uploaded!"); checkMyStoryRing();
    } catch (e) { alert("Error: " + e.message); }
    uploadStoryBtn.textContent = "Upload"; uploadStoryBtn.disabled = false;
});

// === AUTO RING CHECK ===
auth.onAuthStateChanged(() => { checkMyStoryRing(); });
onSnapshot(collection(db, "stories"), () => { checkMyStoryRing(); });
