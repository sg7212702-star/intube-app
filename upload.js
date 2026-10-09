// UPLOAD.JS - ALL SYSTEM FIREBASE (No Storage Needed)
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Real Upload System ON ✅");

function uploadToFirebase(file, type) {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // type = 'posts' / 'stories' / 'reels'
      await addDoc(collection(db, type), {
        imageUrl: e.target.result, // File yahi save ho rahi hai
        createdAt: serverTimestamp(),
        likes: 0,
        type: type,
        uid: "demo_user"
      });
      alert(`${type} Upload Ho Gaya ✅ (Real Firebase)`);
      window.closeAll();
      // 24hr baad story auto delete ka code stories.js me hai
    } catch(err) {
      alert(err.message);
    }
  };
  reader.readAsDataURL(file);
}

// 1. POST ke liye
document.getElementById("postFile")?.addEventListener("change", (e) => uploadToFirebase(e.target.files[0], "posts"));
document.getElementById("fileInput")?.addEventListener("change", (e) => uploadToFirebase(e.target.files[0], "posts"));

// 2. STORY ke liye
document.getElementById("storyFile")?.addEventListener("change", (e) => uploadToFirebase(e.target.files[0], "stories"));
document.getElementById("storyInput")?.addEventListener("change", (e) => uploadToFirebase(e.target.files[0], "stories"));

// 3. REEL ke liye (Reel ka input bana lena)
document.getElementById("optReel")?.addEventListener("click", () => {
  document.getElementById("postFile")?.click();
  // upload hote hi type = 'reels' kar dena
});
