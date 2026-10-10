// app.js - InstaPro CLEAN REAL SYSTEM - 0 to Real Time
import { db } from "./firebase.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

// CLOSE ALL SHEETS
function closeAll(){
  const sheet=$("createSheet"); if(sheet){ sheet.classList.remove("show"); sheet.style.bottom="-100%"; }
  const pSheet=$("profileSheet"); if(pSheet){ pSheet.classList.remove("show"); pSheet.classList.remove("open"); pSheet.style.bottom="-100%"; }
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>{ const e=$(id); if(e){ e.classList.remove("show"); e.style.display="none"; }});
  $("sideMenu")?.classList.remove("show");
  const nb=$("notifBox"); if(nb) nb.style.transform="translateX(120%)";
  const no=$("notifOverlay"); if(no){ no.classList.remove("show"); no.style.display="none"; }
}

function openSheet(){
  const s=$("createSheet"); if(!s) return;
  s.classList.add("show"); s.style.bottom="0";
  $("overlay") && ( $("overlay").style.display="block", $("overlay").classList.add("show") );
  $("sheetOverlay") && ( $("sheetOverlay").style.display="block", $("sheetOverlay").classList.add("show") );
}
function openMenu(){
  const m=$("sideMenu"); if(!m) return;
  m.classList.add("show");
  $("sideOverlay") && ( $("sideOverlay").style.display="block", $("sideOverlay").classList.add("show") );
}
function openProfileSheet(){
  const p=$("profileSheet"); if(!p) return;
  p.classList.add("show"); p.classList.add("open"); p.style.bottom="0";
  $("overlay") && ( $("overlay").style.display="block", $("overlay").classList.add("show") );
  $("profileOverlay") && ( $("profileOverlay").style.display="block", $("profileOverlay").classList.add("show") );
}
function openNotifBox(){
  let box=$("notifBox");
  if(!box){
    box=document.createElement("div");
    box.id="notifBox";
    box.innerHTML=`<div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.25)"><b>Notifications</b><span id="closeNotif" style="cursor:pointer">✕</span></div><div id="notifList" style="padding:10px"><div style="text-align:center;opacity:.6;padding:20px">No notifications yet</div></div>`;
    box.style.cssText="position:fixed;top:70px;right:12px;width:330px;max-height:65vh;background:rgba(18,18,20,0.96);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.15);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);z-index:9999;transform:translateX(120%);transition:.35s;overflow:hidden";
    document.body.appendChild(box);
    box.querySelector("#closeNotif")?.addEventListener("click", closeAll);
  }
  box.style.transform="translateX(0)";
  let ov=$("notifOverlay");
  if(!ov){
    ov=document.createElement("div"); ov.id="notifOverlay"; ov.className="overlayGlass";
    ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9998;display:none";
    document.body.appendChild(ov);
    ov.addEventListener("click", closeAll);
  }
  ov.style.display="block"; ov.classList.add("show");
}

function ensurePages(){
  if($("homePage")) return;
  const story=document.querySelector(".storyGlass")?.parentElement;
  const feed=$("feed");
  if(story && feed){
    const home=document.createElement("div"); home.id="homePage"; home.className="page";
    story.parentNode.insertBefore(home, story);
    home.appendChild(story); home.appendChild(feed);
  }
  ["explore","reels","profile","chat"].forEach(name=>{
    if($(name+"Page")) return;
    const div=document.createElement("div"); div.id=name+"Page"; div.className="page"; div.style.display="none"; div.style.paddingTop="70px"; div.style.minHeight="100vh";
    div.innerHTML = name==="profile"? `<div style="text-align:center;padding:40px 20px"><div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);margin:0 auto 16px"></div><h2>New User</h2><p style="opacity:.6">0 posts • 0 followers • 0 following</p><p style="margin-top:20px;opacity:.5">Share your first photo to start</p></div>` : `<div style="text-align:center;padding:80px 20px;opacity:.6"><h3>${name.toUpperCase()}</h3><p>No ${name} yet - Be first to create!</p></div>`;
    document.querySelector(".app")?.appendChild(div);
  });
}
function openPage(name){
  ensurePages();
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const target=$(name+"Page") || $("homePage");
  if(target) target.style.display="block";
  closeAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

function compress(file){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement("canvas"); let w=img.width,h=img.height,M=800;
        if(w>h){ if(w>M){h*=M/w;w=M} } else { if(h>M){w*=M/h;h=M} }
        c.width=w;c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
        res(c.toDataURL("image/jpeg",0.75));
      }; img.src=e.target.result;
    }; r.readAsDataURL(file);
  });
}

