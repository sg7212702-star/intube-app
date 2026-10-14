// chat.js - InstaPro real-time direct messages
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, arrayRemove, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const CHAT_CLOUDINARY_NAME = "kujnbe0a";
const CHAT_CLOUDINARY_PRESET = "intube_free";

let currentUser = null;
let selectedUser = null;
let allUsers = [];
let chatListener = null;
let listListener = null;
let usersListener = null;
let currentChatMap = new Map();
let messageCache = [];
let replyTarget = null;

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));
const photoOf = user => user?.photoURL || user?.photo || "https://www.gravatar.com/avatar/?d=mp";
const nameOf = user => user?.username || user?.displayName || user?.name || user?.email?.split("@")[0] || "user";
const chatIdFor = (a, b) => [a, b].sort().join("_");

function syncChatKeyboardLayout() {
  const form = $("chatForm"), msgs = $("chatMsgs"), box = $("chatBoxView");
  if (!form || !msgs || !box || box.style.display === "none") return;
  const vv = window.visualViewport;
  const viewportHeight = vv ? vv.height : window.innerHeight;
  const viewportTop = vv ? vv.offsetTop : 0;
  const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - viewportTop);
  const focused = document.activeElement === $("chatInput") || document.activeElement === $("chatMessageSearch");
  box.style.setProperty("position", "fixed", "important");
  box.style.setProperty("top", viewportTop + "px", "important");
  box.style.setProperty("height", viewportHeight + "px", "important");
  box.style.setProperty("min-height", "0", "important");
  box.style.setProperty("bottom", "auto", "important");
  form.style.setProperty("position", "fixed", "important");
  form.style.setProperty("left", "50%", "important");
  form.style.setProperty("right", "auto", "important");
  form.style.setProperty("width", "100%", "important");
  form.style.setProperty("max-width", "470px", "important");
  form.style.setProperty("transform", "translateX(-50%)", "important");
  form.style.setProperty("bottom", keyboardInset + "px", "important");
  form.style.setProperty("z-index", "10020", "important");
  const formHeight = form.getBoundingClientRect().height || 60;
  const header = box.firstElementChild;
  msgs.style.setProperty("position", "absolute", "important");
  msgs.style.setProperty("top", (header ? header.getBoundingClientRect().height : 56) + "px", "important");
  msgs.style.setProperty("bottom", (formHeight + keyboardInset) + "px", "important");
  msgs.style.setProperty("overflow-y", "auto", "important");
  msgs.style.setProperty("width", "100%", "important");
  msgs.style.setProperty("box-sizing", "border-box", "important");
  if (focused) requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
}

function injectChatStyles() {
  if (document.getElementById("instaproChatMotionStyles")) return;
  const style = document.createElement("style");
  style.id = "instaproChatMotionStyles";
  style.textContent = `
    #chatPage { color:#f7f7f7; }
    #chatPage button, #chatPage input { -webkit-tap-highlight-color:transparent; }
    #chatPage button { transition:transform .16s ease, opacity .16s ease, background-color .2s ease, box-shadow .2s ease; }
    #chatPage button:active { transform:scale(.94); }
    #chatPage #chatListView { animation: ipChatPageIn .32s cubic-bezier(.2,.75,.25,1) both; }
    #chatPage #chatBoxView { animation: ipChatPageIn .26s cubic-bezier(.2,.75,.25,1) both; }
    #chatPage #usersList > button { animation: ipChatRowIn .32s ease both; }
    #chatPage #usersList > button:nth-child(2) { animation-delay:.025s; }
    #chatPage #usersList > button:nth-child(3) { animation-delay:.05s; }
    #chatPage #usersList > button:nth-child(4) { animation-delay:.075s; }
    #chatPage #usersList > button:nth-child(5) { animation-delay:.1s; }
    #chatPage #usersList > button:hover { background:rgba(255,255,255,.055)!important; }
    #chatPage #chatMsgs [data-message-id] { animation: ipChatBubbleIn .24s cubic-bezier(.2,.8,.25,1) both; transform-origin:bottom; }
    #chatPage #chatForm { gap:8px!important; background:rgba(255,255,255,.94)!important; border:1px solid rgba(255,255,255,.85)!important; border-radius:34px!important; margin:0 auto 8px!important; width:calc(100% - 28px)!important; max-width:470px!important; padding:8px 10px!important; box-shadow:0 5px 24px rgba(0,0,0,.2)!important; }
    #chatPage .ip-composer-icon { width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;background:transparent;color:#d62976;font-size:23px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s ease,background .16s ease; }
    #chatPage .ip-composer-icon:active { transform:scale(.9);background:rgba(214,41,118,.12); }
    #chatPage .ip-composer-icon svg,#chatPage .ip-header-action svg{width:25px;height:25px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    #chatPage .ip-header-action{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .18s ease,transform .18s ease}
    #chatPage .ip-header-action:active{background:rgba(214,41,118,.12)!important;transform:scale(.92)}
    #chatPage .ip-composer-icon{width:36px;height:40px;flex:0 0 36px;border:0;border-radius:50%;background:transparent;color:#d62976;font-size:23px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s ease,background .16s ease}
    #chatPage .ip-composer-icon svg{width:27px;height:27px}
    #chatPage #chatCamera svg{width:25px;height:25px}
    #chatPage #chatForm{min-height:58px!important;gap:5px!important}
    #chatPage #chatInput{font-style:italic;font-family:Georgia,serif}

    #chatPage #chatInput::placeholder { color:#777;opacity:1; }
    #chatPage #chatForm { z-index:10020!important; padding-bottom:max(8px, env(safe-area-inset-bottom))!important; } padding-bottom:max(8px, env(safe-area-inset-bottom))!important; }
    #chatPage #chatBoxView { height:100dvh; height:100vh; }
    #chatPage #chatMsgs { min-height:0; overscroll-behavior:contain; scroll-behavior:smooth; }
    #chatPage #chatForm button { flex-shrink:0; }
    #chatPage #chatInput { font-size:16px; }
    #chatPage #chatInput:focus, #chatPage #userSearch:focus, #chatPage #chatMessageSearch:focus { border-color:rgba(0,149,246,.85)!important; box-shadow:0 0 0 3px rgba(0,149,246,.12); transition:box-shadow .18s ease,border-color .18s ease; }
    #chatPage #chatSend { transition:transform .16s ease,filter .2s ease,opacity .2s ease; }
    #chatPage #chatSend:hover { filter:brightness(1.12); box-shadow:0 5px 22px rgba(0,149,246,.28)!important; }
    #chatPage #chatInfoPanel { animation:ipChatFadeIn .18s ease both; }
    #chatPage #chatInfoPanel > div { animation:ipChatModalIn .24s cubic-bezier(.2,.8,.25,1) both; }
    #chatPage #chatReplyPreview { animation:ipChatSlideUp .2s ease both; }
    #chatPage .ip-heart-pop { animation:ipChatHeart .42s cubic-bezier(.2,.8,.25,1) both; }
    @keyframes ipChatPageIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ipChatRowIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ipChatBubbleIn { from { opacity:0; transform:translateY(8px) scale(.975); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes ipChatFadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes ipChatModalIn { from { opacity:0; transform:translateY(12px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes ipChatSlideUp { from { opacity:0; transform:translate(-50%,8px); } to { opacity:1; transform:translate(-50%,0); } }
    @keyframes ipChatHeart { 0% { transform:scale(.7); opacity:.4; } 55% { transform:scale(1.18); opacity:1; } 100% { transform:scale(1); opacity:1; } }
    @media (prefers-reduced-motion:reduce) {
      #chatPage *, #chatPage *::before, #chatPage *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; }
    }
  `;
  document.head.appendChild(style);
  if (window.visualViewport && !window.visualViewport.__instaChatBound) { window.visualViewport.__instaChatBound = true; window.visualViewport.addEventListener("resize", syncChatKeyboardLayout); window.visualViewport.addEventListener("scroll", syncChatKeyboardLayout); }
  window.addEventListener("resize", syncChatKeyboardLayout);
}

