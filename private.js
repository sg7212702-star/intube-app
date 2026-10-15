// InstaPro Private Account System
import { db, auth } from "./firebase.js";
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, updateDoc, addDoc, serverTimestamp, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>auth.currentUser?.uid||null;
let settingsStop=null,requestsStop=null,overlay=null;
const normalized=d=>({...d,isPrivate:d?.isPrivate===true||d?.privateAccount===true});
async function getAccountPrivacy(userId){const s=await getDoc(doc(db,"users",userId));return {...normalized(s.exists()?s.data():{}),exists:s.exists()};}
async function isApprovedFollower(ownerUid,viewerUid=uid()){
 if(!ownerUid||!viewerUid)return false;if(ownerUid===viewerUid)return true;
 const [o,v]=await Promise.all([getDoc(doc(db,"users",ownerUid)),getDoc(doc(db,"users",viewerUid))]);
 if(!o.exists())return false;return (Array.isArray(o.data().followers)&&o.data().followers.includes(viewerUid))&&(Array.isArray(v.data()?.following)&&v.data().following.includes(ownerUid));
}
async function canViewAccountContent(ownerUid,viewerUid=uid()){
 if(!ownerUid)return false;if(ownerUid===viewerUid)return true;
 const p=await getAccountPrivacy(ownerUid);return !p.isPrivate||isApprovedFollower(ownerUid,viewerUid);
}
async function notify(target,payload){try{await addDoc(collection(db,"users",target,"notifications"),{...payload,createdAt:serverTimestamp(),read:false});}catch(e){console.warn("Private notification failed",e);}}
async function requestFollow(targetUid){
 const me=uid();if(!me)throw Error("Follow request ke liye login karein.");if(!targetUid||me===targetUid)return {status:"self"};
 const [ts,ms]=await Promise.all([getDoc(doc(db,"users",targetUid)),getDoc(doc(db,"users",me))]);if(!ts.exists())throw Error("Account nahi mila.");
 const target=ts.data(),mine=ms.exists()?ms.data():{},following=Array.isArray(mine.following)?mine.following:[],followers=Array.isArray(target.followers)?target.followers:[];
 if(following.includes(targetUid)&&followers.includes(me))return {status:"following"};
 if(!normalized(target).isPrivate){
  const batch=writeBatch(db);batch.set(doc(db,"users",me),{following:[...new Set([...following,targetUid])],updatedAt:serverTimestamp()},{merge:true});batch.set(doc(db,"users",targetUid),{followers:[...new Set([...followers,me])],updatedAt:serverTimestamp()},{merge:true});await batch.commit();
  await notify(targetUid,{type:"follow",message:"started following you",fromUid:me,fromUsername:mine.username||mine.displayName||auth.currentUser?.displayName||"InstaPro User",fromPhoto:mine.photoURL||auth.currentUser?.photoURL||""});return {status:"following"};
 }
 const ref=doc(db,"users",targetUid,"followRequests",me),old=await getDoc(ref);if(old.exists()&&old.data().status==="pending")return {status:"pending"};if(old.exists()&&old.data().status==="accepted")return {status:"following"};
 await setDoc(ref,{fromUid:me,toUid:targetUid,fromUsername:mine.username||mine.displayName||auth.currentUser?.displayName||auth.currentUser?.email?.split("@")[0]||"InstaPro User",fromPhoto:mine.photoURL||mine.photoUrl||auth.currentUser?.photoURL||"",status:"pending",createdAt:serverTimestamp()});
 await notify(targetUid,{type:"follow_request",message:"requested to follow you",fromUid:me,fromUsername:mine.username||mine.displayName||"InstaPro User",fromPhoto:mine.photoURL||""});return {status:"pending"};
}
async function respondFollowRequest(requesterUid,accept){
 const me=uid();if(!me)throw Error("Pehle login karein.");const ref=doc(db,"users",me,"followRequests",requesterUid);
 const [rs,os,us]=await Promise.all([getDoc(ref),getDoc(doc(db,"users",me)),getDoc(doc(db,"users",requesterUid))]);if(!rs.exists()||rs.data().status!=="pending")throw Error("Pending request nahi mili.");
 const owner=os.exists()?os.data():{},requester=us.exists()?us.data():{},followers=Array.isArray(owner.followers)?owner.followers:[],following=Array.isArray(requester.following)?requester.following:[];
 const b=writeBatch(db);b.update(ref,{status:accept?"accepted":"rejected",respondedAt:serverTimestamp()});
 if(accept){b.set(doc(db,"users",me),{followers:[...new Set([...followers,requesterUid])],updatedAt:serverTimestamp()},{merge:true});b.set(doc(db,"users",requesterUid),{following:[...new Set([...following,me])],updatedAt:serverTimestamp()},{merge:true});}
 await b.commit();if(accept)await notify(requesterUid,{type:"follow_request_accepted",message:"accepted your follow request",fromUid:me,fromUsername:owner.username||owner.displayName||"InstaPro User",fromPhoto:owner.photoURL||owner.photoUrl||""});return true;
}
async function cancelFollowRequest(targetUid){const me=uid();if(!me||!targetUid)return;const r=doc(db,"users",targetUid,"followRequests",me),s=await getDoc(r);if(s.exists()&&s.data().status==="pending")await deleteDoc(r);}
function close(){if(settingsStop){settingsStop();settingsStop=null;}if(requestsStop){requestsStop();requestsStop=null;}overlay?.remove();overlay=null;document.body.style.overflow="";}
function styles(){if($("#ip-private-style"))return;const s=document.createElement("style");s.id="ip-private-style";s.textContent=`#ipPrivateOverlay{position:fixed;inset:0;z-index:2147483000;background:#05070fd9;backdrop-filter:blur(18px);color:#fff;overflow:auto;padding:18px 12px;font-family:inherit}#ipPrivateOverlay .ip-pr-card{max-width:520px;margin:24px auto;background:#1a1b27;border:1px solid #ffffff22;border-radius:22px;padding:18px;box-shadow:0 18px 65px #0008}#ipPrivateOverlay button{cursor:pointer;color:inherit}#ipPrivateOverlay .ip-pr-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}#ipPrivateOverlay .ip-pr-close{margin-left:auto;border:0;background:#ffffff12;border-radius:12px;font-size:24px;width:42px;height:42px}#ipPrivateOverlay .ip-pr-toggle{width:54px;height:30px;border:0;border-radius:30px;background:#555;padding:3px;flex-shrink:0}#ipPrivateOverlay .ip-pr-toggle i{display:block;width:24px;height:24px;border-radius:50%;background:white;transition:transform .18s}#ipPrivateOverlay .ip-pr-toggle[aria-checked=true]{background:#a855f7}#ipPrivateOverlay .ip-pr-toggle[aria-checked=true] i{transform:translateX(24px)}#ipPrivateOverlay .ip-pr-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ffffff12}#ipPrivateOverlay .ip-pr-row img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#333}#ipPrivateOverlay .ip-pr-name{font-weight:750;overflow-wrap:anywhere}#ipPrivateOverlay .ip-pr-sub{font-size:12px;opacity:.65;margin-top:3px;line-height:1.5}#ipPrivateOverlay .ip-pr-actions{margin-left:auto;display:flex;gap:7px}#ipPrivateOverlay .ip-pr-actions button{border:0;border-radius:10px;padding:9px 11px;background:#a855f7;font-weight:700}#ipPrivateOverlay .ip-pr-actions .reject{background:#ffffff18}`;document.head.appendChild(s);}
async function openPrivateSettings(){
 const me=uid();if(!me){alert("Private Account settings ke liye login karein.");return;}styles();close();
 overlay=document.createElement("section");overlay.id="ipPrivateOverlay";overlay.innerHTML=`<div class="ip-pr-card"><header class="ip-pr-head"><div style="font-size:28px">🔒</div><div><strong style="font-size:20px">Private Account</strong><div class="ip-pr-sub">InstaPro privacy settings</div></div><button class="ip-pr-close" id="ipPrClose">×</button></header><div id="ipPrBody">Loading…</div></div>`;
 document.body.appendChild(overlay);document.body.style.overflow="hidden";$("#ipPrClose",overlay).onclick=close;overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
 const body=$("#ipPrBody",overlay),userRef=doc(db,"users",me);
 settingsStop=onSnapshot(userRef,snap=>{
  const data=normalized(snap.exists()?snap.data():{});
  body.innerHTML=`<div class="ip-pr-row"><div style="flex:1"><div class="ip-pr-name">Private account</div><div class="ip-pr-sub">ON karne par nayi follow requests approve karni hongi.</div></div><button class="ip-pr-toggle" id="ipPrToggle" role="switch" aria-checked="${data.isPrivate}"><i></i></button></div><div style="padding:15px 0 6px"><strong>Follow requests</strong><div class="ip-pr-sub">Accept ya Reject karein.</div></div><div id="ipPrRequests">Requests load ho rahi hain…</div><p class="ip-pr-sub" style="margin-top:18px">Security note: actual protection ke liye Firestore Security Rules aur media storage access rules bhi update karne honge. Sirf client-side privacy toggle data ko fully secure nahi karta.</p>`;
  $("#ipPrToggle",body).onclick=async()=>{const btn=$("#ipPrToggle",body);btn.disabled=true;try{await setDoc(userRef,{isPrivate:!data.isPrivate,privateAccount:!data.isPrivate,updatedAt:serverTimestamp()},{merge:true});}catch(e){console.error(e);alert("Privacy save nahi hui. Firestore Rules check karein.");}finally{btn.disabled=false;}};
  if(requestsStop){requestsStop();requestsStop=null;}
  requestsStop=onSnapshot(query(collection(db,"users",me,"followRequests"),where("status","==","pending")),async snap=>{
   const holder=$("#ipPrRequests",body);if(!holder)return;if(snap.empty){holder.innerHTML='<div class="ip-pr-sub" style="padding:12px 0">Abhi koi pending request nahi hai.</div>';return;}
   const rows=await Promise.all(snap.docs.map(async d=>{const x=d.data();let name=x.fromUsername||"InstaPro User",photo=x.fromPhoto||"https://www.gravatar.com/avatar/?d=mp";if(!x.fromUsername){try{const u=await getDoc(doc(db,"users",x.fromUid||d.id));if(u.exists()){name=u.data().username||u.data().displayName||name;photo=u.data().photoURL||u.data().photoUrl||photo;}}catch(_){}}return `<div class="ip-pr-row"><img src="${esc(photo)}" alt=""><div style="min-width:0"><div class="ip-pr-name">${esc(name)}</div><div class="ip-pr-sub">Follow request</div></div><div class="ip-pr-actions"><button data-accept="${esc(d.id)}">Accept</button><button class="reject" data-reject="${esc(d.id)}">Reject</button></div></div>`;}));
   holder.innerHTML=rows.join("");holder.querySelectorAll("[data-accept]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await respondFollowRequest(b.dataset.accept,true);}catch(e){alert(e.message||"Accept nahi hua");}finally{b.disabled=false;}});holder.querySelectorAll("[data-reject]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await respondFollowRequest(b.dataset.reject,false);}catch(e){alert(e.message||"Reject nahi hua");}finally{b.disabled=false;}});
  },e=>{console.error(e);const h=$("#ipPrRequests",body);if(h)h.textContent="Requests load nahi hui. Firestore Rules check karein.";});
 },e=>{console.error(e);body.textContent="Privacy settings load nahi hui. Firestore Rules check karein.";});
}
function initPrivateAccountSystem(){window.InstaProPrivate={getAccountPrivacy,isApprovedFollower,canViewAccountContent,requestFollow,respondFollowRequest,cancelFollowRequest,openPrivateSettings};document.addEventListener("click",e=>{const b=e.target.closest("[data-open-private-settings]");if(b){e.preventDefault();openPrivateSettings();}});console.log("InstaPro Private Account System loaded.");}
export {getAccountPrivacy,isApprovedFollower,canViewAccountContent,requestFollow,respondFollowRequest,cancelFollowRequest,openPrivateSettings,initPrivateAccountSystem};
