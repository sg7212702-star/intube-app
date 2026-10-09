import { db } from "./firebase.js";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
onSnapshot(query(collection(db,'posts'),orderBy('createdAt','desc')), snap=>{
  const feed=document.getElementById('feed'); if(!feed) return;
  if(snap.empty){feed.innerHTML='<div style="padding:80px;text-align:center;opacity:.4">No posts yet<br>Tap + to upload</div>'; return;}
  let html=''; snap.forEach(d=>{const p=d.data(); html+=`
  <div class="postCard">
    <div class="postHead"><img src="${p.userPic}"><b>${p.userName}</b><span style="margin-left:auto;opacity:.5;font-size:12px">${p.caption?'':''}</span></div>
    ${p.type==='video'?`<video src="${p.url}" class="postMedia" controls playsinline></video>`:`<img src="${p.url}" class="postMedia">`}
    <div class="postActions"><span onclick="window.likePost('${d.id}')">❤️ ${p.likes||0}</span><span onclick="window.openComments('${d.id}')">💬 ${p.comments||0}</span><span>✈️</span><span style="margin-left:auto">🔖</span></div>
    <div style="padding:0 12px 12px;font-size:13px"><b>${p.userName}</b> ${p.caption||''}</div>
  </div>`});
  feed.innerHTML=html;
  document.getElementById('profileGrid').innerHTML=snap.docs.map(d=>`<img src="${d.data().url}" onclick="window.openPost('${d.id}')">`).join('');
  document.getElementById('postCount').innerText=snap.size;
});
window.likePost=async(id)=>{ await updateDoc(doc(db,'posts',id),{likes:increment(1)}) };
