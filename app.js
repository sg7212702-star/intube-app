// APP.JS - SAB BUTTON KA DIMAG
console.log("app.js loaded ✅");

const addBtn = document.getElementById("addBtn");
const postFile = document.getElementById("postFile");
const createSheet = document.getElementById("createSheet");
const sideMenu = document.getElementById("sideMenu");
const menuBtn = document.getElementById("menuBtn");
const closeMenu = document.getElementById("closeMenu");

// PLUS BUTTON - Gallery Kholo
if (addBtn) {
  addBtn.addEventListener("click", () => {
    console.log("Plus clicked");
    if (postFile) postFile.click(); // Gallery khulegi
    if (createSheet) createSheet.classList.add("active");
  });
}

// MENU BUTTON
if (menuBtn && sideMenu) {
  menuBtn.addEventListener("click", () => {
    sideMenu.classList.add("active");
  });
}
if (closeMenu && sideMenu) {
  closeMenu.addEventListener("click", () => {
    sideMenu.classList.remove("active");
  });
}

// Bottom 5 Button Active
const navBtns = document.querySelectorAll(".nav-btn");
navBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    navBtns.forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
  });
});

console.log("All Buttons Working ✅");
