import { db } from "./firebase.js"; import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const explorePage=document.getElementById("explorePage");
if(explorePage){
  // Search bar banao agar nahi hai
  if(!document.getElementById("searchInput")){
    const sBar=document.createElement("div");
    sBar.innerHTML=`<div style="margin:10px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);display:flex;gap:8px"><span>🔍</span><input id="searchInput" placeholder="Search..." style="flex:1;background:transparent;border:0;color:#fff;outline:none"></div><div id="exploreGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;padding:6px"></div>`;
    explorePage.prepend(sBar);
  }
  const grid=document.getElementById("exploreGrid");
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")),snap=>{
    if(!grid) return;
    if(snap.empty){ grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;opacity:.5;padding:40px">No posts yet</div>`; return; }
    grid.innerHTML=""; snap.forEach(d=>{ grid.innerHTML+=`<img src="${d.data().url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:2px">`; });
  });
  document.getElementById("searchInput")?.addEventListener("input",e=>{
    const q=e.target.value.toLowerCase();
    document.querySelectorAll("#exploreGrid img").forEach(img=>{ img.style.display = q===""? "block":"block"; });
  });
}
