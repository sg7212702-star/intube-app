// APP.JS - FINAL FIXED 100%
console.log("app.js loaded ✅");

function closeAll(){
  document.getElementById("createSheet")?.classList.remove("active","open");
  document.getElementById("sideMenu")?.classList.remove("active","open");
  document.getElementById("overlay")?.classList.remove("active","open");
  const ov = document.getElementById("overlay");
  if(ov) ov.style.display = "none";
}
window.closeAll = closeAll; // HTML ke onclick ke liye zaruri

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addBtn");
  const postFile = document.getElementById("postFile");
  const createSheet = document.getElementById("createSheet");
  const sideMenu = document.getElementById("sideMenu");
  const menuBtn = document.getElementById("menuBtn");
  const closeMenu = document.getElementById("closeMenu");
  const overlay = document.getElementById("overlay");
  const optPost = document.getElementById("optPost");

  // PLUS BUTTON -> Gallery + Sheet
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      console.log("Plus clicked");
      if (createSheet) {
        createSheet.classList.add("active");
        if(overlay){ overlay.style.display="block"; overlay.classList.add("active"); }
      }
    });
  }

  // Sheet me Post dabao to Gallery kholo
  if (optPost && postFile) {
    optPost.addEventListener("click", () => {
      closeAll();
      postFile.click();
    });
  }

  // MENU OPEN
  if (menuBtn && sideMenu) {
    menuBtn.addEventListener("click", () => {
      sideMenu.classList.add("active","open");
      if(overlay){ overlay.style.display="block"; overlay.classList.add("active"); }
    });
  }
  // MENU CLOSE
  if (closeMenu) closeMenu.addEventListener("click", closeAll);
  if (overlay) overlay.addEventListener("click", closeAll);

  // Bottom 5 Buttons - aapka class bBtn hai
  const navBtns = document.querySelectorAll(".bBtn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      navBtns.forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });
  });

  console.log("✅ All Buttons Fixed");
});
