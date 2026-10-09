import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
onSnapshot(collection(db,"posts"), snap=>{
  const box=$('reelsFeed'); if(!box) return; box.innerHTML='';
  snap.forEach(d=>{
    const p=d.data(); if(!p.url.startsWith('data:video') && p.type!=='reel') return;
    const div=document.createElement('div'); div.className='reelCard';
    div.innerHTML=`<video src="${p.url}" loop playsinline></video><div class="reelOverlay"><b>${p.userName}</b><br>${p.caption||''}</div><div class="reelActions"><div>♡<br>${p.likesCount||0}</div><div>💬</div><div>↗️</div></div>`;
    div.onclick=()=>{ const v=div.querySelector('video'); v.paused ? v.play() : v.pause(); };
    box.appendChild(div);
  });
});
