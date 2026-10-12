import { db, auth } from "./firebase.js";

import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================================
// COMMENT SYSTEM — NO SCORE
// ================================

window.openComment = async (postId) => {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Comment karne ke liye pehle login karein.");
      return;
    }

    const text = prompt("Comment likho:");

    if (!text || !text.trim()) {
      return;
    }

    await addDoc(
      collection(db, "posts", postId, "comments"),
      {
        uid: user.uid,
        username: user.displayName || "User",
        photo: user.photoURL || "",
        text: text.trim(),
        createdAt: serverTimestamp()
      }
    );

    await updateDoc(doc(db, "posts", postId), {
      commentCount: increment(1)
    });

    alert("Comment successfully added!");

  } catch (error) {
    console.error("Comment error:", error);
    alert("Comment add nahi hua. Dobara try karein.");
  }
};

// ================================
// SHARE SYSTEM — NO SCORE
// ================================

window.doShare = async (postId) => {
  try {
    const postUrl = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;

    if (navigator.share) {
      await navigator.share({
        title: "InstaPro Post",
        text: "Check out this post!",
        url: postUrl
      });
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(postUrl);
      alert("Post link copied!");
    } else {
      window.prompt("Post link copy karein:", postUrl);
    }

    await updateDoc(doc(db, "posts", postId), {
      shareCount: increment(1)
    });

  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error("Share error:", error);
    alert("Post share nahi ho payi.");
  }
};

console.log("InstaPro Comment & Share System Loaded — Score Disabled.");
