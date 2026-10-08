// notifications.js - REAL TIME FIREBASE
import { db } from "./firebase-config.js";
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const myId = localStorage.getItem('my_user_id');
console.log("MyID:", myId);

// 1. FOLLOW + AUTO NOTIFICATION CREATE
export async function toggleFollow(targetId){
  if(!targetId || !myId || targetId===myId) return;
  const ref = doc(db, "follows", `${myId}_${targetId}`);
  const snap = await getDoc(ref);
  if(snap.exists()){
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { follower: myId, following: targetId, time: Date.now() });
    // REAL TIME NOTIFICATION PUSH
    await setDoc(doc(db, "notifications", `${Date.now()}_${myId}`), {
      to: targetId, from: myId, fromName: myId.slice(0,6), type: "follow", read: false, time: Date.now()
    });
  }
}

// 2. REAL TIME COUNTS
export function liveFollowSystem(uid){
  onSnapshot(query(collection(db,"follows"), where("following","==",uid)), s=>{
    const el=document.getElementById('followersCount'); if(el) el.innerText=s.size;
  });
  onSnapshot(query(collection(db,"follows"), where("follower","==",uid)), s=>{
    const el=document.getElementById('followingCount'); if(el) el.innerText=s.size;
  });
  // Button
  const btn=document.getElementById('followBtn');
  if(!btn) return;
  if(uid===myId){ btn.style.display='none'; return; }
  btn.style.display='block';
  onSnapshot(query(collection(db,"follows"), where("follower","==",myId), where("following","==",uid)), s=>{
    if(s.size>0){ btn.innerText='Following'; btn.style.background='#262626'; btn.style.border='1px solid #333'; }
    else { btn.innerText='Follow'; btn.style.background='#0095f6'; btn.style.border='none'; }
  });
  btn.onclick=()=>toggleFollow(uid);
}

// 3. REAL TIME NOTIFICATION LISTENER
export function initNotifications(){
  const list=document.getElementById('notifList');
  const bell=document.getElementById('notifBtn');
  if(!myId) return;
  
  const q = query(collection(db,"notifications"), where("to","==",myId), orderBy("time","desc"));
  onSnapshot(q, (snap)=>{
    let html=""; let unread=0;
    snap.forEach(d=>{
      const n=d.data();
      if(!n.read) unread++;
      let icon = n.type==='follow' ? '👤' : n.type==='like' ? '❤️' : '💬';
      let text = n.type==='follow' ? 'started following you' : 'liked your post';
      html+=`<div onclick="markRead('${d.id}')" style="padding:14px;border-bottom:1px solid #1a1a1a;display:flex;gap:12px;align-items:center;background:${!n.read?'#111':''}">
        <div style="width:42px;height:42px;background:#222;border-radius:50%;display:flex;align-items:center;justify-content:center">${icon}</div>
        <div style="flex:1"><div style="font-size:14px"><b>${n.fromName||n.from}</b> ${text}</div><div style="font-size:11px;opacity:.5">${new Date(n.time).toLocaleString()}</div></div>
        ${!n.read?`<div style="width:8px;height:8px;background:#ff3040;border-radius:50%"></div>`:``}
      </div>`;
    });
    if(list) list.innerHTML = html || '<div style="padding:40px;text-align:center;opacity:.4">No notifications</div>';
    if(bell) bell.innerHTML = unread>0 ? `🔔<span style="background:#ff3040;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:4px">${unread}</span>` : '♡';
  });
}

window.markRead = async(id)=>{
  await updateDoc(doc(db,"notifications",id), {read:true});
}

initNotifications();
