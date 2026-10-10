// app.js - InstaPro Premium - All Buttons Fixed - Design Safe
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

function closeAll(){
  const sheet=$("createSheet"); if(sheet){ sheet.classList.remove("show"); sheet.style.bottom="-100%"; }
  ["overlay","sideOverlay","sheetOverlay"].forEach(id=>{ const e=$(id); if(e) e.classList.remove("show"); e.style.display="none"; });
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
function openNotifBox(){
  let box=$("notifBox");
  if(!box){
    // Agar HTML me box nahi hai to JS se banao - Design kharab nahi hoga
    box=document.createElement("div");
    box.id="notifBox";
    box.innerHTML=`<div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.25)"><b>Notifications</b><span id="closeNotif" style="cursor:pointer">✕</span></div><div id="notifList" style="padding:10px"><div style="text-align:center;opacity:.6;padding:20px">No notifications yet</div></div>`;
    box.style.cssText="position:fixed;top:70px;right:12px;width:330px;max-height:65vh;background:rgba(255,255,255,0.18);backdrop-filter:blur(22px) saturate(180%);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,0.35);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);z-index:9999;transform:translateX(120%);transition:.35s;overflow:hidden";
    document.body.appendChild(box);
    box.querySelector("#closeNotif")?.addEventListener("click", closeAll);
  }
  box.style.transform="translateX(0)";
  let ov=$("notifOverlay");
  if(!ov){
    ov=document.createElement("div"); ov.id="notifOverlay"; ov.className="overlayGlass";
    ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.15);z-index:9998;display:none";
    document.body.appendChild(ov);
    ov.addEventListener("click", closeAll);
  }
  ov.style.display="block"; ov.classList.add("show");
}

// PAGE SWITCH - Bina HTML bigade
function ensurePages(){
  if($("homePage")) return;
  const story=$(".storyGlass") || document.querySelector(".storyGlass");
  const feed=$("feed");
  if(story && feed){
    const home=document.createElement("div"); home.id="homePage"; home.className="page";
    story.parentNode.insertBefore(home, story);
    home.appendChild(story); home.appendChild(feed);
  }
  ["explore","reels","profile","chat"].forEach(name=>{
    if($(name+"Page")) return;
    const div=document.createElement("div"); div.id=name+"Page"; div.className="page"; div.style.display="none";
    div.innerHTML=`<div style="padding:70px 15px 80px 15px"><h3 style="margin:0 0 10px 0">${name.charAt(0).toUpperCase()+name.slice(1)}</h3><p style="opacity:.6">This is ${name} page - Coming soon</p></div>`;
    document.querySelector(".app")?.appendChild(div);
  });
}
function openPage(name){
  ensurePages();
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const target=$(name+"Page") || $("homePage");
  if(target) target.style.display="block";
  window.scrollTo({top:0,behavior:"smooth"});
}

// ===== UPLOAD BINA STORAGE KE =====
function compress(file){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement("canvas"); let w=img.width,h=img.height,M=700;
        if(w>h){ if(w>M){h*=M/w;w=M} } else { if(h>M){w*=M/h;h=M} }
        c.width=w;c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
        res(c.toDataURL("image/jpeg",0.75));
      }; img.src=e.target.result;
    }; r.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  ensurePages();

  // Top
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", openNotifBox);
  document.querySelectorAll(".iconGlass")[1]?.addEventListener("click", ()=>openPage("chat"));

  // Close
  $("closeMenu")?.addEventListener("click", closeAll);
  $("overlay")?.addEventListener("click", closeAll);
  $("sideOverlay")?.addEventListener("click", closeAll);
  $("sheetOverlay")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);

  // Plus - 3 jagah
  $("addBtn")?.addEventListener("click", openSheet);
  $("addStoryBtn")?.addEventListener("click", openSheet);

  // Sheet options
  $("optPost")?.addEventListener("click", ()=>$("postFile")?.click());
  $("optStory")?.addEventListener("click", ()=>$("storyFile")?.click());
  $("optReel")?.addEventListener("click", ()=>alert("Reel - Cloudinary jodna padega"));

  // File upload
  $("postFile")?.addEventListener("change", async e=>{
    const f=e.target.files[0]; if(!f) return;
    closeAll();
    const url=await compress(f);
    await addDoc(collection(db,"posts"),{url,likes:0,createdAt:serverTimestamp()});
    alert("✅ Posted!");
  });
  $("storyFile")?.addEventListener("change", async e=>{
    const f=e.target.files[0]; if(!f) return;
    closeAll();
    const url=await compress(f);
    await addDoc(collection(db,"stories"),{url,createdAt:serverTimestamp()});
    alert("✅ Story Added!");
  });

  // Bottom Nav - MAIN FIX
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

  // Side menu
  document.querySelectorAll(".mItem").forEach(m=>{
    m.addEventListener("click", ()=>{
      const t=m.textContent||"";
      if(t.includes("Dark")) document.body.classList.toggle("dark");
      else if(t.includes("Profile")) openPage("profile");
      closeAll();
    });
  });

  openPage("home");
  console.log("✅ All Buttons Fixed - Design Safe");
});
