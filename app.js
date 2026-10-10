// app.js - Sab button yahi se chalenge
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

document.addEventListener("DOMContentLoaded", ()=>{
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", openNotif);
  $("addBtn")?.addEventListener("click", openSheet);
  document.querySelector(".sRing.add")?.addEventListener("click", openSheet);
  
  ["closeMenu","overlay","sideOverlay","sheetOverlay","cancelSheet","notifOverlay","closeNotif"].forEach(id=>{
    $(id)?.addEventListener("click", closeAll);
  });

  document.querySelectorAll(".bBtn").forEach(b=>{
    b.addEventListener("click", ()=>{
      if(b.id==="addBtn") return;
      document.querySelectorAll(".bBtn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
    });
  });
});
