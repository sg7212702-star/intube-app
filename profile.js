import { db, auth } from "./firebase-config.js";
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user)=>{
 if(!user) return;
 const myId = user.uid;

 // Profile data real-time
 onSnapshot(doc(db,"users",myId), snap=>{
  if(snap.exists()){
   const d=snap.data();
   const nameEl = document.getElementById('nameText');
   const bioEl = document.getElementById('bioText');
   const topEl = document.getElementById('profileTopName');
   const picEl = document.getElementById('profilePic');
   if(nameEl) nameEl.innerText = d.name || user.displayName || 'User';
   if(bioEl) bioEl.innerText = d.bio || 'Welcome to InstaPro ✨';
   if(topEl) topEl.innerText = d.username || d.name || 'Profile';
   if(picEl && d.photo) picEl.src = d.photo;
  }
 });

 // 1 second wait - taki menu.js load ho jaye uske baad ye attach ho
 setTimeout(()=>{
  const editBtn = document.getElementById('editBtn');
  const shareBtn = document.getElementById('shareBtn');
  const editSheet = document.getElementById('editSheet');
  const editOverlay = document.getElementById('editOverlay');
  const eCancel = document.getElementById('eCancel');
  const eSave = document.getElementById('eSave');

  console.log("Profile buttons found:", !!editBtn, !!shareBtn); // check ke liye

  if(editBtn){
   editBtn.onclick = (e)=>{
    e.stopPropagation();
    const nameText = document.getElementById('nameText');
    const bioText = document.getElementById('bioText');
    const eName = document.getElementById('eName');
    const eBio = document.getElementById('eBio');
    if(eName) eName.value = nameText ? nameText.innerText : '';
    if(eBio) eBio.value = bioText ? bioText.innerText : '';
    if(editSheet) editSheet.style.display='block';
    if(editOverlay) editOverlay.style.display='block';
    console.log("Edit opened");
   };
  }

  const closeEdit = ()=>{
   if(editSheet) editSheet.style.display='none';
   if(editOverlay) editOverlay.style.display='none';
  };

  if(eCancel) eCancel.onclick = closeEdit;
  if(editOverlay) editOverlay.onclick = closeEdit;

  if(eSave){
   eSave.onclick = async ()=>{
    const n = document.getElementById('eName').value.trim();
    const b = document.getElementById('eBio').value.trim();
    if(!n){ alert('Naam likho'); return; }
    eSave.innerText='Saving...';
    try{
     await setDoc(doc(db,"users",myId),{name:n, bio:b, username:n},{merge:true});
     eSave.innerText='Save';
     closeEdit();
     alert('Profile Saved ✅');
    }catch(err){
     alert('Error: '+err.message);
     eSave.innerText='Save';
    }
   };
  }

  if(shareBtn){
   shareBtn.onclick = async (e)=>{
    e.stopPropagation();
    const link = location.origin + location.pathname + '?user=' + myId;
    try{
     if(navigator.share){
      await navigator.share({title:'InstaPro Profile', text:'Follow me on InstaPro', url:link});
     } else {
      await navigator.clipboard.writeText(link);
      alert('Link Copied: ' + link);
     }
    }catch(err){
     // agar share cancel kiya to bhi copy kar do
     navigator.clipboard.writeText(link);
     alert('Link Copied: ' + link);
    }
   };
  }

 }, 1200); // 1.2 sec delay - FIX
});
