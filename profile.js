// profile.js - InstaPro Premium Instagram Glass Profile
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(()=>{

    let profilePage = document.getElementById("profilePage");
    if(!profilePage){
      profilePage=document.createElement("div");
      profilePage.id="profilePage";
      profilePage.className="page";
      profilePage.style.display="none";
      document.querySelector(".app")?.appendChild(profilePage);
    }

    profilePage.innerHTML=`
      <style>
        .glass{ background:rgba(255,255,255,0.12); backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,0.22); }
        .glassBtn{ background:rgba(255,255,255,0.14); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.25); border-radius:20px; padding:8px 16px; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
        .glassBtn.primary{ background:linear-gradient(135deg,#ff6a8a,#8a6cff); border:none; }
        .stat{ text-align:center; flex:1; }
        .stat b{ display:block; color:#fff; font-size:17px; }
        .stat span{ color:rgba(255,255,255,.55); font-size:12px; }
        .highlight{ min-width:62px; text-align:center; }
        .highlight img{ width:58px; height:58px; border-radius:50%; border:2px solid rgba(255,255,255,.25); padding:2px; background:rgba(255,255,255,.08); }
      </style>

      <div style="padding:66px 0 90px 0; min-height:100vh; background:#000; color:#fff;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0 16px;">
          <div style="display:flex; align-items:center; gap:6px;"><b style="font-size:20px;">instapro_user</b><span style="color:#2ecc71; font-size:12px;">▼</span></div>
          <div style="display:flex; gap:10px;">
            <div class="glass" style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;">☰</div>
            <div class="glass" style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;">+</div>
          </div>
        </div>

        <!-- Avatar + Stats -->
        <div style="display:flex; align-items:center; gap:16px; padding:18px 16px 10px 16px;">
          <div style="position:relative;">
            <img src="https://i.pravatar.cc/150?img=32" style="width:84px;height:84px;border-radius:50%; border:3px solid rgba(255,255,255,.2);">
            <div style="position:absolute; bottom:0; right:0; width:22px;height:22px; background:#2ecc71; border-radius:50%; border:3px solid #000; display:flex; align-items:center; justify-content:center; font-size:10px;">+</div>
          </div>
          <div style="flex:1; display:flex;">
            <div class="stat"><b id="postCount">0</b><span>Posts</span></div>
            <div class="stat"><b>1.2K</b><span>Followers</span></div>
            <div class="stat"><b>380</b><span>Following</span></div>
          </div>
        </div>

        <!-- Bio -->
        <div style="padding:0 16px 12px 16px;">
          <b style="font-size:14px;">Sourabh G | InstaPro 🚀</b><br>
          <span style="color:rgba(255,255,255,.65); font-size:13px; line-height:1.3;">Premium Glass UI • Developer • Jabalpur, MP<br>Building Instagram Clone with Firebase 🔥</span><br>
          <span style="color:#6db3ff; font-size:13px;">github.com/sg7212</span>
        </div>

        <!-- Edit Buttons - Glass -->
        <div style="display:flex; gap:8px; padding:0 16px 14px 16px;">
          <div class="glassBtn" style="flex:1; text-align:center;">Edit profile</div>
          <div class="glassBtn" style="flex:1; text-align:center;">Share profile</div>
          <div class="glass" style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;">👤</div>
        </div>

        <!-- Highlights - Glass -->
        <div style="display:flex; gap:12px; overflow:auto; padding:4px 16px 14px 16px; scrollbar-width:none;">
          <div class="highlight"><div class="glass" style="width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px">+</div><div style="font-size:11px; margin-top:4px; opacity:.7">New</div></div>
          <div class="highlight"><img src="https://picsum.photos/100?random=11"><div style="font-size:11px; margin-top:4px;">Travel ✈️</div></div>
          <div class="highlight"><img src="https://picsum.photos/100?random=12"><div style="font-size:11px; margin-top:4px;">Code 💻</div></div>
          <div class="highlight"><img src="https://picsum.photos/100?random=13"><div style="font-size:11px; margin-top:4px;">Food 🍔</div></div>
        </div>

        <!-- Tabs - Glass -->
        <div style="display:flex; border-top:1px solid rgba(255,255,255,.12);">
          <div style="flex:1; text-align:center; padding:12px; border-top:1px solid #fff;"><span style="font-size:18px;">⊞</span></div>
          <div style="flex:1; text-align:center; padding:12px; opacity:.4;"><span style="font-size:18px;">▶️</span></div>
          <div style="flex:1; text-align:center; padding:12px; opacity:.4;"><span style="font-size:18px;">👤</span></div>
        </div>

        <!-- Posts Grid -->
        <div id="profileGrid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:2px; background:rgba(255,255,255,.08);">
          <div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:rgba(255,255,255,.5);">
            <div style="font-size:40px; margin-bottom:10px;">📸</div>
            <div>No posts yet? Upload from + button</div>
          </div>
        </div>

      </div>
    `;

    // Load real posts from Firebase
    const grid = profilePage.querySelector("#profileGrid");
    const postCountEl = profilePage.querySelector("#postCount");

    try{
      const q = query(collection(db,"posts"), orderBy("createdAt","desc"));
      onSnapshot(q, snap=>{
        if(postCountEl) postCountEl.textContent = snap.size;
        if(snap.empty){
          grid.innerHTML=`<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:rgba(255,255,255,.5);"><div style="font-size:40px;">📸</div><div>No posts yet</div><div style="font-size:12px; opacity:.5; margin-top:4px;">Your uploaded posts will appear here</div></div>`;
          return;
        }
        grid.innerHTML="";
        snap.forEach(d=>{
          const data=d.data();
          grid.innerHTML+=`<div style="aspect-ratio:1; overflow:hidden; background:#111; position:relative;"><img src="${data.url}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,.5); backdrop-filter:blur(8px); border-radius:10px; padding:2px 6px; font-size:11px; color:#fff;">❤️ ${data.likes||0}</div></div>`;
        });
      });
    }catch(e){ console.log("profile load err",e); }

    console.log("✅ Profile Glass Ready");

  },700);
});
