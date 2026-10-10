// profile.js - InstaPro Ultimate Instagram Glass Profile System
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(()=>{

    let page = document.getElementById("profilePage");
    if(!page){
      page=document.createElement("div"); page.id="profilePage"; page.className="page"; page.style.display="none";
      document.querySelector(".app")?.appendChild(page);
    }

    page.innerHTML=`
      <style>
        .glass{ background:rgba(255,255,255,0.14); backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,0.24); }
        .glassBtn{ background:rgba(255,255,255,0.14); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.22); border-radius:12px; padding:10px; color:#fff; font-weight:600; cursor:pointer; transition:.2s; }
        .glassBtn:active{ transform:scale(0.96); }
        .sheet{ position:fixed; left:0; right:0; bottom:-100%; background:rgba(20,20,20,0.85); backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px); border-top:1px solid rgba(255,255,255,0.2); border-radius:28px 28px 0 0; z-index:200; transition:bottom .4s cubic-bezier(.32,.72,0,1); max-height:85vh; overflow:auto; }
        .sheet.show{ bottom:0; }
        .overlay{ position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(6px); z-index:199; display:none; }
        .overlay.show{ display:block; }
        .inputGlass{ width:100%; padding:14px 16px; border-radius:14px; background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18); color:#fff; outline:none; font-size:14px; backdrop-filter:blur(10px); }
        .inputGlass::placeholder{ color:rgba(255,255,255,.5); }
      </style>

      <div style="background:#000; min-height:100vh; padding-bottom:90px; color:#fff;">
        <!-- Top -->
        <div style="position:sticky; top:0; z-index:20; background:rgba(0,0,0,.78); backdrop-filter:blur(22px); display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:flex; align-items:center; gap:6px;"><b id="topUsername" style="font-size:19px;">sg7212</b> ▼ <span style="background:#ff3040; font-size:10px; padding:3px 7px; border-radius:12px; margin-left:6px;">9+</span></div>
          <div style="display:flex; gap:10px;">
            <div id="createBtn" class="glass" style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">⊕</div>
            <div id="menuBtnP" class="glass" style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">☰</div>
          </div>
        </div>

        <!-- Info -->
        <div style="display:flex; padding:18px 16px 10px; gap:18px; align-items:center;">
          <div style="position:relative;"><img id="avatarImg" src="https://i.pravatar.cc/150?img=32" style="width:86px;height:86px;border-radius:50%;border:2px solid rgba(255,255,255,.15);"><div id="changeAvatar" style="position:absolute; bottom:0; right:0; width:26px;height:26px; background:linear-gradient(135deg,#ff6a8a,#8a6cff); border-radius:50%; border:3px solid #000; display:flex;align-items:center;justify-content:center; cursor:pointer;">+</div></div>
          <div style="flex:1; display:flex; text-align:center;"><div style="flex:1"><b id="countPosts" style="display:block;font-size:17px">0</b><span style="font-size:13px;color:#a8a8a8">posts</span></div><div id="openFollowers" style="flex:1;cursor:pointer"><b style="display:block;font-size:17px">1,248</b><span style="font-size:13px;color:#a8a8a8">followers</span></div><div id="openFollowing" style="flex:1;cursor:pointer"><b style="display:block;font-size:17px">420</b><span style="font-size:13px;color:#a8a8a8">following</span></div></div>
        </div>

        <div style="padding:0 16px 12px;">
          <b id="displayName" style="font-size:14px;">Sourabh Gaur</b>
          <div id="displayBio" style="font-size:14px; line-height:1.35; color:rgba(255,255,255,.85); margin-top:2px;">🚀 Building InstaPro Premium<br>💻 Developer • Jabalpur, MP<br>Building with Firebase 🔥</div>
          <div id="displayLink" style="color:#8ab4f8; font-size:14px; margin-top:4px;">github.com/sg7212</div>
        </div>

        <div style="display:flex; gap:8px; padding:0 16px 16px;">
          <div id="editProfileBtn" class="glassBtn" style="flex:1;text-align:center;">Edit profile</div>
          <div id="shareProfileBtn" class="glassBtn" style="flex:1;text-align:center;">Share profile</div>
          <div id="discoverBtn" class="glass" style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;">👤</div>
        </div>

        <!-- Highlights Glass -->
        <div style="display:flex; gap:14px; padding:0 16px 16px; overflow:auto;">
          <div style="text-align:center"><div class="glass" style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer">+</div><div style="font-size:11px;margin-top:6px;opacity:.7">New</div></div>
          <div style="text-align:center"><img src="https://picsum.photos/80?random=11" style="width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.2);padding:2px"><div style="font-size:11px;margin-top:6px">Travel ✈️</div></div>
          <div style="text-align:center"><img src="https://picsum.photos/80?random=12" style="width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.2);padding:2px"><div style="font-size:11px;margin-top:6px">Code 💻</div></div>
        </div>

        <div style="display:flex; border-top:1px solid rgba(255,255,255,.12);">
          <div class="tabBtn active" data-tab="posts" style="flex:1;text-align:center;padding:12px;border-top:1px solid #fff;cursor:pointer">⊞</div>
          <div class="tabBtn" data-tab="reels" style="flex:1;text-align:center;padding:12px;opacity:.5;cursor:pointer">▶️</div>
          <div class="tabBtn" data-tab="tagged" style="flex:1;text-align:center;padding:12px;opacity:.5;cursor:pointer">👤</div>
        </div>

        <div id="grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:2px;"></div>
      </div>

      <!-- Overlay -->
      <div id="pOverlay" class="overlay"></div>

      <!-- EDIT PROFILE SHEET - Glass Premium Instagram -->
      <div id="editSheet" class="sheet">
        <div style="padding:18px 18px 90px 18px;">
          <div style="width:44px;height:5px;background:rgba(255,255,255,.3);border-radius:10px;margin:0 auto 18px;"></div>
          <div style="display:flex; justify-content:space-between; align-items:center;"><b style="font-size:18px;">Edit profile</b><div id="closeEdit" class="glass" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</div></div>
          
          <div style="text-align:center; margin:18px 0;"><img id="editAvatarPreview" src="https://i.pravatar.cc/150?img=32" style="width:90px;height:90px;border-radius:50%"><div id="editPhotoBtn" style="color:#8ab4f8; margin-top:8px; font-weight:600; cursor:pointer; font-size:14px;">Edit picture or avatar</div></div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div><label style="font-size:12px; color:rgba(255,255,255,.6)">Name</label><input id="inpName" class="inputGlass" value="Sourabh Gaur"></div>
            <div><label style="font-size:12px; color:rgba(255,255,255,.6)">Username</label><input id="inpUser" class="inputGlass" value="sg7212"></div>
            <div><label style="font-size:12px; color:rgba(255,255,255,.6)">Bio</label><textarea id="inpBio" class="inputGlass" rows="3">🚀 Building InstaPro Premium
💻 Developer • Jabalpur, MP</textarea></div>
            <div><label style="font-size:12px; color:rgba(255,255,255,.6)">Links</label><input id="inpLink" class="inputGlass" value="github.com/sg7212"><div id="addLink" class="glassBtn" style="margin-top:8px; text-align:center; background:rgba(255,255,255,.08)">+ Add link</div></div>
            <div><label style="font-size:12px; color:rgba(255,255,255,.6)">Gender</label><div
