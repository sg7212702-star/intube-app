import { db } from "./firebase.js";
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const box=document.getElementById("otherStories");
onSnapshot(collection(db,"stories"), snap=>{
  box.innerHTML="";
  snap.forEach(d=>{
    const s=d.data();
    // 24h expiry logic
    if(Date.now() - (s.score||0) > 86400000) return;
    const div=document.createElement("div"); div.className="sItem";
    div.innerHTML=`<div class="sRing"><img src="${s.url}"></div><p>user</p>`;
    box.appendChild(div);
  });
});
