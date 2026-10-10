import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  const list=document.getElementById("notifList");
  if(!list)return;
  const q=query(collection(db,"notifications"),orderBy("createdAt","desc"));
  onSnapshot(q,snap=>{
    list.innerHTML="";
    snap.forEach(d=>{
      const n=d.data();
      list.innerHTML+=`<div class="notifItemGlass"><div class="nIcon">❤️</div><div class="nText"><b>${n.text}</b><span>Just now</span></div></div>`;
    });
  });
});
