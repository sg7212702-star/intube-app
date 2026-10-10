import { db } from "./firebase.js"; import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const reelsPage=document.getElementById("reelsPage");
if(reelsPage){
  if(!document.getElementById("reelsGrid")){
    reelsPage.innerHTML=`<div style="padding:10px"><h3>Reels (Posts as Reels - No Billing)</h3></div><div id="reelsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px"></div>`;
  }
  const grid=document.getElementById("reelsGrid");
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")),snap=>{
    if(snap.empty){ grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;opacity:.5;padding:50px">🎬<p>No reels yet - Post karo to yahan dikhega</p></div>`; return; }
    grid.innerHTML=""; snap.forEach(d=>{ grid.innerHTML+=`<div style="position:relative;border-radius:12px;overflow:hidden"><img src="${d.data().url}" style="width:100%;aspect-ratio:9/16;object-fit:cover"><div style="position:absolute;bottom:6px;left:6px;color:#fff;font-size:12px">▶ Reels</div></div>`; });
  });
}
