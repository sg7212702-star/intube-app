// app.js - ALL BUTTON WORKING - NO INDEX REPLACE
const $ = id => document.getElementById(id);
function closeAll(){
  const s=$("createSheet"); if(s){ s.classList.remove("show"); s.style.bottom="-100%"; }
  const ps=$("profileSheet"); if(ps){ ps.classList.remove("show","open"); ps.style.bottom="-100%"; }
  ["overlay","sideOverlay","sheetOverlay","profileOverlay","notifOverlay"].forEach(id=>{ const e=$(id); if(e){ e.classList.remove("show"); e.style.display="none"; }});
  $("sideMenu")?.classList.remove("show");
  const nb=$("notifBox"); if(nb) nb.style.transform="translateX(120%)";
}
function openSheet(){ const s=$("createSheet"); if(!s) return; s.classList.add("show"); s.style.bottom="0"; $("overlay")&&( $("overlay").style.display="block", $("overlay").classList.add("show")); $("sheetOverlay")&&( $("sheetOverlay").style.display="block"); }
function openMenu(){ const m=$("sideMenu"); if(!m) return; m.classList.add("show"); $("sideOverlay")&&( $("sideOverlay").style.display="block", $("sideOverlay").classList.add("show")); }
function openPage(name){
  // Agar page nahi hai to bana do
  if(!$(name+"Page") && name!=="home"){
    const div=document.createElement("div"); div.id=name+"Page"; div.className="page"; div.style.display="none"; div.style.paddingTop="60px"; div.style.minHeight="100vh"; div.style.paddingBottom="90px";
    document.querySelector(".app")?.appendChild(div);
  }
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const home=$("homePage")||document.querySelector(".storyGlass")?.parentElement?.parentElement || document.getElementById("feed")?.parentElement;
  if(name==="home" && home){ home.style.display="block"; if($("feed")) $("feed").style.display="block"; }
  const target=$(name+"Page"); if(target) target.style.display="block";
  closeAll(); window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded",()=>{
  // Top buttons
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", ()=>import("./notifications.js").then(m=>m.openNotif()));
  document.querySelectorAll(".iconGlass")[1]?.addEventListener("click", ()=>openPage("chat"));
  document.querySelector('[data-lucide="send"]')?.parentElement?.addEventListener("click", ()=>openPage("chat"));

  // Overlays
  ["overlay","sideOverlay","sheetOverlay","profileOverlay","notifOverlay"].forEach(id=>$(id)?.addEventListener("click", closeAll));
  $("closeMenu")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);
  $("closeNotif")?.addEventListener("click", closeAll);

  // Add buttons
  $("addBtn")?.addEventListener("click", openSheet);
  $("addStoryBtn")?.addEventListener("click", openSheet);
  document.querySelector(".storyGlass")?.addEventListener("click", openSheet);

  // BOTTOM NAV - SEARCH FIX - Yeh main fix hai
  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.id==="addBtn") return;
      document.querySelectorAll(".bBtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const v=btn.dataset.v;
      console.log("Clicked:",v);
      if(v==="home") openPage("home");
      else if(v==="search") openPage("explore");
      else if(v==="reels") openPage("reels");
      else if(v==="profile") openPage("profile");
    });
  });

  openPage("home");
  console.log("✅ All Buttons Fixed - No Index Replace");
});