// REAL TIME FEED - NO FAKE DATA
function loadRealFeed(){
  const feed=$("feed");
  if(!feed) return;
  const q=query(collection(db,"posts"), orderBy("createdAt","desc"));
  onSnapshot(q, (snap)=>{
    if(snap.empty){
      feed.innerHTML=`<div style="text-align:center;padding:60px 20px;opacity:.6"><div style="font-size:50px">📸</div><h3 style="margin:10px 0">No Posts Yet</h3><p>When you share photos, they'll appear here<br>Be the first to post!</p></div>`;
      return;
    }
    feed.innerHTML="";
    snap.forEach(d=>{
      const p=d.data();
      const div=document.createElement("div");
      div.style.cssText="background:rgba(18,18,20,0.96);border:1px solid rgba(255,255,255,.1);border-radius:16px;margin:12px;overflow:hidden";
      div.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:12px"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(45deg,#feda75,#d62976)"></div><b>user</b></div><img src="${p.url}" style="width:100%;display:block"><div style="padding:12px;display:flex;gap:14px">❤️ 💬 ✈️</div>`;
      feed.appendChild(div);
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  ensurePages();
  loadRealFeed();

  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", openNotifBox);
  document.querySelectorAll(".iconGlass")[1]?.addEventListener("click", ()=>openPage("chat"));

  $("closeMenu")?.addEventListener("click", closeAll);
  $("overlay")?.addEventListener("click", closeAll);
  $("sideOverlay")?.addEventListener("click", closeAll);
  $("sheetOverlay")?.addEventListener("click", closeAll);
  $("profileOverlay")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);

  $("addBtn")?.addEventListener("click", openSheet);
  $("addStoryBtn")?.addEventListener("click", openSheet);
  // Profile button - Bottom bar wala
  document.querySelectorAll(".bBtn").forEach(btn=>{
    if(btn.dataset.v==="profile"){
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        openPage("profile");
        // 2nd click pe sheet kholega
        if(btn.classList.contains("active")){
          openProfileSheet();
        }
      });
    }
  });
  // Top avatar click
  $("profileBtn")?.addEventListener("click", openProfileSheet);
  document.querySelector(".avatarBtn")?.addEventListener("click", openProfileSheet);

  $("optPost")?.addEventListener("click", ()=>$("postFile")?.click());
  $("optStory")?.addEventListener("click", ()=>$("storyFile")?.click());
  $("optReel")?.addEventListener("click", ()=>alert("Reels - Cloudinary connect karo"));

  $("postFile")?.addEventListener("change", async e=>{
    const f=e.target.files[0]; if(!f) return;
    closeAll();
    const url=await compress(f);
    await addDoc(collection(db,"posts"),{url,likes:0,createdAt:serverTimestamp()});
    alert("✅ Posted! Real time feed me aa gaya!");
  });
  $("storyFile")?.addEventListener("change", async e=>{
    const f=e.target.files[0]; if(!f) return;
    closeAll();
    const url=await compress(f);
    await addDoc(collection(db,"stories"),{url,createdAt:serverTimestamp()});
    alert("✅ Story Added!");
  });

  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.id==="addBtn") return;
      document.querySelectorAll(".bBtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const v=btn.dataset.v;
      if(v==="home") openPage("home");
      else if(v==="search") openPage("explore");
      else if(v==="reels") openPage("reels");
      else if(v==="profile") openPage("profile");
    });
  });

  document.querySelectorAll(".mItem").forEach(m=>{
    m.addEventListener("click", ()=>{
      const t=m.textContent||"";
      if(t.includes("Dark")) document.body.classList.toggle("dark");
      else if(t.includes("Profile")) openPage("profile");
      closeAll();
    });
  });

  openPage("home");
  console.log("✅ CLEAN REAL SYSTEM - 0 to Real Time");
});
