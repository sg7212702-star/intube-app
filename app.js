// FINAL APP.JS - 100% WORKING - REAL SYSTEM
const $ = (id) => document.getElementById(id);

const openSheet = () => { 
  const s = $("createSheet");
  if(s){ s.classList.add("show"); s.style.bottom = "0"; }
  $("overlay")?.classList.add("show"); 
  $("sheetOverlay")?.classList.add("show"); 
};

const closeAll = () => { 
  const s = $("createSheet");
  if(s){ s.classList.remove("show"); s.style.bottom = "-100%"; }
  $("overlay")?.classList.remove("show"); 
  $("sheetOverlay")?.classList.remove("show"); 
  $("sideMenu")?.classList.remove("show"); 
  $("sideOverlay")?.classList.remove("show"); 
};

const openMenu = () => { 
  $("sideMenu")?.classList.add("show"); 
  $("sideOverlay")?.classList.add("show"); 
};

document.addEventListener("click", (e)=>{
  const t = e.target.closest("#addBtn, #menuBtn, #closeMenu, #overlay, #sideOverlay, #sheetOverlay, #optPost, #optStory, #optReel, #cancelSheet, #addStoryBtn");
  if(!t) return;
  if(t.id==="addBtn" || t.id==="addStoryBtn") openSheet();
  if(t.id==="menuBtn") openMenu();
  if(["closeMenu","overlay","sideOverlay","sheetOverlay","cancelSheet"].includes(t.id)) closeAll();
  if(t.id==="optPost"){ closeAll(); $("postFile")?.click(); }
  if(t.id==="optStory"){ closeAll(); $("storyFile")?.click(); }
  if(t.id==="optReel"){ closeAll(); $("reelFile")?.click(); }
});

window.closeAll = closeAll;
console.log("App.js Ready - Real System Active ✅");
