// ALL UI CONTROLLER
window.openSheet = () => {
  document.getElementById("createSheet")?.classList.add("show","active","open");
  document.getElementById("overlay")?.classList.add("show","active","open");
}
window.closeAll = () => {
  document.querySelectorAll("#createSheet, #overlay, #sideMenu, #sideOverlay, #createSheet2").forEach(e=>e.classList.remove("show","active","open"));
}
window.openMenu = () => {
  document.getElementById("sideMenu")?.classList.add("show","active","open");
  document.getElementById("sideOverlay")?.classList.add("show","active","open");
}

document.addEventListener("DOMContentLoaded",()=>{
  // Plus buttons
  ["createBtn","navCreateBtn","bottomPlus","plusBtn"].forEach(id=>{
    document.getElementById(id)?.addEventListener("click", window.openSheet);
  });
  // Overlay close
  ["overlay","sheetOverlay","sideOverlay"].forEach(id=>{
    document.getElementById(id)?.addEventListener("click", window.closeAll);
  });
  // Options
  document.getElementById("optPost")?.addEventListener("click", ()=>document.getElementById("postFile")?.click());
  document.getElementById("optStory")?.addEventListener("click", ()=>document.getElementById("storyFile")?.click());
  document.getElementById("optReel")?.addEventListener("click", ()=>document.getElementById("postFile")?.click());
});
console.log("APP.JS - Instagram UI ON ✅");