function setupUI() {
  injectChatStyles();
  const page = $("chatPage");
  if (!page || page.dataset.instaProChatReady === "true") return;
  page.dataset.instaProChatReady = "true";
  page.innerHTML = `
  <div id="chatListView" style="display:block; min-height:100vh; background:#000; position:relative;">
    <div style="position:sticky; top:0; z-index:10; background:rgba(0,0,0,0.8); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,.08);">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px;">
        <div style="display:flex; align-items:center; gap:12px;"><div class="backBtn" id="chatBackHome" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer;">←</div><b id="chatOwnName" style="font-size:18px;">Messages</b></div>
        <div style="display:flex; gap:18px; font-size:22px;"><span aria-label="Video call">📹</span><span aria-label="New message">✏️</span></div>
      </div>
      <div style="padding:0 14px 10px;">
        <div style="display:flex; gap:8px; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,.08);">
          <span style="opacity:.5;">🔍</span><input id="userSearch" placeholder="Search" style="flex:1; background:transparent; border:0; color:#fff; outline:none;">
        </div>
      </div>
      <div style="display:flex; gap:14px; padding:6px 14px 12px; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="text-align:center;"><div style="width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,.1); display:flex; align-items:center; justify-content:center; font-size:22px;">+</div><div style="font-size:11px; margin-top:4px; opacity:.7;">Your note</div></div>
        <div id="storyInChat" style="display:flex; gap:14px;"></div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; padding:12px 16px; font-size:13px;"><b>Messages</b><span style="color:#0095f6;">Requests (0)</span></div>
    <div id="usersList" style="padding-bottom:80px;"></div>
  </div>
  <div id="chatBoxView" style="display:none; min-height:100vh; flex-direction:column; background:#000; position:fixed; inset:0; z-index:10002;">
    <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.1); background:rgba(15,15,18,.78);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 8px 24px rgba(0,0,0,.18);">
      <div class="backBtn" id="backToList" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer;">←</div>
      <div style="width:34px; height:34px; border-radius:50%; padding:2px; background:linear-gradient(45deg,#feda75,#d62976,#962fbf);"><img id="chatWithAvatar" src="https://www.gravatar.com/avatar/?d=mp" style="width:100%; height:100%; border-radius:50%; border:2px solid #000; object-fit:cover;"></div>
      <div style="flex:1;"><b id="chatWithName" style="font-size:14px; display:block;">username</b><span style="font-size:11px; opacity:.6;">InstaPro messages</span></div>
      <div style="display:flex; gap:8px; font-size:20px; align-items:center;"><button id="chatAudioCall" type="button" aria-label="Start audio call" title="Audio call" class="ip-header-action" style="border:0;background:transparent;color:#d62976;cursor:pointer;padding:5px;" ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8 9.1 3c.7-.2 1.4.2 1.6.9l1 3.1c.2.6 0 1.2-.5 1.6l-1.5 1.1a14 14 0 0 0 5.7 5.7l1.1-1.5c.4-.5 1-.7 1.6-.5l3.1 1c.7.2 1.1.9.9 1.6l-.8 2.5c-.2.6-.8 1-1.4 1C10.8 19.5 4.5 13.2 4.5 5.2c0-.6.4-1.2 1-1.4Z"/></svg></button><button id="chatVideoCall" type="button" aria-label="Start video call" title="Video call" class="ip-header-action" style="border:0;background:transparent;color:#d62976;cursor:pointer;padding:5px;"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg></button><button id="chatInfoToggle" type="button" aria-label="Chat details" class="ip-header-action" style="border:0;background:transparent;color:#fff;cursor:pointer;"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></button></div>
    </div>
    <div id="chatMsgs" style="flex:1; overflow-y:auto; padding:14px 12px 90px; display:flex; flex-direction:column; gap:6px; background:#000;"></div>
    <div id="chatInfoPanel" style="display:none;position:fixed;inset:0;z-index:10004;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);padding:24px;box-sizing:border-box;align-items:center;justify-content:center;"><div style="width:100%;max-width:360px;border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:22px;background:rgba(28,28,32,.97);text-align:center;color:#fff;"><img id="chatInfoAvatar" alt="" style="width:76px;height:76px;border-radius:50%;object-fit:cover;"><h3 id="chatInfoName" style="margin:12px 0 4px;"></h3><p id="chatInfoUsername" style="opacity:.65;font-size:13px;"></p><button id="chatInfoProfile" type="button" style="padding:10px 16px;border-radius:18px;border:1px solid #555;background:#333;color:#fff;">View Profile</button><button id="chatInfoClose" type="button" style="display:block;width:100%;margin-top:16px;padding:10px;border:0;border-radius:16px;background:#444;color:#fff;">Close</button></div></div>
    <div id="chatReplyPreview" style="display:none;position:fixed;bottom:62px;left:50%;transform:translateX(-50%);width:100%;max-width:470px;box-sizing:border-box;padding:8px 14px;background:rgba(30,30,34,.96);border-top:1px solid rgba(255,255,255,.12);color:#fff;font-size:12px;z-index:2;"><span id="chatReplyText" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:30px;"></span><button id="chatCancelReply" type="button" style="position:absolute;right:12px;top:6px;border:0;background:transparent;color:#fff;font-size:18px;">×</button></div>
    <form id="chatForm" style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:470px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:rgba(12,12,14,.82);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.13);box-shadow:0 -8px 30px rgba(0,0,0,.22);box-sizing:border-box;">
      <button id="chatCamera" type="button" aria-label="Take photo" title="Camera" class="ip-composer-icon" style="background:#6854f7;color:white;border-radius:50%;width:44px;height:44px;flex:0 0 44px;"> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="4"/></svg></button>
      <input id="chatCameraInput" type="file" accept="image/*" capture="environment" hidden>
      <input id="chatInput" maxlength="4000" autocomplete="off" placeholder="Message..." style="flex:1; min-width:0; padding:12px 8px; border:0;background:transparent;color:#222;outline:none;font-style:italic;font-family:Georgia,serif;font-size:16px;">
      <button id="chatClearDraft" type="button" aria-label="Clear message" title="Clear message" class="ip-composer-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg></button>
      <button id="chatVoice" type="button" aria-label="Record voice message" title="Voice message" class="ip-composer-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg></button>
      <button id="chatAttach" type="button" aria-label="Photo or video" title="Gallery" class="ip-composer-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg></button>
      <input id="chatMediaInput" type="file" accept="image/*,video/*" hidden>
      <button id="chatSticker" type="button" aria-label="Stickers and emoji" title="Stickers and emoji" class="ip-composer-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M8 14s1.3 2 4 2 4-2 4-2"/></svg></button>
      <button id="chatMore" type="button" aria-label="More attachments" title="More" class="ip-composer-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></button>
      <button id="chatEmoji" type="button" aria-label="Insert emoji" style="display:none;">☺</button>
      <button id="chatSend" type="submit" style="display:none;">Send</button>
    </form>
  </div>`;

  $("chatBackHome")?.addEventListener("click", () => {
    document.querySelector('.bBtn[data-v="home"]')?.click();
  });
  $("backToList")?.addEventListener("click", closeChat);
  $("chatAudioCall")?.addEventListener("click", () => startDirectCall("audio"));
  $("chatVideoCall")?.addEventListener("click", () => startDirectCall("video"));
  $("chatForm")?.addEventListener("submit", sendMsg);
  $("chatInput")?.addEventListener("focus", () => setTimeout(syncChatKeyboardLayout, 80));
  $("chatInput")?.addEventListener("input", syncChatKeyboardLayout);
  $("chatMessageSearch")?.addEventListener("focus", () => setTimeout(syncChatKeyboardLayout, 80));
  $("chatInput")?.addEventListener("blur", () => setTimeout(syncChatKeyboardLayout, 120));
  $("chatEmoji")?.addEventListener("click", () => {
    const input = $("chatInput");
    if (!input) return;
    const choices = ["❤️","😂","🥹","😍","👍","🙏","🔥","🎉","😮","😭","😊","😘","💯","✨","👋","🤝"];
    const choice = prompt("Emoji choose karein:\\n" + choices.join(" "), "❤️");
    if (!choice || !choices.includes(choice.trim())) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + choice.trim() + input.value.slice(end);
    input.focus();
    input.setSelectionRange(start + choice.trim().length, start + choice.trim().length);
  });
  $("chatCancelReply")?.addEventListener("click", clearReply);
  $("chatMessageSearch")?.addEventListener("input", event => filterChatMessages(event.target.value));
  $("chatInfoToggle")?.addEventListener("click", openChatInfo);
  $("chatInfoClose")?.addEventListener("click", () => { $("chatInfoPanel").style.display = "none"; });
  $("chatInfoPanel")?.addEventListener("click", event => { if (event.target.id === "chatInfoPanel") event.currentTarget.style.display = "none"; });
  $("chatCamera")?.addEventListener("click", () => $("chatCameraInput")?.click());
  $("chatCameraInput")?.addEventListener("change", async event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await sendMedia(file, "image"); });
  $("chatClearDraft")?.addEventListener("click", () => { const input = $("chatInput"); if (input) { input.value = ""; input.focus(); } });
  $("chatSticker")?.addEventListener("click", () => { const input = $("chatInput"); if (!input) return; const choice = prompt("Emoji / sticker type karein:", "❤️ 😊 😂 🔥"); if (choice) { input.value += choice; input.focus(); input.dispatchEvent(new Event("input",{bubbles:true})); } });
  $("chatMore")?.addEventListener("click", () => { const choice = prompt("Attachment: 1 Photo/Video, 2 Voice message, 3 Emoji", "1"); if (choice === "1") $("chatMediaInput")?.click(); else if (choice === "2") toggleVoiceRecording(); else if (choice === "3") $("chatSticker")?.click(); });
  $("chatAttach")?.addEventListener("click", () => $("chatMediaInput")?.click());
  $("chatMediaInput")?.addEventListener("change", async event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await sendMedia(file, file.type.startsWith("video/") ? "video" : "image"); });
  $("chatVoice")?.addEventListener("click", toggleVoiceRecording);
  $("userSearch")?.addEventListener("input", event => {
    const q = event.target.value.trim().toLowerCase();
    renderList(allUsers.filter(user =>
      nameOf(user).toLowerCase().includes(q) ||
      String(user.name || "").toLowerCase().includes(q)
    ));
  });
}

