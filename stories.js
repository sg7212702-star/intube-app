import { db, auth } from "./firebase-config.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const addStory = document.querySelector(".addStory");
  const storyModal = document.getElementById("storyModal");
  const uploadStoryBtn = document.getElementById("uploadStoryBtn");
  const storyFile = document.getElementById("storyFile");
  const storiesList = document.getElementById("storiesList");
  const storyViewer = document.getElementById("storyViewer");
  const storyImage = document.getElementById("storyImage");
  const storyUserPhoto = document.getElementById("storyUserPhoto");
  const storyUserName = document.getElementById("storyUserName");

  const CLOUD = "kujnbe0a";
  const PRESET = "intube_free";

  // Open Story Modal
  addStory?.addEventListener("click", () => {
    storyModal.hidden = false;
  });

  // Close Story Modal
  storyModal?.addEventListener("click", (e) => {
    if (e.target === storyModal) {
      storyModal.hidden = true;
    }
  });

  // Upload Story
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
          userId: auth.currentUser?.uid || "",
          userName: auth.currentUser?.displayName || "INTUBE User",
          userPhoto: auth.currentUser?.photoURL || "",
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

  // Load Stories Realtime
  if (storiesList) {

    const q = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {

      storiesList.innerHTML = "";

      snapshot.forEach((docSnap) => {

        const story = docSnap.data();

        const storyDiv = document.createElement("div");
        storyDiv.className = "story";

        storyDiv.innerHTML = `
          <div class="storyRing">
            <img
              src="${story.userPhoto || ''}"
              style="
                width:60px;
                height:60px;
                border-radius:50%;
                object-fit:cover;
              "
            >
          </div>
          <span>${story.userName || "User"}</span>
        `;

        storyDiv.addEventListener("click", () => {

          if (storyViewer) {
            storyViewer.hidden = false;
          }

          if (storyImage) {
            storyImage.src = story.imageUrl;
          }

          if (storyUserPhoto) {
            storyUserPhoto.src = story.userPhoto || "";
          }

          if (storyUserName) {
            storyUserName.innerText = story.userName || "User";
          }

        });

        storiesList.appendChild(storyDiv);

      });

    });

  }

  // Close Story Viewer
  storyViewer?.addEventListener("click", () => {
    storyViewer.hidden = true;
  });

});
