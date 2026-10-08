import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CLOUD_NAME = "kujnbe0a";
const UPLOAD_PRESET = "intube_free";

const postBtn = document.getElementById("postBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const mediaFile = document.getElementById("mediaFile");
const caption = document.getElementById("caption");
const uploadBtn = document.getElementById("uploadBtn");
const storyFile = document.getElementById("storyFile");
const storyModal = document.getElementById("storyModal");
const closeStoryModal = document.getElementById("closeStoryModal");
const storyFileName = document.getElementById("storyFileName");
const uploadStoryBtn = document.getElementById("uploadStoryBtn");

async function uploadToCloudinary(file) {
    if (!file) throw new Error("No file selected");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    let resourceType = "image";
    if (file.type && file.type.startsWith("video/")) resourceType = "video";
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok ||!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data;
}

postBtn?.addEventListener("click", () => { if(uploadModal) uploadModal.hidden = false; });
closeModal?.addEventListener("click", () => { if(uploadModal) uploadModal.hidden = true; });
closeStoryModal?.addEventListener("click", () => { if(storyModal) storyModal.hidden = true; });

// LEFT wala button - Instagram jaisa logic
// Duplicate click removed - handled in stories.js

storyFile?.addEventListener("change", () => {
    if (storyFile.files[0] && storyModal) {
        if (storyFileName) storyFileName.textContent = storyFile.files[0].name;
        storyModal.hidden = false;
    }
});

uploadBtn?.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Pehle Login karo!");
    const file = mediaFile?.files[0]; if (!file) return alert("Photo/Video select karo!");
    uploadBtn.textContent = "Uploading..."; uploadBtn.disabled = true;
    try {
        const data = await uploadToCloudinary(file);
        await addDoc(collection(db, "posts"), {
            uid: user.uid,
            username: user.displayName || user.email,
            userPhoto: user.photoURL || "",
            caption: caption?.value || "",
            mediaUrl: data.secure_url,
            mediaType: file.type.startsWith("video/")? "video" : "image",
            createdAt: serverTimestamp(),
            likes: [],
            likesCount: 0
        });
        if (uploadModal) uploadModal.hidden = true;
        if (caption) caption.value = "";
        if (mediaFile) mediaFile.value = "";
        alert("Post Uploaded");
    } catch (e) { alert("Error: " + e.message); }
    uploadBtn.textContent = "Upload"; uploadBtn.disabled = false;
});

uploadStoryBtn?.addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Login karo!");
    const file = storyFile?.files[0]; if (!file) return alert("Story select karo!");
    uploadStoryBtn.textContent = "Uploading..."; uploadStoryBtn.disabled = true;
    try {
        const data = await uploadToCloudinary(file);
        await addDoc(collection(db, "stories"), {
            uid: user.uid,
            userName: user.displayName || user.email,
            username: user.displayName || user.email,
            userPhoto: user.photoURL || "",
            storyUrl: data.secure_url,
            storyUrl1: data.secure_url,
            type: file.type.startsWith("video/")? "video" : "image",
            mediaType: file.type.startsWith("video/")? "video" : "image",
            views: [],
            createdAt: serverTimestamp(),
            expiresAt: Date.now() + 86400000
        });
        if (storyModal) storyModal.hidden = true;
        if (storyFile) storyFile.value = "";
        alert("Story Uploaded! Ab left wala button colourful ho jayega");
    } catch (e) { alert("Error: " + e.message); }
    uploadStoryBtn.textContent = "Upload"; uploadStoryBtn.disabled = false;
});
