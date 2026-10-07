import { auth, db, storage } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ELEMENTS
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

// OPEN POST MODAL
postBtn?.addEventListener("click", () => {
  uploadModal.hidden = false;
});

// OPEN STORY FILE PICKER
addStory?.addEventListener("click", () => {
  storyFile.click();
});

// WHEN STORY FILE SELECTED
storyFile?.addEventListener("change", () => {
  if (storyFile.files[0]) {
    storyFileName.textContent = storyFile.files[0].name;
    storyModal.hidden = false;
  }
});

// UPLOAD POST - PREMIUM LOGIC
uploadBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");
  if (!mediaFile.files[0]) return alert("Select image/video!");

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const file = mediaFile.files[0];
    const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    const isVideo = file.type.startsWith("video");

    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      username: user.displayName,
      userPhoto: user.photoURL,
      caption: caption.value,
      mediaUrl: url,
      mediaType: isVideo? "video" : "image",
      createdAt: serverTimestamp(),
      likes: [],
      likesCount: 0
    });

    uploadModal.hidden = true;
    caption.value = "";
    mediaFile.value = "";
    alert("Post Uploaded 💎");
  } catch (e) {
    alert("Error: " + e.message);
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});

// UPLOAD STORY - PREMIUM LOGIC
uploadStoryBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first!");
  if (!storyFile.files[0]) return alert("Select story!");

  uploadStoryBtn.textContent = "Uploading...";
  uploadStoryBtn.disabled = true;

  try {
    const file = storyFile.files[0];
    const fileRef = ref(storage, `stories/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    const isVideo = file.type.startsWith("video");

    await addDoc(collection(db, "stories"), {
      uid: user.uid,
      username: user.displayName,
      userPhoto: user.photoURL,
      storyUrl: url,
      storyType: isVideo? "video" : "image",
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24hr story
      seenBy: []
    });

    storyModal.hidden = true;
    storyFile.value = "";
    storyFileName.textContent = "No file selected";
    alert("Story Added 🔥");
  } catch (e) {
    alert("Error: " + e.message);
  }

  uploadStoryBtn.textContent = "Upload Story";
  uploadStoryBtn.disabled = false;
});