function showChatMessage(message) {
  const box = $("chatMsgs");
  if (box) box.innerHTML = '<p style="text-align:center;opacity:.65;padding:24px;">' + escapeHTML(message) + '</p>';
}

function closeChat() {
  if (chatListener) chatListener();
  chatListener = null;
  selectedUser = null;
  $("chatBoxView").style.display = "none";
  $("chatListView").style.display = "block";
  document.body.style.overflow = "";
}

async function loadUsersAndChats() {
  if (!currentUser || currentUser.isAnonymous) {
    renderList([]);
    showChatMessage("Please sign in with Google to send messages.");
    return;
  }
  // Realtime users: new accounts and profile changes appear without refreshing.
  if (usersListener) usersListener();
  if (listListener) listListener();
  usersListener = onSnapshot(collection(db, "users"), snapshot => {
    allUsers = snapshot.docs
      .filter(item => item.id !== currentUser.uid)
      .map(item => ({ uid: item.id, ...item.data() }));
    renderStories();
    renderList(allUsers, currentChatMap);
  }, error => {
    console.error("Realtime users listener error:", error);
    showChatMessage("Users load nahi hue. Internet aur Firestore Rules check karein.");
  });

  const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
  listListener = onSnapshot(chatsQuery, snapshot => {
    currentChatMap = new Map();
    snapshot.docs.forEach(item => {
      const data = item.data();
      const otherUid = (data.participants || []).find(uid => uid !== currentUser.uid) || data.otherUid;
      if (otherUid) currentChatMap.set(otherUid, data);
    });
    renderList(allUsers, currentChatMap);
  }, error => {
    console.error("Chat list error:", error);
    renderList(allUsers, currentChatMap);
  });
}

