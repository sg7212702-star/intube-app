import { db } from "./firebase.js";
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const otherStories=document.getElementById('otherStories');
const myId=localStorage.getItem('my_user_id')||'user';
onSnapshot(collection(db,"stories"), snap=>{
  if(!otherStories) return;
  otherStories.innerHTML='';
  snap.forEach(d=>{
    let s=d.data();
    if(Date.now()-s.time>86400000) return; // 24h expiry
    let div=document.createElement('div');
    div.className='sItem';
    div.innerHTML=`<div class="sRing"><img src="${s.url}"></div><div class="sName">${s.userName||'User'}</div>`;
    div.onclick=()=>{ localStorage.setItem('openStory',JSON.stringify(s)); location.href='./story-viewer.html'; };
    otherStories.appendChild(div);
  });
});
document.getElementById('yourStoryBtn').onclick=()=>document.getElementById('storyInput').click();
document.getElementById('storyInput').onchange=(e)=>{
  let f=e.target.files[0]; if(!f) return;
  let r=new FileReader();
  r.onload=async(ev=>{
    await addDoc(collection(db,"stories"),{url:ev.target.result,userId:myId,userName:localStorage.getItem('my_user_name')||'New User',time:Date.now()});
    alert('Story posted! Live 24h');
  };
  r.readAsDataURL(f);
};
