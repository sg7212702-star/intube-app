// app.js - All Buttons + Page Navigation - FINAL
const $ = id => document.getElementById(id);

export function closeAll(){
  $("createSheet") && ( $("createSheet").classList.remove("show"), $("createSheet").style.bottom="-100%" );
  ["overlay","sheetOverlay","sideOverlay","notifOverlay"].forEach(i=>$(i)?.classList.remove("show"));
  $("sideMenu")?.classList.remove("show");
  $("notifBox")?.classList.remove("show");
}
function openSheet(){ const s=$("createSheet"); if(s){ s.classList.add("show"); s.style.bottom="0"; } $("overlay")?.classList.add("show"); $("sheetOverlay")?.classList.add("show"); }
function openMenu(){ $("sideMenu")?.classList.add("show"); $("sideOverlay")?.classList.add("show"); }
function openNotif(){ $("notifBox")?.classList.add("show"); $("notifOverlay")?.classList.add("show"); }

// ===== PAGE SWITCH SYSTEM =====
function openPage(page){
  // Saare pages chupao
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  // Jo manga hai wo dikhao
  const target = $(page+"Page");
  if(target){
    target.style.display="block";
  }else{
    // Agar alag HTML file hai toh
    if(page==="explore" && document.getElementById("explorePage")) document.getElementById("explorePage").style.display="block";
    else if(page==="reels" && document.getElementById("reelsPage")) document.getElementById("reelsPage").style.display="block";
    else if(page==="profile" && document.getElementById("profilePage")) document.getElementById("profilePage").style.display="block";
    else {
      // Default - home dikhao
      $("homePage") ? $("homePage").style.display="block" : null;
      if(page!=="home") alert(page+" Page - Jald hi ayega! Abhi home pe ho");
    }
  }
  window.scrollTo({top:0, behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded", ()=>{
  // Top Buttons
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", openNotif);
  $("sendBtn")?.addEventListener("click", ()=> openPage("chat"));

  // Close
  ["closeMenu","overlay","sideOverlay","sheetOverlay","cancelSheet","notifOverlay","closeNotif"].forEach(id=>{
    $(id)?.addEventListener("click", closeAll);
  });

  // Plus Buttons
  $("addBtn")?.addEventListener("click", openSheet);
  document.querySelector(".sRing.add")?.addEventListener("click", openSheet);
  document.querySelectorAll("#addStoryBtn").forEach(b=>b.addEventListener("click", openSheet));

  // Bottom 5 Buttons - YAHI MAIN FIX HAI
  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.id==="addBtn") return; // Plus ka alag kaam
      document.querySelectorAll(".bBtn").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");

      const page = btn.dataset.v; // home, explore, reels, profile, chat
      console.log("Open Page:", page);
      openPage(page);
    });
  });

  // Side Menu
  document.querySelectorAll(".mItem").forEach(m=>{
    m.addEventListener("click", ()=>{
      const txt = m.textContent || "";
      if(txt.includes("Dark")) document.body.classList.toggle("dark");
      else if(txt.includes("Profile")) openPage("profile");
      else if(txt.includes("Settings")) alert("Settings - Coming Soon");
      closeAll();
    });
  });

  // Default Home
  openPage("home");
  console.log("✅ Navigation Fixed");
});
