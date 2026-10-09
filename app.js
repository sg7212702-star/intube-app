// FINAL APP.JS - BUTTONconst $ = (id) => document.getElementById(id);
const openSheet = () => { $("createSheet").style.bottom = "0"; $("overlay")?.classList.add("show"); $("sheetOverlay")?.classList.add("show"); };
const closeAll = () => { $("createSheet").style.bottom = "-100%"; $("overlay")?.classList.remove("show"); $("sheetOverlay")?.classList.remove("show"); $("sideMenu")?.classList.remove("show"); $("sideOverlay")?.classList.remove("show"); };
const openMenu = () => { $("sideMenu")?.classList.add("show"); $("sideOverlay")?.classList.add("show"); };

document.addEventListener("click", (e)=>{
  const t = e.target.closest("#addBtn, #menuBtn, #closeMenu, #overlay, #sideOverlay, #sheetOverlay, #optPost, #optStory, #optReel, #optLive");
  if(!t) return;
  if(t.id==="addBtn") openSheet();
  if(t.id==="menuBtn") openMenu();
  if(t.id==="closeMenu" || t.id==="overlay" || t.id==="sideOverlay" || t.id==="sheetOverlay") closeAll();
  if(t.id==="optPost"){ closeAll(); $("postFile")?.click(); }
  if(t.id==="optStory"){ closeAll(); $("storyFile")?.click(); }
  if(t.id==="optReel"){ closeAll(); $("reelFile")?.click(); }
});
window.closeAll = closeAll; 100% WORKING
