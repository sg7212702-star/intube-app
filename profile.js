// profile.js - INSTAGRAM PROFILE 100% REALTIME - POSTS + REELS + FOLLOW
import { auth, db } from "./firebase.js";
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null, viewingUid=null, isOwnProfile=true;

const $=id=>document.getElementById(id);

function setupProfileHTML(){
  const page=$("profilePage"); if(!page) return;
  page.innerHTML=`
  <div style="background:#000; min-height:100vh;">
    <div class="backBar"><div class="backBtn" onclick="goHome()">←</div><b id="profileUsernameTop">username</b><div style="margin-left:auto; display:flex; gap:16px; font-size:20px;"><span>🧵</span><span id="profileMenuBtn">☰</span></div></div>

    <div style="padding:14px 16px;">
      <div style="display:flex; gap:20px; align-items:center;">
        <div style="position:relative;">
          <div style="width:84px; height:84px; border-radius:50%; padding:3px; background:linear-gradient(45deg,#feda75,#d62976,#962fbf);"><img id="pAvatar" src="https://i.pravatar.cc/100" style="width:100%; height:100%; border-radius:50%; border:3px solid #000; object-fit:cover;"></div>
          <div id="addStoryPlus" style="position:absolute; bottom:0; right:0; width:22px; height:22px; border-radius:50%; background:#0095f6; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer;">+</div>
        </div>
        <div style="display:flex; flex:1; justify-content:space-around; text-align:center;">
          <div><b id="pPostsCount" style="display:block; font-size:16px;">0</b><span style="font-size:13px; opacity:.8;">posts</span></div>
          <div id="openFollowers" style="cursor:pointer;"><b id="pFollowersCount" style="display:block; font-size:16px;">0</b><span style="font-size:13px; opacity:.8;">followers</span></div>
          <div id="openFollowing" style="cursor:pointer;"><b id="pFollowingCount" style="display:block; font-size:16px;">0</b><span style="font-size:13px; opacity:.8;">following</span></div>
        </div>
      </div>

      <div style="margin-top:12px;">
        <b id="pName" style="font-size:14px; display:block;">Name</b>
        <div id="pBio" style="font-size:13px; white-space:pre-wrap; margin-top:2px; opacity:.9;">Bio loading...</div>
        <div id="pLink" style="font-size:13px; color:#e0f1ff; margin-top:4px;"></div>
      </div>

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button id="editProfileBtn" style="flex:1; padding:7px; border-radius:8px; border:0; background:rgba(255,255,255,.15); color:#fff; font-weight:600; font-size:14px;">Edit profile</button>
        <button id="followBtn" style="flex:1; padding:7px; border-radius:8px; border:0; background:#0095f6; color:#fff; font-weight:600; font-size:14px; display:none;">Follow</button>
        <button id="messageBtn" style="flex:1; padding:7px; border-radius:8px; border:0; background:rgba(255,255,255,.15); color:#fff; font-weight:600; font-size:14px; display:none;">Message</button>
        <button style="padding:7px 12px; border-radius:8px; border:0; background:rgba(255,255,255,.15); color:#fff;">♡</button>
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; overflow-x:auto;">
        <div style="text-align:center; min-width:60px;"><div style="width:60px; height:60px; border-radius:50%; border:1px solid rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size:24px;">+</div><div style="font-size:11px; margin-top:4px;">New</div></div>
        <div id="highlightsRow" style="display:flex; gap:10px;"></div>
      </div>
    </div>

    <div style="display:flex; border-top:1px solid rgba(255,255,255,.1); margin-top:10px;">
      <div class="tabBtn active" data-tab="posts" style="flex:1; text-align:center; padding:10px; border-top:1px solid #fff; opacity:1;">⊞</div>
      <div class="tabBtn" data-tab="reels" style="flex:1; text-align:center; padding:10px; opacity:.5;">▶️</div>
      <div class="tabBtn" data-tab="tagged" style="flex:1; text-align:center; padding:10px; opacity:.5;">👤</div>
    </div>

    <div id="postsGrid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1px; background:rgba(255,255,255,.1);"></div>
    <div id="reelsGrid" style="display:none; grid-template-columns:1fr 1fr 1fr; gap:1px; background:rgba(255,255,255,.1);"></div>
    <div id="taggedGrid" style="display:none; padding:40px; text-align:center; opacity:.5;">No tagged photos</div>
  </div>

  <!-- Followers List Sheet -->
  <div id="followListSheet" class="sheetGlass" style="display:none; max-height:80vh; overflow-y:auto;">
    <div class="handle"></div>
    <div style="display:flex; justify-content:center; gap:20px; padding:10px; border-bottom:1px solid rgba(255,255,255,.1);"><b id="followTabFollowers" style="border-bottom:1px solid #fff; padding-bottom:6px; cursor:pointer;">Followers</b><b id="followTabFollowing" style="opacity:.5; cursor:pointer;">Following</b></div>
    <div id="followList" style="padding:10px;"></div>
  </div>
  <div id="followOverlay" class="overlayGlass"></div>
  `;

  $("editProfileBtn")?.addEventListener("click", ()=>{ $("profileSheet").classList.add("show"); $("profileSheet").style.bottom="0"; $("profileOverlay").style.display="block"; $("profileOverlay").classList.add("show"); });
  $("followOverlay")?.addEventListener("click", closeFollow);
  $("profileOverlay")?.addEventListener("click", ()=>{ $("profileSheet").classList.remove("show"); $("profileSheet").style.bottom="-100%"; $("profileOverlay").classList.remove("show"); $("profileOverlay").style.display="none"; });

  document.querySelectorAll(".tabBtn").forEach(b=>b.addEventListener("click", ()=>{
    document.querySelectorAll(".tabBtn").forEach(x=>{x.classList.remove("active"); x.style.opacity=".5"; x.style.borderTop="0";});
    b.classList.add("active"); b.style.opacity="1"; b.style.borderTop="1px solid #fff";
    $("postsGrid").style.display=b.dataset.tab==="posts"?"grid":"none";
    $("reelsGrid").style.display=b.dataset.tab==="reels"?"grid":"none";
    $("taggedGrid").style.display=b.dataset.tab==="tagged"?"block":"none";
  }));

  $("openFollowers")?.addEventListener("click", ()=> openFollowList("followers"));
  $("openFollowing")?.addEventListener("click", ()=> openFollowList("following"));
  $("followTabFollowers")?.addEventListener("click", ()=> openFollowList("followers"));
  $("followTabFollowing")?.addEventListener("click", ()=> openFollowList("following"));
}

