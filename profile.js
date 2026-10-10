// profile.js - InstaPro Instagram Premium Glass - FIXED BLANK ISSUE
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("profile.js loading...");

function loadProfile(){
  let page = document.getElementById("profilePage");
  if(!page){
    page = document.createElement("div");
    page.id = "profilePage";
    page.className = "page";
    document.querySelector(".app")?.appendChild(page);
  }

  // Blank fix - force visible style when opened
  page.style.minHeight = "100vh";
  page.style.background = "#000";

  page.innerHTML = `
  <style>
    .pGlass{ background:rgba(255,255,255,0.13); backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,0.22); }
    .pBtn{ background:rgba(255,255,255,0.14); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.22); border-radius:12px; padding:10px; color:#fff; font-weight:600; cursor:pointer; }
    .pSheet{ position:fixed; left:0; right:0; bottom:-110%; background:rgba(18,18,18,0.90); backdrop-filter:blur(32px) saturate(180%); border-top:1px solid rgba(255,255,255,0.18); border-radius:28px 28px 0 0; z-index:99999; transition:bottom .4s; max-height:88vh; overflow:auto; }
    .pSheet.show{ bottom:0; }
    .pOver{ position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(8px); z-index:99998; display:none; }
    .pOver.show{ display:block; }
    .pInput{ width:100%; padding:14px 16px; border-radius:14px; background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.16); color:#fff; outline:none; }
  </style>

  <div style="padding:62px 0 92px 0; color:#fff;">
    <!-- Top -->
    <div style="display:flex; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #262626; position:sticky; top:0; background:rgba(0,0,0,.85); backdrop-filter:blur(20px); z-index:10;">
      <b id="p_username" style="font-size:18px;">sg7212 ▼</b>
      <div style="display:flex; gap:10px;"><div class="pGlass" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">⊕</div><div id="p_menuBtn" class="pGlass" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">☰</div></div>
    </div>

    <!-- Avatar + Stats -->
    <div style="display:flex; gap:18px; padding:18px 16px;">
      <div style="position:relative"><img id="p_avatar" src="https://i.pravatar.cc/150?img=32" style="width:86px;height:86px;border-radius:50%;"><div id="p_change" style="position:absolute;bottom:0;right:0;width:24px;height:24px;background:linear-gradient(135deg,#ff6a8a,#8a6cff);border-radius:50%;border:3px solid #000;display:flex;align-items:center;justify-content:center;cursor:pointer;">+</div></div>
      <div style="flex:1;display:flex;text-align:center;">
        <div style="flex:1"><b id="p_count" style="display:block;font-size:17px;">0</b><span style="color:#8e8e8e;font-size:13px;">posts</span></div>
        <div style="flex:1"><b style="display:block;font-size:17px;">1.2K</b><span style="color:#8e8e8e;font-size:13px;">followers</span></div>
        <div style="flex:1"><b style="display:block;font-size:17px;">420</b><span style="color:#8e8e8e;font-size:13px;">following</span></div>
      </div>
    </div>

    <div style="padding:0 16px 14px;">
      <b id="p_name">Sourabh Gaur</b>
      <div id="p_bio" style="font-size:14px; color:rgba(255,255,255,.85); white-space:pre-wrap;">🚀 InstaPro Premium
💻 Developer • Jabalpur, MP
Firebase + Glass UI 🔥</div>
      <div id="p_link" style="color:#8ab4f8;font-size:14px;margin-top:4px;">github.com/sg7212</div>
    </div>

    <div style="display:flex; gap:8px; padding:0 16px 16px;">
      <div id="p_editBtn" class="pBtn" style="flex:1;text-align:center;">Edit profile</div>
      <div id="p_shareBtn" class="pBtn" style="flex:1;text-align:center;">Share profile</div>
      <div class="pGlass" style="width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;">👤</div>
    </div>

    <div style="display:flex; border-top:1px solid #262626;"><div style="flex:1;text-align:center;padding:12px;border-top:1px solid #fff;">⊞</div><div style="flex:1;text-align:center;padding:12px;opacity:.5;">▶️</div><div style="flex:1;text-align:center;padding:12px;opacity:.5;">👤</div></div>

    <div id="p_grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:2px; background:#111; min-height:200px;"></div>
  </div>

  <div id="p_overlay" class="pOver"></div>

  <!-- EDIT SHEET - Premium Glass -->
  <div id="p_editSheet" class="pSheet">
    <div style="padding:18px 18px 100px;">
      <div style="width:40px;height:5px;background:rgba(255,255,255,.4);border-radius:10px;margin:0 auto 16px;"></div>
      <div style="display:flex; justify-content:space-between;"><h3 style="margin:0">Edit profile</h3><div id="p_closeEdit" class="pGlass" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</div></div>
      
      <div style="text-align:center;margin:20px 0;"><img id="p_editAv" src="https://i.pravatar.cc/150?img=32" style="width:90px;height:90px;border-radius:50%"><div id="p_editPhoto" style="color:#4da3ff;margin-top:8px;font-weight:600;cursor:pointer">Edit picture or avatar</div></div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <div><label style="font-size:11px;opacity:.6">Name</label><input id="p_inpName" class="pInput" value="Sourabh Gaur"></div>
        <div><label style="font-size:11px;opacity:.6">Username</label><input id="p_inpUser" class="pInput" value="sg7212"></div>
        <div><label style="font-size:11px;opacity:.6">Bio</label><textarea id="p_inpBio" class="pInput" rows="3">🚀 InstaPro Premium
💻 Developer • Jabalpur, MP</textarea></div>
        <div><label style="font-size:11px;opacity:.6">Link</label><input id="p_inpLink" class="pInput" value="github.com/sg7212"></div>
        <button id="p_save" style="width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#ff6a8a,#8a6cff);color:#fff;font-weight:700;margin-top:10px;">Done ✓</button>
      </div>
    </div>
  </div>

  <!-- MENU SHEET -->
  <div id="p_menuSheet" class="pSheet">
    <div style="padding:18px 18px 100px;">
      <div style="width:40px;height:5px;background:rgba(255,255,255,.4);border-radius:10px;margin:0 auto 16px;"></div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div class="pBtn" style="padding:14px;">⚙️ Settings and privacy</div>
        <div class="pBtn" style="padding:14px;">📦 Archive</div>
        <div class="pBtn" style="padding:14px;">📊 Your activity</div>
        <div class="pBtn" style="padding:14px;">🔖 Saved</div>
      </div>
    </div>
  </div>

  <!-- POST VIEWER -->
  <div id="p_viewer" style="position:fixed; inset:0; background:rgba(0,0,0,.92); z-index:100000; display:none; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.1);"><b>Post</b><div id="p_closeView" style="width:32px;height:32px;background:rgba(255,255,255,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</div></div>
    <div id="p_viewContent" style="flex:1;display:flex;align-items:center;justify-content:center;background:#000;"></div>
    <div style="padding:12px 16px;display:flex;gap:16px;font-size:22px;">❤️ 💬 ✈️</div>
  </div>
  `;

  const overlay = page.querySelector("#p_overlay");
  const editSheet = page.querySelector("#p_editSheet");
  const menuSheet = page.querySelector("#p_menuSheet");
  const viewer = page.querySelector("#p_viewer");

  function openSheet(s){ s.classList.add("show"); overlay.classList.add("show"); }
  function closeAll(){ page.querySelectorAll(".pSheet").forEach(s=>s.classList.remove("show")); overlay.classList.remove("show"); viewer.style.display="none"; }

  overlay.addEventListener("click", closeAll);
  page.querySelector("#p_closeEdit").addEventListener("click", closeAll);
  page.querySelector("#p_closeView").addEventListener("click", closeAll);
  page.querySelector("#p_editBtn").addEventListener("click", ()=>openSheet(editSheet));
  page.querySelector("#p_menuBtn").addEventListener("click", ()=>openSheet(menuSheet));
  page.querySelector("#p_change").addEventListener("click", ()=>document.getElementById("postFile")?.click());
  page.querySelector("#p_editPhoto").addEventListener("click", ()=>document.getElementById("postFile")?.click());
  page.querySelector("#p_shareBtn").addEventListener("click", ()=>{ navigator.clipboard.writeText(location.href); alert("🔗 Profile link copied!"); });

  page.querySelector("#p_save").addEventListener("click", ()=>{
    page.querySelector("#p_name").textContent = page.querySelector("#p_inpName").value;
    page.querySelector("#p_username").textContent = page.querySelector("#p_inpUser").value + " ▼";
    page.querySelector("#p_bio").textContent = page.querySelector("#p_inpBio").value;
    page.querySelector("#p_link").textContent = page.querySelector("#p_inpLink").value;
    closeAll();
  });

  // Load posts + videos - Real time
  const grid = page.querySelector("#p_grid");
  const count = page.querySelector("#p_count");
  try{
    const q = query(collection(db,"posts"), orderBy("createdAt","desc"));
    onSnapshot(q, snap=>{
      count.textContent = snap.size;
      if(snap.empty){
        grid.innerHTML = `<div style="grid-column:1/-1;padding:50px;text-align:center;color:#777;">No posts yet<br><span style="font-size:12px;">Upload karo to yahan dikhega</span></div>`;
        return;
      }
      grid.innerHTML="";
      snap.forEach(d=>{
        const url = d.data().url;
        const isVideo = url.includes(".mp4") || url.includes("video") || d.data().type==="reel";
        const div=document.createElement("div");
        div.style.cssText="aspect-ratio:1;background:#111;position:relative;overflow:hidden;cursor:pointer;";
        div.innerHTML = isVideo ? `<video src="${url}" style="width:100%;height:100%;object-fit:cover" muted></video><div style="position:absolute;top:6px;right:6px;">▶️</div>` : `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
        div.addEventListener("click", ()=>{
          const vc = page.querySelector("#p_viewContent");
          vc.innerHTML = isVideo ? `<video src="${url}" controls autoplay style="width:100%;max-height:80vh"></video>` : `<img src="${url}" style="width:100%;max-height:80vh;object-fit:contain">`;
          viewer.style.display="flex";
        });
        grid.appendChild(div);
      });
    });
  }catch(e){ console.log(e); }
}

// Fix: app.js ne profilePage banaya hai to usko override karna
setTimeout(loadProfile, 500);

// Profile button dabane pe force reload - blank fix
document.addEventListener("click", (e)=>{
  if(e.target.closest('[data-v="profile"]') || e.target.closest("#profileBtn") || e.target.closest(".profile-btn")){
    setTimeout(()=>{
      const p = document.getElementById("profilePage");
      if(p){ p.style.display="block"; loadProfile(); }
    }, 150);
  }
});

// Page visible hone pe auto load
const observer = new MutationObserver(()=>{
  const p = document.getElementById("profilePage");
  if(p && p.style.display!=="none" && p.innerHTML.trim()===""){
    loadProfile();
  }
});
observer.observe(document.body, { attributes:true, subtree:true, attributeFilter:["style"] });
