import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  const grid=document.getElementById("exploreGrid");
  if(!grid) return;
  grid.innerHTML = `<input id="searchBox" placeholder="Search..." style="grid-column:1/-1;padding:12px;border-radius:12px;border:none;background:rgba(255,255,255,.1);color:#fff;margin-bottom:8px">`;
  const searchBox=document.getElementById("searchBox");
  
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")), snap=>{
    const posts=[];
    snap.forEach(d=>posts.push(d.data()));
    function render(filter=""){
      grid.querySelectorAll(".expItem").forEach(e=>e.remove());
      posts.filter(p=>true).forEach(p=>{
        const div=document.createElement("div");
        div.className="expItem";
        div.innerHTML=`<img src="${p.url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px">`;
        div.style.cssText="overflow:hidden";
        grid.appendChild(div);
      });
    }
    render();
    searchBox?.addEventListener("input", e=>render(e.target.value));
  });
});