async function openFollowList(type){
  const list=$("followList"); const sheet=$("followListSheet");
  sheet.style.display="block"; sheet.classList.add("show"); sheet.style.bottom="0";
  $("followOverlay").style.display="block"; $("followOverlay").classList.add("show");
  list.innerHTML="Loading...";
  
  const userRef=doc(db,"users", viewingUid);
  const snap=await getDoc(userRef);
  if(!snap.exists()) return;
  const data=snap.data();
  const uids = type==="followers"? (data.followers||[]) : (data.following||[]);
  
  if(uids.length===0){ list.innerHTML=`<div style="text-align:center; opacity:.5; padding:20px;">No ${type} yet</div>`; return; }
  list.innerHTML="";
  for(const uid of uids){
    const uSnap=await getDoc(doc(db,"users", uid));
    if(!uSnap.exists()) continue;
    const u=uSnap.data();
    const row=document.createElement("div");
    row.style.cssText="display:flex; gap:10px; align-items:center; padding:8px;";
    row.innerHTML=`<img src="${u.photo||'https://i.pravatar.cc/100?u='+uid}" style="width:44px; height:44px; border-radius:50%;"><div style="flex:1;"><b style="font-size:13px;">${u.username}</b><div style="font-size:11px; opacity:.6;">${u.name||''}</div></div><button style="padding:6px 16px; border-radius:8px; border:0; background:rgba(255,255,255,.15); color:#fff; font-size:12px;">Remove</button>`;
    list.appendChild(row);
  }
}
function closeFollow(){ $("followListSheet").classList.remove("show"); $("followListSheet").style.bottom="-100%"; $("followOverlay").classList.remove("show"); $("followOverlay").style.display="none"; }

// Realtime Profile Loader
function loadProfileRealtime(uid){
  viewingUid=uid;
  const userRef=doc(db,"users", uid);
  
  // 1. User data realtime - Bio, Photo, Name, Followers sab realtime
  onSnapshot(userRef, (snap)=>{
    if(!snap.exists()) return;
    const u=snap.data();
    $("pAvatar").src=u.photo||`https://i.pravatar.cc/150?u=${uid}`;
    $("profileUsernameTop").textContent=u.username||"user";
    $("pName").textContent=u.name||"";
    $("pBio").textContent=u.bio||"";
    $("pLink").innerHTML=u.link? `<a href="${u.link}" target="_blank" style="color:#e0f1ff;">${u.link}</a>` : "";
    $("pFollowersCount").textContent=(u.followers?.length||0);
    $("pFollowingCount").textContent=(u.following?.length||0);

    // Edit sheet me bhi realtime fill
    if(isOwnProfile){
      const ep=$("editAvatarPreview"); if(ep) ep.src=u.photo||"";
      const en=$("editName"); if(en) en.value=u.name||"";
      const eu=$("editUsername"); if(eu) eu.value=u.username||"";
      const eb=$("editBio"); if(eb) eb.value=u.bio||"";
      const el=$("editLink"); if(el) el.value=u.link||"";
    }

    // Follow button logic
    if(!isOwnProfile && currentUser){
      const amIFollowing = (u.followers||[]).includes(currentUser.uid);
      const fb=$("followBtn"); const mb=$("messageBtn"); const eb=$("editProfileBtn");
      if(fb && mb &&
