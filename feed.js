import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const feed=document.getElementById("feed");
const q=query(collection(db,"posts"),orderBy("createdAt","desc"));
onSnapshot(q,snap=>{
  feed.innerHTML="";
  if(snap.empty) feed.innerHTML="<p style='text-align:center;padding:40px;opacity:.5'>No posts - + se upload karo</p>";
  snap.forEach(d=>{
    const p=d.data();
    feed.innerHTML+=`<div class="postGlass"><div style="padding:10px"><b>InstaPro</b></div><img src="${p.url}" style="width:100%;border-radius:12px"><div style="padding:10px">❤️ ${p.likes||0} Likes</div></div>`;
  });
});
