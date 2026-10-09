import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const bar = document.getElementById("storyBar") || document.querySelector(".stories");
if(bar){
  const q = query(collection(db,"stories"), orderBy("createdAt","desc"));
  onSnapshot(q,(snap)=>{
    let html=`<div class="story sItem" onclick="document.getElementById('storyFile').click()"><div class="ring sRing"><img src="https://i.pravatar.cc/100"><span style="position:absolute;font-size:20px">+</span></div><div class="sName">Your Story</div></div>`;
    snap.forEach(d=>{
      const s=d.data();
      html+=`<div class="story sItem"><div class="ring sRing"><img src="${s.fileUrl||s.imageUrl}"></div><div class="sName">User</div></div>`;
    });
    bar.innerHTML=html;
  });
}
