import { auth, db } from "./firebase.js";
import {
  collection, doc, getDocs, limit, query, setDoc, updateDoc,
  arrayUnion, arrayRemove, writeBatch, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let usersCache = [];
let myFollowing = [];
let unsubMe = null;
let unsubUsers = null;
let unsubAuth = null;
let initialized = false;
let dismissed = new Set();
let refreshBusy = false;

function styles() {
  if (document.getElementById("ipSuggestStyles")) return;
  const s = document.createElement("style");
  s.id = "ipSuggestStyles";
  s.textContent = `
  .ipsg-wrap{margin:18px 12px;padding:16px;border:1px solid #ffffff1c;border-radius:20px;background:linear-gradient(135deg,#ffffff12,#ffffff05);color:inherit;backdrop-filter:blur(18px);font-family:inherit}
  .ipsg-head{display:flex;align-items:center;gap:8px;margin-bottom:12px}.ipsg-title{font-size:16px;font-weight:800;flex:1}.ipsg-refresh{border:1px solid #ffffff25;border-radius:10px;background:#ffffff0d;color:inherit;padding:7px 10px}
  .ipsg-list{display:flex;gap:10px;overflow-x:auto;padding:2px 0 7px;scroll-snap-type:x proximity}
  .ipsg-card{flex:0 0 154px;min-width:0;text-align:center;padding:14px 10px;border:1px solid #ffffff1c;border-radius:16px;background:#ffffff08;scroll-snap-align:start}
  .ipsg-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#333;border:2px solid #e879f9;margin:0 auto 9px;display:block}
  .ipsg-name{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ipsg-handle{font-size:11px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:3px 0 7px}
  .ipsg-mutual{font-size:10px;opacity:.7;min-height:14px;margin-bottom:8px}.ipsg-follow{width:100%;border:0;border-radius:10px;padding:9px 7px;background:linear-gradient(110deg,#8b5cf6,#ec4899);color:white;font-weight:800;font-size:12px}.ipsg-remove{border:0;background:transparent;color:inherit;opacity:.6;font-size:11px;padding:8px}
  .ipsg-empty{font-size:12px;opacity:.7;padding:15px 3px}.ipsg-error{font-size:12px;color:#ff9da9;padding:10px}
  `;
  document.head.appendChild(s);
}
function personName(u){return u.username || u.displayName || u.name || u.email?.split("@")[0] || "InstaPro user";}
function personPhoto(u){return u.photoURL || u.photoUrl || u.profilePic || u.photo || u.avatar || "https://www.gravatar.com/avatar/?d=mp";}
function uidOf(u){return u.uid || u.id || "";}
function rankUsers() {
  const me = auth.currentUser?.uid;
  const followed = new Set(myFollowing);
  const mine = usersCache.find(u => uidOf(u) === me) || {};
  const myInterests = new Set([...(mine.interests || []), ...(mine.categories || [])].map(x => String(x).toLowerCase()));
  return usersCache.filter(u => {
    const id=uidOf(u);
    return id && id!==me && !followed.has(id) && !dismissed.has(id) && !u.disabled && u.isAnonymous!==true;
  }).map(u => {
    const followers = Array.isArray(u.followers) ? u.followers : [];
    const following = Array.isArray(u.following) ? u.following : [];
    const mutual = following.filter(id => followed.has(id)).length;
    const interests = [...(u.interests || []), ...(u.categories || [])].filter(x => myInterests.has(String(x).toLowerCase())).length;
    const followersCount = Array.isArray(u.followers) ? u.followers.length : Number(u.followersCount || 0);
    return {...u, __uid:uidOf(u), __mutual:mutual, __score:mutual*5+interests*3+Math.min(followersCount,100)/100};
  }).sort((a,b)=>b.__score-a.__score).slice(0,24);
}
function mount(target) {
  if (!target || target.querySelector(":scope > .ipsg-wrap")) return;
  const box=document.createElement("section");
  box.className="ipsg-wrap";
  box.innerHTML='<div class="ipsg-head"><div class="ipsg-title">Suggested for you</div><button class="ipsg-refresh" type="button">↻ Refresh</button></div><div class="ipsg-list"><div class="ipsg-empty">Loading suggestions…</div></div>';
  target.append(box);
  box.querySelector(".ipsg-refresh").onclick=()=>{dismissed.clear(); if(refreshBusy)return; refreshBusy=true; showSuggestionState("Suggestions refresh ho rahe hain…"); const user=auth.currentUser; if(user&&!user.isAnonymous){startListeners(user);} else { unsubUsers?.(); unsubUsers=onSnapshot(query(collection(db,"users"),limit(100)),snap=>{usersCache=snap.docs.map(d=>({id:d.id,uid:d.id,...d.data()}));renderAll();},error=>{console.error("Suggestion refresh:",error);showSuggestionState("Suggestions load nahi hue. Firestore Rules check karein.",true);}); } setTimeout(()=>{refreshBusy=false;},1500); };
  return box;
}
function cardHTML(u) {
  const name=personName(u), id=u.__uid;
  return `<article class="ipsg-card" data-suggest-card="${esc(id)}">
    <img class="ipsg-avatar" src="${esc(personPhoto(u))}" alt="" loading="lazy" onerror="this.src='https://www.gravatar.com/avatar/?d=mp'">
    <div class="ipsg-name">${esc(name)}</div><div class="ipsg-handle">@${esc(String(u.username || id).replace(/^@/, ""))}</div>
    <div class="ipsg-mutual">${u.__mutual ? esc(u.__mutual)+" mutual connection"+(u.__mutual===1?"":"s") : "People you may know"}</div>
    <button type="button" class="ipsg-follow" data-suggest-follow="${esc(id)}">Follow</button>
    <button type="button" class="ipsg-remove" data-suggest-remove="${esc(id)}">Remove</button>
  </article>`;
}
function renderAll() {
  document.querySelectorAll(".ipsg-wrap").forEach(box=>{
    const list=box.querySelector(".ipsg-list");
    if (!list) return;
    const ranked=rankUsers();
    list.innerHTML=ranked.length?ranked.map(cardHTML).join(""):'<div class="ipsg-empty">Abhi naye suggestions nahi hain. Baad mein refresh karein.</div>';
    list.querySelectorAll("[data-suggest-follow]").forEach(btn=>btn.onclick=()=>followUser(btn.dataset.suggestFollow,btn));
    list.querySelectorAll("[data-suggest-remove]").forEach(btn=>btn.onclick=()=>{dismissed.add(btn.dataset.suggestRemove);renderAll();});
    list.querySelectorAll(".ipsg-avatar,.ipsg-name,.ipsg-handle").forEach(el=>el.style.cursor="pointer");
    list.querySelectorAll(".ipsg-card").forEach(card=>{
      const id=card.dataset.suggestCard;
      card.querySelector(".ipsg-avatar").onclick=card.querySelector(".ipsg-name").onclick=()=>openSuggestedProfile(id);
    });
  });
}
async function openSuggestedProfile(uid) {
  try { await import("./profile.js"); if(typeof window.openProfile==="function") await window.openProfile(uid); }
  catch(e){console.error("Suggested profile open failed:",e);}
}
async function followUser(targetUid,button) {
  const user=auth.currentUser;
  if(!user || user.isAnonymous){alert("Follow karne ke liye Google se login karein.");return;}
  if(user.uid===targetUid)return;
  button.disabled=true;button.textContent="Please wait…";
  try {
    const meRef=doc(db,"users",user.uid), targetRef=doc(db,"users",targetUid);
    const [meSnap,targetSnap]=await Promise.all([getDocs(query(collection(db,"users"),limit(100))), import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(m=>m.getDoc(targetRef))]);
    const currentSnap = meSnap.docs.find(d=>d.id===user.uid);
    const mine=currentSnap?.data() || {};
    const target=targetSnap.exists()?targetSnap.data():{};
    const following=Array.isArray(mine.following)?mine.following:[];
    const followers=Array.isArray(target.followers)?target.followers:[];
    if(following.includes(targetUid)){myFollowing=following;renderAll();return;}
    const batch=writeBatch(db);
    batch.set(meRef,{following:arrayUnion(targetUid),updatedAt:serverTimestamp()},{merge:true});
    batch.set(targetRef,{followers:arrayUnion(user.uid),updatedAt:serverTimestamp()},{merge:true});
    await batch.commit();
    myFollowing=[...new Set([...myFollowing,targetUid])];
    renderAll();
  } catch(e) {
    console.error("Suggested follow failed:",e);
    alert("Follow save nahi hua. Internet aur Firestore Rules check karein.");
    button.disabled=false;button.textContent="Follow";
  }
}
function showSuggestionState(message, isError=false) {
  document.querySelectorAll(".ipsg-list").forEach(list => {
    list.innerHTML = '<div class="' + (isError ? 'ipsg-error' : 'ipsg-empty') + '">' + esc(message) + '</div>';
  });
}
let placementObserver = null;
let duplicateGuardObserver = null;
let placementTimer = null;

function placeSingleSuggestion(box, feedEl) {
  if (!box || !feedEl) return;
  document.querySelectorAll(".ipsg-wrap").forEach(item => { if (item !== box) item.remove(); });
  // Only place after the feed has rendered at least its first result/empty state.
  const hasFeedContent = feedEl.querySelector(".instapro-feed-post") ||
    /No Photo Posts Yet|Login required/i.test(feedEl.textContent || "");
  if (!hasFeedContent) return;
  const posts = Array.from(feedEl.children).filter(el => el.matches(".instapro-feed-post"));
  if (posts.length >= 5) {
    const anchor = posts[4];
    if (box.parentElement !== feedEl || anchor.nextElementSibling !== box) feedEl.insertBefore(box, anchor.nextElementSibling);
  } else if (posts.length) {
    const anchor = posts[posts.length - 1];
    if (box.parentElement !== feedEl || anchor.nextElementSibling !== box) feedEl.insertBefore(box, anchor.nextElementSibling);
  } else if (box.parentElement !== feedEl) {
    feedEl.appendChild(box);
  }
}

function init() {
  styles();
  const home = document.getElementById("homePage");
  const feedEl = document.getElementById("feed");
  if (!home || !feedEl) return;

  const existing = Array.from(document.querySelectorAll(".ipsg-wrap"));
  const box = existing[0] || mount(feedEl);
  existing.slice(1).forEach(item => item.remove());
  if (!box) return;

  const schedulePlacement = () => {
    clearTimeout(placementTimer);
    placementTimer = setTimeout(() => placeSingleSuggestion(box, feedEl), 350);
  };
  schedulePlacement();

  if (!placementObserver) {
    placementObserver = new MutationObserver(schedulePlacement);
    placementObserver.observe(feedEl, { childList: true });
  }
  if (!duplicateGuardObserver) {
    duplicateGuardObserver = new MutationObserver(() => {
      const all = Array.from(document.querySelectorAll(".ipsg-wrap"));
      all.slice(1).forEach(item => item.remove());
    });
    duplicateGuardObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (initialized) return;
  initialized = true;

  unsubAuth = auth.onAuthStateChanged(user => {
    if (unsubMe) { unsubMe(); unsubMe = null; }
    if (unsubUsers) { unsubUsers(); unsubUsers = null; }
    myFollowing = [];
    if (user && !user.isAnonymous) {
      unsubMe = onSnapshot(doc(db, "users", user.uid), snap => {
        const data = snap.exists() ? snap.data() : {};
        myFollowing = Array.isArray(data.following) ? data.following : [];
        renderAll();
      }, error => { console.error("Suggestion follow listener:", error); renderAll(); });
    }
    unsubUsers = onSnapshot(query(collection(db, "users"), limit(100)), snap => {
      usersCache = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
      renderAll();
    }, error => {
      console.error("Suggestion users listener:", error);
      showSuggestionState("Suggestions load nahi hue. Firestore Rules check karein.", true);
    });
  }, error => {
    console.error("Suggestion auth state error:", error);
    showSuggestionState("Suggestions load nahi hue. Internet ya Firebase Rules check karein.", true);
  });

  setTimeout(() => {
    document.querySelectorAll(".ipsg-list").forEach(list => {
      if (/Loading suggestions/i.test(list.textContent || "")) {
        list.innerHTML = '<div class="ipsg-error">Suggestions load nahi hue. Refresh dabayein.</div>';
      }
    });
  }, 10000);
}
function startListeners(user = auth.currentUser) {
  if(!user || user.isAnonymous) {
    showSuggestionState("Follow suggestions ke liye Google account se login karein.");
    return;
  }
  if(unsubMe)unsubMe();
  if(unsubUsers)unsubUsers();
  unsubMe=onSnapshot(doc(db,"users",user.uid),snap=>{
    const data=snap.exists()?snap.data():{};
    myFollowing=Array.isArray(data.following)?data.following:[];
    renderAll();
  },e=>{ console.error("Suggestion follow listener:",e); showSuggestionState("Following data load nahi hua. Refresh dabayein.", true); });
  unsubUsers=onSnapshot(query(collection(db,"users"),limit(100)),snap=>{
    usersCache=snap.docs.map(d=>({id:d.id,uid:d.id,...d.data()}));
    renderAll();
  },e=>{
    console.error("Suggestion users listener:",e);
    document.querySelectorAll(".ipsg-list").forEach(list=>list.innerHTML='<div class="ipsg-error">Suggestions load nahi hue. Firestore Rules check karein.</div>');
  });
}
export function initSuggestions() {
  if (window.__instaProSuggestionsInitStarted) return;
  window.__instaProSuggestionsInitStarted = true;
  init();
}
