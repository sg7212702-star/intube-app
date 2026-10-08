// notifications.js - COMPLETE FINAL - NO MORE EDITS NEEDED
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, onSnapshot, orderBy, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const myId = localStorage.getItem('my_user_id');
const myName = localStorage.getItem('my_name') || localStorage.getItem('username') || (myId ? myId.slice(0,8) : "User");

// ========== CORE NOTIFICATION SENDER ==========
export async function sendNotif(to, type, data={}){
  if(!to || to===myId || !myId) return;
  try{
    await setDoc(doc(db, "notifications", `${Date.now()}_${myId}_${Math.random().toString(36).slice(2,6)}`), {
      to, from: myId, fromName: myName, type, postId: data.postId||"", text: data.text||"", read: false, time: Date.now()
    });
  }catch(e){ console.log("notif error", e); }
}

// ========== FOLLOW / UNFOLLOW ==========
export async function toggleFollow(targetId){
  if(!targetId || targetId===myId) return;
  const ref = doc(db, "follows", `${myId}_${targetId}`);
  const snap = await getDoc(ref);
  if(snap.exists()){
    await deleteDoc(ref);
  }else{
    await setDoc(ref, { follower: myId, following: targetId, time: Date.now() });
    await sendNotif(targetId, "follow");
  }
}

// ========== LIKE / UNLIKE ==========
export async function toggleLike(postId, ownerId){
  if(!postId || !myId) return;
  const ref = doc(db, "likes", `${myId}_${postId}`);
  const snap = await getDoc(ref);
  if(snap.exists()){
    await deleteDoc(ref);
  }else{
    await setDoc(ref, { user: myId, post: postId, time: Date.now() });
    await sendNotif(ownerId, "like", { postId });
  }
}

// ========== COMMENT ==========
export async function postComment(postId, ownerId, text){
  if(!text || !text.trim() || !postId) return;
  const id = `${Date.now()}_${myId}`;
  await setDoc(doc(db, "comments", id), {
    id, post: postId, user: myId, userName: myName, text: text.trim(), time: Date.now()
  });
  await sendNotif(ownerId, "comment", { postId, text: text.trim() });
  return true;
}

// ========== LIVE COUNTS + BUTTON ==========
export function startFollowSystem(profileUid){
  const followersEl = document.getElementById('followersCount');
  const followingEl = document.getElementById('followingCount');
  const btn = document.getElementById('followBtn');

  onSnapshot(query(collection(db, "follows"), where("following","==",profileUid)), s=>{ if(followersEl) followersEl.innerText=s.size; });
  onSnapshot(query(collection(db, "follows"), where("follower","==",profileUid)), s=>{ if(followingEl) followingEl.innerText=s.size; });

  if(!btn) return;
  if(profileUid===myId){ btn.style.display='none'; return; }
  btn.style.display='block';
  onSnapshot(query(collection(db, "follows"), where("follower","==",myId), where("following","==",profileUid)), s=>{
    if(s.size>0){ btn.innerText='Following ✓'; btn.style.background='#262626'; btn.style.border='1px solid #555'; btn.style.color='#fff'; }
    else { btn.innerText='Follow'; btn.style.background='#0095f6'; btn.style.border='none'; btn.style.color='#fff'; }
  });
  btn.onclick=()=>toggleFollow(profileUid);
}

export function bindLikeSystem(postId){
  const countEl = document.getElementById(`likeCount_${postId}`);
  const btnEl = document.getElementById(`likeBtn_${postId}`);
  onSnapshot(query(collection(db, "likes"), where("post","==",postId)), snap=>{
    if(countEl) countEl.innerText=snap.size;
    if(btnEl){
      const liked = snap.docs.some(d=>d.data().user===myId);
      btnEl.innerHTML = liked ? '❤️' : '🤍';
      btnEl.style.color = liked ? '#ff3040' : '#fff';
    }
  });
}

export function bindCommentCount(postId){
  const el = document.getElementById(`commentCount_${postId}`);
  onSnapshot(query(collection(db, "comments"), where("post","==",postId)), s=>{ if(el) el.innerText=s.size; });
}

// ========== NOTIFICATIONS UI - COMPLETE ==========
export function initNotifications(){
  const list = document.getElementById('notifList');
  const bell = document.getElementById('notifBtn');
  const bellCount = document.getElementById('notifCount');
  if(!myId) return;

  const q = query(collection(db, "notifications"), where("to","==",myId), orderBy("time","desc"));
  onSnapshot(q, snap=>{
    let html=""; let unread=0;
    if(snap.empty){
      if(list) list.innerHTML='<div style="text-align:center;padding:50px 20px;opacity:.4">No notifications yet<br><span style="font-size:12px">When someone follows, likes or comments, you will see it here</span></div>';
      if(bellCount) bellCount.style.display='none';
      return;
    }
    snap.forEach(d=>{
      const n=d.data();
      if(!n.read) unread++;
      let icon="🔔", msg="", color="#222";
      if(n.type==="follow"){ icon="👤"; msg="started following you"; color="#0095f6"; }
      if(n.type==="like"){ icon="❤️"; msg="liked your post"; color="#ff3040"; }
      if(n.type==="comment"){ icon="💬"; msg=`commented: "${n.text.slice(0,35)}"`; color="#00c851"; }

      html+=`<div onclick="markRead('${d.id}')" style="padding:14px 16px;border-bottom:1px solid #1e1e1e;display:flex;gap:12px;align-items:center;background:${!n.read?'#121212':''};cursor:pointer">
        <div style="width:44px;height:44px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0"><div style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${n.fromName}</b> ${msg}</div><div style="font-size:11px;opacity:.5;margin-top:3px">${timeAgo(n.time)}</div></div>
        ${!n.read?`<div style="width:8px;height:8px;background:#ff3040;border-radius:50%;flex-shrink:0"></div>`:``}
      </div>`;
    });
    if(list) list.innerHTML=html;
    if(bellCount){
      if(unread>0){ bellCount.innerText=unread>99?"99+":unread; bellCount.style.display='inline-block'; }
      else bellCount.style.display='none';
    }
    if(bell && !bellCount){
      bell.innerHTML = unread>0 ? `🔔 <span style="background:#ff3040;padding:2px 7px;border-radius:10px;font-size:10px">${unread}</span>` : '🔔';
    }
  });
}

function timeAgo(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return "just now";
  if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

window.markRead = async(id)=>{ try{ await updateDoc(doc(db,"notifications",id),{read:true}); }catch{}
