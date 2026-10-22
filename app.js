// app.js - ALL BUTTON WORKING - FINAL FIX - NO OVERLAP
const $ = id => document.getElementById(id);

// Load the standalone Music Library without changing index.html or style.css.
import("./music.js").catch(error => console.error("Music Library failed to load:", error));

// Keep the Home screen focused on the feed; do not inject the suggested-people panel on startup.

// Keep every video in InstaPro at its original 1x playback speed.
// This also applies to videos inserted later by Feed, Reels, Explore and Profile.
function setInstaProNormalVideoSpeed(event) {
  const video = event.target;
  if (!(video instanceof HTMLVideoElement)) return;

  try {
    video.defaultPlaybackRate = 1;
    video.playbackRate = 1;
  } catch (error) {
    console.warn("Could not normalize video playback speed:", error);
  }
}

document.addEventListener("loadedmetadata", setInstaProNormalVideoSpeed, true);
document.addEventListener("play", setInstaProNormalVideoSpeed, true);

// Shared transparent-glass layer for all InstaPro pages and in-app sheets.
function installGlobalGlassStyles() {
  if (document.getElementById("instapro-global-glass-style")) return;
  const style = document.createElement("style");
  style.id = "instapro-global-glass-style";
  style.textContent = `
    :root{--ip-glass-bg:rgba(18,20,30,.36);--ip-glass-border:rgba(255,255,255,.17);--ip-glass-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 10px 32px rgba(0,0,0,.14)}
    .topGlass,.bottomGlass,.sideGlass,.sheetGlass,#sideMenu,#createSheet,#profileSheet,#overlay,#sideOverlay,#sheetOverlay,#profileOverlay{background:rgba(12,14,22,.38)!important;backdrop-filter:blur(24px) saturate(165%)!important;-webkit-backdrop-filter:blur(24px) saturate(165%)!important;border-color:var(--ip-glass-border)!important}
    .page{background:transparent}
    .page [class*="card"],.page [class*="Card"],.page [class*="panel"],.page [class*="Panel"],.page [class*="modal"],.page [class*="Modal"],.page [class*="sheet"],.page [class*="Sheet"],.page [class*="glass"],.page [class*="Glass"]{background-color:var(--ip-glass-bg);border-color:var(--ip-glass-border);backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);box-shadow:var(--ip-glass-shadow)}
    #createSheet,#profileSheet,#sideMenu{border:1px solid var(--ip-glass-border)!important;box-shadow:0 18px 48px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.12)!important}
    #createSheet button,#profileSheet button,#sideMenu button,.page button:not([data-no-glass]){transition:background .18s ease,border-color .18s ease,transform .18s ease}
    #createSheet button,#profileSheet button,#sideMenu button{border-color:rgba(255,255,255,.18)}
    #createSheet button:active,#profileSheet button:active,#sideMenu button:active,.page button:not([data-no-glass]):active{transform:scale(.98)}
    #instaproSettingsPanel{background:rgba(0,0,0,.34)!important;backdrop-filter:blur(20px) saturate(150%)!important;-webkit-backdrop-filter:blur(20px) saturate(150%)!important}
    #instaproSettingsPanel .isp-card{background:rgba(20,22,31,.62)!important;border:1px solid rgba(255,255,255,.2)!important;backdrop-filter:blur(28px) saturate(170%)!important;-webkit-backdrop-filter:blur(28px) saturate(170%)!important;box-shadow:0 18px 55px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.14)!important}
    body.instapro-light-mode .topGlass,body.instapro-light-mode .bottomGlass,body.instapro-light-mode .sideGlass,body.instapro-light-mode .sheetGlass{background:rgba(250,250,252,.62)!important;backdrop-filter:blur(24px) saturate(150%)!important;-webkit-backdrop-filter:blur(24px) saturate(150%)!important}
    @media(prefers-reduced-motion:reduce){#createSheet button,#profileSheet button,#sideMenu button,.page button{transition:none!important}}
  `;
  document.head.appendChild(style);
}

function closeAll(){
  const s=$("createSheet"); if(s){ s.classList.remove("show"); s.style.bottom="-100%"; }
  const ps=$("profileSheet"); if(ps){ ps.classList.remove("show","open"); ps.style.bottom="-100%"; }
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>{
    const e=$(id); if(e){ e.classList.remove("show"); e.style.display="none"; }
  });
  $("sideMenu")?.classList.remove("show");
  const nf=document.getElementById("notifFullPage"); if(nf) nf.style.display="none";
  document.body.style.overflow="auto";
}

function openSheet(){
  const s=$("createSheet"); if(!s) return;
  s.classList.add("show"); s.style.setProperty("position","fixed","important"); s.style.setProperty("left","12px","important"); s.style.setProperty("right","12px","important"); s.style.setProperty("width","auto","important"); s.style.setProperty("max-width","none","important"); s.style.setProperty("transform","none","important"); s.style.setProperty("box-sizing","border-box","important"); s.style.setProperty("bottom","calc(78px + env(safe-area-inset-bottom))","important"); s.style.setProperty("z-index","10020","important");
  const ov=$("overlay"); if(ov){ ov.style.display="block"; ov.classList.add("show"); }
  const sov=$("sheetOverlay"); if(sov) sov.style.display="block";
}


let settingsUnsubscribe = null;
let currentAppSettings = { theme: "dark", browserNotifications: false, dataSaver: false, reduceMotion: false, fontFamily: "system", fontSize: 100, accentColor: "#ff2d7a", appBackground: "#000000" };

