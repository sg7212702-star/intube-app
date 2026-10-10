import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  const proPage=document.getElementById("profilePage");
  if(!proPage) return;
  proPage.innerHTML=`<div style="padding:60px 15px 80px 15px"><div style="text-align:center"><img src="https://i.pravatar.cc/100?img=12" style="width:90px;height:90px;border-radius:50%;border:3px solid #fff"><h2 style="margin:10px 0 2px 0">InstaPro User</h2><p style="opacity:.6">@instapro</p><div style="display:flex;justify-content:center;gap:30px;margin:15px 0"><div><b id="pCount">0</b><br>Posts</div><div><b>1.2K</b><br>Followers</div><div><b>180</b><br>Following</div></div><button style="padding:8px 24px;border-radius:20px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff">Edit Profile</button></div><div id="myPosts" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:20px"></div></div>`;

  const myPosts=document.getElementById("myPosts");
  const pCount=document.getElementById("pCount");
  onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc")), snap=>{
    myPosts.innerHTML=""; pCount.textContent=snap.size;
    snap.forEach(d=>{
      myPosts.innerHTML+=`<img src="${d.data().url}" style="width:100%;aspect-ratio:1;object-fit:cover">`;
    });
  });
});
