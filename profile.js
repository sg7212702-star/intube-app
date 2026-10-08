// Auto hide edit modal on load - fix for direct open
document.addEventListener('DOMContentLoaded', ()=>{ 
  const m=document.getElementById('editModal'); 
  if(m) m.style.display='none'; 
});

// Close modal by default
const editModalEl = document.getElementById('editModal');
if(editModalEl) editModalEl.style.display = 'none';

import { auth, db, storage } from './firebase-config.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let currentUser = null;
let newPicUrl = null;

onAuthStateChanged(auth, async (user) => {
  if(!user) return;
  currentUser = user;
  loadProfile(user);
  loadMyPosts(user.uid);
});

async function loadProfile(user){
  try{
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const name = data.name || user.displayName || 'User';
    const bio = data.bio || 'Welcome to INTUBE 💎';
    const photo = data.photo || user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    
    document.getElementById('profileTopName').innerText = name;
    document.getElementById('profileName').innerText = name;
    document.getElementById('profileBio').innerText = bio;
    document.getElementById('profileEmail').innerText = data.email || user.email || '';
    document.getElementById('profilePic').src = photo;
    const bImg = document.getElementById('bottomProfileImg');
    if(bImg) bImg.src = photo;
    const ep = document.getElementById('editPicPreview');
    if(ep) ep.src = photo;
    const en = document.getElementById('editNameInput');
    if(en) en.value = name;
    const eb = document.getElementById('editBioInput');
    if(eb) eb.value = data.bio || '';
  }catch(e){ console.log(e); }
}

async function loadMyPosts(uid){
  try{
    const q = query(collection(db, "posts"), where("uid", "==", uid), orderBy("createdAt", "desc"));
    const snaps = await getDocs(q);
    const grid = document.getElementById('profilePostsGrid');
    if(!grid) return;
    grid.innerHTML = '';
    let count = 0;
    snaps.forEach(d=>{
      count++;
      const p = d.data();
      const div = document.createElement('div');
      div.style.cssText = 'aspect-ratio:1;background:#111;overflow:hidden;cursor:pointer';
      div.innerHTML = `<img src="${p.mediaUrl || p.imageUrl}" style="width:100%;height:100%;object-fit:cover">`;
      grid.appendChild(div);
    });
    const pc = document.getElementById('postCount');
    if(pc) pc.innerText = count;
  }catch(e){ console.log(e); }
}

// Tabs
document.querySelectorAll('.pTab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.pTab').forEach(b=>{b.classList.remove('active'); b.style.borderTopColor='transparent'; b.style.color='#6e6e84'});
    btn.classList.add('active'); btn.style.borderTopColor='#fff'; btn.style.color='#fff';
    document.getElementById('profilePostsGrid').style.display = btn.dataset.tab==='posts'? 'grid' : 'none';
    document.getElementById('profileReelsGrid').style.display = btn.dataset.tab==='reels'? 'grid' : 'none';
    document.getElementById('profileTaggedGrid').style.display = btn.dataset.tab==='tagged'? 'block' : 'none';
  });
});

// Edit open/close - FIXED
const editBtn = document.getElementById('editProfileBtn');
if(editBtn) editBtn.onclick = ()=> { 
  const m = document.getElementById('editModal');
  if(m) m.style.display='flex'; 
};
const closeBtn = document.getElementById('closeEditModal');
if(closeBtn) closeBtn.onclick = ()=> { 
  const m = document.getElementById('editModal');
  if(m) m.style.display='none'; 
};
const picPreview = document.getElementById('editPicPreview');
if(picPreview) picPreview.onclick = ()=> document.getElementById('editPicFile').click();

const fileInput = document.getElementById('editPicFile');
if(fileInput){
  fileInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    document.getElementById('editPicPreview').src = URL.createObjectURL(file);
    try{
      const r = ref(storage, `profilePics/${currentUser.uid}`);
      await uploadBytes(r, file);
      newPicUrl = await getDownloadURL(r);
    }catch(err){ alert(err.message); }
  });
}

const saveBtn = document.getElementById('saveProfileBtn');
if(saveBtn){
  saveBtn.onclick = async ()=>{
    if(!currentUser) return;
    const name = document.getElementById('editNameInput').value.trim();
    const bio = document.getElementById('editBioInput').value.trim();
    const update = { name, bio };
    if(newPicUrl) update.photo = newPicUrl;
    try{
      await updateDoc(doc(db, "users", currentUser.uid), update);
      document.getElementById('editModal').style.display='none';
      loadProfile(currentUser);
      alert('Profile Updated');
    }catch(err){ alert(err.message); }
  };
}
