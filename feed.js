import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const feed = document.getElementById("feed") || document.getElementById("postsContainer") || document.querySelector(".feed");
if(feed){
  const q = query(collection(db, "posts"), orderBy("createdAt","desc"));
  onSnapshot(q,(snap)=>{
    feed.innerHTML="";
    snap.forEach(docSnap=>{
      const p=docSnap.data();
      feed.innerHTML+=`
        <div class="postCard post">
          <div class="postHead"><img src="https://i.pravatar.cc/100"><b>sg7212</b></div>
          <img class="postMedia" src="${p.fileUrl||p.imageUrl}" style="width:100%">
          <div class="postActions actions">
            <span onclick="likePost('${docSnap.id}')">❤️ ${p.likes||0}</span>
            <span onclick="commentPost('${docSnap.id}')">💬</span>
            <span>✈️</span>
          </div>
        </div>`;
    });
  });
}
window.likePost = async (id)=>{
  await updateDoc(doc(db,"posts",id),{likes: increment(1)});
}
window.commentPost = (id)=>{
  const c=prompt("Comment likho:");
  if(c) alert("Comment Real System me save hoga - Next update me!");
}
