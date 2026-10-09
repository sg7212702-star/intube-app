// FINAL APP.JS - BUTTON 100% WORKING
const openSheet = () => {
  const sheet = document.getElementById("createSheet");
  if(sheet){
    sheet.classList.add("show","open","active");
    sheet.style.bottom = "0";
    sheet.style.display = "block";
  }
  document.getElementById("overlay")?.classList.add("show");
  document.getElementById("sheetOverlay")?.classList.add("show");
  console.log("Sheet Opened ✅");
};

const closeAll = () => {
  document.getElementById("createSheet")?.classList.remove("show","open","active");
  document.getElementById("overlay")?.classList.remove("show");
  document.getElementById("sheetOverlay")?.classList.remove("show");
  document.getElementById("sideMenu")?.classList.remove("show");
  document.getElementById("sideOverlay")?.classList.remove("show");
};

const openMenu = () => {
  document.getElementById("sideMenu")?.classList.add("show");
  document.getElementById("sideOverlay")?.classList.add("show");
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addBtn")?.addEventListener("click", openSheet);
  document.getElementById("menuBtn")?.addEventListener("click", openMenu);
  document.getElementById("closeMenu")?.addEventListener("click", closeAll);
  document.getElementById("overlay")?.addEventListener("click", closeAll);
  document.getElementById("sideOverlay")?.addEventListener("click", closeAll);
  document.getElementById("sheetOverlay")?.addEventListener("click", closeAll);
  
  document.getElementById("optPost")?.addEventListener("click", () => {
    closeAll();
    document.getElementById("postFile")?.click();
  });
  document.getElementById("optStory")?.addEventListener("click", () => {
    closeAll();
    document.getElementById("storyFile")?.click();
  });
});

// Global ke liye bhi
window.openSheet = openSheet;
window.closeAll = closeAll;
