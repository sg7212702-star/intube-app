// notifications.js - REAL TIME NOTIFICATION - Instagram Type Transparent Glass
import { db } from './firebase.js'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const notifBtn = document.getElementById('notifBtn')
let allNotifs = []

// ===== 1. REAL-TIME LISTENER - Firebase se Live =====
const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"))
onSnapshot(q, (snap) => {
  allNotifs = []
  snap.forEach(d => allNotifs.push({ id: d.id, ...d.data() }))
  updateBadge(snap.size)
  // Agar page khula hai to turant update
  if(document.getElementById('notifPage')) renderNotifs('all')
  console.log("Real-time notif:", snap.size)
})

function updateBadge(count){
  let badge = document.getElementById('notifBadge')
  if(!badge && notifBtn){
    badge = document.createElement('span')
    badge.id = 'notifBadge'
    badge.style.cssText = `position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:#ff3040;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #000`
    notifBtn.style.position = 'relative'
    notifBtn.appendChild(badge)
  }
  if(badge){
    badge.textContent = count > 99 ? '99+' : count
    badge.style.display = count > 0 ? 'flex' : 'none'
  }
}

// ===== 2. BELL DABANE PE TRANSPARENT GLASS PAGE =====
notifBtn?.addEventListener('click', (e)=>{
  e.preventDefault()
  e.stopPropagation()
  openNotifPage()
})

window.openNotifPage = () => {
  document.getElementById('createSheet')?.classList.remove('show')
  document.getElementById('sideMenu')?.classList.remove('show')
  document.getElementById('notifPage')?.remove()

  const page = document.createElement('div')
  page.id = 'notifPage'
  page.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:rgba(0,0,0,0.75); backdrop-filter:blur(28px) saturate(180%);
    display:flex; flex-direction:column;
  `
  page.innerHTML = `
    <div style="padding:14px 16px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.08)">
      <h2 style="color:#fff;font-weight:800;font-size:18px">Notifications</h2>
      <button onclick="closeNotifPage()" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff">✕</button>
    </div>
    <div id="notifList" style="flex:1; overflow-y:auto; padding:8px"></div>
  `
  document.body.appendChild(page)
  document.getElementById('overlay')?.classList.add('show')
  renderNotifs('all')
}

function renderNotifs(filter){
  const list = document.getElementById('notifList')
  if(!list) return
  let data = filter==='all' ? allNotifs : allNotifs.filter(n=>n.type===filter)
  
  if(data.length===0){
    list.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#fff;opacity:0.5">🔔<br><br>No notifications yet<br><span style="font-size:12px">Like / Comment karo to yahan ayega</span></div>`
    return
  }

  list.innerHTML = ""
  data.forEach(n=>{
    const dateObj = n.createdAt?.toDate ? n.createdAt.toDate() : new Date()
    const time = timeAgo(dateObj)
    const fullDate = dateObj.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    
    let icon='❤️', text='liked your post'
    if(n.type==='comment'){ icon='💬'; text=`commented: "${n.text||''}"` }
    if(n.type==='follow'){ icon='👤'; text='started following you' }
    if(n.type==='post'){ icon='📸'; text='added new post' }

    list.innerHTML += `
      <div style="display:flex;gap:12px;padding:12px;border-radius:14px;margin-bottom:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(12px)">
        <img src="${n.userPic||'https://i.pravatar.cc/100?img=12'}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">
        <div style="flex:1;min-width:0">
          <p style="color:#fff;font-size:14px"><b>${n.by||'you'}</b> ${text}</p>
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px">${time} • ${fullDate} ${icon}</p>
        </div>
        ${n.postImg?`<img src="${n.postImg}" style="width:44px;height:44px;border-radius:8px;object-fit:cover">`:''}
      </div>
    `
  })
}

window.closeNotifPage = () => {
  document.getElementById('notifPage')?.remove()
  document.getElementById('overlay')?.classList.remove('show')
}

function timeAgo(d){
  const s = Math.floor((new Date()-d)/1000)
  if(s<60) return 'just now'
  if(s<3600) return Math.floor(s/60)+'m ago'
  if(s<86400) return Math.floor(s/3600)+'h ago'
  return Math.floor(s/86400)+'d ago'
}

// ===== 3. REAL TIME NOTIF PUSH FUNCTION - Isko har jagah se call karenge =====
window.pushRealNotif = async (type, extra={}) => {
  try{
    await addDoc(collection(db, "notifications"), {
      type: type, // like, comment, follow, post
      by: extra.by || "you",
      userPic: extra.userPic || "https://i.pravatar.cc/100?img=12",
      text: extra.text || "",
      postImg: extra.postImg || "",
      postId: extra.postId || "",
      createdAt: serverTimestamp() // Real date - Firebase server time
    })
    console.log("Real-time notif sent:", type)
  }catch(e){ console.log("Notif error", e) }
}
