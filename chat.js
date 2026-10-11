// chat.js - INSTAGRAM DM 100% - LAST MSG + UNREAD + STORY RING
import { auth, db } from "./firebase.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null, selectedUser=null, allUsers=[], chatListener=null;

function setupUI(){
  const p=document.getElementById("chatPage"); if(!p) return;
  p.innerHTML=`
  <div id="chatListView" style="display:block; height:100vh; background:#000; position:relative;">
    <div style="position:sticky; top:0; z-index:10; background:rgba(0,0,0,0.8); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,.08);">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px;">
        <div style="display:flex; align-items:center; gap:12px;"><div class="backBtn" onclick="goHome()" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center;">←</div><b style="font-size:18px;">${auth.currentUser?.displayName||'s_gaming'} ▾</b></div>
        <div style="display:flex; gap:18px; font-size:22px;"><span>📹</span><span>✏️</span></div>
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

  <div id="chatBoxView" style="display:none; height:100vh; flex-direction:column; background:#000; position:fixed; inset:0; z-index:10002;">
    <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,0.9); backdrop-filter:blur(20px);">
      <div class="backBtn" id="backToList" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center;">←</div>
      <div style="width:34px; height:34px; border-radius:50%; padding:2px; background:linear-gradient(45deg,#feda75,#d62976,#962fbf);"><img id="chatWithAvatar" src="https://i.pravatar.cc/100" style="width:100%; height:100%; border-radius:50%; border:2px solid #000; object-fit:cover;"></div>
      <div style="flex:1;"><b id="chatWithName" style="font-size:14px; display:block;">username</b><span style="font-size:11px; opacity:.6;">Active now • Instagram</span></div>
      <div style="display:flex; gap:16px; font-size:20px;">📞 🎥 ℹ️</div>
    </div>
    <div id="chatMsgs" style="flex:1; overflow-y:auto; padding:14px 12px; display:flex; flex-direction:column; gap:6px; background:#000; padding-bottom:80px;"></div>
    <div style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:470px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:#000; border-top:1px solid rgba(255,255,255,.08);">
      <div style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.1); display:flex; align-items:center; justify-content:center;">📷</div>
      <input id="chatInput" placeholder="Message..." style="flex:1; padding:12px 16px; border-radius:22px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.12); color:#fff; outline:none;">
      <div style="display:flex; gap:10px; font-size:20px; align-items:center;"><span>🎙️</span><span>🖼️</span><span>😊</span></div>
      <button id="chatSend" style="padding:8px 14px; border-radius:20px; border:0; background:transparent; color:#0095f6; font-weight:700; font-size:15px;">Send</button>
    </div>
  </div>`;
  
  document.getElementById("backToList")?.addEventListener("click", ()=>{ document.getElementById("chatBoxView").style.display="none"; document.getElementById("chatListView").style.display="block"; selectedUser=null; });
  document.getElementById("chatSend")?.addEventListener("click", sendMsg);
  document.getElementById("chatInput")?.addEventListener("keypress", e=>{ if(e.key==="Enter") sendMsg(); });
  document.getElementById("userSearch")?.addEventListener("input", e=>{
    const q=e.target.value.toLowerCase();
    const f=allUsers.filter(u=> (u.username||"").toLowerCase().includes(q) || (u.name||"").toLowerCase().includes(q));
    renderList(f);
  });
}

function timeAgo(ts){
  if(!ts) return "";
  const d=Math.floor((Date.now()-ts)/1000);
  if(d<60) return `${d}s`;
  if(d<3600) return `${Math.floor(d/60)}m`;
  if(d<86400) return `${Math.floor(d/3600)}h`;
  return `${Math.floor(d/86400)}d`;
}

async function loadUsersAndChats(){
  // Users
  const uSnap=await getDocs(collection(db,"users"));
  allUsers=[]; uSnap.forEach(d=>{ if(d.id!==currentUser.uid) allUsers.push({uid:d.id,...d.data()}); });

  // Chats - Last message ke liye
  const cQuery=query(collection(db,"chats"), where("participants","array-contains", currentUser.uid));
  onSnapshot(cQuery, (cSnap)=>{
    const chatMap={};
    cSnap.forEach(d=>{ chatMap[d.data().otherUid] = d.data(); });
    
    // Story row - Instagram jaisa
    const storyRow=document.getElementById("storyInChat");
    if(storyRow){
      storyRow.innerHTML="";
      allUsers.slice(0,8).forEach(u=>{
        const d=document.createElement("div"); d.style.textAlign="center";
        d.innerHTML=`<div style="width:56px; height:56px; border-radius:50%; padding:2px; background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf)"><img src="${u.photo||'https://i.pravatar.cc/100?u='+u.uid}" style="width:100%; height:100%; border-radius:50%; border:2px solid #000; object-fit:cover"></div><div style="font-size:10px; margin-top:4px; width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.username||'user'}</div>`;
        d.onclick=()=> openChat(u);
        storyRow.appendChild(d);
      });
    }
    renderList(allUsers, chatMap);
  });
}

function renderList(users, chatMap={}){
  const list=document.getElementById("usersList"); if(!list) return;
  if(users.length===0){ list.innerHTML=`<div style="text-align:center; opacity:.5; padding:40px;">No users<br><small>Ask friends to join InstaPro</small></div>`; return; }
  list.innerHTML="";
  users.forEach(u=>{
    const chat=chatMap[u.uid]||{};
    const lastMsg=chat.lastMessage||"Tap to
