// profile.js - Profile Page Real-Time - Glass Safe
import { db } from './firebase.js'
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const profileSheet = document.getElementById('profileSheet')
const profileGrid = document.getElementById('profileGrid')
const postCountEl = document.getElementById('postCount')
const profileName = document.getElementById('profileName')
const profilePic = document.getElementById('profilePic')

// ===== BOTTOM PROFILE BUTTON SE OPEN =====
document.querySelectorAll('.bBtn').forEach(btn=>{
  if(btn.dataset.v === 'profile'){
    btn.addEventListener('click', ()=>{
      openProfile()
    })
  }
})

window.openProfile = ()=>{
  // Agar sheet bani hai to dikhao, warna alert
  if(profileSheet){
    profileSheet.classList.add('show')
    document.getElementById('overlay')?.classList.add('show')
  }else{
    // Simple profile view banao agar sheet nahi hai
    showProfileModal()
  }
  loadMyPosts()
}

window.closeProfile = ()=>{
  profileSheet?.classList.remove('show')
  document.getElementById('overlay')?.classList.remove('show')
  document.getElementById('profileModal')?.remove()
}

// ===== MODAL PROFILE (Agar aapke index me sheet nahi hai) =====
function showProfileModal(){
  let modal = document.getElementById('profileModal')
  if(modal) modal.remove()
  
  modal = document.createElement('div')
  modal.id = 'profileModal'
  modal.style.cssText = `
    position:fixed; inset:0; z-index:200; background:rgba(10,10,15,0.92); backdrop-filter:blur(20px);
    padding:20px; overflow-y:auto; animation: fadeIn 0.3s;
  `
  modal.innerHTML = `
    <div style="max-width:420px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="color:#fff;font-weight:800">Profile</h2>
        <button onclick="closeProfile()" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff">✕</button>
      </div>
      
      <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:24px;backdrop-filter:blur(16px)">
        <img id="profilePic" src="https://i.pravatar.cc/100?img=12" style="width:90px;height:90px;border-radius:50%;border:3px solid #ff2d7a;object-fit:cover">
        <h3 id="profileName" style="color:#fff;margin-top:12px;font-weight:800">you</h3>
        <p style="color:rgba(255,255,255,0.5);font-size:13px">Jabalpur, MP • Premium User 👑</p>
        
        <div style="display:flex;justify-content:space-around;margin-top:18px">
          <div><b id="postCount" style="color:#fff;font-size:18px">0</b><br><span style="color:rgba(255,255,255,0.5);font-size:12px">Posts</span></div>
          <div><b style="color:#fff;font-size:18px">1.2k</b><br><span style="color:rgba(255,255,255,0.5);font-size:12px">Followers</span></div>
          <div><b style="color:#fff;font-size:18px">340</b><br><span style="color:rgba(255,255,255,0.5);font-size:12px">Following</span></div>
        </div>
        
        <div style="display:flex;gap:10px;margin-top:18px">
          <button onclick="editProfile()" style="flex:1;padding:10px;border-radius:12px;border:none;background:linear-gradient(135deg,#ff2d7a,#7c4dff);color:#fff;font-weight:700">Edit Profile</button>
          <button onclick="shareProfile()" style="flex:1;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-weight:700">Share</button>
        </div>
      </div>
      
      <div style="display:flex;gap:16px;justify-content:center;margin:20px 0;color:#fff;opacity:.7">
        <span>⊞ Grid</span><span>🎬 Reels</span><span>🔖 Saved</span>
      </div>
      
      <div id="profileGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"></div>
    </div>
  `
  document.body.appendChild(modal)
}

// ===== MERE POSTS LOAD - Real-Time =====
function loadMyPosts(){
  const grid = document.getElementById('profileGrid')
  if(!grid) return

  const q = query(collection(db, "posts"), where("username", "==", "you"), orderBy("createdAt", "desc"))
  onSnapshot(q, (snap)=>{
    if(postCountEl) postCountEl.textContent = snap.size
    const countEl = document.querySelector('#profileModal #postCount')
    if(countEl) countEl.textContent = snap.size

    if(snap.empty){
      grid.innerHTML = `<div style="grid-column:1/4;text-align:center;padding:40px;opacity:.4;color:#fff"><div style="font-size:40px">📸</div><p style="margin-top:8px;font-size:13px">No posts yet<br>+ se post karo</p></div>`
      return
    }

    grid.innerHTML = ""
    snap.forEach(d=>{
      const p = d.data()
      grid.innerHTML += `
      <div style="aspect-ratio:1;overflow:hidden;background:#111;border-radius:8px">
        <img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover">
      </div>`
    })
  }, (err)=>{
    console.log("Profile posts error:", err.message)
    grid.innerHTML = `<div style="grid-column:1/4;text-align:center;padding:20px;color:#fff;opacity:.5">Firebase connect karo</div>`
  })
}

// ===== EDIT / SHARE =====
window.editProfile = ()=>{
  const name = prompt("New name likho:", "you")
  if(name){
    if(profileName) profileName.textContent = name
    const modalName = document.querySelector('#profileModal #profileName')
    if(modalName) modalName.textContent = name
    alert("Profile updated ✅")
  }
}

window.shareProfile = async()=>{
  if(navigator.share) await navigator.share({title:"My InstaPro", url: location.href})
  else{ await navigator.clipboard.writeText(location.href); alert("Profile link copied ✅") }
}

console.log("profile.js loaded ✅")
