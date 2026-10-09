import { db } from "./firebase.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const feed=document.getElementById('feed');
const postsGrid=document.getElementById('postsGrid');
const reelsGrid=document.getElementById('reelsGrid');
const myId=localStorage.getItem('my_user_id')||'user_'+Math.random().toString(36).substr(2,6);
localStorage.setItem('my_user_id',myId);

onSnapshot(query(collection(db,"posts"),orderBy("time","desc")), snap=>{
  if(!feed) return;
  if(snap.empty){ feed.innerHTML='<div class="empty">No posts yet - Be first to post!</div>'; return; }
  feed.innerHTML='';
  let myCount=0;
  let postsHTML='';
  let reelsHTML='';
  snap.forEach(d=>{
    let p=d.data();
    if(p.userId===myId) myCount++;
    let media = p.url.startsWith('data:video') || p.type==='reel'? `<video src="${p.url}" controls playsinline style="width:100%"></video>` : `<img src="${p.url}" style="width:100%">`;
    feed.innerHTML+=`<div class="postCard"><div style="padding:10px;display:flex;gap:8px;align-items:center"><img src="https://i.pravatar.cc/40?u=${p.userId}" style="width:32px;height:32px;border-radius:50%"><b>${p.userName||'User'}</b></div>${media}<div style="padding:10px"><b>${p.userName||'User'}</b> ${p.caption||''}</div><div style="padding:0 12px 12px;display:flex;gap:12px">♡ ${p.likesCount||0} 💬 ↗️</div></div>`;
    if(p.type==='reel' || p.url.startsWith('data:video')) reelsHTML+=`<div style="aspect-ratio:9/16;background:#111"><video src="${p.url}" style="width:100%;height:100%;object-fit:cover"></video></div>`;
    else postsHTML+=`<div style="aspect-ratio:1/1;background:#111"><img src="${p.url}" style="width:100%;height:100%;object-fit:cover"></div>`;
  });
  document.getElementById('postsCount').innerText=myCount;
  if(postsGrid) postsGrid.innerHTML=postsHTML;
  if(reelsGrid) reelsGrid.innerHTML=reelsHTML;
}, err=>{
  console.log(err);
  feed.innerHTML='<div class="empty">Firebase error - Check config</div>';
});
