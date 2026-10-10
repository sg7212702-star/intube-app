import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const ex = document.getElementById("explorePage");
if(ex){
  ex.innerHTML = `<div class="glassBack" data-back>←</div><div style="padding:70px 20px;text-align:center;opacity:.6"><h3>Explore</h3><p>No posts yet - Be first!</p></div><div id="exploreGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;padding:10px"></div>`;
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")),snap=>{
    const grid = document.getElementById("exploreGrid"); if(!grid) return;
    grid.innerHTML=""; snap.forEach(d=>{ grid.innerHTML+=`<img src="${d.data().url}" style="width:100%;aspect-ratio:1;object-fit:cover">`; });
  });
}
