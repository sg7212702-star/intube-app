import { db } from "./firebase.js"; import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const feed=document.getElementById("feed"); if(feed){ onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")),snap=>{
  if(snap.empty){feed.innerHTML=`<div style="text-align:center;padding:60px;opacity:.6">📸<h3>No Posts Yet</h3><p>Be first to post!</p></div>`; return;}
  feed.innerHTML=""; snap.forEach(d=>{const p=d.data(); feed.innerHTML+=`<div style="margin:12px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1)"><img src="${p.url}" style="width:100%"><div style="padding:10px">❤️ 💬</div></div>`;});
});}
