import { db } from "./firebase.js";
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=id=>document.getElementById(id);

onSnapshot(collection(db,"stories"), snap=>{
  const box=$('otherStories'); if(!box) return; box.innerHTML='';
  snap.forEach(d=>{
    const s=d.data(); if(Date.now()-s.time > 86400000) return; // 24h expiry - Insta algorithm
    const seen = localStorage.getItem('seen_'+d.id) ? 'seen' : '';
    const div=document.createElement('div'); div.className='sItem '+seen;
    div.innerHTML=`<div class="sRing ${seen?'seen':''}"><img src="${s.url}"></div><div class="sName">${s.userName}</div>`;
    div.onclick=()=>{ localStorage.setItem('seen_'+d.id,'1'); localStorage.setItem('openStory',JSON.stringify(s)); location.href='./story-viewer.html'; };
    box.appendChild(div);
  });
});

$('yourStoryBtn').onclick=()=> $('storyInput').click();
$('storyInput').onchange=(e)=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=async ev=>{
    await addDoc(collection(db,"stories"),{url:ev.target.result,userId:localStorage.getItem('my_user_id')||'user',userName:localStorage.getItem('my_user_name')||'User',time:Date.now()});
    alert('✅ Story live - 24h Algorithm active!');
  }; r.readAsDataURL(f);
};