function renderStories() {
  const row = $("storyInChat");
  if (!row) return;
  row.innerHTML = "";
  allUsers.slice(0, 12).forEach(user => {
    const item = document.createElement("button");
    item.type = "button";
    item.style.cssText = "border:0;background:transparent;color:white;padding:0;min-width:60px;text-align:center;cursor:pointer;";
    item.innerHTML = `<div style="width:56px;height:56px;border-radius:50%;padding:2px;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf);box-sizing:border-box;"><img src="${escapeHTML(photoOf(user))}" alt="" style="width:100%;height:100%;border-radius:50%;border:2px solid #000;object-fit:cover;box-sizing:border-box;"></div><div style="font-size:10px;margin-top:4px;width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(nameOf(user))}</div>`;
    item.addEventListener("click", () => openChat(user));
    row.appendChild(item);
  });
}

function renderList(users, chatMap = new Map()) {
  const list = $("usersList");
  if (!list) return;
  if (!currentUser || currentUser.isAnonymous) {
    list.innerHTML = '<div style="text-align:center;opacity:.65;padding:40px;">Sign in to use InstaPro messages.</div>';
    return;
  }
  if (!users.length) {
    list.innerHTML = '<div style="text-align:center;opacity:.55;padding:40px;">No other users yet<br><small>Invite friends to join InstaPro</small></div>';
    return;
  }
  const visibleUsers = users.filter(user => !chatMap.get(user.uid)?.hiddenFor?.map(String).includes(String(currentUser.uid)));
  const sorted = [...visibleUsers].sort((a, b) => {
    const aTime = chatMap.get(a.uid)?.updatedAt?.toMillis?.() || 0;
    const bTime = chatMap.get(b.uid)?.updatedAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
  list.innerHTML = "";
  sorted.forEach(user => {
    const chat = chatMap.get(user.uid) || {};
    const row = document.createElement("button");
    row.type = "button";
    row.style.cssText = "width:100%;display:flex;align-items:center;gap:12px;padding:10px 16px;border:0;background:transparent;color:white;text-align:left;cursor:pointer;";
    row.innerHTML = `<img src="${escapeHTML(photoOf(user))}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;background:#222;"><span style="flex:1;min-width:0;"><b style="display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(nameOf(user))}</b><small style="display:block;margin-top:5px;opacity:.62;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(chat.lastMessage || "Tap to message")}</small></span><span style="opacity:.55;">›</span>`;
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "🗑";
    deleteButton.title = "Delete chat";
    deleteButton.setAttribute("aria-label", "Delete chat");
    deleteButton.style.cssText = "flex:0 0 36px;width:36px;height:36px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.08);backdrop-filter:blur(14px);color:#fff;cursor:pointer;";
    deleteButton.addEventListener("click", event => { event.stopPropagation(); deleteChatForMe(user.uid); });
    row.appendChild(deleteButton);
    row.addEventListener("click", () => openChat(user));
    list.appendChild(row);
  });
}

let activeCall = null;
let incomingCallUnsubscribe = null;
let callStatusUnsubscribe = null;
let localStream = null;
let remoteStream = null;
let callCandidatesUnsubscribers = [];

const rtcConfig = { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
] };

function ensureCallUI() {
  if ($("ipCallOverlay")) return;
  const el = document.createElement("div");
  el.id = "ipCallOverlay";
  el.style.cssText = "position:fixed;inset:0;z-index:200000;background:#101014;color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;font-family:Arial,sans-serif";
  el.innerHTML = '<div id="ipCallTitle" style="font-size:24px;font-weight:700;margin:12px"></div><div id="ipCallStatus" style="opacity:.75;margin:8px 0 20px">Connecting…</div><video id="ipRemoteVideo" autoplay playsinline style="display:none;width:100%;max-height:58vh;object-fit:cover;border-radius:20px;background:#222"></video><video id="ipLocalVideo" autoplay muted playsinline style="display:none;position:absolute;right:18px;top:18px;width:100px;height:145px;object-fit:cover;border-radius:14px;background:#222"></video><div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:24px"><button id="ipAcceptCall" style="display:none;border:0;border-radius:30px;padding:14px 22px;background:#21b45b;color:#fff;font-weight:700">Answer</button><button id="ipMuteCall" style="border:0;border-radius:30px;padding:14px 22px;background:#333;color:#fff">Mute mic</button><button id="ipCameraCall" style="border:0;border-radius:30px;padding:14px 22px;background:#333;color:#fff">Camera off</button><button id="ipEndCall" style="border:0;border-radius:30px;padding:14px 22px;background:#e1306c;color:#fff;font-weight:700">End call</button></div>';
  document.body.appendChild(el);
  $("ipEndCall").onclick = () => endDirectCall(true);
  $("ipMuteCall").onclick = () => { if (!localStream) return; const track=localStream.getAudioTracks()[0]; if(track){track.enabled=!track.enabled;$("ipMuteCall").textContent=track.enabled?"Mute mic":"Unmute mic";} };
  $("ipCameraCall").onclick = () => { if (!localStream) return; const track=localStream.getVideoTracks()[0]; if(track){track.enabled=!track.enabled;$("ipCameraCall").textContent=track.enabled?"Camera off":"Camera on";} };
  $("ipAcceptCall").onclick = answerDirectCall;
}
function showCallUI(mode, status, incoming=false) {
  ensureCallUI();
  $("ipCallOverlay").style.display="flex";
  $("ipCallTitle").textContent=(mode==="video"?"Video":"Audio")+" call";
  $("ipCallStatus").textContent=status;
  $("ipAcceptCall").style.display=incoming?"inline-block":"none";
  $("ipCameraCall").style.display=mode==="video"?"inline-block":"none";
  $("ipRemoteVideo").style.display=mode==="video"?"block":"none";
  $("ipLocalVideo").style.display=mode==="video"?"block":"none";
}
async function startDirectCall(mode) {
  if (!currentUser || !selectedUser) return alert("Pehle chat open karein.");
  if (!selectedUser.uid && !selectedUser.id) return alert("Is user ki ID nahi mili; call nahi lag sakti.");
  if (activeCall) return alert("Pehle chal rahi call end karein.");
  const targetId=selectedUser.uid || selectedUser.id;
  try {
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode==="video"});
    remoteStream=new MediaStream();
    activeCall={id:doc(collection(db,"calls")).id,mode,from:currentUser.uid,to:targetId,initiator:true,pc:new RTCPeerConnection(rtcConfig)};
    showCallUI(mode,"Calling "+nameOf(selectedUser)+"…");
    $("ipLocalVideo").srcObject=localStream;
    $("ipRemoteVideo").srcObject=remoteStream;
    localStream.getTracks().forEach(track=>activeCall.pc.addTrack(track,localStream));
    activeCall.pc.ontrack=e=>{e.streams[0]?.getTracks().forEach(t=>remoteStream.addTrack(t));$("ipCallStatus").textContent="Connected";};
    activeCall.pc.onicecandidate=async e=>{if(e.candidate&&activeCall) await addDoc(collection(db,"calls",activeCall.id,"callerCandidates"),e.candidate.toJSON());};
    await setDoc(doc(db,"calls",activeCall.id),{from:currentUser.uid,to:targetId,fromName:nameOf(currentUser),fromPhoto:photoOf(currentUser),toName:nameOf(selectedUser),mode,status:"ringing",createdAt:serverTimestamp()});
    const offer=await activeCall.pc.createOffer();
    await activeCall.pc.setLocalDescription(offer);
    await updateDoc(doc(db,"calls",activeCall.id),{offer:{type:offer.type,sdp:offer.sdp}});
    callStatusUnsubscribe=onSnapshot(doc(db,"calls",activeCall.id),async snap=>{
      const data=snap.data(); if(!data||!activeCall)return;
      if(data.status==="ended"){await endDirectCall(false);return;}
      if(data.answer&&!activeCall.pc.currentRemoteDescription) { await activeCall.pc.setRemoteDescription(new RTCSessionDescription(data.answer)); $("ipCallStatus").textContent="Connecting…"; }
    });
    callCandidatesUnsubscribers.push(onSnapshot(collection(db,"calls",activeCall.id,"calleeCandidates"),s=>s.docChanges().forEach(ch=>{if(ch.type==="added"&&activeCall) activeCall.pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(()=>{});})));
  } catch(err) { await endDirectCall(false); alert("Call start nahi hui: "+(err?.message||"Microphone/camera permission ya secure connection check karein.")); }
}
async function answerDirectCall() {
  if(!activeCall||activeCall.initiator)return;
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:activeCall.mode==="video"});
    remoteStream=new MediaStream();
    $("ipLocalVideo").srcObject=localStream;$("ipRemoteVideo").srcObject=remoteStream;
    localStream.getTracks().forEach(t=>activeCall.pc.addTrack(t,localStream));
    activeCall.pc.ontrack=e=>{e.streams[0]?.getTracks().forEach(t=>remoteStream.addTrack(t));$("ipCallStatus").textContent="Connected";};
    activeCall.pc.onicecandidate=async e=>{if(e.candidate&&activeCall) await addDoc(collection(db,"calls",activeCall.id,"calleeCandidates"),e.candidate.toJSON());};
    await activeCall.pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
    const answer=await activeCall.pc.createAnswer();await activeCall.pc.setLocalDescription(answer);
    await updateDoc(doc(db,"calls",activeCall.id),{answer:{type:answer.type,sdp:answer.sdp},status:"active"});
    callCandidatesUnsubscribers.push(onSnapshot(collection(db,"calls",activeCall.id,"callerCandidates"),s=>s.docChanges().forEach(ch=>{if(ch.type==="added"&&activeCall)activeCall.pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(()=>{});})));
    $("ipCallStatus").textContent="Connecting…";
  }catch(err){alert("Call answer nahi hui: "+(err?.message||"Permission error"));await endDirectCall(true);}
}
async function endDirectCall(notify=true) {
  const call=activeCall; activeCall=null;
  if(callStatusUnsubscribe){callStatusUnsubscribe();callStatusUnsubscribe=null;}
  callCandidatesUnsubscribers.forEach(fn=>fn());callCandidatesUnsubscribers=[];
  try{if(notify&&call)await updateDoc(doc(db,"calls",call.id),{status:"ended",endedAt:serverTimestamp()});}catch{}
  try{call?.pc?.close();}catch{}
  localStream?.getTracks().forEach(t=>t.stop());localStream=null;remoteStream=null;
  if($("ipCallOverlay"))$("ipCallOverlay").style.display="none";
}
function listenForIncomingCalls() {
  if(incomingCallUnsubscribe||!currentUser||currentUser.isAnonymous)return;
  incomingCallUnsubscribe=onSnapshot(query(collection(db,"calls"),where("to","==",currentUser.uid),where("status","==","ringing")),snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type!=="added"||activeCall)return;
      const d=change.doc.data();
      if(Date.now()-(d.createdAt?.toMillis?.()||Date.now())>120000)return;
      activeCall={id:change.doc.id,mode:d.mode||"audio",from:d.from,to:d.to,initiator:false,offer:d.offer,pc:new RTCPeerConnection(rtcConfig)};
      activeCall.pc.onicecandidate=null;
      showCallUI(activeCall.mode,(d.fromName||"User")+" is calling…",true);
      $("ipCallTitle").textContent=(d.mode==="video"?"Video":"Audio")+" call";
      $("ipCallStatus").textContent=(d.fromName||"User")+" is calling you";
      activeCall.pc.onicecandidate=async e=>{if(e.candidate&&activeCall)await addDoc(collection(db,"calls",activeCall.id,"calleeCandidates"),e.candidate.toJSON());};
      callStatusUnsubscribe=onSnapshot(doc(db,"calls",activeCall.id),async s=>{const data=s.data();if(!data||!activeCall)return;if(data.status==="ended")await endDirectCall(false);});
      callCandidatesUnsubscribers.push(onSnapshot(collection(db,"calls",activeCall.id,"callerCandidates"),s=>s.docChanges().forEach(ch=>{if(ch.type==="added"&&activeCall)activeCall.pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(()=>{});})));
    });
  },err=>console.warn("Incoming call listener:",err));
}

