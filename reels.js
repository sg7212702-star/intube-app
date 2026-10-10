import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  const reelPage=document.getElementById("reelsPage");
  if(!reelPage) return;
  reelPage.innerHTML = `<div style="padding:60px 0 80px 0"><h3 style="padding:0 15px">Reels</h3><div id="reelsFeed"></div></div>`;
  const feed=document.getElementById("reelsFeed");
  
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")), snap=>{
    feed.innerHTML="";
    snap.forEach(d=>{
      const p=d.data();
      feed.innerHTML+=`<div style="height:85vh;margin:10px;border-radius:20px;overflow:hidden;position:relative;background:#000"><img src="${p.url}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;bottom:20px;left:15px;color:#fff"><b>InstaPro</b><br>❤️ ${p.likes||0} Likes</div></div>`;
    });
    if(snap.empty) feed.innerHTML=`<p style="text-align:center;opacity:.5;padding:30px">Post dalo - Reels ban jayega!</p>`;
  });
});
