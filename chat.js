// chat.js - InstaPro Premium Instagram Glass Chat
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(()=>{
    let cp = document.getElementById("chatPage");
    if(!cp){
      cp=document.createElement("div"); cp.id="chatPage"; cp.className="page"; cp.style.display="none";
      document.querySelector(".app")?.appendChild(cp);
    }

    cp.innerHTML=`
    <style>
      .glass{ background:rgba(255,255,255,0.14); backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,0.28); box-shadow:0 8px 24px rgba(0,0,0,.18); }
      .glassBtn{ background:rgba(255,255,255,0.15); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.3); border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; transition:.2s; }
      .glassBtn:active{ transform:scale(0.92); }
      .chatCard{ display:flex; gap:12px; padding:14px; border-radius:20px; margin:10px 14px; cursor:pointer; transition:.2s; }
      .chatCard:hover{ background:rgba(255,255,255,0.20); }
      .bubble{ max-width:72%; padding:10px 14px; border-radius:18px; font-size:14px; line-height:1.3; }
      .me{ background:linear-gradient(135deg,#ff6a8a,#8a6cff); color:#fff; margin-left:auto; border-bottom-right-radius:6px; }
      .other{ background:rgba(255,255,255,0.16); backdrop-filter:blur(12px); color:#fff; border-bottom-left-radius:6px; }
    </style>

    <!-- LIST VIEW -->
    <div id="chatListView" style="padding:64px 0 110px 0; min-height:100vh; background:#000;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0 16px 12px 16px;">
        <h2 style="margin:0; color:#fff; font-size:22px; font-weight:700;">Messages</h2>
        <div style="display:flex; gap:8px;">
          <div class="glassBtn">📹</div>
          <div class="glassBtn">✏️</div>
        </div>
      </div>

      <div style="display:flex; gap:10px; overflow:auto; padding:8px 14px 12px 14px; scrollbar-width:none;">
        <div style="text-align:center; min-width:62px;"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:22px" class="glass">+</div><div style="color:#fff;font-size:11px;margin-top:4px;opacity:.7">Your Note</div></div>
        <div style="text-align:center; min-width:62px;"><img src="https://i.pravatar.cc/100?img=5" style="width:56px;height:56px;border-radius:50%;border:2px solid #ff6a8a"><div style="color:#fff;font-size:11px;margin-top:4px">Rahul</div></div>
        <div style="text-align:center; min-width:62px;"><img src="https://i.pravatar.cc/100?img=8" style="width:56px;height:56px;border-radius:50%;border:2px solid #8a6cff"><div style="color:#fff;font-size:11px;margin-top:4px">Priya</div></div>
      </div>

      <div id="msgList">
        <div class="chatCard glass" data-user="Rahul" data-img="https://i.pravatar.cc/100?img=5">
          <img src="https://i.pravatar.cc/100?img=5" style="width:52px;height:52px;border-radius:50%;object-fit:cover">
          <div style="flex:1"><div style="display:flex;justify-content:space-between"><b style="color:#fff">Rahul</b><span style="color:rgba(255,255,255,.5);font-size:11px">2m</span></div><div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:2px">Hey! Nice post 🔥 • Tap to chat</div></div>
          <div style="width:8px;height:8px;background:#ff3b5c;border-radius:50%;align-self:center"></div>
        </div>
        <div class="chatCard glass" data-user="Priya" data-img="https://i.pravatar.cc/100?img=8">
          <img src="https://i.pravatar.cc/100?img=8" style="width:52px;height:52px;border-radius:50%">
          <div style="flex:1"><b style="color:#fff">Priya</b><div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:2px">Story dekha kya? 👀</div></div>
        </div>
      </div>

      <div style="position:fixed; bottom:88px; left:12px; right:12px; display:flex; gap:10px; z-index:5;">
        <div class="glass" style="flex:1; display:flex; align-items:center; padding:0 14px; border-radius:28px; height:48px;">
          <span style="opacity:.5">🔍</span><input id="searchMsg" placeholder="Search messages..." style="flex:1; background:transparent; border:none; outline:none; color:#fff; margin-left:8px; font-size:14px">
        </div>
        <div class="glassBtn" style="width:48px;height:48px;background:#fff;color:#000">⌕</div>
      </div>
    </div>

    <!-- CHAT DETAIL VIEW -->
    <div id="chatDetailView" style="display:none; position:fixed; inset:0; background:#000; z-index:60; flex-direction:column;">
      <div class="glass" style="height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border-radius:0 0 20px 20px; margin-top:0;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div