function openChat(user) {
  if (!currentUser || currentUser.isAnonymous) {
    alert("Pehle Google se login karein.");
    return;
  }
  selectedUser = user;
  $("chatListView").style.display = "none";
  $("chatBoxView").style.display = "flex";
  $("chatWithName").textContent = nameOf(user);
  $("chatWithAvatar").src = photoOf(user);
  $("chatMsgs").innerHTML = '<p style="text-align:center;opacity:.6;">Loading messages…</p>';
  if (chatListener) chatListener();
  const chatId = chatIdFor(currentUser.uid, user.uid);
  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  chatListener = onSnapshot(messagesQuery, snapshot => {
    const box = $("chatMsgs");
    if (!box) return;
    if (snapshot.empty) {
      box.innerHTML = '<p style="text-align:center;opacity:.5;padding:24px;">Say hello 👋</p>';
      return;
    }
    const docs = snapshot.docs.filter(item => !(item.data().hiddenFor || []).map(String).includes(String(currentUser.uid)));
    if (!docs.length) { box.innerHTML = '<p style="text-align:center;opacity:.5;padding:24px;">Say hello 👋</p>'; return; }
    docs.forEach(item => { const msg = item.data(); if (msg.senderUid !== currentUser.uid && msg.receiverUid === currentUser.uid && !msg.read) updateDoc(item.ref, { delivered: true, read: true, readAt: serverTimestamp() }).catch(err => console.warn("Read receipt:", err)); });
    box.innerHTML = docs.map(item => {
      const msg = item.data();
      const mine = msg.senderUid === currentUser.uid || msg.uid === currentUser.uid;
      const when = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "";
      const editForwardLabel = `${msg.forwarded ? '<span style="font-size:10px;opacity:.7;">↗ Forwarded</span>' : ""}${msg.edited ? '<span style="font-size:10px;opacity:.7;margin-left:6px;">Edited</span>' : ""}`;
      const replyPreview = msg.replyTo ? `<div style="padding:5px 8px;margin-bottom:6px;border-left:3px solid rgba(255,255,255,.7);background:rgba(0,0,0,.16);border-radius:4px;font-size:11px;opacity:.85;">↪ ${escapeHTML(msg.replyTo.text || "Media message")}</div>` : "";
      const body = msg.deleted ? '<i style="opacity:.65;">This message was deleted</i>' : (msg.mediaUrl ? (msg.mediaType === "video" ? `<video controls playsinline src="${escapeHTML(msg.mediaUrl)}" style="max-width:100%;max-height:260px;border-radius:10px;"></video>` : msg.mediaType === "audio" ? `<audio controls src="${escapeHTML(msg.mediaUrl)}" style="max-width:220px;"></audio>` : `<img src="${escapeHTML(msg.mediaUrl)}" alt="Photo" style="max-width:100%;max-height:260px;border-radius:10px;object-fit:contain;">`) : escapeHTML(msg.text || msg.message || ""));
      const reactions = msg.reactions && typeof msg.reactions === "object" ? Object.values(msg.reactions).filter(Boolean) : [];
      const myReaction = msg.reactions && msg.reactions[currentUser.uid];
      const receipt = mine ? (msg.read ? "Seen ✓✓" : msg.delivered ? "Delivered ✓✓" : "Sent ✓") : "";
      return `<div data-message-id="${escapeHTML(item.id)}" style="align-self:${mine ? "flex-end" : "flex-start"};max-width:82%;padding:10px 13px;border-radius:${mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};background:${mine ? "#3797f0" : "#262626"};color:#fff;overflow-wrap:anywhere;"><div>${editForwardLabel}${replyPreview}${body}</div>${reactions.length ? `<div style="display:inline-flex;gap:4px;margin-top:7px;padding:3px 8px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(0,0,0,.18);font-size:14px;">${reactions.map(escapeHTML).join(" ")}</div>` : ""}<div style="display:flex;gap:9px;align-items:center;justify-content:flex-end;margin-top:5px;"><small style="opacity:.7;font-size:10px;">${escapeHTML(when)} ${escapeHTML(receipt)}</small><button type="button" data-react="${escapeHTML(item.id)}" style="width:27px;height:27px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.09);color:#fff;padding:0;font-size:14px;cursor:pointer;" aria-label="React">${myReaction || "☺"}</button>${mine && !msg.deleted ? `<button type="button" data-delete="${escapeHTML(item.id)}" style="width:27px;height:27px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.07);color:#fff;padding:0;font-size:12px;cursor:pointer;" aria-label="Delete message">🗑</button>` : ""}</div></div>`;
    }).join("");
    box.querySelectorAll("[data-react]").forEach(button => button.addEventListener("click", () => reactToMessage(button.dataset.react)));
    box.querySelectorAll("[data-message-id]").forEach(bubble => {
      let lastTap = 0, holdTimer = null, didHold = false;
      bubble.addEventListener("contextmenu", event => { event.preventDefault(); showMessageActions(bubble.dataset.messageId); });
      bubble.addEventListener("touchstart", () => { didHold = false; holdTimer = setTimeout(() => { didHold = true; showMessageActions(bubble.dataset.messageId); }, 550); }, { passive: true });
      ["touchend","touchmove","touchcancel"].forEach(name => bubble.addEventListener(name, () => clearTimeout(holdTimer), { passive: true }));
      bubble.addEventListener("click", event => { if (event.target.closest("button,video,audio") || didHold) { didHold = false; return; } const now = Date.now(); if (now - lastTap < 320) { lastTap = 0; quickHeart(bubble.dataset.messageId); } else lastTap = now; });
    });
    box.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => removeMessage(button.dataset.delete)));
    box.scrollTop = box.scrollHeight;
  }, error => {
    console.error("Messages listener error:", error);
    showChatMessage("Messages load nahi hue. Firestore Rules check karein.");
  });
}

