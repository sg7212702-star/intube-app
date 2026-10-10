import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
export async function sendNotif(text,type="like"){
  await addDoc(collection(db,"notifications"),{text,type,time:Date.now(),createdAt:serverTimestamp()});
}
document.addEventListener("DOMContentLoaded",()=>{
  $("notifBtn")?.addEventListener("click",()=>{ $("notifBox")?.classList.add("show"); $("notifOverlay")?.classList.add("show"); });
  $("notifOverlay")?.addEventListener("click",()=>{ $("notifBox")?.classList.remove("show"); $("notifOverlay")?.classList.remove("show"); });
  $("closeNotif")?.addEventListener("click",()=>{ $("notifBox")?.classList.remove("show"); $("notifOverlay")?.classList.remove("show"); });
  const list=$("notifList"); if(!list)return;
  const q=query(collection(db,"notifications"),orderBy("createdAt","desc"));
  onSnapshot(q,snap=>{
    list.innerHTML=snap.empty?`<div style="text-align:center;padding:20px;opacity:.6">No notifications</div>`:"";
    snap.forEach(d=>{
      const n=d.data(); const ic=n.type==="story"?"⭕":n.type==="post"?"📸":"❤️";
      list.innerHTML+=`<div class="notifItemGlass"><div class="nIcon">${ic}</div><div class="nText"><b>${n.text}</b><span>Just now</span></div><div class="nDot"></div></div>`;
    });
  });
});
