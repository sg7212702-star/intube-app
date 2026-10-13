// chat.js - InstaPro real-time direct messages
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let selectedUser = null;
let allUsers = [];
let chatListener = null;
let listListener = null;
let usersListener = null;
let currentChatMap = new Map();
let messageCache = [];

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));
const photoOf = user => user?.photoURL || user?.photo || "https://www.gravatar.com/avatar/?d=mp";
const nameOf = user => user?.username || user?.displayName || user?.name || user?.email?.split("@")[0] || "user";
const chatIdFor = (a, b) => [a, b].sort().join("_");

function setupUI() {
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
    <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,0.9); backdrop-filter:blur(20px);">
      <div class="backBtn" id="backToList" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer;">←</div>
      <div style="width:34px; height:34px; border-radius:50%; padding:2px; background:linear-gradient(45deg,#feda75,#d62976,#962fbf);"><img id="chatWithAvatar" src="https://www.gravatar.com/avatar/?d=mp" style="width:100%; height:100%; border-radius:50%; border:2px solid #000; object-fit:cover;"></div>
      <div style="flex:1;"><b id="chatWithName" style="font-size:14px; display:block;">username</b><span style="font-size:11px; opacity:.6;">InstaPro messages</span></div>
      <div style="display:flex; gap:16px; font-size:20px;">📞 🎥 ℹ️</div>
    </div>
    <div id="chatMsgs" style="flex:1; overflow-y:auto; padding:14px 12px 90px; display:flex; flex-direction:column; gap:6px; background:#000;"></div>
    <form id="chatForm" style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:470px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:#000; border-top:1px solid rgba(255,255,255,.08); box-sizing:border-box;">
      <input id="chatInput" maxlength="4000" autocomplete="off" placeholder="Message..." style="flex:1; min-width:0; padding:12px 16px; border-radius:22px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.12); color:#fff; outline:none;">
      <button id="chatSend" type="submit" style="padding:8px 14px; border-radius:20px; border:0; background:transparent; color:#0095f6; font-weight:700; font-size:15px;">Send</button>
    </form>
  </div>`;

  $("chatBackHome")?.addEventListener("click", () => {
    document.querySelector('.bBtn[data-v="home"]')?.click();
  });
  $("backToList")?.addEventListener("click", closeChat);
  $("chatForm")?.addEventListener("submit", sendMsg);
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
  const sorted = [...users].sort((a, b) => {
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
    row.addEventListener("click", () => openChat(user));
    list.appendChild(row);
  });
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
    box.innerHTML = snapshot.docs.map(item => {
      const msg = item.data();
      const mine = msg.senderUid === currentUser.uid || msg.uid === currentUser.uid;
      const when = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "";
      return `<div style="align-self:${mine ? "flex-end" : "flex-start"};max-width:82%;padding:10px 13px;border-radius:${mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};background:${mine ? "#3797f0" : "#262626"};color:#fff;overflow-wrap:anywhere;"><div>${escapeHTML(msg.text || msg.message || "")}</div><small style="display:block;text-align:right;opacity:.65;margin-top:4px;font-size:10px;">${escapeHTML(when)}</small></div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }, error => {
    console.error("Messages listener error:", error);
    showChatMessage("Messages load nahi hue. Firestore Rules check karein.");
  });
}

async function sendMsg(event) {
  event?.preventDefault();
  const input = $("chatInput");
  const text = input?.value.trim();
  if (!text || !currentUser || !selectedUser || currentUser.isAnonymous) return;
  const button = $("chatSend");
  if (button) button.disabled = true;
  const chatId = chatIdFor(currentUser.uid, selectedUser.uid);
  const chatRef = doc(db, "chats", chatId);
  try {
    await setDoc(chatRef, {
      participants: [currentUser.uid, selectedUser.uid],
      lastMessage: text,
      lastSenderUid: currentUser.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text,
      senderUid: currentUser.uid,
      receiverUid: selectedUser.uid,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
      read: false
    });
    input.value = "";
    input.focus();
  } catch (error) {
    console.error("Send message error:", error);
    alert("Message send nahi hua. Firestore Rules check karein.");
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", setupUI);
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
