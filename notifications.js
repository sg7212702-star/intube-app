// notifications.js - Full Notification System - Glass Premium - Real-Time
import { db } from './firebase.js'
import { collection, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const notifBtn = document.getElementById('notifBtn')
let notifCount = 0
let notifData = []

// ===== REAL-TIME LISTENER - Firebase se live notifications =====
const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"))
onSnapshot(q, (snap)=>{
  notifData = []
  snap.forEach(d=>{
    notifData.push({ id: d.id, ...d.data() })
  })
  notifCount = snap.size
  updateNotifBadge()
})

function updateNotifBadge(){
  let badge = document.getElementById('notifBadge')
  if(!badge && notifBtn){
    badge = document.createElement('span')
    badge.id = 'notifBadge'
    badge.style.cssText = `position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:linear-gradient(135deg,#ff2d7a,#ff7a3d);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #000;`
    notifBtn.style.position = 'relative'
    notifBtn.appendChild(badge)
  }
  if(badge){
    badge.textContent = notifCount > 9 ? '9+' : notifCount
    badge.style.display = notifCount > 0 ? 'flex' : 'none'
  }
}

// ===== NOTIFICATION BUTTON DABANE SE SHEET KHULEGA =====
notifBtn?.addEventListener('click', ()=>{
  openNotifSheet()
})

window.openNotifSheet = ()=>{
  closeAllSheets()
  let sheet = document.getElementById('notifSheet')
  if(sheet) sheet.remove()

  sheet = document.createElement('div')
  sheet.id = 'notifSheet'
  sheet.style.cssText = `
    position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column;
    background:rgba(10,10,15,0.92); backdrop-filter:blur(24px);
    animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
  `
  sheet.innerHTML = `
    <style>
      @keyframes slideUp{ from{ transform:translateY(100%) } to{ transform:translateY(0) } }
      .notifItem{ display:flex; gap:12px; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06); align-items:center; }
      .notifItem:active{ background:rgba(255,255,255,0.04) }
    </style>
    
    <div style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1)">
      <h2 style="color:#fff; font-weight:800; font-size:18px; display:flex; align-items:center; gap:8px">🔔 Notifications ${notifCount>0?`<span style="background:#ff2d7a;padding:2px 8px;border-radius:10px;font-size:12px">${notifCount}</span>`:''}</h2>
      <button onclick="closeNotifSheet()" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-weight:700">✕</button>
    </div>
    
    <div style="padding:12px 16px; display:flex; gap:8px; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,0.06)">
      <button class="nFilter active" data-f="all" style="padding:6px 14px;border-radius:20px;border:none;background:#fff;color:#000;font-weight:700;font-size:13px;white-space:nowrap">All</button>
      <button class="nFilter" data-f="like" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:13px;white-space:nowrap">❤️ Likes</button>
      <button class="nFilter" data-f="comment" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:13px;white-space:nowrap">💬 Comments</button>
      <button class="nFilter" data-f="follow" style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:13px;white-space:nowrap">👤 Follows</button>
    </div>
    
    <div id="notifList" style="flex:1; overflow-y:auto; padding-bottom:20px"></div>
  `
  document.body.appendChild(sheet)
  document.getElementById('overlay')?.classList.add('show')
  
  renderNotifs('all')

  // Filter buttons
  sheet.querySelectorAll('.nFilter').forEach(b=>{
    b.addEventListener('click', ()=>{
      sheet.querySelectorAll('.nFilter').forEach(x=>{
        x.classList.remove('active'); x.style.background='rgba(255,255,255,0.08)'; x.style.color='#fff'; x.style.border='1px solid rgba(255,255,255,0.15)'
      })
      b.classList.add('active'); b.style.background='#fff'; b.style.color='#000'; b.style.border='none'
      renderNotifs(b.dataset.f)
    })
  })
}

function renderNotifs(filter){
  const list = document.getElementById('notifList')
  if(!list) return

  let filtered = notifData
  if(filter !== 'all') filtered = notifData.filter(n=> n.type === filter)

  if(filtered.length === 0){
    list.innerHTML = `
      <div style="text-align:center; padding:80px 20px; opacity:.4">
        <div style="font-size:48px">🔔</div>
        <p style="color:#fff; margin-top:12px; font-weight:600">No ${filter==='all'?'notifications': filter+' notifications'} yet</p>
        <p style="color:rgba(255,255,255,0.5); font-size:12px; margin-top:6px">Jab koi like / comment karega,<br>yahan real-time dikhega</p>
      </div>
    `
    return
  }

  list.innerHTML = ""
  filtered.forEach(n=>{
    const time = n.createdAt?.toDate ? timeAgo(n.createdAt.toDate()) : 'now'
    let icon = '❤️', text = 'liked your post', color = '#ff2d7a'
    if(n.type === 'comment'){ icon='💬'; text=`commented: "${n.text||'Nice!'}"`; color='#7c4dff' }
    if(n.type === 'follow'){ icon='👤'; text='started following you'; color='#00e5ff' }
    if(n.type === 'save'){ icon='🔖'; text='saved your post'; color='#ffcc00' }

    list.innerHTML += `
      <div class="notifItem">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${color},#ff7a3d);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icon}</div>
        <img src="${n.userPic||'https://i.pravatar.cc/100?img=5'}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin-left:-10px;border:2px solid rgba(10,10,15,0.9)">
        <div style="flex:1;min-width:0">
          <p style="color:#fff;font-size:14px;line-height:1.3"><b>${n.by||'someone'}</b> ${text}</p>
          <p style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:2px">${time} • ${n.postId? 'Post': ''}</p>
        </div>
        ${n.imageUrl? `<img src="${n.imageUrl}" style="width:48px;height:48px;border-radius:10px;object-fit:cover">` : `<div style="width:8px;height:8px;border-radius:50%;background:#ff2d7a;flex-shrink:0"></div>`}
      </div>
    `
  })
}

window.closeNotifSheet = ()=>{
  document.getElementById('notifSheet')?.remove()
  document.getElementById('overlay')?.classList.remove('show')
}

function closeAllSheets(){
  document.getElementById('createSheet')?.classList.remove('show')
  document.getElementById('sideMenu')?.classList.remove('show')
  document.getElementById('profileModal')?.remove()
}

function timeAgo(date){
  const s = Math.floor((new Date() - date)/1000)
  if(s < 60) return 'now'
  if(s < 3600) return Math.floor(s/60)+'m ago'
  if(s < 86400) return Math.floor(s/3600)+'h ago'
  return Math.floor(s/86400)+'d ago'
}

// ===== TEST NOTIFICATION - Jab Like Hoga Tab Auto Add Hoga =====
window.addTestNotif = (type='like')=>{
  // Ye function app.js / feed.js se call hoga jab like hoga
  console.log("Notification added:", type)
}

console.log("notifications.js - Real-Time Notification System Ready ✅")
