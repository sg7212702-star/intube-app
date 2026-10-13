// app.js - ALL BUTTON WORKING - FINAL FIX - NO OVERLAP
const $ = id => document.getElementById(id);

// Load the standalone Music Library without changing index.html or style.css.
import("./music.js").catch(error => console.error("Music Library failed to load:", error));

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
  s.classList.add("show"); s.style.bottom="0";
  const ov=$("overlay"); if(ov){ ov.style.display="block"; ov.classList.add("show"); }
  const sov=$("sheetOverlay"); if(sov) sov.style.display="block";
}


let settingsUnsubscribe = null;
let currentAppSettings = { theme: "dark", browserNotifications: false, dataSaver: false, reduceMotion: false };

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
    body.instapro-light-mode #homePage,body.instapro-light-mode .page{color:#161616}
    body.instapro-light-mode .topGlass,body.instapro-light-mode .bottomGlass,body.instapro-light-mode .sideGlass,body.instapro-light-mode .sheetGlass{background:rgba(250,250,252,.96)!important;color:#161616!important}
    body.instapro-light-mode .mItem,body.instapro-light-mode .sOpt{color:#161616!important}
    body.instapro-reduce-motion *,body.instapro-reduce-motion *::before,body.instapro-reduce-motion *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
    @media(min-width:600px){#instaproSettingsPanel{align-items:center;padding:16px}#instaproSettingsPanel .isp-card{border-radius:24px;max-height:85dvh}}
  `;
  document.head.appendChild(style);
}

function settingsPanelMarkup(user) {
  const theme = currentAppSettings.theme === "light";
  const notifications = currentAppSettings.browserNotifications === true;
  return `
    <div class="isp-card" role="dialog" aria-modal="true" aria-label="Settings and activity">
      <div class="isp-head"><button id="ispBack" aria-label="Back">‹</button><div class="isp-title">Settings and activity</div><button id="ispClose" aria-label="Close">×</button></div>
      <div class="isp-subtitle">Your account</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Signed in account</div><div class="isp-desc">${escapeSettingsText(user?.email || user?.displayName || "Google account")}</div></div><button class="isp-action" id="ispProfile">Profile</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Saved posts</div><div class="isp-desc">Open your profile to view posts you saved.</div></div><button class="isp-action" id="ispSaved">Open</button></div>
      <div class="isp-subtitle" style="margin-top:18px">Creator tools</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Creator analytics</div><div class="isp-desc">Views, likes, followers and the last 28 days.</div></div><button class="isp-action" id="ispCreatorAnalytics">View</button></div>
      <div class="isp-subtitle" style="margin-top:18px">How you use InstaPro</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Light appearance</div><div class="isp-desc">Change the app's appearance on this device and save your choice.</div></div><button class="isp-switch ${theme ? "on" : ""}" id="ispTheme" role="switch" aria-checked="${theme}" aria-label="Light appearance"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Browser notifications</div><div class="isp-desc">Allow this browser to show notifications, if supported.</div></div><button class="isp-switch ${notifications ? "on" : ""}" id="ispNotifications" role="switch" aria-checked="${notifications}" aria-label="Browser notifications"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Data saver</div><div class="isp-desc">Use lazy-loaded images and lighter video preloading on this device.</div></div><button class="isp-switch ${currentAppSettings.dataSaver ? "on" : ""}" id="ispDataSaver" role="switch" aria-checked="${!!currentAppSettings.dataSaver}" aria-label="Data saver"></button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Reduce motion</div><div class="isp-desc">Reduce app animations and transitions on this device.</div></div><button class="isp-switch ${currentAppSettings.reduceMotion ? "on" : ""}" id="ispReduceMotion" role="switch" aria-checked="${!!currentAppSettings.reduceMotion}" aria-label="Reduce motion"></button></div>
      <div class="isp-subtitle" style="margin-top:18px">More information</div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Help and support</div><div class="isp-desc">For a problem, note the screen and error message.</div></div><button class="isp-action" id="ispHelp">Help</button></div>
      <div class="isp-row"><div class="isp-copy"><div class="isp-label">Log out</div><div class="isp-desc">Sign out of the current Google account on this app.</div></div><button class="isp-action" id="ispLogout">Log out</button></div>
      <div class="isp-status" id="ispStatus" aria-live="polite"></div>
    </div>`;
}

function escapeSettingsText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function applyAppTheme(theme) {
  currentAppSettings.theme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("instapro-light-mode", currentAppSettings.theme === "light");
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

async function openSettingsPanel() {
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
  panel.innerHTML = settingsPanelMarkup(user);
  panel.classList.add("open");
  const status = () => panel.querySelector("#ispStatus");
  const close = () => panel.classList.remove("open");
  panel.querySelector("#ispClose").onclick = close;
  panel.querySelector("#ispBack").onclick = close;
  panel.onclick = event => { if (event.target === panel) close(); };
  panel.querySelector("#ispCreatorAnalytics").onclick = () => openCreatorAnalytics(user, panel);
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

  try {
    if (settingsUnsubscribe) settingsUnsubscribe();
    const { onSnapshot, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    settingsUnsubscribe = onSnapshot(doc(db, "users", user.uid), snapshot => {
      const saved = snapshot.exists() ? snapshot.data().appSettings : null;
      if (!saved) return;
      currentAppSettings = { ...currentAppSettings, ...saved };
      applyAppTheme(currentAppSettings.theme);
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
  m.classList.add("show");
  const sov=$("sideOverlay"); if(sov){ sov.style.display="block"; sov.classList.add("show"); }
  // Settings panel and menu actions are implemented in this file; do not import a missing settings.js.
}

function openPage(name){
  document.querySelectorAll(".page").forEach(p=>p.style.display="none");
  const home=document.getElementById("homePage");
  if(name==="home" && home){ home.style.display="block"; }
  const target=document.getElementById(name+"Page");
  if(target){ target.style.display="block"; }
  closeAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("DOMContentLoaded",()=>{
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
  try { applyAppTheme(localStorage.getItem("instapro-theme") || "dark"); applyDataSaver(localStorage.getItem("instapro-data-saver") === "1"); applyReduceMotion(localStorage.getItem("instapro-reduce-motion") === "1"); } catch (_) {}
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
