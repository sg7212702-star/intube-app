// notifications.js - InstaPro Premium Instagram Glass Notification
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(()=>{

    // --- CSS INJECT ---
    const style = document.createElement("style");
    style.textContent=`
      .notifWrap{ position:fixed; top:0; right:0; width:100%; max-width:400px; height:100vh; background:rgba(10,10,12,0.85); backdrop-filter:blur(28px) saturate(180%); -webkit-backdrop-filter:blur(28px); border-left:1px solid rgba(255,255,255,0.18); z-index:9999; transform:translateX(105%); transition:transform .38s cubic-bezier(.32,.72,0,1); display:flex; flex-direction:column; }
      .notifWrap.show{ transform:translateX(0); }
      .notifCard{ display:flex; gap:12px; padding:14px 16px; border-radius:18px; margin:8px 12px; background:rgba(255,255,255,0.10); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.18); transition:.2s; }
      .notifCard:hover{ background:rgba(255,255,255,0.16); transform:translateY(-1px); }
      .glassBtn{ background:rgba(255,255,255,0.15); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.28); border-radius:20px; padding:6px 14px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; }
      .glassBtn.primary{ background:linear-gradient(135deg,#ff6a8a,#8a6cff); border:none; }
    `;
    document.head.appendChild(style);

    // --- HTML CREATE ---
    let box = document.getElementById("notifBox");
    if(box) box.remove();
    let overlay = document.getElementById("notifOverlay");
    if(overlay) overlay.remove();

    box = document.createElement("div");
    box.id="notifBox";
    box.className="notifWrap";
    box.innerHTML=`
      <div style="padding:18px 16px 12px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.12);">
        <div style="display:flex; align-items:center; gap:10px;">
          <div id="closeNotif" style="width:36px;height:36px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer; border:1px solid rgba(255,255,255,.2)">✕</div>
          <b style="color:#fff; font-size:18px;">Notifications</b>
        </div>
        <div id="markAll" class="glassBtn">Mark all read</div>
      </div>

      <div style="display:flex; gap:8px; padding:12px 16px;">
        <div class="glassBtn primary">All</div>
        <div class="glassBtn">Likes</div>
        <div class="glassBtn">Comments</div>
        <div class="glassBtn">Follows</div>
      </div>

      <div id="notifList" style="flex:1; overflow:auto; padding-bottom:90px;">
        <div style="text-align:center; padding:40px 20px; opacity:.6;">
          <div style="font-size:36px; margin-bottom:8px;">🔔</div>
          <div style="color:#fff;">No notifications yet</div>
          <div style="color:rgba(255,255,255,.5); font-size:12px; margin-top:4px;">When someone likes or comments, you'll see it here</div>
        </div>
      </div>

      <div style="padding:12px 16px; border-top:1px solid rgba(255,255,255,.1); display:flex; justify-content:space-between; align-items:center;">
        <span style="color:rgba(255,255,255,.6); font-size:12px;">InstaPro • Glass System</span>
        <span id="clearNotif" style="color:#ff6a8a; font-size:13px; cursor:pointer; font-weight:600;">Clear all</span>
      </div>
    `;
    document.body.appendChild(box);

    overlay = document.createElement("div");
    overlay.id="notifOverlay";
    overlay.style.cssText="position:fixed; inset:0; background:rgba(0,0,0,.35); backdrop-filter:blur(4px); z-index:9998; display:none; opacity:0; transition:opacity .3s;";
    document.body.appendChild(overlay);

    function openBox(){
      box.classList.add("show");
      overlay.style.display="block";
      setTimeout(()=> overlay.style.opacity="1",10);
    }
    function closeBox(){
      box.classList.remove("show");
      overlay.style.opacity="0";
      setTimeout(()=> overlay.style.display="none",300);
    }

    document.getElementById("closeNotif").addEventListener("click", closeBox);
    document.getElementById("clearNotif").addEventListener("click", ()=>{ document.getElementById("notifList").innerHTML=`<div style="text-align:center; padding:40px; color:rgba(255,255,255,.6)">Cleared ✨</div>`; });
    document.getElementById("markAll").addEventListener("click", ()=>{ box.querySelectorAll(".dot").forEach(d=>d.style.display="none"); });
    overlay.addEventListener("click", closeBox);

    // Bell button
    const bell = document.getElementById("notifBtn");
    if(bell){ bell.style.position="relative"; bell.addEventListener("click", openBox); }

    // --- REALTIME NOTIFICATIONS ---
    const list = document.getElementById("notifList");
    
    // Demo data + Firebase
    function renderNotif(data){
      const type = data.type || "like";
      const icons = { like:"❤️", comment:"💬", follow:"👤", mention:"📌" };
      const texts = {
        like: `<b>${data.user||'Someone'}</b> liked your post.`,
        comment: `<b>${data.user||'Someone'}</b> commented: "${data.text||'Nice! 🔥'}"`,
        follow: `<b>${data.user||'Someone'}</b> started following you.`,
        mention: `<b>${data.user||'Someone'}</b> mentioned you in a comment.`
      };
      return `
        <div class="notifCard">
          <div style="position:relative;">
            <img src="${data.avatar||'https://i.pravatar.cc/100?img='+Math.floor(Math.random()*20)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">
            <div style="position:absolute; bottom:-4px; right:-4px; width:22px;height:22px; border-radius:50%; background:rgba(0,0,0,.8); display:flex; align-items:center; justify-content:center; font-size:11px; border:1px solid rgba(255,255,255,.3)">${icons[type]}</div>
          </div>
          <div style="flex:1">
            <div style="color:#fff; font-size:13.5px; line-height:1.3;">${texts[type]}</div>
            <div style="color:rgba(255,255,255,.45); font-size:11px; margin-top:4px;">${data.time||'Just now'} • ${type}</div>
          </div>
          ${type==='follow' ? `<div class="glassBtn primary" style="align-self:center">Follow back</div>` : `<img src="${data.postImg||'https://picsum.photos/100?random='+Math.floor(Math.random()*10)}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;align-self:center">`}
          <div class="dot" style="width:8px;height:8px;background:#ff3b5c;border-radius:50%;align-self:center;flex-shrink:0"></div>
        </div>
      `;
    }

    // Firebase listener
    try{
      const q = query(collection(db,"notifications"), orderBy("createdAt","desc"));
      onSnapshot(q, snap=>{
        if(snap.empty){
          // Show demo Instagram style
          list.innerHTML = `
            ${renderNotif({type:"like", user:"Rahul", time:"2m ago", postImg:"https://picsum.photos/100?random=1", avatar:"https://i.pravatar.cc/100?img=5"})}
            ${renderNotif({type:"comment", user:"Priya", text:"Story dekha kya? 👀", time:"10m ago", avatar:"https://i.pravatar.cc/100?img=8"})}
            ${renderNotif({type:"follow", user:"Aman", time:"1h ago", avatar:"https://i.pravatar.cc/100?img=12"})}
            ${renderNotif({type:"like", user:"Sneha", time:"3h ago", avatar:"https://i.pravatar.cc/100?img=9"})}
          `;
        } else {
          list.innerHTML="";
          snap.forEach(d=>{ list.innerHTML+=renderNotif(d.data()); });
        }
      });
    }catch(e){
      console.log("notif offline",e);
    }

    console.log("✅ Notification Glass System Ready");

  },600);
});
