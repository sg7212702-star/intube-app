import { db, auth } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUD = "kujnbe0a";
const PRESET_POST = "intube_free"; // post ke liye
const PRESET_STORY = "intube_stories"; // story ke liye (unsigned)

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("mediaFile");
const captionInput = document.getElementById("caption");

// 1. POST UPLOAD (tumhara purana wala same)
if (uploadBtn) {
  uploadBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) { alert("Select file"); return; }
    try {
      uploadBtn.innerText = "Uploading...";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", PRESET_POST);
      const resourceType = file.type.startsWith("video")? "video" : "image";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if(!data.secure_url) throw new Error("Cloudinary fail");
      await addDoc(collection(db, "posts"), {
        url: data.secure_url,
        type: resourceType,
        caption: captionInput.value || "",
        userId: auth.currentUser?.uid || "",
        userName: auth.currentUser?.displayName || "INTUBE User",
        userPhoto: auth.currentUser?.photoURL || "",
        createdAt: serverTimestamp()
      });
      captionInput.value = "";
      fileInput.value = "";
      alert("Post Uploaded ✅");
      document.getElementById("uploadModal").hidden = true;
    } catch (err) { alert(err.message); }
    uploadBtn.innerText = "Upload";
  };
}

// 2. STORY UPLOAD - YE NAYA HAI (Home wala redirect fix)
const storyFile = document.getElementById("storyFile");
const addStoryBtn = document.getElementById("addStory");

if (addStoryBtn && storyFile) {
  addStoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    storyFile.click(); // file khulega, home pe nahi jayega
  });

  storyFile.addEventListener("change", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    if (!auth.currentUser) { alert("Pehle login karo!"); return; }
    try {
      alert("Uploading Story... ⏳");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", PRESET_STORY);
      const resourceType = file.type.startsWith("video")? "video" : "image";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if(!data.secure_url) throw new Error(JSON.stringify(data));

      await addDoc(collection(db, "stories"), {
        uid: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "INTUBE User",
        userPhoto: auth.currentUser.photoURL || "",
        storyUrl: data.secure_url,
        type: resourceType,
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + 86400000
      });
      alert("Story Uploaded! ✅");
      location.reload();
    } catch (err) {
      alert("Story Fail: " + err.message);
    }
  });
}

// Modal open/close
const uploadFab = document.getElementById("uploadFab");
const postBtn = document.getElementById("postBtn");
const uploadModal = document.getElementById("uploadModal");
uploadFab?.addEventListener("click", () => { uploadModal.hidden = false; });
postBtn?.addEventListener("click", () => { uploadModal.hidden = false; });