function applyPersonalCustomization(settings = currentAppSettings) {
  const root = document.documentElement;
  const familyMap = { system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', roboto: 'Roboto, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, SFMono-Regular, Consolas, monospace' };
  root.style.setProperty("--ip-user-font", familyMap[settings.fontFamily] || familyMap.system);
  root.style.setProperty("--ip-user-font-size", Math.min(125, Math.max(85, Number(settings.fontSize) || 100)) + "%");
  root.style.fontSize = root.style.getPropertyValue("--ip-user-font-size");
  document.body.classList.add("instapro-user-font");
  root.style.setProperty("--ip-accent", /^#[0-9a-f]{6}$/i.test(settings.accentColor || "") ? settings.accentColor : "#ff2d7a");
  root.style.setProperty("--ip-user-background", /^#[0-9a-f]{6}$/i.test(settings.appBackground || "") ? settings.appBackground : "#000000");
  document.body.style.fontFamily = root.style.getPropertyValue("--ip-user-font");
  document.body.style.fontSize = root.style.getPropertyValue("--ip-user-font-size");
  document.body.classList.toggle("instapro-amoled-mode", settings.theme === "amoled");
  document.body.classList.toggle("instapro-custom-mode", settings.theme === "custom");
  if (settings.theme === "custom") document.body.style.backgroundColor = settings.appBackground || "#000000";
  else document.body.style.backgroundColor = settings.theme === "light" ? "#f4f4f7" : "#000000";
}

function installSettingsStyles() {
  if (document.getElementById("instapro-settings-style")) return;
  const style = document.createElement("style");
  style.id = "instapro-settings-style";
  style.textContent = `
    #instaproSettingsPanel{position:fixed;inset:0;z-index:1000001;display:none;background:rgba(0,0,0,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);align-items:flex-end;justify-content:center;color:#fff;font-family:inherit}
    #instaproSettingsPanel.open{display:flex}
    #instaproSettingsPanel .isp-card{width:100%;max-width:520px;max-height:88dvh;overflow:auto;background:rgba(18,18,22,.98);border:1px solid rgba(255,255,255,.14);border-radius:24px 24px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));box-sizing:border-box}
    #instaproSettingsPanel .isp-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
    #instaproSettingsPanel .isp-head button{border:0;background:transparent;color:inherit;font-size:25px;padding:4px 8px}
    #instaproSettingsPanel .isp-title{font-size:21px;font-weight:700;flex:1}
    #instaproSettingsPanel .isp-subtitle{font-size:12px;opacity:.65;margin:0 0 8px 4px;text-transform:uppercase;letter-spacing:.8px}
    #instaproSettingsPanel .isp-row{display:flex;align-items:center;gap:12px;padding:14px 12px;margin:7px 0;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.045)}
    #instaproSettingsPanel .isp-copy{flex:1;min-width:0}
    #instaproSettingsPanel .isp-label{font-size:15px;font-weight:600}
    #instaproSettingsPanel .isp-desc{font-size:12px;opacity:.65;margin-top:4px;line-height:1.4}
    #instaproSettingsPanel .isp-action{border:1px solid rgba(255,255,255,.2);border-radius:20px;background:rgba(255,255,255,.08);color:inherit;padding:8px 12px}
    #instaproSettingsPanel .isp-switch{width:44px;height:26px;border-radius:20px;border:0;background:#555;position:relative;flex-shrink:0}
    #instaproSettingsPanel .isp-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:white;transition:.18s}
    #instaproSettingsPanel .isp-switch.on{background:#1688ff}
    #instaproSettingsPanel .isp-switch.on:after{left:21px}
    #instaproSettingsPanel .isp-status{font-size:12px;opacity:.65;text-align:center;padding-top:10px;min-height:16px}
    body.instapro-light-mode{background:#f4f4f7!important;color:#161616!important}
    body.instapro-amoled-mode,body.instapro-amoled-mode .app,body.instapro-amoled-mode .page{background:#000!important}
    body.instapro-custom-mode,body.instapro-custom-mode .app,body.instapro-custom-mode .page{background:var(--ip-user-background,#000)!important}
    body.instapro-user-font,body.instapro-user-font *{font-family:var(--ip-user-font,-apple-system,sans-serif)!important}
    .plusGlass{background:linear-gradient(135deg,var(--ip-accent,#ff2d7a),color-mix(in srgb,var(--ip-accent,#ff2d7a) 55%,#38bdf8))!important}
    .postActions .like.active{border-color:var(--ip-accent,#ff2d7a)!important;color:var(--ip-accent,#ff2d7a)!important}
    .iconGlass .dot{background:var(--ip-accent,#ff2d7a)!important;box-shadow:0 0 10px var(--ip-accent,#ff2d7a)!important}
    .sRing:not(.add){background:linear-gradient(45deg,var(--ip-accent,#ff2d7a),#38bdf8,#a78bfa)!important}
    body.instapro-custom-mode .topGlass,body.instapro-custom-mode .bottomGlass,body.instapro-custom-mode .sideGlass,body.instapro-custom-mode .sheetGlass{background:color-mix(in srgb,var(--ip-user-background,#000) 82%,transparent)!important}
    body.instapro-light-mode .post,body.instapro-light-mode .storyGlass{background:rgba(255,255,255,.88)!important;color:#161616!important}
    .logo{touch-action:manipulation;user-select:none;-webkit-user-select:none}
    #instaproSecretTrigger{display:none;border:1px solid color-mix(in srgb,var(--ip-accent,#ff2d7a) 55%,transparent);border-radius:12px;padding:7px 9px;background:rgba(20,20,28,.88);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.25)}
    #instaproSecretTrigger.visible{display:inline-flex;align-items:center;gap:5px}
    #instaproSettingsPanel .isp-custom-select,#instaproSettingsPanel .isp-color{max-width:145px;width:42%;min-height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:inherit;padding:6px}
    #instaproSettingsPanel .isp-color{padding:3px;height:38px}
    #instaproSettingsPanel .isp-secret-card{max-height:80dvh;padding:12px 11px calc(14px + env(safe-area-inset-bottom));border-radius:18px 18px 0 0}
    #instaproSettingsPanel .isp-secret-card .isp-head{gap:7px;margin-bottom:10px}
    #instaproSettingsPanel .isp-secret-card .isp-title{font-size:17px;line-height:1.2}
    #instaproSettingsPanel .isp-secret-card .isp-head button{font-size:21px;padding:3px 6px}
    #instaproSettingsPanel .isp-secret-card .isp-subtitle{font-size:10px;margin-bottom:5px}
    #instaproSettingsPanel .isp-secret-card .isp-row{gap:8px;padding:9px 8px;margin:5px 0;border-radius:11px}
    #instaproSettingsPanel .isp-secret-card .isp-label{font-size:13px}
    #instaproSettingsPanel .isp-secret-card .isp-desc{font-size:10px;line-height:1.3;margin-top:2px}
    #instaproSettingsPanel .isp-secret-card .isp-custom-select,#instaproSettingsPanel .isp-secret-card .isp-color{min-height:30px;padding:4px;font-size:12px}
    #instaproSettingsPanel .isp-secret-card .isp-custom-preview{padding:8px;border-radius:10px}

    #instaproSettingsPanel .isp-custom-range{width:42%;accent-color:var(--ip-accent,#ff2d7a)}
    #instaproSettingsPanel .isp-custom-preview{border-radius:14px;padding:12px;border:1px solid var(--ip-accent,#ff2d7a);background:var(--ip-user-background,#000);font-family:var(--ip-user-font,inherit);font-size:var(--ip-user-font-size,100%)}
    body.instapro-light-mode #homePage,body.instapro-light-mode .page{color:#161616}
    body.instapro-light-mode .topGlass,body.instapro-light-mode .bottomGlass,body.instapro-light-mode .sideGlass,body.instapro-light-mode .sheetGlass{background:rgba(250,250,252,.96)!important;color:#161616!important}
    body.instapro-light-mode .mItem,body.instapro-light-mode .sOpt{color:#161616!important}
    body.instapro-reduce-motion *,body.instapro-reduce-motion *::before,body.instapro-reduce-motion *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
    @media(min-width:600px){#instaproSettingsPanel{align-items:center;padding:16px}#instaproSettingsPanel .isp-card{border-radius:24px;max-height:85dvh}}
  `;
  document.head.appendChild(style);
}

function settingsPanelMarkup(user, secretMode = false) {
  const theme = currentAppSettings.theme === "light";
  const notifications = currentAppSettings.browserNotifications === true;
  return `
    <div class="isp-card ${secretMode ? "isp-secret-card" : ""}" role="dialog" aria-modal="true" aria-label="Settings and activity">
      <div class="isp-head"><button id="ispBack" aria-label="Back">‹</button><div class="isp-title">${secretMode ? "Insta Pro Secret Settings" : "Settings and activity"}</div><button id="ispClose" aria-label="Close">×</button></div>
      ${secretMode ? `<div class="isp-subtitle">Personalize your app</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">App theme</div><div class="isp-desc">Dark, Light, AMOLED black or custom background.</div></div><select class="isp-custom-select" id="ispSecretTheme" aria-label="App theme"><option value="dark">Dark</option><option value="light">Light</option><option value="amoled">AMOLED</option><option value="custom">Custom</option></select></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">App font</div><div class="isp-desc">Change text font across the app.</div></div><select class="isp-custom-select" id="ispSecretFont" aria-label="App font"><option value="system">System</option><option value="roboto">Roboto style</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Font size</div><div class="isp-desc">Adjust text size from 85% to 125%.</div></div><input class="isp-custom-range" id="ispSecretFontSize" type="range" min="85" max="125" step="5" aria-label="Font size"><b id="ispSecretFontSizeValue">100%</b></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Accent / button color</div><div class="isp-desc">Customize highlights and accent color.</div></div><input class="isp-color" id="ispSecretAccent" type="color" aria-label="Accent color"></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Custom background</div><div class="isp-desc">Used when Custom theme is selected.</div></div><input class="isp-color" id="ispSecretBackground" type="color" aria-label="Custom background"></div>
      <div class="isp-row" style="display:block"><div class="isp-label">Preview</div><div class="isp-custom-preview" id="ispSecretPreview" style="margin-top:8px">Insta Pro — Your personal style</div></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Reset appearance</div><div class="isp-desc">Restore default font, theme and colors.</div></div><button class="isp-action" id="ispSecretReset">Reset</button></div>` : ""}
      ${secretMode ? "" : `      <div class="isp-subtitle">Your account</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Signed in account</div><div class="isp-desc">${escapeSettingsText(user?.email || user?.displayName || "Google account")}</div></div><button class="isp-action" id="ispProfile">Profile</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Saved posts</div><div class="isp-desc">Open your profile to view posts you saved.</div></div><button class="isp-action" id="ispSaved">Open</button></div>
      <div class="isp-subtitle" style="margin-top:18px">Creator tools</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Creator analytics</div><div class="isp-desc">Views, likes, followers and the last 28 days.</div></div><button class="isp-action" id="ispCreatorAnalytics">View</button></div>
      <div class="isp-subtitle" style="margin-top:18px">Instagram-style settings</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Notifications</div><div class="isp-desc">Manage push, likes, comments, follows and message alerts.</div></div><button class="isp-action isp-category" data-category="Notifications">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Privacy</div><div class="isp-desc">Private account, activity status and interaction controls.</div></div><button class="isp-action isp-category" data-category="Privacy">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Messages and replies</div><div class="isp-desc">Message requests, story replies and comment controls.</div></div><button class="isp-action isp-category" data-category="Messages and replies">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Content preferences</div><div class="isp-desc">Suggested posts, sensitive content and muted words.</div></div><button class="isp-action isp-category" data-category="Content preferences">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Blocked accounts</div><div class="isp-desc">Review account restrictions and blocked users.</div></div><button class="isp-action isp-category" data-category="Blocked accounts">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Your activity</div><div class="isp-desc">Review activity tools and account information.</div></div><button class="isp-action isp-category" data-category="Your activity">Open</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Account security</div><div class="isp-desc">Signed-in account, session and account actions.</div></div><button class="isp-action isp-category" data-category="Account security">Open</button></div>
      <div class="isp-subtitle" style="margin-top:18px">How you use InstaPro</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Light appearance</div><div class="isp-desc">Change the app's appearance on this device and save your choice.</div></div><button class="isp-switch ${theme ? "on" : ""}" id="ispTheme" role="switch" aria-checked="${theme}" aria-label="Light appearance"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Browser notifications</div><div class="isp-desc">Allow this browser to show notifications, if supported.</div></div><button class="isp-switch ${notifications ? "on" : ""}" id="ispNotifications" role="switch" aria-checked="${notifications}" aria-label="Browser notifications"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Data saver</div><div class="isp-desc">Use lazy-loaded images and lighter video preloading on this device.</div></div><button class="isp-switch ${currentAppSettings.dataSaver ? "on" : ""}" id="ispDataSaver" role="switch" aria-checked="${!!currentAppSettings.dataSaver}" aria-label="Data saver"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Reduce motion</div><div class="isp-desc">Reduce app animations and transitions on this device.</div></div><button class="isp-switch ${currentAppSettings.reduceMotion ? "on" : ""}" id="ispReduceMotion" role="switch" aria-checked="${!!currentAppSettings.reduceMotion}" aria-label="Reduce motion"></button></div>
      <div class="isp-subtitle" style="margin-top:18px">More information</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Help and support</div><div class="isp-desc">For a problem, note the screen and error message.</div></div><button class="isp-action" id="ispHelp">Help</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Log out</div><div class="isp-desc">Sign out of the current Google account on this app.</div></div><button class="isp-action" id="ispLogout">Log out</button></div>
      `}
      <div class="isp-status" id="ispStatus" aria-live="polite"></div>
    </div>`;
}

function bindSecretCustomization(panel, getStatus) {
  const theme = panel.querySelector("#ispSecretTheme");
  const font = panel.querySelector("#ispSecretFont");
  const size = panel.querySelector("#ispSecretFontSize");
  const sizeValue = panel.querySelector("#ispSecretFontSizeValue");
  const accent = panel.querySelector("#ispSecretAccent");
  const background = panel.querySelector("#ispSecretBackground");
  const preview = panel.querySelector("#ispSecretPreview");
  const defaults = { theme: "dark", fontFamily: "system", fontSize: 100, accentColor: "#ff2d7a", appBackground: "#000000" };
  const sync = () => {
    if (theme) theme.value = currentAppSettings.theme || "dark";
    if (font) font.value = currentAppSettings.fontFamily || "system";
    if (size) size.value = String(currentAppSettings.fontSize || 100);
    if (sizeValue) sizeValue.textContent = (currentAppSettings.fontSize || 100) + "%";
    if (accent) accent.value = currentAppSettings.accentColor || "#ff2d7a";
    if (background) background.value = currentAppSettings.appBackground || "#000000";
    if (preview) { preview.style.borderColor = currentAppSettings.accentColor || "#ff2d7a"; preview.style.background = currentAppSettings.appBackground || "#000000"; preview.style.fontFamily = document.body.style.fontFamily; preview.style.fontSize = (currentAppSettings.fontSize || 100) + "%"; }
  };
  const save = async (key, value) => {
    const old = currentAppSettings[key];
    currentAppSettings[key] = value;
    if (key === "theme") applyAppTheme(value);
    applyPersonalCustomization(currentAppSettings);
    sync();
    getStatus().textContent = "Saving your personal appearance…";
    try { await saveAppSetting(key, value); getStatus().textContent = "Saved for your account."; }
    catch (error) { currentAppSettings[key] = old; applyAppTheme(currentAppSettings.theme); applyPersonalCustomization(currentAppSettings); sync(); getStatus().textContent = "Device par apply hua, Firebase save nahi hua: " + error.message; console.error("Secret appearance save failed:", error); }
  };
  theme?.addEventListener("change", () => save("theme", theme.value));
  font?.addEventListener("change", () => save("fontFamily", font.value));
  size?.addEventListener("input", () => { currentAppSettings.fontSize = Number(size.value); applyPersonalCustomization(currentAppSettings); sync(); });
  size?.addEventListener("change", () => save("fontSize", Number(size.value)));
  accent?.addEventListener("input", () => { currentAppSettings.accentColor = accent.value; applyPersonalCustomization(currentAppSettings); sync(); });
  accent?.addEventListener("change", () => save("accentColor", accent.value));
  background?.addEventListener("input", () => { currentAppSettings.appBackground = background.value; applyPersonalCustomization(currentAppSettings); sync(); });
  background?.addEventListener("change", () => save("appBackground", background.value));
  panel.querySelector("#ispSecretReset")?.addEventListener("click", async () => {
    if (!confirm("Appearance ki sabhi personal settings default par reset karein?")) return;
    for (const [key, value] of Object.entries(defaults)) await save(key, value);
    getStatus().textContent = "Default appearance restored and saved.";
  });
  sync();
}

function escapeSettingsText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function applyAppTheme(theme) {
  currentAppSettings.theme = ["light", "dark", "amoled", "custom"].includes(theme) ? theme : "dark";
  document.body.classList.toggle("instapro-light-mode", currentAppSettings.theme === "light");
  applyPersonalCustomization(currentAppSettings);
  try { localStorage.setItem("instapro-theme", currentAppSettings.theme); } catch (_) {}
}

function applyDataSaver(enabled) {
  currentAppSettings.dataSaver = !!enabled;
  document.documentElement.classList.toggle("instapro-data-saver", !!enabled);
  document.querySelectorAll("img").forEach(img => {
    if (enabled && !img.hasAttribute("loading")) img.loading = "lazy";
  });
  document.querySelectorAll("video").forEach(video => {
    if (enabled) video.preload = "metadata";
  });
  try { localStorage.setItem("instapro-data-saver", enabled ? "1" : "0"); } catch (_) {}
}

function applyReduceMotion(enabled) {
  currentAppSettings.reduceMotion = !!enabled;
  document.body.classList.toggle("instapro-reduce-motion", !!enabled);
  try { localStorage.setItem("instapro-reduce-motion", enabled ? "1" : "0"); } catch (_) {}
}

async function saveAppSetting(key, value) {
  const user = (await import("./firebase.js")).auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Settings save karne ke liye Google login karein.");
  const { db } = await import("./firebase.js");
  const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  await setDoc(doc(db, "users", user.uid), {
    appSettings: { ...currentAppSettings, [key]: value },
    appSettingsUpdatedAt: serverTimestamp()
  }, { merge: true });
  currentAppSettings[key] = value;
}

const SETTINGS_CATEGORY_OPTIONS = {
  "Notifications": [
    ["likeNotifications","Likes", "Notify me about likes", true],
    ["commentNotifications","Comments", "Notify me about comments", true],
    ["followNotifications","New followers", "Notify me about new followers", true],
    ["messageNotifications","Messages", "Notify me about messages", true]
  ],
  "Privacy": [
    ["activityStatus","Activity status", "Allow others to see when you are active.", true],
    ["storyReplies","Story replies", "Allow replies to stories.", true],
    ["mentions","Mentions", "Allow other users to mention you.", true]
  ],
  "Messages and replies": [
    ["messageRequests","Message requests", "Allow message requests from other users.", true],
    ["commentControls","Comments", "Allow comments on your posts.", true],
    ["storyReplies","Story replies", "Allow replies to stories.", true]
  ],
  "Content preferences": [
    ["suggestedContent","Suggested content", "Show suggested posts and reels.", true],
    ["sensitiveContent","Sensitive content filter", "Prefer less potentially sensitive suggested content.", true],
    ["autoplayVideos","Autoplay videos", "Allow videos to autoplay when available.", true]
  ],
  "Blocked accounts": [],
  "Your activity": [],
  "Account security": []
};

async function openSettingsCategory(category, user, panel) {
  const { auth, db } = await import("./firebase.js");
  const { doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where, limit, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const me = auth.currentUser;
  if (!me || me.uid !== user.uid) throw new Error("Login session badal gaya. Dobara login karein.");
  panel.innerHTML = `<div class="isp-card" role="dialog" aria-modal="true">
    <div class="isp-head"><button id="ispCategoryBack" aria-label="Back">‹</button><div class="isp-title">${escapeSettingsText(category)}</div><button id="ispCategoryClose" aria-label="Close">×</button></div>
    <p class="isp-desc" style="margin:0 0 14px">Changes aapke Insta Pro account mein save honge.</p>
    <div id="ispCategoryRows"><div class="isp-row">Loading…</div></div><div class="isp-status" id="ispCategoryStatus" aria-live="polite"></div>
  </div>`;
  const close = () => panel.classList.remove("open");
  panel.querySelector("#ispCategoryClose").onclick = close;
  panel.querySelector("#ispCategoryBack").onclick = () => { panel.classList.remove("open"); if (history.state?.instaproSettingsOverlay) history.back(); };
  panel.onclick = event => { if (event.target === panel) close(); };
  const rows = panel.querySelector("#ispCategoryRows");
  const status = panel.querySelector("#ispCategoryStatus");
  const buttonRow = (label, desc, actionLabel, id) => '<div class="isp-row"><div class="isp-copy"><div class="isp-label">' + escapeSettingsText(label) + '</div><div class="isp-desc">' + escapeSettingsText(desc) + '</div></div><button class="isp-action" id="' + id + '">' + escapeSettingsText(actionLabel) + '</button></div>';
  const switchRow = (key, label, desc, enabled) => '<div class="isp-row"><div class="isp-copy"><div class="isp-label">' + escapeSettingsText(label) + '</div><div class="isp-desc">' + escapeSettingsText(desc) + '</div></div><button class="isp-switch ' + (enabled ? "on" : "") + '" data-setting-key="' + key + '" role="switch" aria-checked="' + enabled + '" aria-label="' + escapeSettingsText(label) + '"></button></div>';
  const setSwitches = (settings, apply) => {
    rows.querySelectorAll("[data-setting-key]").forEach(button => {
      button.onclick = async () => {
        if (button.disabled) return;
        button.disabled = true;
        const key = button.dataset.settingKey;
        const next = !button.classList.contains("on");
        const previous = button.classList.contains("on");
        button.classList.toggle("on", next);
        button.setAttribute("aria-checked", String(next));
        status.textContent = "Saving…";
        try {
          await apply(key, next, settings);
          status.textContent = "Saved successfully.";
        } catch (error) {
          button.classList.toggle("on", previous);
          button.setAttribute("aria-checked", String(previous));
          status.textContent = "Save nahi hua: " + error.message;
          console.error("Settings save failed:", error);
        } finally { button.disabled = false; }
      };
    });
  };

  if (category === "Blocked accounts") {
    rows.innerHTML = '<div class="isp-row"><div class="isp-copy"><div class="isp-label">Blocked accounts</div><div class="isp-desc">Aapke blocked users yahan dikhte hain. Unblock karne par user dobara aapka profile dekh sakta hai, privacy rules ke mutabik.</div></div></div><div id="ispBlockedList" class="isp-desc">Blocked list load ho rahi hai…</div>';
    try {
      const snap = await getDocs(collection(db, "users", me.uid, "blockedUsers"));
      const holder = rows.querySelector("#ispBlockedList");
      if (snap.empty) holder.textContent = "Aapne abhi kisi account ko block nahi kiya.";
      else {
        holder.innerHTML = snap.docs.map(d => {
          const x=d.data(), target=d.id;
          return '<div class="isp-row"><div class="isp-copy"><div class="isp-label">' + escapeSettingsText(x.username || x.displayName || target) + '</div><div class="isp-desc">' + escapeSettingsText(x.email || x.reason || "Blocked account") + '</div></div><button class="isp-action" data-unblock="' + escapeSettingsText(target) + '">Unblock</button></div>';
        }).join("");
        holder.querySelectorAll("[data-unblock]").forEach(btn => btn.onclick = async () => {
          btn.disabled=true; status.textContent="Unblocking…";
          try { await deleteDoc(doc(db,"users",me.uid,"blockedUsers",btn.dataset.unblock)); btn.closest(".isp-row")?.remove(); status.textContent="Account unblocked."; if (!holder.querySelector(".isp-row")) holder.textContent="Aapki blocked list ab khaali hai."; }
          catch(e) { status.textContent="Unblock nahi hua: "+e.message; btn.disabled=false; }
        });
      }
    } catch(error) { rows.querySelector("#ispBlockedList").textContent="Blocked list load nahi hui: "+error.message; }
    return;
  }

  if (category === "Your activity") {
    rows.innerHTML = `
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Activity overview</div><div class="isp-desc" id="ipaActivityOverview">Firebase account activity load ho rahi hai…</div></div></div>
      <div class="isp-subtitle">Your interactions</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Likes</div><div class="isp-desc">Aapne jin posts aur Reels ko like kiya.</div></div><button class="isp-action" data-activity-list="likes">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Comments</div><div class="isp-desc">Aapke comments, jahan comment records readable hain.</div></div><button class="isp-action" data-activity-list="comments">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Saved posts and Reels</div><div class="isp-desc">Aapke saved content.</div></div><button class="isp-action" data-activity-list="saved">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Reposts</div><div class="isp-desc">Aapke repost kiye gaye posts/Reels.</div></div><button class="isp-action" data-activity-list="reposts">View</button></div>
      <div class="isp-subtitle">Your content and connections</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Posts and Reels</div><div class="isp-desc">Aapke published content ki list.</div></div><button class="isp-action" data-activity-list="content">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Followers and following</div><div class="isp-desc">Current account connection lists.</div></div><button class="isp-action" data-activity-list="follows">View</button></div>
      <div class="isp-subtitle">Account history on this device</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Search history</div><div class="isp-desc">Insta Pro is device par save ki gayi searches.</div></div><button class="isp-action" data-activity-list="searches">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Recently deleted</div><div class="isp-desc">Is device par locally remembered deleted post/Reel IDs.</div></div><button class="isp-action" data-activity-list="deleted">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Time spent</div><div class="isp-desc" id="ipaTimeSpent">Is device par app use ka available record.</div></div><button class="isp-action" data-activity-list="time">View</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Account information</div><div class="isp-desc">Account ID, username, email aur account creation date.</div></div><button class="isp-action" data-activity-list="account">View</button></div>
      <div class="isp-status" id="ipaActivityList" aria-live="polite" style="white-space:normal;overflow-wrap:anywhere"></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Export account activity</div><div class="isp-desc">Available account activity ka JSON file banayein.</div></div><button class="isp-action" id="ipaExportActivity">Export</button></div>`;
    const activityList=panel.querySelector("#ipaActivityList");
    const safeActivityText=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    const getMillis=value=>value?.toMillis?.() || value?.toDate?.()?.getTime?.() || (typeof value==="number"?value:Date.parse(value||"")||0);
    let activityPosts=[], activityProfile={}, activityComments=[];
    const readLocal=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback;}catch(_){return fallback;}};
    const prettyDate=value=>getMillis(value)?new Date(getMillis(value)).toLocaleString():"Date unavailable";
    const showList=(title,items)=>{activityList.innerHTML='<div class="isp-subtitle">'+safeActivityText(title)+' ('+items.length+')</div>'+(items.length?items.slice(0,100).map(item=>'<div class="isp-row" style="display:block"><div class="isp-label">'+safeActivityText(item.title||item.caption||item.text||item.type||"Activity")+'</div><div class="isp-desc">'+safeActivityText(item.detail||prettyDate(item.createdAt||item.time||item.timestamp))+'</div></div>').join(""):'<div class="isp-row">Is category ka saved record nahi mila.</div>');};
    try {
      const [profileSnap,postsSnap]=await Promise.all([getDoc(doc(db,"users",me.uid)),getDocs(collection(db,"posts"))]);
      activityProfile=profileSnap.exists()?profileSnap.data():{};
      activityPosts=postsSnap.docs.map(snap=>({id:snap.id,...snap.data()}));
      const owns=p=>String(p.uid||p.userId||p.authorId||p.ownerUid||p.userUID||"")===me.uid;
      const liked=activityPosts.filter(p=>Array.isArray(p.likes)&&p.likes.includes(me.uid));
      const saved=activityPosts.filter(p=>Array.isArray(p.savedBy)&&p.savedBy.includes(me.uid));
      const reposted=activityPosts.filter(p=>Array.isArray(p.repostedBy)&&p.repostedBy.includes(me.uid));
      const own=activityPosts.filter(owns);
      panel.querySelector("#ipaActivityOverview").textContent="Posts/Reels: "+own.length+" • Liked: "+liked.length+" • Saved: "+saved.length+" • Reposted: "+reposted.length+" • Followers: "+(Array.isArray(activityProfile.followers)?activityProfile.followers.length:Number(activityProfile.followersCount||0))+" • Following: "+(Array.isArray(activityProfile.following)?activityProfile.following.length:Number(activityProfile.followingCount||0));
      panel.querySelectorAll("[data-activity-list]").forEach(button=>button.onclick=async()=>{
        const kind=button.dataset.activityList; button.disabled=true;
        try {
          if(kind==="likes") return showList("Liked posts and Reels",liked.map(p=>({title:p.caption||"Liked post",detail:"Post ID: "+p.id+" • "+prettyDate(p.createdAt||p.time)})));
          if(kind==="saved") return showList("Saved posts and Reels",saved.map(p=>({title:p.caption||"Saved post",detail:"Post ID: "+p.id+" • "+prettyDate(p.createdAt||p.time)})));
          if(kind==="reposts") return showList("Reposts",reposted.map(p=>({title:p.caption||"Reposted post",detail:"Post ID: "+p.id+" • "+prettyDate(p.createdAt||p.time)})));
          if(kind==="content") return showList("Your published posts and Reels",own.map(p=>({title:p.caption||((p.type||p.mediaType||"").toLowerCase().includes("reel")?"Reel":"Post"),detail:(p.type||p.mediaType||"Post")+" • ID: "+p.id+" • "+prettyDate(p.createdAt||p.time)})));
          if(kind==="comments") {
            const records=[];
            for(const post of activityPosts.slice(0,80)) {
              try {
                const cs=await getDocs(query(collection(db,"posts",post.id,"comments"),where("uid","==",me.uid),limit(30)));
                cs.docs.forEach(c=>records.push({title:c.data().text||c.data().comment||"Comment",detail:"Post ID: "+post.id+" • "+prettyDate(c.data().createdAt||c.data().time)}));
              } catch(_) {}
            }
            return showList("Your comments (readable recent posts)",records);
          }
          if(kind==="follows") {
            const followers=Array.isArray(activityProfile.followers)?activityProfile.followers:[];
            const following=Array.isArray(activityProfile.following)?activityProfile.following:[];
            return showList("Followers and following",[
              ...followers.map(uid=>({title:"Follower: "+uid,detail:"Current follower"})),
              ...following.map(uid=>({title:"Following: "+uid,detail:"Current following"}))
            ]);
          }
          if(kind==="searches") {
            const searches=readLocal("instapro-search-history",readLocal("searchHistory",[]));
            return showList("Search history on this device",(Array.isArray(searches)?searches:[]).map(x=>typeof x==="string"?{title:x,detail:"Saved on this device"}:{title:x.query||x.term||x.text||"Search",detail:prettyDate(x.createdAt||x.time||x.timestamp)}));
          }
          if(kind==="deleted") {
            const ids=readLocal("instapro-deleted-post-ids",[]);
            return showList("Recently deleted IDs on this device",(Array.isArray(ids)?ids:[]).map(id=>({title:"Deleted post/Reel",detail:"ID: "+id+" • Local device record only"})));
          }
          if(kind==="time") {
            const seconds=Number(localStorage.getItem("instapro-total-time-seconds")||0);
            const sessionSeconds=Number(sessionStorage.getItem("instapro-session-time-seconds")||0);
            return showList("Time spent",[{title:"Recorded time on this device",detail:Math.floor((seconds+sessionSeconds)/60)+" minutes. Tracking only covers sessions where this counter is active; it is not historical server-wide usage."}]);
          }
          if(kind==="account") return showList("Account information",[
            {title:"Username",detail:activityProfile.username||activityProfile.userName||"Not set"},
            {title:"Email",detail:me.email||"Not available"},
            {title:"Account UID",detail:me.uid},
            {title:"Created",detail:me.metadata?.creationTime||"Not available"},
            {title:"Last sign in",detail:me.metadata?.lastSignInTime||"Not available"}
          ]);
        } catch(error) { activityList.textContent="Activity load nahi hui: "+error.message; }
        finally { button.disabled=false; }
      });
      panel.querySelector("#ipaExportActivity").onclick=()=>{
        const payload={exportedAt:new Date().toISOString(),account:{uid:me.uid,email:me.email||null,username:activityProfile.username||activityProfile.userName||null,createdAt:me.metadata?.creationTime||null},summary:{postsAndReels:own.length,liked:liked.length,saved:saved.length,reposted:reposted.length,followers:Array.isArray(activityProfile.followers)?activityProfile.followers.length:Number(activityProfile.followersCount||0),following:Array.isArray(activityProfile.following)?activityProfile.following.length:Number(activityProfile.followingCount||0)},content:own.map(p=>({id:p.id,caption:p.caption||"",type:p.type||p.mediaType||"post",createdAt:p.createdAt||p.time||null})),likedPostIds:liked.map(p=>p.id),savedPostIds:saved.map(p=>p.id),repostedPostIds:reposted.map(p=>p.id),localSearchHistory:readLocal("instapro-search-history",readLocal("searchHistory",[])),localDeletedIds:readLocal("instapro-deleted-post-ids",[])};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download="instapro-account-activity.json";a.click();URL.revokeObjectURL(url);
        status.textContent="Available activity JSON export taiyar hai. Kuch purane actions ke records save nahi the, isliye woh export mein nahi aa sakte.";
      };
    } catch(error) {
      panel.querySelector("#ipaActivityOverview").textContent="Firebase activity load nahi hui: "+error.message+" • Firestore Rules aur posts collection access check karein.";
    }
    return;
  }

  if (category === "Data usage and media quality") {
    const settings = { ...(currentAppSettings["Data usage and media quality"] || {}) };
    rows.innerHTML = switchRow("dataSaver","Use less mobile data","Images lazy-load hongi aur videos metadata preload karenge.",settings.dataSaver ?? currentAppSettings.dataSaver ?? false)
      + switchRow("highQualityUploads","Upload at highest quality","Upload workflow ko high-quality preference batata hai; source file quality bhi matter karti hai.",settings.highQualityUploads ?? true)
      + switchRow("autoplayVideos","Autoplay videos","Feed videos ko autoplay karne ki preference.",settings.autoplayVideos ?? true)
      + switchRow("preloadMedia","Preload media","Next media ko pehle se load karne ki preference.",settings.preloadMedia ?? false);
    setSwitches(settings, async (key,next,old) => {
      const updated={...old,[key]:next};
      if(key==="dataSaver") { applyDataSaver(next); currentAppSettings.dataSaver=next; }
      if(key==="autoplayVideos") document.documentElement.classList.toggle("instapro-no-autoplay",!next);
      if(key==="preloadMedia") document.documentElement.classList.toggle("instapro-preload-media",next);
      currentAppSettings["Data usage and media quality"]=updated;
      await saveAppSetting("Data usage and media quality",updated);
    });
    return;
  }

  if (category === "Account type and tools") {
    const snap=await getDoc(doc(db,"users",me.uid));
    const profile=snap.exists()?snap.data():{};
    const currentType=["personal","creator","business"].includes(profile.accountType)?profile.accountType:"personal";
    rows.innerHTML = '<div class="isp-row"><div class="isp-copy"><div class="isp-label">Account type</div><div class="isp-desc">Personal, Creator ya Business account choose karein.</div></div><select id="ispAccountType" class="isp-custom-select" aria-label="Account type"><option value="personal">Personal</option><option value="creator">Creator</option><option value="business">Business</option></select></div>'
      + switchRow("showContactInfo","Show contact info","Profile par contact details dikhane ki preference.",profile.showContactInfo===true)
      + buttonRow("Creator tools","Creator insights aur professional profile tools.","Open","ispCreatorTools")
      + '<div class="isp-row"><div class="isp-copy"><div class="isp-label">Account data</div><div class="isp-desc">Account type changes Firebase profile mein save hote hain.</div></div></div>';
    const select=panel.querySelector("#ispAccountType"); select.value=currentType;
    select.onchange=async()=>{ select.disabled=true; status.textContent="Saving account type…"; try { await setDoc(doc(db,"users",me.uid),{accountType:select.value,accountTypeUpdatedAt:serverTimestamp()},{merge:true}); status.textContent="Account type saved: "+select.value+". Professional tools depend on the enabled features in this app."; } catch(e) { select.value=currentType; status.textContent="Account type save nahi hua: "+e.message; } finally { select.disabled=false; } };
    setSwitches({showContactInfo:profile.showContactInfo===true},async(key,next)=>{await setDoc(doc(db,"users",me.uid),{[key]:next,updatedAt:serverTimestamp()},{merge:true});});
    panel.querySelector("#ispCreatorTools").onclick=()=>{ status.textContent="Creator tools: account type is "+(select.value||currentType)+". Detailed analytics will use real post insights when available."; };
    return;
  }

  if (category === "Insta Pro Verified") {
    rows.innerHTML = '<div class="isp-row"><div class="isp-copy"><div class="isp-label">🔵 Insta Pro Verified is ON</div><div class="isp-desc">Is app mein har account ko automatic Verified Badge milta hai — 0 followers, naya account, Personal, Creator ya Business. Koi application ya approval required nahi hai.</div></div><span class="instapro-verified-badge" title="Insta Pro Verified" aria-label="Insta Pro Verified">✓</span></div>'
      + '<div class="isp-row"><div class="isp-copy"><div class="isp-label">Badge kahan dikhega?</div><div class="isp-desc">Profile, Home Feed, Reels Feed aur comments mein username ke saath.</div></div></div>'
      + '<div class="isp-row"><div class="isp-copy"><div class="isp-label">Automatic eligibility</div><div class="isp-desc">Follower count check nahi hota. App ke sabhi accounts ko ek jaisa badge diya jata hai.</div></div></div>';
    return;
  }
  const options = SETTINGS_CATEGORY_OPTIONS[category] || [];
  const saved = currentAppSettings[category] || {};
  if (category === "Privacy") {
    rows.innerHTML=options.map(([key,label,description,defaultValue])=>switchRow(key,label,description,typeof saved[key]==="boolean"?saved[key]:defaultValue)).join("");
  } else {
    rows.innerHTML=options.map(([key,label,description,defaultValue])=>switchRow(key,label,description,typeof saved[key]==="boolean"?saved[key]:defaultValue)).join("");
  }
  setSwitches(saved,async(key,next,old)=>{
    const updated={...old,[key]:next};
    currentAppSettings[category]=updated;
    await saveAppSetting(category,updated);
  });
}

// Android/browser Back: dismiss the currently open settings overlay; never
// rebuild the old Settings landing page when a menu category was open.
if (!window.__instaproSettingsBackBound) {
  window.__instaproSettingsBackBound = true;
  window.addEventListener("popstate", () => {
    const panel = document.getElementById("instaproSettingsPanel");
    if (panel?.classList.contains("open")) panel.classList.remove("open");
  });
}

function profileName(user) { return user?.displayName || user?.email?.split("@")[0] || ""; }

async function openSettingsPanel(secretMode = false) {
  installSettingsStyles();
  const { auth, db } = await import("./firebase.js");
  const user = auth.currentUser;
  if (!user || user.isAnonymous) { alert("Settings ke liye pehle Google se login karein."); return; }
  document.getElementById("sideMenu")?.classList.remove("show");
  const overlay = document.getElementById("sideOverlay");
  if (overlay) { overlay.classList.remove("show"); overlay.style.display = "none"; }
  let panel = document.getElementById("instaproSettingsPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "instaproSettingsPanel";
    document.body.appendChild(panel);
  }
  const wasOpen = panel.classList.contains("open");
  panel.innerHTML = settingsPanelMarkup(user, secretMode);
  panel.classList.add("open");
  // Keep the settings overlay inside the app's navigation stack so Android/browser
  // Back closes it instead of restoring a previous, stale settings screen.
  if (!wasOpen && !history.state?.instaproSettingsOverlay) {
    history.pushState({ ...(history.state || {}), instaproSettingsOverlay: true }, "", location.href);
  }
  const status = () => panel.querySelector("#ispStatus");
  const close = () => {
    panel.classList.remove("open");
    if (history.state?.instaproSettingsOverlay) history.back();
  };
  panel.querySelector("#ispClose").onclick = close;
  if (secretMode) bindSecretCustomization(panel, status);
  panel.querySelector("#ispBack").onclick = close;
  panel.onclick = event => { if (event.target === panel) close(); };
  panel.querySelectorAll(".isp-category").forEach(button => {
    button.onclick = () => openSettingsCategory(button.dataset.category, user, panel);
  });
  const creatorAnalyticsButton = panel.querySelector("#ispCreatorAnalytics");
  if (creatorAnalyticsButton) creatorAnalyticsButton.onclick = () => openCreatorAnalytics(user, panel);
  if (!secretMode) {
  panel.querySelector("#ispProfile").onclick = async () => {
    close();
    try { await import("./profile.js"); if (typeof window.openProfile === "function") await window.openProfile(user.uid); }
    catch (error) { alert("Profile open nahi hua: " + error.message); }
  };
  panel.querySelector("#ispSaved").onclick = async () => {
    close();
    try { await import("./profile.js"); if (typeof window.openProfile === "function") await window.openProfile(user.uid); }
    catch (error) { alert("Profile open nahi hua: " + error.message); }
    alert("Saved posts ka section profile mein kholen.");
  };
  panel.querySelector("#ispTheme").onclick = async event => {
    const button = event.currentTarget;
    const next = currentAppSettings.theme === "light" ? "dark" : "light";
    applyAppTheme(next);
    button.classList.toggle("on", next === "light");
    button.setAttribute("aria-checked", String(next === "light"));
    status().textContent = "Saving appearance…";
    try { await saveAppSetting("theme", next); status().textContent = "Appearance saved."; }
    catch (error) { status().textContent = "Device par apply hua, Firebase save nahi hua."; console.error("Theme setting save error:", error); }
  };
  panel.querySelector("#ispNotifications").onclick = async event => {
    const button = event.currentTarget;
    if (!("Notification" in window)) { status().textContent = "Is browser mein notifications supported nahi hain."; return; }
    try {
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      const enabled = permission === "granted";
      currentAppSettings.browserNotifications = enabled;
      button.classList.toggle("on", enabled);
      button.setAttribute("aria-checked", String(enabled));
      await saveAppSetting("browserNotifications", enabled);
      status().textContent = enabled ? "Browser notifications allowed." : "Browser notification permission not granted.";
    } catch (error) { status().textContent = "Notification setting save nahi hui."; console.error(error); }
  };
  panel.querySelector("#ispDataSaver").onclick = async event => {
    const button = event.currentTarget;
    const next = !currentAppSettings.dataSaver;
    applyDataSaver(next);
    button.classList.toggle("on", next);
    button.setAttribute("aria-checked", String(next));
    status().textContent = "Saving data saver setting…";
    try { await saveAppSetting("dataSaver", next); status().textContent = "Data saver saved."; }
    catch (error) { status().textContent = "Device par apply hua, Firebase save nahi hua."; console.error("Data saver save error:", error); }
  };
  panel.querySelector("#ispReduceMotion").onclick = async event => {
    const button = event.currentTarget;
    const next = !currentAppSettings.reduceMotion;
    applyReduceMotion(next);
    button.classList.toggle("on", next);
    button.setAttribute("aria-checked", String(next));
    status().textContent = "Saving motion setting…";
    try { await saveAppSetting("reduceMotion", next); status().textContent = "Reduce motion saved."; }
    catch (error) { status().textContent = "Device par apply hua, Firebase save nahi hua."; console.error("Reduce motion save error:", error); }
  };
  panel.querySelector("#ispHelp").onclick = () => { status().textContent = "Help: app ka screenshot aur Console error share karein."; };
  panel.querySelector("#ispLogout").onclick = async () => {
    if (!confirm("Kya aap InstaPro se log out karna chahte hain?")) return;
    try {
      const { auth } = await import("./firebase.js");
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
      if (settingsUnsubscribe) { settingsUnsubscribe(); settingsUnsubscribe = null; }
      await signOut(auth);
      close();
      location.reload();
    } catch (error) { status().textContent = "Logout nahi hua: " + error.message; }
  };
  }

  try {
    if (settingsUnsubscribe) settingsUnsubscribe();
    const { onSnapshot, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    settingsUnsubscribe = onSnapshot(doc(db, "users", user.uid), snapshot => {
      const saved = snapshot.exists() ? snapshot.data().appSettings : null;
      if (!saved) return;
      currentAppSettings = { ...currentAppSettings, ...saved };
      applyAppTheme(currentAppSettings.theme);
      applyPersonalCustomization(currentAppSettings);
      const secretTheme = panel.querySelector("#ispSecretTheme");
      const secretFont = panel.querySelector("#ispSecretFont");
      const secretSize = panel.querySelector("#ispSecretFontSize");
      const secretSizeValue = panel.querySelector("#ispSecretFontSizeValue");
      const secretAccent = panel.querySelector("#ispSecretAccent");
      const secretBackground = panel.querySelector("#ispSecretBackground");
      if (secretTheme) secretTheme.value = currentAppSettings.theme || "dark";
      if (secretFont) secretFont.value = currentAppSettings.fontFamily || "system";
      if (secretSize) secretSize.value = String(currentAppSettings.fontSize || 100);
      if (secretSizeValue) secretSizeValue.textContent = (currentAppSettings.fontSize || 100) + "%";
      if (secretAccent) secretAccent.value = currentAppSettings.accentColor || "#ff2d7a";
      if (secretBackground) secretBackground.value = currentAppSettings.appBackground || "#000000";
      const themeButton = panel.querySelector("#ispTheme");
      const notifButton = panel.querySelector("#ispNotifications");
      const dataSaverButton = panel.querySelector("#ispDataSaver");
      const reduceMotionButton = panel.querySelector("#ispReduceMotion");
      if (themeButton) { themeButton.classList.toggle("on", currentAppSettings.theme === "light"); themeButton.setAttribute("aria-checked", String(currentAppSettings.theme === "light")); }
      if (notifButton) { notifButton.classList.toggle("on", currentAppSettings.browserNotifications === true); notifButton.setAttribute("aria-checked", String(currentAppSettings.browserNotifications === true)); }
      if (dataSaverButton) { dataSaverButton.classList.toggle("on", !!currentAppSettings.dataSaver); dataSaverButton.setAttribute("aria-checked", String(!!currentAppSettings.dataSaver)); }
      if (reduceMotionButton) { reduceMotionButton.classList.toggle("on", !!currentAppSettings.reduceMotion); reduceMotionButton.setAttribute("aria-checked", String(!!currentAppSettings.reduceMotion)); }
      applyDataSaver(currentAppSettings.dataSaver);
      applyReduceMotion(currentAppSettings.reduceMotion);
    }, error => { console.error("Settings realtime listener error:", error); if (status()) status().textContent = "Firebase settings load nahi hui."; });
  } catch (error) { console.error("Settings initialize error:", error); }
}


// Creator dashboard: live Firestore totals and a 28-day daily trend.
// Shared entry point for privacy settings from the three-line menu.
window.InstaProOpenPrivacySettings = async function() {
  await openSettingsPanel();
  const { auth } = await import("./firebase.js");
  const user = auth.currentUser;
  const panel = document.getElementById("instaproSettingsPanel");
  if (user && panel) await openSettingsCategory("Privacy", user, panel);
};

async function openCreatorAnalytics(user, panel) {
  if (!user || user.isAnonymous) { alert("Creator analytics ke liye Google login karein."); return; }
  if (settingsUnsubscribe) { settingsUnsubscribe(); settingsUnsubscribe = null; }
  const { db } = await import("./firebase.js");
  const { collection, doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  panel.innerHTML = `
    <div class="isp-card" role="dialog" aria-modal="true" aria-label="Creator analytics" style="max-height:92dvh">
      <div class="isp-head"><button id="ipaBack" aria-label="Back">‹</button><div class="isp-title">Creator analytics</div><button id="ipaClose" aria-label="Close">×</button></div>
      <div style="font-size:12px;opacity:.7;margin:-8px 0 14px">Last 28 days · Updates live from Firebase</div>
      <div id="ipaStats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">
        <div class="isp-row">Loading analytics…</div>
      </div>
      <div class="isp-row" style="display:block;margin-top:14px">
        <div class="isp-label">Views & net follows · 28 days</div>
        <div id="ipaChart" style="width:100%;overflow:hidden;padding-top:10px">Loading chart…</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-top:8px"><span>🔵 Views</span><span>🟣 Net follows</span></div>
      </div>
      <div class="isp-row" style="display:block">
        <div class="isp-label">Your posts</div>
        <div id="ipaPosts" style="font-size:13px;line-height:1.8;overflow-wrap:anywhere">Loading…</div>
      </div>
      <div class="isp-status" id="ipaStatus" aria-live="polite"></div>
    </div>`;
  panel.classList.add("open");
  const close = () => { if (settingsUnsubscribe) { settingsUnsubscribe(); settingsUnsubscribe = null; } panel.classList.remove("open"); };
  panel.querySelector("#ipaClose").onclick = close;
  panel.querySelector("#ipaBack").onclick = () => { if (settingsUnsubscribe) { settingsUnsubscribe(); settingsUnsubscribe = null; } openSettingsPanel(); };
  panel.onclick = event => { if (event.target === panel) close(); };
  let userData = {};
  let allPosts = [];
  let userReady = false, postsReady = false;
  const stamp = value => value?.toMillis ? value.toMillis() : value?.toDate ? value.toDate().getTime() : Number(value || 0);
  const count = value => Math.max(0, Number(value || 0));
  const dayKey = date => date.toISOString().slice(0,10);
  const dayLabels = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let n=27;n>=0;n--) { const d=new Date(today); d.setDate(d.getDate()-n); dayLabels.push(dayKey(d)); }
  const owner = post => post.uid || post.userId || post.authorId || post.ownerUid || "";
  const draw = () => {
    if (!userReady || !postsReady || !panel.classList.contains("open")) return;
    const posts = allPosts.filter(post => owner(post) === user.uid);
    const totals = { views:0, likes:0, comments:0, shares:0 };
    const viewsByDay = Object.fromEntries(dayLabels.map(day=>[day,0]));
    posts.forEach(post => {
      const daily = post.viewsByDay && typeof post.viewsByDay === "object" ? post.viewsByDay : {};
      totals.views += count(post.viewCount ?? post.views ?? Object.values(daily).reduce((sum,v)=>sum+count(v),0));
      totals.likes += count(post.likesCount ?? post.likeCount ?? (Array.isArray(post.likes)?post.likes.length:0));
      totals.comments += count(post.commentsCount ?? post.commentCount);
      totals.shares += count(post.shareCount);
      dayLabels.forEach(day => { viewsByDay[day] += count(daily[day]); });
    });
    const followers = Array.isArray(userData.followers) ? userData.followers.length : count(userData.followersCount ?? userData.followers);
    const followsByDay = userData.followsByDay && typeof userData.followsByDay === "object" ? userData.followsByDay : {};
    const followSeries = dayLabels.map(day=>Number(followsByDay[day]||0));
    const metrics = [
      ["Views",totals.views.toLocaleString("en-IN"),"Total post views"],
      ["Followers",followers.toLocaleString("en-IN"),"Current followers"],
      ["Likes",totals.likes.toLocaleString("en-IN"),"Across your posts"],
      ["Comments",totals.comments.toLocaleString("en-IN"),"Across your posts"],
      ["Shares",totals.shares.toLocaleString("en-IN"),"Recorded shares"],
      ["Posts",posts.length.toLocaleString("en-IN"),"Published posts"]
    ];
    panel.querySelector("#ipaStats").innerHTML = metrics.map(([label,value,sub])=>'<div class="isp-row" style="display:block;margin:0"><div style="font-size:12px;opacity:.7">'+label+'</div><div style="font-size:25px;font-weight:800;margin:4px 0">'+value+'</div><div style="font-size:11px;opacity:.65">'+sub+'</div></div>').join("");
    const W=320,H=125, pad=8;
    const max=Math.max(1,...Object.values(viewsByDay),...followSeries.map(Math.abs));
    const x=i=>pad+i*(W-2*pad)/(dayLabels.length-1);
    const y=v=>H-pad-(Math.max(0,v)/max)*(H-2*pad);
    const path=arr=>arr.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
    const viewPath=path(dayLabels.map(day=>viewsByDay[day]));
    const followPath=path(followSeries.map(v=>Math.max(0,v)));
    panel.querySelector("#ipaChart").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Daily views and net follows chart" style="width:100%;height:auto;display:block"><path d="M8 '+(H-8)+' H'+(W-8)+'" stroke="currentColor" opacity=".2" fill="none"/><path d="'+viewPath+'" stroke="#3698ff" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="'+followPath+'" stroke="#c084fc" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg><div style="display:flex;justify-content:space-between;font-size:10px;opacity:.65"><span>'+dayLabels[0]+'</span><span>'+dayLabels[13]+'</span><span>'+dayLabels[27]+'</span></div><p style="font-size:12px;opacity:.7;margin-bottom:0">28-day views: '+dayLabels.reduce((sum,day)=>sum+viewsByDay[day],0).toLocaleString("en-IN")+' · Net follows: '+followSeries.reduce((sum,v)=>sum+v,0).toLocaleString("en-IN")+'</p>';
    const sorted=[...posts].sort((a,b)=>stamp(b.createdAt||b.time)-stamp(a.createdAt||a.time));
    panel.querySelector("#ipaPosts").innerHTML=sorted.length?sorted.slice(0,20).map(post=>'<div style="padding:8px 0;border-bottom:1px solid #8884"><b>'+(String(post.caption||"Untitled post").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])))+'</b><div style="opacity:.72;font-size:12px">👁 '+count(post.viewCount??post.views).toLocaleString("en-IN")+' views · ♥ '+count(post.likesCount??post.likeCount??(Array.isArray(post.likes)?post.likes.length:0)).toLocaleString("en-IN")+' likes · ↗ '+count(post.shareCount).toLocaleString("en-IN")+' shares</div></div>').join(""):'No posts yet.';
    panel.querySelector("#ipaStatus").textContent="Live Firebase data · daily chart starts collecting from when tracking is enabled.";
  };
  const stopUser=onSnapshot(doc(db,"users",user.uid),snap=>{userData=snap.exists()?snap.data():{};userReady=true;draw();},error=>{console.error("Analytics user listener:",error);panel.querySelector("#ipaStatus").textContent="Follower analytics load nahi hui. Firestore Rules check karein.";});
  const stopPosts=onSnapshot(collection(db,"posts"),snap=>{allPosts=snap.docs.map(d=>({id:d.id,...d.data()}));postsReady=true;draw();},error=>{console.error("Analytics posts listener:",error);panel.querySelector("#ipaStatus").textContent="Post analytics load nahi hui. Firestore Rules check karein.";});
  settingsUnsubscribe=()=>{stopUser();stopPosts();};
}

