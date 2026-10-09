import { db } from './firebase.js';
import { collection, query, where, onSnapshot, orderBy, addDoc, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let myUid = localStorage.getItem('my_user_id');
let storiesMap = {};

const q = query(collection(db,'stories'), where('expiresAt','>',Date.now()), orderBy('expiresAt','desc'));

onSnapshot(q, (snap)=>{
  let el=document.getElementById('otherStories'); if(!el) return;
  el.innerHTML=''; storiesMap={};
  snap.forEach(d=>{
    let s={id:d.id,...d.data()};
    if(storiesMap[s.userId]) return; // Ek user = ek ring - Duplicate khatam
    storiesMap[s.userId]=s;
  });
  Object.values(storiesMap).forEach(s=>{
    if(s.userId===myUid) return;
    let seen=localStorage.getItem('seen_'+s.id);
    let ring=seen?'background:#333':'background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)';
    let div=document.createElement('div');
    div.style.cssText='min-width:66px;text-align:center;cursor:pointer';
    div.innerHTML=`<div style="width:62px;height:62px;border-radius:50%;padding:3px;${ring}"><img src="${s.userPic}" style="width:100%;height:100%;border-radius:50%;border:2px solid #000;object-fit:cover"></div><div style="font-size:11px;margin-top:4px">${(s.userName||'User').slice(0,8)}</div>`;
    div.onclick=()=>openStoryViewer(s);
    el.appendChild(div);
  });
});

// Upload - Your Story + se
let inp=document.getElementById('storyInput');
if(inp){
  inp.onchange=(e)=>{
    let file=e.target.files[0]; if(!file) return;
    let reader=new FileReader();
    reader.onload=async(ev)=>{
      let uSnap=await getDoc(doc(db,'users',myUid));
      let u=uSnap.exists()?uSnap.data():{};
      await addDoc(collection(db,'stories'),{
        userId:myUid, userName:u.name||'User', userPic:u.pic||'https://i.pravatar.cc/100',
        mediaUrl:ev.target.result, mediaType:file.type.includes('video')?'video':'image',
        createdAt:Date.now(), expiresAt:Date.now()+86400000, views:0, likes:0, isPublic:true
      });
      alert('Story uploaded - 24h public!');
    };
    reader.readAsDataURL(file);
  };
}
