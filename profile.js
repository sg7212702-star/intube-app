import { db, auth } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, async (user)=>{
  if(!user) return;
  const snap = await getDoc(doc(db,"users",user.uid));
  const data = snap.exists()? snap.data() : {name:user.email.split("@")[0], posts:0, followers:0, following:0};
  const box = document.getElementById("profilePage");
  if(box){
    box.innerHTML = `
    <div class="glassBack" data-back>←</div>
    <div style="text-align:center;padding:70px 20px 20px">
      <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);margin:0 auto 12px"></div>
      <h2>${data.name}</h2>
      <p style="opacity:.7">${data.posts||0} posts • ${data.followers||0} followers • ${data.following||0} following</p>
      <p style="opacity:.5;margin-top:10px">${data.bio||'No bio yet'}</p>
      <div style="margin-top:20px;opacity:.4">📸 No posts yet</div>
    </div>`;
  }
});
