// app.js - ONLY BUTTON CONTROLLER
const $ = id => document.getElementById(id);

export function closeAll(){
  ["createSheet","profileSheet"].forEach(id=>{
    const e=$(id); if(e){ e.classList.remove("show","open"); e.style.bottom="-100%"; }
  });
  ["overlay","sideOverlay","sheetOverlay","profileOverlay","notifOverlay"].forEach(id=>{
    const e=$(id); if(e){ e.classList.remove("show"); e.style.display="none"; }
  });
  $("sideMenu")?.classList.remove("show");
  const nb=$("notifBox"); if(nb) nb.style.transform="translateX(120%)";
}
export function openSheet(){ const s=$("createSheet"); s.classList.add("show"); s.style.bottom="0"; $("overlay").style.display="block"; $("overlay").classList.add("show"); $("sheetOverlay").style.display="block"; }
export function openMenu(){ $("sideMenu").classList.add("show"); $("sideOverlay").style.display="block"; $("sideOverlay").classList.add("show"); }
export function openProfileSheet(){ const p=$("profileSheet"); p.classList.add("show","open"); p.style.bottom="0"; $("overlay").style.display="block"; $("overlay").classList.add("show"); }
export function openPage(name){
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const t=$(name+"Page") || $("homePage"); if(t) t.style.display="block";
  closeAll(); window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", ()=>import("./notif.js").then(m=>m.openNotif()));
  $("addBtn")?.addEventListener("click", openSheet);
  $("addStoryBtn")?.addEventListener("click", openSheet);
  document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click", ()=>openPage("home")));
  $("closeMenu")?.addEventListener("click", closeAll);
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>$(id)?.addEventListener("click", closeAll));
  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".bBtn").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      const v=btn.dataset.v; if(v) openPage(v==="search"?"explore":v);
    });
  });
});
