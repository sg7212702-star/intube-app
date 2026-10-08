// profile.js - FINAL 100% REAL-TIME INSTAGRAM PROFILE
import { doc, setDoc, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db;
const CLOUD_NAME = 'kujnbe8a';
const PRESET = 'intube_free';
let currentUserId = localStorage.getItem('my_user_id') || 'sanjay_kumar';
let currentUserData = {};

export function initProfile(firestoreDb) {
  db = firestoreDb;
  injectCSS();
  createEditModal();
  loadUserInfoRealTime(); // 👈 Ab Real-Time
  listenPostsAndReelsRealTime(); // 👈 Real-Time
  listenHighlightsRealTime(); // 👈 Real-Time
  setupEvents();
}

function injectCSS(){
  if(document.getElementById('p-css')) return;
  let s=document.createElement('style'); s.id='p-css';
  s.innerHTML=`.ig-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100}
 .ig-sheet{display:none;position:fixed;left:0;right:0;bottom:0;background:#121212;border-radius:20px 20px 0 0;z-index:101;max-height:92vh;overflow:auto;padding:16px}
 .ig-input{width:100%;padding:14px;background:#1e1e1e;border:1px solid #333;border-radius:10px;color:#fff;margin:8px 0}
 .ig-label{font-size:12px;opacity:.6;margin-top:10px;display:block}
 .ig-blue{width:100%;padding:14px;background:#0095f6;border:none;border-radius:10px;color:#fff;font-weight:700;margin-top:14px}`;
  document.head.appendChild(s);
}

function createEditModal(){
  if(document.getElementById('igOverlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div id="igOverlay" class="ig-overlay"></div>
  <div id="igSheet" class="ig-sheet">
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #222;padding-bottom:10px"><button id="igClose" style="background:none;border:none;color:#fff;font-size:20px">✕</button><b>Edit Profile</b><button id="igDoneTop" style="background:none;border:none;color:#0095f6;font-weight:700">Done</button></div>
    <div style="text-align:center;padding:18px 0"><div style="width:90px;height:90px;margin:0 auto;border-radius:50%;overflow:hidden"><img id="editPrevPic" src="https://i.pravatar.cc/150" style="width:100%;height:100%;object-fit:cover"></div><button id="editChangePic" style="background:none;border:none;color:#0095f6;font-weight:600;margin-top:10px">Edit picture or avatar</button><input type="file" id="editPicInput" accept="image/*" style="display:none"></div>
    <label class="ig-label">Name</label><input id="editName" class="ig-input">
    <label class="ig-label">Username</label><input id="editUsername" class="ig-input">
    <label class="ig-label">Pronouns</label><input id="editPronouns" class="ig-input" placeholder="he/him">
    <label class="ig-label">Category</label><input id="editCategory" class="ig-input" placeholder="Digital creator">
    <label class="ig-label">Bio</label><textarea id="editBio" class="ig-input" rows="3"></textarea>
    <label class="ig-label">Link</label><input id="editLink" class="ig-input" placeholder="https://">
    <label class="ig-label">Gender</label><select id="editGender" class="ig-input"><option>Male</option><option>Female</option><option>Other</option></select>
    <div id="editStatus" style="text-align:center;font-size:12px;padding:8px;opacity:.6"></div>
    <button id="igSave" class="ig-blue">Done</button><div style="height:40px"></div>
  </div>`);
}

// 🔴 REAL-TIME 1: USER INFO - naam/bio/dp jaise hi badlega sab phone me update
function loadUserInfoRealTime(){
  onSnapshot(doc(db, "users", currentUserId), (snap)=>{
    if(snap.exists()){
      currentUserData = snap.data();
      render(currentUserData);
      console.log("🔴 Real-Time Profile Update:", currentUserData.name);
    } else {
      // pehli baar user banao
      setDoc(doc(db, "users", currentUserId), { name:'sanjay kumar', username:currentUserId, bio:'🌾 Farmer | Creator', category:'Digital creator', photo:'https://i.pravatar.cc/150?u=sanjay', time:Date.now() }, {merge:true});
    }
  });
}

// 🔴 REAL-TIME 2: POSTS + REELS COUNT + GRID
function listenPostsAndReelsRealTime(){
  onSnapshot(query(collection(db, "posts"), orderBy("time","desc")), (snap)=>{
    let myPosts=[], myReels=[];
    snap.forEach(d=>{
      let p=d.data();
      if(p.user && (p.user.toLowerCase().includes('sanjay') || p.userId===currentUserId)){
        if(p.type==='reel') myReels.push(p); else myPosts.push(p);
      }
    });
    setTxt('postsCount', myPosts.length+myReels.length);
    setTxt('postsOnlyCount', myPosts.length); setTxt('reelsOnlyCount', myReels.length);
    let pg=document.getElementById('postsGrid'); if(pg) pg.innerHTML = myPosts.map(p=>`<div style="aspect-ratio:1/1;background:#111"><img src="${p.url}" style="width:100%;height:100%;object-fit:cover"></div>`).join('') || `<div style="grid-column:1/4;padding:40px;text-align:center;opacity:.4">No posts</div>`;
    let rg=document.getElementById('reelsGrid'); if(rg) rg.innerHTML = myReels.map(p=>`<div style="aspect-ratio:1/1;background:#111;position:relative"><video src="${p.url}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;top:6px;right:6px">▶</div></div>`).join('') || `<div style="grid-column:1/4;padding:40px;text-align:center;opacity:.4">No reels</div>`;
  });
}

// 🔴 REAL-TIME 3: HIGHLIGHTS
function listenHighlightsRealTime(){
  onSnapshot(collection(db, "users", currentUserId, "highlights"), (snap)=>{
    let box=document.getElementById('highlightsBox'); if(!box) return;
    if(snap.empty){ box.innerHTML=`<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;border:1px dashed #555;display:flex;align-items:center;justify-content:center">+</div><div style="font-size:12px">New</div></div>`; return; }
    box.innerHTML=''; snap.forEach(d=>{ let h=d.data(); box.innerHTML+=`<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:1px solid #333"><img src="${h.cover}" style="width:100%;height:100%;object-fit:cover"></div><div style="font-size:12px;margin-top:4px">${h.title}</div></div>`; });
  });
}

function render(u){
  setTxt('nameText', u.name); setTxt('bioText', u.bio); setTxt('categoryText', u.category);
  setSrc('profilePic', u.photo); setSrc('editPrevPic', u.photo);
  let ids=['editName','editUsername','editBio','editCategory','editPronouns','editLink','editGender'];
  let vals=[u.name,u.username,u.bio,u.category,u.pronouns,u.link,u.gender];
  ids.forEach((id,i)=>{ let el=document.getElementById(id); if(el) el.value=vals[i]||''; });
  localStorage.setItem('insta_name', u.name);
}

function setupEvents(){
  document.getElementById('editBtn')?.addEventListener('click', ()=>{ document.getElementById('igOverlay').style.display='block'; document.getElementById('igSheet').style.display='block'; });
  document.getElementById('igClose')?.addEventListener('click', close); document.getElementById('igOverlay')?.addEventListener('click', close);
  document.getElementById('igSave')?.addEventListener('click', save); document.getElementById('igDoneTop')?.addEventListener('click', save);
  document.getElementById('editChangePic')?.addEventListener('click', ()=> document.getElementById('editPicInput').click());
  document.getElementById('editPicInput')?.addEventListener('change', uploadPic);
  document.getElementById('shareBtn')?.addEventListener('click', ()=>{ if(navigator.share) navigator.share({url:location.href}); else {navigator.clipboard.writeText(location.href); alert('Link copied!');} });
  document.getElementById('tabPosts')?.addEventListener('click', ()=>switchTab('posts')); document.getElementById('tabReels')?.addEventListener('click', ()=>switchTab('reels'));
}
function close(){ document.getElementById('igOverlay').style.display='none'; document.getElementById('igSheet').style.display='none'; }
function switchTab(t){ document.getElementById('postsGrid').style.display=t==='posts'?'grid':'none'; document.getElementById('reelsGrid').style.display=t==='reels'?'grid':'none'; document.getElementById('tabPosts')?.classList.toggle('active',t==='posts'); document.getElementById('tabReels')?.classList.toggle('active',t==='reels'); }
async function uploadPic(e){
  let f=e.target.files[0]; if(!f) return; document.getElementById('editStatus').innerText='Uploading...';
  let fd=new FormData(); fd.append('file',f); fd.append('upload_preset',PRESET);
  let r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:'POST',body:fd}); let j=await r.json();
  if(j.secure_url){ document.getElementById('editPrevPic').src=j.secure_url; currentUserData.photo=j.secure_url; document.getElementById('editStatus').innerText='Uploaded, press Done'; }
}
async function save(){
  document.getElementById('igSave').innerText='Saving...';
  let data={ name:val('editName'), username:val('editUsername'), pronouns:val('editPronouns'), category:val('editCategory'), bio:val('editBio'), link:val('editLink'), gender:val('editGender'), photo:document.getElementById('editPrevPic').src, time:Date.now() };
  await setDoc(doc(db, "users", currentUserId), data, {merge:true});
  document.getElementById('igSave').innerText='Done'; close();
}
function val(id){ let el=document.getElementById(id); return el?el.value.trim():''; }
function setTxt(id,v){ let el=document.getElementById(id); if(el) el.innerText=v||''; }
function setSrc(id,v){ let el=document.getElementById(id); if(el&&v) el.src=v; }
export const editProfile = ()=>{ document.getElementById('igOverlay').style.display='block'; document.getElementById('igSheet').style.display='block'; };
