// profile.js - INSTAGRAM JAISA COMPLETE PROFILE SYSTEM
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db;
const CLOUD_NAME = 'kujnbe8a';
const PRESET = 'intube_free';
let currentUserId = localStorage.getItem('my_user_id') || 'sanjay_kumar';
let currentUserData = {};

// --- INIT ---
export function initProfile(firestoreDb) {
  db = firestoreDb;
  injectProfileCSS();
  createEditModalHTML();
  loadUserInfo();
  listenPostsAndReels();
  setupProfileEvents();
}

// --- CSS Instagram Jaisa ---
function injectProfileCSS(){
  if(document.getElementById('profile-css')) return;
  let s = document.createElement('style'); s.id='profile-css';
  s.innerHTML = `
  .ig-edit-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100}
  .ig-edit-sheet{display:none;position:fixed;left:0;right:0;bottom:0;background:#121212;border-radius:20px 20px 0 0;z-index:101;max-height:92vh;overflow:auto;padding:16px}
  .ig-input{width:100%;padding:14px;background:#1e1e1e;border:1px solid #333;border-radius:10px;color:#fff;margin:8px 0;font-size:14px}
  .ig-label{font-size:13px;opacity:.6;margin-top:12px;display:block}
  .ig-blue-btn{width:100%;padding:14px;background:#0095f6;border:none;border-radius:10px;color:#fff;font-weight:700;margin-top:16px}
  .p-header{display:flex;gap:16px;padding:16px;align-items:center}
  .p-avatar{width:86px;height:86px;border-radius:50%;padding:3px;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);position:relative}
  .p-avatar img{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #0e0014;background:#222}
  `;
  document.head.appendChild(s);
}

// --- EDIT MODAL HTML ---
function createEditModalHTML(){
  if(document.getElementById('igEditOverlay')) return;
  let html = `
  <div id="igEditOverlay" class="ig-edit-overlay"></div>
  <div id="igEditSheet" class="ig-edit-sheet">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #222">
      <button id="igEditClose" style="background:none;border:none;color:#fff;font-size:20px">✕</button>
      <b>Edit Profile</b>
      <button id="igEditSaveTop" style="background:none;border:none;color:#0095f6;font-weight:700">Done</button>
    </div>
    <div style="text-align:center;padding:20px 0">
      <div style="width:90px;height:90px;margin:0 auto;border-radius:50%;overflow:hidden"><img id="editPrevPic" src="https://i.pravatar.cc/150" style="width:100%;height:100%;object-fit:cover"></div>
      <button id="editChangePic" style="background:none;border:none;color:#0095f6;font-weight:600;margin-top:10px">Edit picture or avatar</button>
      <input type="file" id="editPicInput" accept="image/*" style="display:none">
    </div>
    <label class="ig-label">Name</label><input id="editName" class="ig-input" placeholder="Name">
    <label class="ig-label">Username</label><input id="editUsername" class="ig-input" placeholder="Username">
    <label class="ig-label">Pronouns</label><input id="editPronouns" class="ig-input" placeholder="Pronouns">
    <label class="ig-label">Category</label><input id="editCategory" class="ig-input" placeholder="Digital creator">
    <label class="ig-label">Bio</label><textarea id="editBio" class="ig-input" rows="3" placeholder="Bio + links"></textarea>
    <label class="ig-label">Link</label><input id="editLink" class="ig-input" placeholder="Add link">
    <label class="ig-label">Gender</label><select id="editGender" class="ig-input"><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>
    <div id="editStatus" style="text-align:center;padding:10px;font-size:12px;opacity:.6"></div>
    <button id="igEditSave" class="ig-blue-btn">Done</button>
    <div style="height:40px"></div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

// --- LOAD USER INFO FROM FIREBASE ---
async function loadUserInfo(){
  try{
    const ref = doc(db, "users", currentUserId);
    const snap = await getDoc(ref);
    if(snap.exists()){
      currentUserData = snap.data();
    } else {
      currentUserData = { name:'sanjay kumar', username:'sanjay_kumar_01', bio:'🌾 Farmer | 📸 Creator\nDM for collab', category:'Digital creator', pronouns:'', link:'', gender:'Male', photo:'https://i.pravatar.cc/150?u=sanjay', followers:1200, following:180 };
    }
    renderProfile(currentUserData);
  }catch(e){ console.log('profile load err', e); }
}

function renderProfile(u){
  const set = (id, v) => { const el=document.getElementById(id); if(el) el.innerText = v || ''; }
  const setSrc = (id, v) => { const el=document.getElementById(id); if(el && v) el.src = v; }
  set('nameText', u.name); set('bioText', u.bio); set('categoryText', u.category);
  setSrc('profilePic', u.photo); setSrc('editPrevPic', u.photo);
  if(document.getElementById('editName')) document.getElementById('editName').value = u.name || '';
  if(document.getElementById('editUsername')) document.getElementById('editUsername').value = u.username || currentUserId;
  if(document.getElementById('editBio')) document.getElementById('editBio').value = u.bio || '';
  if(document.getElementById('editCategory')) document.getElementById('editCategory').value = u.category || '';
  if(document.getElementById('editPronouns')) document.getElementById('editPronouns').value = u.pronouns || '';
  if(document.getElementById('editLink')) document.getElementById('editLink').value = u.link || '';
  if(document.getElementById('editGender')) document.getElementById('editGender').value = u.gender || 'Male';
  localStorage.setItem('insta_name', u.name);
  localStorage.setItem('insta_bio', u.bio);
}

// --- POSTS / REELS COUNT + GRID ---
function listenPostsAndReels(){
  const postsCol = collection(db, "posts");
  onSnapshot(query(postsCol, orderBy("time","desc")), (snap)=>{
    let myPosts = []; let myReels = [];
    snap.forEach(d=>{
      const p = d.data();
      if(p.user && (p.user.toLowerCase().includes('sanjay') || p.userId===currentUserId)){
        if(p.type==='reel') myReels.push(p); else myPosts.push(p);
      }
    });
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.innerText=v; }
    set('postsCount', myPosts.length+myReels.length);
    set('postsOnlyCount', myPosts.length); set('reelsOnlyCount', myReels.length);
    const pGrid = document.getElementById('postsGrid');
    if(pGrid) pGrid.innerHTML = myPosts.map(p=>`<div style="aspect-ratio:1/1;background:#111;overflow:hidden"><img src="${p.url}" style="width:100%;height:100%;object-fit:cover"></div>`).join('') || `<div style="grid-column:1/4;padding:40px;text-align:center;opacity:.4">Share a photo</div>`;
    const rGrid = document.getElementById('reelsGrid');
    if(rGrid) rGrid.innerHTML = myReels.map(p=>`<div style="aspect-ratio:1/1;background:#111;position:relative;overflow:hidden"><video src="${p.url}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;top:6px;right:6px">▶</div></div>`).join('') || `<div style="grid-column:1/4;padding:40px;text-align:center;opacity:.4">Share a reel</div>`;
  });
}

// --- EVENTS ---
function setupProfileEvents(){
  document.getElementById('editBtn')?.addEventListener('click', openEdit);
  document.getElementById('igEditClose')?.addEventListener('click', closeEdit);
  document.getElementById('igEditOverlay')?.addEventListener('click', closeEdit);
  document.getElementById('igEditSave')?.addEventListener('
