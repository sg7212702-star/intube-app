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
    <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.1); background:rgba(15,15,18,.78);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 8px 24px rgba(0,0,0,.18);">
      <div class="backBtn" id="backToList" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer;">←</div>
      <div style="width:34px; height:34px; border-radius:50%; padding:2px; background:linear-gradient(45deg,#feda75,#d62976,#962fbf);"><img id="chatWithAvatar" src="https://www.gravatar.com/avatar/?d=mp" style="width:100%; height:100%; border-radius:50%; border:2px solid #000; object-fit:cover;"></div>
      <div style="flex:1;"><b id="chatWithName" style="font-size:14px; display:block;">username</b><span style="font-size:11px; opacity:.6;">InstaPro messages</span></div>
      <div style="display:flex; gap:16px; font-size:20px;">📞 🎥 ℹ️</div>
    </div>
    <div id="chatMsgs" style="flex:1; overflow-y:auto; padding:14px 12px 90px; display:flex; flex-direction:column; gap:6px; background:#000;"></div>
    <form id="chatForm" style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:470px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:rgba(12,12,14,.82);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.13);box-shadow:0 -8px 30px rgba(0,0,0,.22);box-sizing:border-box;">
      <input id="chatInput" maxlength="4000" autocomplete="off" placeholder="Message..." style="flex:1; min-width:0; padding:12px 16px; border-radius:22px; border:1px solid rgba(255,255,255,.17);background:rgba(255,255,255,.085);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 rgba(255,255,255,.07);color:#fff;outline:none;">
      <button id="chatAttach" type="button" aria-label="Photo or video" style="width:38px;height:38px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.09);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;font-size:22px;padding:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);cursor:pointer;">＋</button>
      <input id="chatMediaInput" type="file" accept="image/*,video/*" hidden>
      <button id="chatVoice" type="button" aria-label="Record voice message" style="width:38px;height:38px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.09);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;font-size:18px;padding:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);cursor:pointer;">🎙️</button>
      <button id="chatSend" type="submit" style="padding:10px 16px;border-radius:22px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(135deg,rgba(0,149,246,.95),rgba(121,72,255,.88));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff;font-weight:700;font-size:14px;box-shadow:0 4px 18px rgba(0,149,246,.22);cursor:pointer;">Send</button>
    </form>
  </div>`;

  $("chatBackHome")?.addEventListener("click", () => {
    document.querySelector('.bBtn[data-v="home"]')?.click();
  });
  $("backToList")?.addEventListener("click", closeChat);
  $("chatForm")?.addEventListener("submit", sendMsg);
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
      const body = msg.deleted ? '<i style="opacity:.65;">This message was deleted</i>' : (msg.mediaUrl ? (msg.mediaType === "video" ? `<video controls playsinline src="${escapeHTML(msg.mediaUrl)}" style="max-width:100%;max-height:260px;border-radius:10px;"></video>` : msg.mediaType === "audio" ? `<audio controls src="${escapeHTML(msg.mediaUrl)}" style="max-width:220px;"></audio>` : `<img src="${escapeHTML(msg.mediaUrl)}" alt="Photo" style="max-width:100%;max-height:260px;border-radius:10px;object-fit:contain;">`) : escapeHTML(msg.text || msg.message || ""));
      const reactions = msg.reactions && typeof msg.reactions === "object" ? Object.values(msg.reactions).filter(Boolean) : [];
      const myReaction = msg.reactions && msg.reactions[currentUser.uid];
      const receipt = mine ? (msg.read ? "Seen ✓✓" : msg.delivered ? "Delivered ✓✓" : "Sent ✓") : "";
      return `<div data-message-id="${escapeHTML(item.id)}" style="align-self:${mine ? "flex-end" : "flex-start"};max-width:82%;padding:10px 13px;border-radius:${mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};background:${mine ? "#3797f0" : "#262626"};color:#fff;overflow-wrap:anywhere;"><div>${body}</div>${reactions.length ? `<div style="display:inline-flex;gap:4px;margin-top:7px;padding:3px 8px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(0,0,0,.18);font-size:14px;">${reactions.map(escapeHTML).join(" ")}</div>` : ""}<div style="display:flex;gap:9px;align-items:center;justify-content:flex-end;margin-top:5px;"><small style="opacity:.7;font-size:10px;">${escapeHTML(when)} ${escapeHTML(receipt)}</small><button type="button" data-react="${escapeHTML(item.id)}" style="width:27px;height:27px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.09);color:#fff;padding:0;font-size:14px;cursor:pointer;" aria-label="React">${myReaction || "☺"}</button>${mine && !msg.deleted ? `<button type="button" data-delete="${escapeHTML(item.id)}" style="width:27px;height:27px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.07);color:#fff;padding:0;font-size:12px;cursor:pointer;" aria-label="Delete message">🗑</button>` : ""}</div></div>`;
    }).join("");
    box.querySelectorAll("[data-react]").forEach(button => button.addEventListener("click", () => reactToMessage(button.dataset.react)));
    box.querySelectorAll("[data-message-id]").forEach(bubble => { let lastTap = 0; bubble.addEventListener("click", event => { if (event.target.closest("button,video,audio")) return; const now = Date.now(); if (now - lastTap < 320) { lastTap = 0; quickHeart(bubble.dataset.messageId); } else lastTap = now; }); });
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
  try { await saveMessage({ text }, text); input.value = ""; input.focus(); }
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
