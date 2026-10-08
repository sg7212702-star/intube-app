import { db } from "./firebase-config.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadPosts(){
  const container = document.getElementById("postsContainer") || document.getElementById("videoContainer") || document.getElementById("homeFeed") || document.getElementById("feed");
  if(!container) return;
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  container.innerHTML = "";
  if(snap.empty){ container.innerHTML = "<p style='color:white; text-align:center;'>No posts yet</p>"; return; }
  snap.forEach(doc=>{
    const p = doc.data();
    container.innerHTML += `
      <div style="background:#111; margin-bottom:15px; border-radius:12px; overflow:hidden;">
        ${p.mediaType === "video" ? `<video src="${p.mediaUrl}" controls style="width:100%"></video>` : `<img src="${p.mediaUrl}" style="width:100%">`}
        <div style="padding:10px; color:white;">${p.caption || ""} - <small>${p.username}</small></div>
      </div>`;
  });
}
loadPosts();
