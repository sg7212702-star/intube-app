import { App } from "@capacitor/app";

const BACK_KEYS = [
  "intubeProfile", "intubeCamera", "intubeChat", "intubeNotifications",
  "intubeStoryViewer", "instaproSettingsOverlay", "intubeReelViewer"
];

function hasIntubeHistoryEntry() {
  const state = history.state || {};
  return BACK_KEYS.some(key => state[key]) ||
    (typeof state.intubePage === "string" && state.intubePage !== "home");
}

function closeUntrackedOverlay() {
  const settings = document.getElementById("instaproSettingsPanel");
  if (settings?.classList.contains("open")) {
    settings.classList.remove("open");
    return true;
  }

  const comments = document.getElementById("commentsPanel");
  if (comments && getComputedStyle(comments).display !== "none" &&
      comments.getAttribute("aria-hidden") !== "true") {
    document.getElementById("closeCommentsBtn")?.click();
    if (getComputedStyle(comments).display !== "none") comments.style.display = "none";
    return true;
  }

  const createSheet = document.getElementById("createSheet");
  if (createSheet?.classList.contains("show")) {
    createSheet.classList.remove("show");
    createSheet.style.bottom = "-100%";
    for (const id of ["overlay", "sheetOverlay"]) {
      const el = document.getElementById(id);
      el?.classList.remove("show");
      if (el) el.style.display = "none";
    }
    return true;
  }

  const sideMenu = document.getElementById("sideMenu");
  if (sideMenu?.classList.contains("show")) {
    document.getElementById("closeMenu")?.click();
    sideMenu.classList.remove("show");
    const overlay = document.getElementById("sideOverlay");
    overlay?.classList.remove("show");
    if (overlay) overlay.style.display = "none";
    return true;
  }

  const notif = document.getElementById("notifFullPage");
  if (notif && getComputedStyle(notif).display !== "none") {
    document.getElementById("closeNotifBtn")?.click();
    if (getComputedStyle(notif).display !== "none") notif.style.display = "none";
    return true;
  }

  return false;
}

let handlingBack = false;
App.addListener("backButton", async () => {
  if (handlingBack) return;
  handlingBack = true;
  try {
    if (hasIntubeHistoryEntry()) {
      history.back();
      return;
    }
    if (closeUntrackedOverlay()) return;
    await App.exitApp();
  } catch (error) {
    console.error("Intube Android Back handling failed:", error);
    try { await App.exitApp(); } catch (_) {}
  } finally {
    setTimeout(() => { handlingBack = false; }, 250);
  }
}).catch(error => console.error("Could not register Android Back handler:", error));