async function saveMessage(payload, previewText) {
  if (!currentUser || !selectedUser || currentUser.isAnonymous) throw new Error("Please sign in first.");
  const chatId = chatIdFor(currentUser.uid, selectedUser.uid);
  await setDoc(doc(db, "chats", chatId), { participants: [currentUser.uid, selectedUser.uid], lastMessage: previewText, lastSenderUid: currentUser.uid, updatedAt: serverTimestamp(), hiddenFor: arrayRemove(currentUser.uid) }, { merge: true });
  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), { ...payload, senderUid: currentUser.uid, receiverUid: selectedUser.uid, uid: currentUser.uid, createdAt: serverTimestamp(), delivered: false, read: false });
  try { await addDoc(collection(db, "users", selectedUser.uid, "notifications"), { type: "message", fromUid: currentUser.uid, fromName: nameOf(currentUser), fromPhoto: photoOf(currentUser), chatId, messageId: messageRef.id, text: previewText, read: false, createdAt: serverTimestamp() }); }
  catch (e) { console.warn("Chat notification not saved; check Firestore Rules:", e); }
  return messageRef;
}
async function sendMsg(event) {
  event?.preventDefault();
  const input = $("chatInput"), text = input?.value.trim();
  if (!text || !currentUser || !selectedUser || currentUser.isAnonymous) return;
  const button = $("chatSend"); if (button) button.disabled = true;
  try { await saveMessage({ text, ...(replyTarget ? { replyTo: { messageId: replyTarget.id, text: replyTarget.text } } : {}) }, text); input.value = ""; clearReply(); input.focus(); }
  catch (error) { console.error("Send message error:", error); alert("Message send nahi hua. Firestore Rules check karein."); }
  finally { if (button) button.disabled = false; }
}
async function uploadChatMedia(file) {
  const isAudio = file.type.startsWith("audio/"), isVideo = file.type.startsWith("video/") || isAudio;
  const endpoint = `https://api.cloudinary.com/v1_1/${CHAT_CLOUDINARY_NAME}/${isVideo ? "video" : "image"}/upload`;
  const data = new FormData(); data.append("file", file); data.append("upload_preset", CHAT_CLOUDINARY_PRESET);
  const response = await fetch(endpoint, { method: "POST", body: data }), result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Media upload fail hua.");
  return result.secure_url;
}
async function sendMedia(file, mediaType) {
  if (!currentUser || !selectedUser || currentUser.isAnonymous) { alert("Pehle Google se login karein."); return; }
  if (file.size > 100 * 1024 * 1024) { alert("File 100 MB se chhoti honi chahiye."); return; }
  const attach = $("chatAttach"); if (attach) { attach.disabled = true; attach.textContent = "…"; }
  try { const url = await uploadChatMedia(file); await saveMessage({ mediaUrl: url, mediaType, fileName: file.name || mediaType }, mediaType === "video" ? "🎬 Video" : mediaType === "audio" ? "🎙️ Voice message" : "📷 Photo"); }
  catch (error) { console.error("Chat media upload error:", error); alert("Media send nahi hua: " + (error.message || "Upload error")); }
  finally { if (attach) { attach.disabled = false; attach.textContent = "＋"; } }
}
let voiceRecorder = null, voiceChunks = [];
async function toggleVoiceRecording() {
  const button = $("chatVoice");
  if (voiceRecorder && voiceRecorder.state === "recording") { voiceRecorder.stop(); if (button) button.textContent = "🎙️"; return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { alert("Is browser mein voice recording supported nahi hai."); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
    voiceChunks = []; voiceRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    voiceRecorder.addEventListener("dataavailable", event => { if (event.data.size) voiceChunks.push(event.data); });
    voiceRecorder.addEventListener("stop", async () => { stream.getTracks().forEach(track => track.stop()); const blob = new Blob(voiceChunks, { type: voiceRecorder.mimeType || "audio/webm" }); if (blob.size) await sendMedia(new File([blob], "voice-message.webm", { type: blob.type }), "audio"); });
    voiceRecorder.start(); if (button) button.textContent = "⏹️";
  } catch (error) { console.error("Voice recording error:", error); alert("Microphone permission dein, phir voice message record karein."); }
}
async function deleteChatForMe(otherUid) {
  if (!currentUser || !otherUid) return;
  if (!confirm("Is chat ko apni Messages list se delete karein? Doosre user ki chat delete nahi hogi.")) return;
  try {
    const chatId = chatIdFor(currentUser.uid, otherUid);
    const ref = doc(db, "chats", chatId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const hiddenFor = [...new Set([...(snap.data().hiddenFor || []).map(String), String(currentUser.uid)])];
    await updateDoc(ref, { hiddenFor });
  } catch (error) {
    console.error("Delete chat error:", error);
    alert("Chat delete nahi hui. Firestore Rules check karein.");
  }
}

async function quickHeart(messageId) {
  if (!currentUser || !selectedUser) return;
  try { const chatId = chatIdFor(currentUser.uid, selectedUser.uid); const ref = doc(db, "chats", chatId, "messages", messageId); const snap = await getDoc(ref); if (!snap.exists()) return; const current = snap.data().reactions?.[currentUser.uid]; await updateDoc(ref, { [`reactions.${currentUser.uid}`]: current === "❤️" ? "" : "❤️" }); }
  catch (error) { console.error("Double-tap reaction error:", error); }
}

async function reactToMessage(messageId) {
  if (!currentUser || !selectedUser) return;
  const choice = prompt("Reaction choose karein: ❤️ 😂 😮 😢 👍 🔥", "❤️");
  if (!choice || !["❤️","😂","😮","😢","👍","🔥"].includes(choice.trim())) return;
  try { const chatId = chatIdFor(currentUser.uid, selectedUser.uid); await updateDoc(doc(db, "chats", chatId, "messages", messageId), { [`reactions.${currentUser.uid}`]: choice.trim() }); }
  catch (error) { console.error("Message reaction error:", error); alert("Reaction save nahi hui. Firestore Rules check karein."); }
}
async function removeMessage(messageId) {
  if (!currentUser || !selectedUser) return;
  const choice = prompt('Choose: 1 = only me, 2 = both users', '1');
  if (!choice || !['1', '2'].includes(choice.trim())) return;
  const ref = doc(db, 'chats', chatIdFor(currentUser.uid, selectedUser.uid), 'messages', messageId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const msg = snap.data();
    const mine = msg.senderUid === currentUser.uid || msg.uid === currentUser.uid;
    if (choice.trim() === '2') {
      if (!mine) { alert('You can remove for both users only messages you sent.'); return; }
      if (!confirm('Remove this sent message for both users?')) return;
      await updateDoc(ref, { deleted: true, text: '', mediaUrl: '', fileName: '', deletedAt: serverTimestamp() });
    } else {
      await updateDoc(ref, { hiddenFor: arrayUnion(currentUser.uid) });
    }
  } catch (error) {
    console.error('Message removal error:', error);
    alert('Could not remove message. Check Firestore Rules.');
  }
}


function filterChatMessages(value) {
  const q = String(value || "").trim().toLowerCase();
  $("chatMsgs")?.querySelectorAll("[data-message-id]").forEach(el => {
    el.style.display = !q || el.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
function openChatInfo() {
  if (!selectedUser) return;
  $("chatInfoAvatar").src = photoOf(selectedUser);
  $("chatInfoName").textContent = nameOf(selectedUser);
  $("chatInfoUsername").textContent = selectedUser.username ? "@" + selectedUser.username : (selectedUser.email || "");
  $("chatInfoPanel").style.display = "flex";
  $("chatInfoProfile").onclick = () => {
    $("chatInfoPanel").style.display = "none";
    if (typeof window.openProfile === "function") window.openProfile(selectedUser.uid);
    else if (typeof window.showProfile === "function") window.showProfile(selectedUser.uid);
    else alert("Profile open karne ke liye app ke existing profile button ka use karein.");
  };
}
function clearReply() {
  replyTarget = null;
  const preview = $("chatReplyPreview");
  if (preview) preview.style.display = "none";
}
async function showMessageActions(messageId) {
  if (!currentUser || !selectedUser) return;
  const chatId = chatIdFor(currentUser.uid, selectedUser.uid);
  const ref = doc(db, "chats", chatId, "messages", messageId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const msg = snap.data();
    const mine = msg.senderUid === currentUser.uid || msg.uid === currentUser.uid;
    const options = ["Reply", "Copy text", "React", ...(mine && !msg.deleted ? ["Edit message"] : []), "Forward", "Delete for me", ...(mine && !msg.deleted ? ["Unsend for everyone"] : [])];
    const choice = prompt("Message actions:\n" + options.map((v,i)=>`${i+1}. ${v}`).join("\n") + "\nNumber choose karein:");
    const action = options[Number(choice)-1];
    if (!action) return;
    if (action === "Reply") {
      replyTarget = { id: messageId, text: msg.text || (msg.mediaType === "video" ? "🎬 Video" : msg.mediaType === "audio" ? "🎙️ Voice message" : msg.mediaUrl ? "📷 Photo" : "") };
      $("chatReplyText").textContent = "Replying to: " + replyTarget.text;
      $("chatReplyPreview").style.display = "block";
      $("chatInput")?.focus();
    } else if (action === "Copy text") {
      if (!msg.text) { alert("Is message mein copy karne ke liye text nahi hai."); return; }
      await navigator.clipboard.writeText(msg.text);
    } else if (action === "React") {
      await reactToMessage(messageId);
    } else if (action === "Edit message") {
      const next = prompt("Message edit karein:", msg.text || "");
      if (next === null || !next.trim()) return;
      await updateDoc(ref, { text: next.trim(), edited: true, editedAt: serverTimestamp() });
    } else if (action === "Forward") {
      const targetName = prompt("Forward karne ke liye user ka exact username/name likhein:");
      const target = allUsers.find(u => nameOf(u).toLowerCase() === String(targetName || "").trim().toLowerCase() || String(u.username || "").toLowerCase() === String(targetName || "").trim().toLowerCase());
      if (!target) { alert("User nahi mila."); return; }
      const previous = selectedUser;
      selectedUser = target;
      try { await saveMessage({ text: msg.text || "", ...(msg.mediaUrl ? { mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, fileName: msg.fileName || "" } : {}), forwarded: true }, msg.text || (msg.mediaType === "video" ? "🎬 Video" : "📷 Photo")); }
      finally { selectedUser = previous; }
    } else if (action === "Delete for me") {
      await updateDoc(ref, { hiddenFor: arrayUnion(currentUser.uid) });
    } else if (action === "Unsend for everyone") {
      if (!confirm("Is message ko dono taraf se unsend karein?")) return;
      await updateDoc(ref, { deleted: true, text: "", mediaUrl: "", fileName: "", deletedAt: serverTimestamp() });
    }
  } catch (error) {
    console.error("Message action error:", error);
    alert("Action poora nahi hua. Firestore Rules/clipboard permission check karein.");
  }
}

// Open a direct chat from another profile.
window.openChatWithUser = async function(uid) {
  if (!currentUser || currentUser.isAnonymous) { alert('Pehle Google se login karein.'); return; }
  if (!uid || uid === currentUser.uid) return;
  let user = allUsers.find(item => item.uid === uid);
  if (!user) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) { alert('Is user ki profile nahi mili.'); return; }
    user = { uid: snap.id, ...snap.data() };
  }
  document.querySelectorAll('.page').forEach(page => { page.style.display = 'none'; });
  const chatPage = $('chatPage');
  if (chatPage) chatPage.style.display = 'block';
  setupUI();
  openChat(user);
};

document.addEventListener('DOMContentLoaded', setupUI);
onAuthStateChanged(auth, user => {
  currentUser = user;
  if ($("chatOwnName")) $("chatOwnName").textContent = nameOf(user || {});
  if (document.readyState !== "loading") setupUI();
  if (user) loadUsersAndChats();
  else {
    if (listListener) listListener();
    if (usersListener) usersListener();
    if (chatListener) chatListener();
    listListener = null;
    usersListener = null;
    chatListener = null;
    currentChatMap = new Map();
    allUsers = [];
    renderList([]);
  }
});
window.addEventListener("pagehide", () => {
  if (chatListener) chatListener();
  if (listListener) listListener();
  if (usersListener) usersListener();
});
