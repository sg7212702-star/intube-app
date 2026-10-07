import { db, auth } from "./firebase-config.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const addStory = document.querySelector(".addStory");
  const storyModal = document.getElementById("storyModal");
  const uploadStoryBtn = document.getElementById("uploadStoryBtn");
  const storyFile = document.getElementById("storyFile");

  const CLOUD = "kujnbe0a";
  const PRESET = "intube_free";

  addStory?.addEventListener("click", () => {
    storyModal.hidden = false;
  });

  storyModal?.addEventListener("click", (e) => {
    if (e.target === storyModal) {
      storyModal.hidden = true;
    }
  });

  uploadStoryBtn?.addEventListener("click", async () => {

    const file = storyFile.files[0];

    if (!file) {
      alert("Select Story");
      return;
    }

    try {

      uploadStoryBtn.innerText = "Uploading...";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await res.json();

      await addDoc(
        collection(db, "stories"),
        {
          imageUrl: data.secure_url,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || "INTUBE User",
          userPhoto: auth.currentUser.photoURL || "",
          createdAt: serverTimestamp()
        }
      );

      alert("Story Uploaded");

      storyFile.value = "";
      storyModal.hidden = true;

    } catch (err) {

      alert(err.message);

    }

    uploadStoryBtn.innerText = "Upload Story";

  });

});
