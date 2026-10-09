import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
const myId=localStorage.getItem('my_user_id')||'user';
$('nameText').innerText=localStorage.getItem('my_user_name')||'New User';
$('bioText').innerText=localStorage.getItem('my_bio')||'Welcome to InstaPro ✨';
$('profileTopName').innerText=localStorage.getItem('my_user_name')||'_';
$('editBtn').onclick=()=>{
  let n=prompt('Name:',localStorage.getItem('my_user_name')||'New User'); if(n===null) return;
  let b=prompt('Bio:',localStorage.getItem('my_bio')||'Welcome to InstaPro ✨'); if(b===null) return;
  localStorage.setItem('my_user_name',n); localStorage.setItem('my_bio',b);
  $('nameText').innerText=n; $('bioText').innerText=b; $('profileTopName').innerText=n;
  setDoc(doc(db,"users",myId),{name:n,bio:b,userId:myId,time:Date.now()},{merge:true});
};
$('shareBtn').onclick=()=>{ navigator.clipboard.writeText(location.href); alert('Link copied!'); };
$('tabPosts').onclick=()=>{ $('postsGrid').style.display='grid'; $('reelsGrid').style.display='none'; $('tabPosts').style.borderBottom='2px solid #fff'; $('tabReels').style.borderBottom='none'; };
$('tabReels').onclick=()=>{ $('postsGrid').style.display='none'; $('reelsGrid').style.display='grid'; $('tabReels').style.borderBottom='2px solid #fff'; $('tabPosts').style.borderBottom='none'; };
