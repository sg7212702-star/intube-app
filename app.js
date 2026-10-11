// app.js - ALL BUTTON WORKING - FINAL FIX - NO OVERLAP
const $ = id => document.getElementById(id);

function closeAll(){
  const s=$("createSheet"); if(s){ s.classList.remove("show"); s.style.bottom="-100%"; }
  const ps=$("profileSheet"); if(ps){ ps.classList.remove("show","open"); ps.style.bottom="-100%"; }
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>{
    const e=$(id); if(e){ e.classList.remove("show"); e.style.display="none"; }
  });
  $("sideMenu")?.classList.remove("show");
  const nf=document.getElementById("notifFullPage"); if(nf) nf.style.display="none";
  document.body.style.overflow="auto";
}

function openSheet(){
  const s=$("createSheet"); if(!s) return;
  s.classList.add("show"); s.style.bottom="0";
  const ov=$("overlay"); if(ov){ ov.style.display="block"; ov.classList.add("show"); }
  const sov=$("sheetOverlay"); if(sov) sov.style.display="block";
}

function openMenu(){
  const m=$("sideMenu"); if(!m) return;
  m.classList.add("show");
  const sov=$("sideOverlay"); if(sov){ sov.style.display="block"; sov.classList.add("show"); }
}

function openPage(name){
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const home=document.getElementById("homePage");
  if(name==="home" && home){ home.style.display="block"; }
  const target=document.getElementById(name+"Page");
  if(target){ target.style.display="block"; }
  closeAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded",()=>{
  // TOP BUTTONS - FINAL
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", ()=>import("./notifications.js").then(m=>m.openNotif()));
  
  // CHAT BUTTON - Top right send icon
  const chatIcons = document.querySelectorAll(".iconGlass");
  if(chatIcons[1]) chatIcons[1].addEventListener("click", ()=>openPage("chat"));

  // OVERLAYS - Close on click
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>{
    $(id)?.addEventListener("click", closeAll);
  });
  $("closeMenu")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);

  // ADD BUTTONS - Story + Post
  $("addBtn")?.addEventListener("click", openSheet);
  $("addStoryBtn")?.addEventListener("click", openSheet);
  document.querySelector(".storyGlass")?.addEventListener("click", openSheet);

  // BOTTOM NAV - SEARCH + ALL FIX
  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.id==="addBtn") return; // + button ke liye alag hai
      document.querySelectorAll(".bBtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const v=btn.dataset.v;
      console.log("Nav Clicked:", v);
      if(v==="home") openPage("home");
      else if(v==="search") openPage("explore");
      else if(v==="reels") openPage("reels");
      else if(v==="profile") openPage("profile");
    });
  });

  openPage("home");
  console.log("✅ FINAL - All Buttons Fixed - No Overlap - No Billing");
});