function bindSideMenuItems() {
  const items = document.querySelectorAll("#sideMenu .mItem");
  if (items[0]) items[0].onclick = openSettingsPanel;
  if (items[1]) items[1].onclick = () => {
    openSettingsPanel();
  };
  if (items[2]) items[2].onclick = async () => {
    const next = currentAppSettings.theme === "light" ? "dark" : "light";
    applyAppTheme(next);
    try { await saveAppSetting("theme", next); } catch (error) { console.error("Theme save error:", error); }
  };
  if (items[3]) items[3].onclick = async () => {
    if (!confirm("Kya aap InstaPro se log out karna chahte hain?")) return;
    try { const { auth } = await import("./firebase.js"); const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"); await signOut(auth); location.reload(); }
    catch (error) { alert("Logout nahi hua: " + error.message); }
  };
}

function openMenu(){
  const m=$("sideMenu"); if(!m) return;
  m.querySelectorAll(".mItem").forEach(item => item.remove());
  document.getElementById("instaproSettingsMenuEntry")?.remove();
  document.getElementById("creatorAnalyticsMenuItem")?.remove();
  const entries = [
    ["Your activity", "🕘", "Your activity"],
    ["Account privacy", "🔒", "Privacy"],
    ["Blocked", "🚫", "Blocked accounts"],
    ["Message and story reply", "💬", "Messages and replies"],
    ["Data usage and media quality", "📶", "Data usage and media quality"],
    ["Account type and tools", "🧰", "Account type and tools"],
    ["Insta Pro Verified", "✓", "Insta Pro Verified"],
    ["Log out", "🚪", "Log out"]
  ];
  entries.forEach(([label,icon,action])=>{
    const item=document.createElement("div");
    item.className="mItem"; item.setAttribute("role","button"); item.setAttribute("tabindex","0");
    item.textContent=icon+" "+label;
    const activate=async()=>{
      try {
        const {auth}=await import("./firebase.js"); const user=auth.currentUser;
        if(label==="Log out") {
          if(!user){alert("Aap pehle se logged out hain.");return;}
          if(!confirm("Kya aap Insta Pro se log out karna chahte hain?")) return;
          try {
            if(settingsUnsubscribe){settingsUnsubscribe();settingsUnsubscribe=null;}
            const {signOut}=await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            m.classList.remove("show");
            const logoutOverlay=document.getElementById("sideOverlay");
            if(logoutOverlay){logoutOverlay.classList.remove("show");logoutOverlay.style.display="none";}
            await signOut(auth);
            location.reload();
          } catch(error) { alert("Logout nahi hua: "+error.message); }
          return;
        }
        if(!user||user.isAnonymous){alert("Is option ke liye pehle Google se login karein.");return;}
        m.classList.remove("show");
        const overlay=document.getElementById("sideOverlay");
        if(overlay){overlay.classList.remove("show");overlay.style.display="none";}
        const routes={"Your activity":"Your activity","Account privacy":"Privacy","Blocked":"Blocked accounts","Message and story reply":"Messages and replies","Data usage and media quality":"Data usage and media quality","Account type and tools":"Account type and tools","Insta Pro Verified":"Insta Pro Verified"};
        await openSettingsPanel();
        const panel=document.getElementById("instaproSettingsPanel"); if(!panel)return;
        await openSettingsCategory(routes[label],user,panel);
      } catch(error) { console.error("Menu setting failed:",error); alert("Setting open nahi hui: "+error.message); }
    };
    item.addEventListener("click",activate);
    item.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activate();}});
    m.appendChild(item);
  });
  m.classList.add("show");
  const sov=$("sideOverlay"); if(sov){sov.style.display="block";sov.classList.add("show");}
}
function openPage(name){
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const home=document.getElementById("homePage");
  if(name==="home" && home){ home.style.display="block"; }
  const target=document.getElementById(name+"Page");
  if(target){ target.style.display="block"; }
  if(target || (name==="home" && home)){
    try { sessionStorage.setItem("instapro-last-page", name); } catch (_) {}
  }
  closeAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded",()=>{
  installGlobalGlassStyles();

  // Restore the last app page after refresh instead of always returning to Home.
  try {
    const savedPage = sessionStorage.getItem("instapro-last-page");
    const savedTarget = savedPage && document.getElementById(savedPage + "Page");
    if (savedTarget && savedTarget.classList.contains("page")) {
      document.querySelectorAll(".page").forEach(page => { page.style.display = "none"; });
      savedTarget.style.display = savedPage === "chat" ? "flex" : "block";
    }
  } catch (_) {}
  // HOME ADD (+) BUTTON: open the create sheet.
  const addButton = $("addBtn");
  if (addButton) {
    addButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openSheet();
    });
  }

  // TOP BUTTONS - FINAL
  $("menuBtn")?.addEventListener("click", openMenu);
  bindSideMenuItems();
  try { applyAppTheme(localStorage.getItem("instapro-theme") || "dark"); applyDataSaver(localStorage.getItem("instapro-data-saver") === "1"); applyReduceMotion(localStorage.getItem("instapro-reduce-motion") === "1"); applyPersonalCustomization(currentAppSettings); } catch (_) {}
  // Secret settings: hidden until a genuine 2-second press on the brand.
  const brand = document.querySelector(".topGlass .logo");
  // Remove any stale/duplicate trigger so refresh can never reveal it by itself.
  document.querySelectorAll("#instaproSecretTrigger").forEach(node => node.remove());
  if (brand) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "instaproSecretTrigger";
    trigger.textContent = "⚙️ Insta Pro Settings";
    trigger.setAttribute("aria-label", "Open Insta Pro Secret Settings");
    trigger.setAttribute("aria-hidden", "true");
    trigger.style.setProperty("display", "none", "important");
    trigger.style.visibility = "hidden";
    trigger.style.pointerEvents = "none";
    brand.insertAdjacentElement("afterend", trigger);
    let holdTimer = null;
    let revealed = false;
    const stopHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null; };
    // Disable Android text selection / Google Search popup while pressing the logo.
    brand.style.setProperty("touch-action", "none", "important");
    brand.style.setProperty("-webkit-touch-callout", "none", "important");
    brand.style.setProperty("user-select", "none", "important");
    brand.style.setProperty("-webkit-user-select", "none", "important");
    const revealTrigger = () => {
      revealed = true;
      trigger.classList.add("visible");
      trigger.style.setProperty("display", "inline-flex", "important");
      trigger.style.visibility = "visible";
      trigger.style.pointerEvents = "auto";
      trigger.setAttribute("aria-hidden", "false");
    };
    const startHold = event => {
      if (event.type === "pointerdown" && event.pointerType === "mouse" && event.button !== 0) return;
      stopHold();
      holdTimer = setTimeout(revealTrigger, 2000);
    };
    brand.addEventListener("contextmenu", event => { event.preventDefault(); event.stopPropagation(); });
    brand.addEventListener("selectstart", event => event.preventDefault());
    // Use Pointer Events only: mixing touchstart + pointerup cancels the timer on Android.
    brand.addEventListener("pointerdown", startHold);
    ["pointerup", "pointercancel", "pointerleave"].forEach(name => brand.addEventListener(name, stopHold));
    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (revealed) openSettingsPanel(true);
    });
    trigger.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        revealed = false;
        trigger.classList.remove("visible");
        trigger.style.setProperty("display", "none", "important");
        trigger.style.visibility = "hidden";
        trigger.style.pointerEvents = "none";
        trigger.setAttribute("aria-hidden", "true");
      }
    });
  }
  $("notifBtn")?.addEventListener("click", async () => {
  try {
    const m = await import("./notifications.js");
    m.openNotif();
  } catch (error) {
    console.error("Notifications open error:", error);
    alert("Notifications error: " + error.message);
  }
});
  
  // CHAT BUTTON - Top right send icon
  const chatIcons = document.querySelectorAll(".iconGlass");
  if(chatIcons[1]) chatIcons[1].addEventListener("click", ()=>openPage("chat"));

  // OVERLAYS - Close on click
  ["overlay","sideOverlay","sheetOverlay","profileOverlay"].forEach(id=>{
    $(id)?.addEventListener("click", closeAll);
  });
  $("closeMenu")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);


  // Show the signed-in user's real profile photo in the bottom Profile tab.
  let bottomAvatarUnsubscribe = null;
  let bottomAvatarBoundUid = null;
  let bottomAvatarRequest = 0;

  async function syncBottomProfileAvatar() {
    const avatar = document.getElementById("myAvatar");
    const largeAvatar = document.getElementById("myAvatarLarge");
    if (!avatar) return;

    const fallback = "https://www.gravatar.com/avatar/?d=mp";
    const requestId = ++bottomAvatarRequest;

    try {
      const { auth, db } = await import("./firebase.js");
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        if (bottomAvatarUnsubscribe) bottomAvatarUnsubscribe();
        bottomAvatarUnsubscribe = null;
        bottomAvatarBoundUid = null;
        [avatar, largeAvatar].filter(Boolean).forEach(img => {
          img.src = fallback;
          img.alt = "Your profile";
          img.style.objectFit = "cover";
        });
        return;
      }

      const { doc, getDoc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      if (requestId !== bottomAvatarRequest || auth.currentUser?.uid !== user.uid) return;

      const userRef = doc(db, "users", user.uid);
      const applyPhoto = data => {
        const photo = data?.photoURL || data?.photoUrl || data?.profilePic || data?.photo || data?.avatar || auth.currentUser?.photoURL || fallback;
        [avatar, largeAvatar].filter(Boolean).forEach(img => {
          if (img.getAttribute("src") !== photo) img.src = photo;
          img.alt = "Your profile";
          img.style.objectFit = "cover";
        });
      };

      const snap = await getDoc(userRef);
      if (requestId !== bottomAvatarRequest || auth.currentUser?.uid !== user.uid) return;
      applyPhoto(snap.exists() ? snap.data() : {});

      if (bottomAvatarBoundUid !== user.uid) {
        if (bottomAvatarUnsubscribe) bottomAvatarUnsubscribe();
        bottomAvatarBoundUid = user.uid;
        bottomAvatarUnsubscribe = onSnapshot(userRef, latest => {
          if (auth.currentUser?.uid !== user.uid) return;
          applyPhoto(latest.exists() ? latest.data() : {});
        }, error => console.warn("Bottom profile photo listener:", error));
      }
    } catch (error) {
      console.warn("Could not sync bottom profile photo:", error);
    }
  }

  syncBottomProfileAvatar();
  import("./firebase.js").then(({ auth }) => {
    auth.onAuthStateChanged?.(() => syncBottomProfileAvatar());
  }).catch(error => console.warn("Profile photo auth sync:", error));

  // BOTTOM NAV - GLASS PROFILE FIX
  document.querySelectorAll(".bBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (btn.id === "addBtn") return;

      document.querySelectorAll(".bBtn").forEach(b => {
        b.classList.remove("active");
      });

      btn.classList.add("active");

      const v = btn.dataset.v;
      console.log("Nav Clicked:", v);

      if (v === "home") {
        openPage("home");
        return;
      }

      if (v === "search") {
        openPage("explore");
        return;
      }

      if (v === "reels") {
        openPage("reels");
        return;
      }

      if (v === "profile") {
        try {
          const { auth } = await import("./firebase.js");
          const user = auth.currentUser;

          if (!user || user.isAnonymous) {
            console.error("Login user nahi mila");
            alert("Pehle Google se login karein.");
            return;
          }
          await import("./profile.js");
          if (typeof window.openProfile === "function") {
            await window.openProfile(user.uid);
          } else {
            console.error("Profile function nahi mila");
            alert("Glass Profile load nahi hua. profile.js check karein.");
          }
        } catch (error) {
          console.error("Profile open error:", error);
          alert("Profile error: " + error.message);
        }

        return;
      }
    });
  });

  openPage("home");
  console.log("✅ Navigation initialized");
});
