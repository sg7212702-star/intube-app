import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const addStory = document.getElementById("addStory");
const storyFile = document.getElementById("storyFile");
const storyModal = document.getElementById("storyModal");
const closeStoryModal = document.getElementById("closeStoryModal");
const storyFileName = document.getElementById("storyFileName");
const uploadStoryBtn = document.getElementById("uploadStoryBtn");

// === CLOUDINARY UPLOAD - FINAL FIXED ===
async function uploadToCloudinary(file) {
    if (!file) {
        throw new Error("No file selected");
    }
    console.log("Uploading:", file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    // check video or image
    let resourceType = "image";
    if (file.type && file.type.startsWith("video/")) {
        resourceType = "video";
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const res = await fetch(url, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (!res.ok ||!data.secure_url) {
        console.error(data);
        throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return data.secure_url;
}

// === MODAL OPEN/CLOSE ===
postBtn?.addEventListener("click", () => {
    if(uploadModal) uploadModal.hidden = false;
});

closeModal?.addEventListener("click", () => {
    if(uploadModal) uploadModal.hidden = true;
});

addStory?.addEventListener("click", () => {
    storyFile?.click();
});

storyFile?.addEventListener("change", () => {
    if (storyFile.files[0] && storyModal) {
        if(storyFileName) storyFileName.textContent = storyFile.files[0].name;
        storyModal.hidden = false;
    }
});

closeStoryModal?.addEventListener("click", () => {
    if(storyModal) storyModal.hidden = true;
});

// === UPLOAD POST ===
uploadBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Pehle Login karo!");

    const file = mediaFile?.files[0];
    if (!file) return alert("Pehle Photo/Video select karo!");

    uploadBtn.textContent = "Uploading...";
    uploadBtn.disabled = true;

    try {
        const uploadedUrl = await uploadToCloudinary(file);

        let mediaType = "image";
        if (file.type && file.type.startsWith("video/")) {
            mediaType = "video";
        }

        await addDoc(collection(db, "posts"), {
            uid: user.uid,
            username: user.displayName || user.email,
            userPhoto: user.photoURL || "",
            caption: caption? caption.value : "",
            mediaUrl: uploadedUrl,
            mediaType: mediaType,
            createdAt: serverTimestamp(),
            likes: [],
            likesCount: 0
        });

        if(uploadModal) uploadModal.hidden = true;
        if(caption) caption.value = "";
        if(mediaFile) mediaFile.value = "";
        alert("Post Uploaded 💎");

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }

    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
});

// === UPLOAD STORY ===
uploadStoryBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Pehle Login karo!");

    const file = storyFile?.files[0];
    if (!file) return alert("Pehle Story select karo!");

    uploadStoryBtn.textContent = "Uploading...";
    uploadStoryBtn.disabled = true;

    try {
        const uploadedUrl = await uploadToCloudinary(file);

        let mediaType = "image";
        if (file.type && file.type.startsWith("video/")) {
            mediaType = "video";
        }

        await addDoc(collection(db, "stories"), {
            uid: user.uid,
            username: user.displayName || user.email,
            userPhoto: user.photoURL || "",
            storyUrl: uploadedUrl,
            mediaType: mediaType,
            createdAt: serverTimestamp()
        });

        if(storyModal) storyModal.hidden = true;
        if(storyFile) storyFile.value = "";
        alert("Story Uploaded!");

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }

    uploadStoryBtn.textContent = "Upload";
    uploadStoryBtn.disabled = false;
});
