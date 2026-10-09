import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
const feed=$('feed');
const myId=localStorage.getItem('my_user_id')||'user';

// INSTAGRAM ALGORITHM: Time decay + Likes + Following boost
function instaScore(p){
  const hoursAgo = (Date.now() - p.time) / 3600000;
  const timeScore = Math.max(0, 100 - hoursAgo*2); // naya post = high score
  const likeScore = (p.likesCount||0) * 5;
  const followBoost = p.userId===myId ? 50 : 0; // apne post ko boost
  return timeScore + likeScore + followBoost;
}

onSnapshot(query(collection(db,"posts"), orderBy("time","desc")), snap=>{
  if(!feed) return;
  let posts=[]; snap.forEach(d=>posts.push({id:d.id,...d.data()}));
  // Algorithm sort
  posts.sort((a,b)=> instaScore(b) - instaScore(a));
  
  if(posts.length===0){ feed.innerHTML='<div class="empty">No posts yet - Be first to post! ✨</div>'; return; }
  feed.innerHTML='';
  posts.forEach(p=>{
    let div=document.createElement('div'); div.className='postCard';
    div.innerHTML=`
    <div class="postHead"><img src="https://i.pravatar.cc/100?u=${p.userId}"><div><b>${p.userName||'User'}</b><br><span style="font-size:11px;opacity:0.6">${Math.floor((Date.now()-p.time)/60000)}m ago • ${p.likesCount||0} likes</span></div><div style="margin-left:auto">⋯</div></div>
    <div class="postMedia"><img src="${p.url}" style="width:100%"></div>
    <div class="postActions"><span onclick="likePost('${p.id}')">♡ ${p.likesCount||0}</span> <span>💬</span> <span>↗️</span></div>
    <div style="padding:0 12px 12px"><b>${p.userName}</b> ${p.caption||''}</div>`;
    feed.appendChild(div);
  });
});

window.likePost=async(id)=>{
  const ref=doc(db,"posts",id);
  await updateDoc(ref,{likesCount:increment(1)});
};
