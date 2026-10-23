// InstaPro Stories — Instagram-style realtime stories
import { db, auth } from "./firebase.js";
import {
  collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove,
  setDoc, addDoc, deleteDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const otherStoriesBox = document.getElementById("otherStories");
const yourRing = document.getElementById("addStoryBtn");
const yourStoryItem = yourRing?.closest(".sItem");
if (yourRing && !yourRing.dataset.storyTapFix) {
  yourRing.dataset.storyTapFix = "1";
  yourRing.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const myUid = auth.currentUser?.uid || signedInUser?.uid || "";
    const ownStories = groupsByUser(activeStories()).find(group => group.uid === myUid);
    // If a story is already posted, tapping the ring opens it. Use the bottom + to add another story.
    if (ownStories?.stories?.length) openStoryGroup(ownStories);
    else document.getElementById("optStory")?.click();
  }, true);
  yourRing.style.position = "relative";
  yourRing.style.zIndex = "5";
  yourRing.style.pointerEvents = "auto";
  yourRing.style.touchAction = "manipulation";
  yourRing.querySelector("span")?.style.setProperty("pointer-events", "auto");
  yourStoryItem?.querySelector("p")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const myUid = auth.currentUser?.uid || signedInUser?.uid || "";
    const ownStories = groupsByUser(activeStories()).find(group => group.uid === myUid);
    if (ownStories?.stories?.length) openStoryGroup(ownStories);
    else document.getElementById("optStory")?.click();
  }, true);
}
let expiryTimer = null;
let stopCurrentStory = null;
let currentLiked = false;
let allStories = [];
let stopStories = null;
let signedInUser = auth.currentUser || null;
let viewer = null;
let viewerTimer = null;
let currentGroup = [];
let currentIndex = 0;
let seenStoryIds = new Set();
let stopStoryComments = null;

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));

function mediaUrl(story) {
  return story.mediaUrl || story.imageUrl || story.url || story.videoUrl || story.image || "";
}
function ownerId(story) {
  return story.uid || story.userId || story.authorId || story.ownerUid || story.userUID || story.authorUid || story.ownerId || story.user?.uid || story.user?.id || story.createdBy || "";
}
function chatIdFor(a, b) { return [a, b].sort().join("_"); }
async function sendReplyToDM(text) {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  const receiverUid = ownerId(story);
  if (!user || user.isAnonymous) throw new Error("DM bhejne ke liye Google login karein.");
  if (!receiverUid || receiverUid === user.uid) throw new Error("Apni story par DM reply nahi bhej sakte.");
  const replyMode=story.privacy?.replies||"everyone";
  if(replyMode==="off")throw new Error("Is story par replies band hain.");
  if(replyMode==="following"){
    const ownerSnap=await getDoc(doc(db,"users",receiverUid));
    const following=ownerSnap.exists()&&Array.isArray(ownerSnap.data().following)?ownerSnap.data().following:[];
    if(!following.includes(user.uid))throw new Error("Is story par sirf owner jinhe follow karta hai wahi reply kar sakte hain.");
  }
  const chatId = chatIdFor(user.uid, receiverUid);
  await setDoc(doc(db, "chats", chatId), {
    participants: [user.uid, receiverUid],
    lastMessage: "Story reply: " + text,
    lastSenderUid: user.uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await addDoc(collection(db, "chats", chatId, "messages"), {
    text, message: text, senderUid: user.uid, receiverUid, uid: user.uid,
    createdAt: serverTimestamp(), read: false, messageType: "story_reply",
    storyId: story.id, storyMediaUrl: mediaUrl(story), storyOwnerUid: receiverUid
  });
  await notifyStoryOwner(receiverUid, "story_reply", "replied to your story", story);
}
async function toggleStoryLike() {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  if (!user || user.isAnonymous) { alert("Story like karne ke liye Google login karein."); return; }
  if (ownerId(story) && ownerId(story) === user.uid) {
    alert("Aap apni story ko like nahi kar sakte.");
    return;
  }
  const btn = viewer?.querySelector(".is-like");
  if (btn) btn.disabled = true;
  try {
    const wasLiked = currentLiked;
    await updateDoc(doc(db, "stories", story.id), {
      likedBy: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    currentLiked = !wasLiked;
    if (!wasLiked) animateStoryHeart();
    if (!wasLiked) {
      await notifyStoryOwner(ownerId(story), "story_like", "liked your story", story);
    }
    story.likedBy = currentLiked
      ? [...new Set([...(Array.isArray(story.likedBy) ? story.likedBy : []), user.uid])]
      : (Array.isArray(story.likedBy) ? story.likedBy.filter(uid => uid !== user.uid) : []);
    updateLikeButton();
  } catch (error) {
    console.error("Story like save error:", error);
    alert("Like Firebase mein save nahi hua. Firestore Rules check karein.");
  } finally { if (btn) btn.disabled = false; }
}
function updateLikeButton() {
  const btn = viewer?.querySelector(".is-like");
  if (btn) {
    btn.textContent = currentLiked ? "♥" : "♡";
    btn.setAttribute("aria-pressed", currentLiked ? "true" : "false");
    btn.style.background = "transparent";
    btn.style.color = currentLiked ? "#ff3040" : "#fff";
  }
}
function animateStoryHeart() {
  const stage = viewer?.querySelector(".is-stage");
  if (!stage) return;
  const heart = document.createElement("div");
  heart.className = "is-heart-pop";
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");
  heart.style.cssText = "position:absolute;left:50%;top:48%;z-index:25;pointer-events:none;color:#ff2d55;font-size:clamp(90px,24vw,150px);line-height:1;text-shadow:0 5px 28px rgba(255,45,85,.5);transform:translate(-50%,-50%) scale(.25);opacity:0;will-change:transform,opacity;";
  stage.appendChild(heart);
  if (heart.animate) heart.animate([
    {transform:"translate(-50%,-50%) scale(.25)",opacity:0,offset:0},
    {transform:"translate(-50%,-50%) scale(1.18)",opacity:1,offset:.42},
    {transform:"translate(-50%,-50%) scale(.94)",opacity:1,offset:.65},
    {transform:"translate(-50%,-50%) scale(1.08)",opacity:0,offset:1}
  ],{duration:850,easing:"cubic-bezier(.18,.89,.32,1)",fill:"forwards"});
  setTimeout(()=>heart.remove(),900);
}
function ownerName(story) {
  return story.username || story.displayName || story.email?.split("@")[0] || "InstaPro User";
}
async function notifyStoryOwner(targetUid, type, message, story) {
  const user = signedInUser || auth.currentUser;
  if (!user || !targetUid || targetUid === user.uid) return;
  try {
    await addDoc(collection(db, "users", targetUid, "notifications"), {
      type,
      message,
      fromUid: user.uid,
      fromUsername: user.displayName || user.email?.split("@")[0] || "InstaPro User",
      fromPhoto: user.photoURL || "",
      storyId: story?.id || "",
      storyMediaUrl: mediaUrl(story || {}),
      createdAt: serverTimestamp(),
      read: false
    });
  } catch (error) {
    console.warn("Story notification could not be saved:", error);
  }
}
function isVideo(story) {
  const type = String(story.mediaType || story.contentType || story.type || "").toLowerCase();
  return type.includes("video") || type.includes("reel") || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl(story));
}
function timestamp(story) {
  const value = story.createdAt;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
}
function expiry(story) {
  const exp = Number(story.expiresAt);
  return exp > 0 ? exp : (timestamp(story) || Date.now()) + 86400000;
}
function activeStories() {
  const now = Date.now();
  const uid=(signedInUser||auth.currentUser)?.uid||"";
  return allStories.filter(s => {
    if (!mediaUrl(s) || expiry(s) <= now) return false;
    const privacy = s.privacy || {};
    const audience = privacy.audience || s.audience || "everyone";
    if (ownerId(s) === uid) return true;
    if (audience === "onlyMe") return false;
    if (Array.isArray(privacy.hiddenFromUids) && privacy.hiddenFromUids.includes(uid)) return false;
    if (audience === "closeFriends") {
      const owner = allStories.find(item => ownerId(item) === ownerId(s));
      // Close-friends membership is stored on the story owner's user document.
      return Array.isArray(privacy.closeFriendsUids) && privacy.closeFriendsUids.includes(uid);
    }
    return true;
  }).sort((a, b) => timestamp(b) - timestamp(a));
}
function groupsByUser(stories) {
  const groups = new Map();
  for (const story of stories) {
    const key = ownerId(story) || ("unknown:" + (story.email || ownerName(story)));
    if (!groups.has(key)) groups.set(key, { key, uid: ownerId(story), name: ownerName(story), photo: story.photo || story.photoURL || "", stories: [] });
    const group = groups.get(key);
    group.stories.push(story);
    if ((!group.photo || group.photo.length < 5) && (story.photo || story.photoURL)) group.photo = story.photo || story.photoURL;
  }
  return [...groups.values()].map(group => {
    group.stories.sort((a, b) => timestamp(a) - timestamp(b));
    group.latest = group.stories[group.stories.length - 1];
    return group;
  });
}
function setRingPreview(ring, story, label) {
  if (!ring) return;
  const url = story ? mediaUrl(story) : "";
  let image = ring.querySelector(":scope > img.insta-story-preview");
  ring.style.position = "relative";
  ring.style.overflow = "visible";

  if (url) {
    // Keep the gradient visible as an outer ring; the story image sits inside it.
    ring.style.background = "conic-gradient(#ffb347,#ff3d9a,#a855f7,#ff3d9a,#ffb347)";
    ring.style.padding = "3px";
    ring.style.boxSizing = "border-box";
    ring.style.border = "0";
    if (!image) {
      image = document.createElement("img");
      image.className = "insta-story-preview";
      image.alt = label;
      ring.prepend(image);
    }
    image.src = url;
    image.style.cssText = "position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);object-fit:cover;border-radius:50%;z-index:0;display:block;pointer-events:none;";
    const plus = ring.querySelector("span");
    if (plus) plus.style.cssText = "position:absolute;right:-3px;bottom:-3px;z-index:3;background:#0095f6;color:#fff;border:2px solid #111;border-radius:50%;width:21px;height:21px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;";
  } else {
    image?.remove();
    ring.style.background = "";
    ring.style.padding = "";
    ring.style.boxSizing = "";
    ring.style.border = "";
    const plus = ring.querySelector("span");
    if (plus) plus.removeAttribute("style");
  }
}
function openUpload() {
  const button = document.getElementById("optStory");
  if (button) button.click();
  else alert("Story upload option nahi mila.");
}
function renderStories() {
  if (!otherStoriesBox) return;

  // Auth can resolve after Firestore's first snapshot; always recalculate ownership.
  const stories = activeStories();
  const groups = groupsByUser(stories);
  const myUid = signedInUser?.uid || auth.currentUser?.uid || "";
  const ownGroup = myUid ? groups.find(g => g.uid === myUid) : null;
  const otherGroups = groups.filter(g => g.uid !== myUid);

  // Keep the "Your story" slot visible so users can always add a story.
  if (yourStoryItem) {
    yourStoryItem.style.display = "flex";
    yourStoryItem.style.flex = "0 0 64px";
    yourStoryItem.style.minWidth = "64px";
    yourStoryItem.style.width = "64px";
    yourStoryItem.style.flexDirection = "column";
    yourStoryItem.style.alignItems = "center";
    yourStoryItem.style.textAlign = "center";
    const caption = yourStoryItem.querySelector("p");
    if (caption) {
      caption.textContent = "Your story";
      caption.style.cssText = "display:block;visibility:visible;opacity:1;width:100%;margin:5px 0 0;padding:0;text-align:center;white-space:nowrap;font-size:12px;line-height:16px;color:inherit;position:relative;z-index:2;";
    }
  }
  // Show the latest own story in the existing ring; the plus control still opens upload.
  setRingPreview(yourRing, ownGroup?.latest || null, "Your latest story");
  if (yourRing) {
    yourRing.title = ownGroup ? "View your story · + to add another" : "Add to your story";
    yourRing.style.cursor = "pointer";
    yourRing.style.pointerEvents = "auto";
    yourRing.style.touchAction = "manipulation";
    yourRing.setAttribute("role", "button");
    yourRing.setAttribute("tabindex", "0");
    const handleYourStoryClick = event => {
      event.preventDefault();
      event.stopPropagation();
      // The small blue + is for adding another story; the rest of the ring opens it.
      if (event.target instanceof Element && event.target.closest("span")) {
        openUpload();
        return;
      }
      if (ownGroup?.stories?.length) openStoryGroup(ownGroup);
      else openUpload();
    };
    yourRing.onclick = handleYourStoryClick;
    yourRing.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") handleYourStoryClick(event);
    };
    const yourCaption = yourStoryItem?.querySelector("p");
    if (yourCaption) {
      yourCaption.style.cursor = "pointer";
      yourCaption.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        if (ownGroup?.stories?.length) openStoryGroup(ownGroup);
        else openUpload();
      };
    }
  }

  // Use a real flex row instead of display:contents for reliable mobile rendering.
  otherStoriesBox.style.display = "flex";
  otherStoriesBox.style.flex = "0 0 auto";
  otherStoriesBox.style.alignItems = "flex-start";
  otherStoriesBox.style.gap = "12px";
  otherStoriesBox.style.width = "max-content";
  otherStoriesBox.style.border = "0";
  otherStoriesBox.style.background = "transparent";
  otherStoriesBox.style.padding = "0";
  otherStoriesBox.style.margin = "0";
  otherStoriesBox.innerHTML = "";

  for (const group of otherGroups) {
    const item = document.createElement("div");
    item.className = "sItem insta-story-account";
    item.style.cssText = "flex:0 0 auto;cursor:pointer;";
    const ring = document.createElement("button");
    ring.type = "button";
    ring.className = "sRing";
    ring.setAttribute("aria-label", "View " + group.name + "'s story");
    ring.style.cssText = "position:relative;overflow:visible;padding:3px;cursor:pointer;border:0;box-sizing:border-box;background:conic-gradient(#ffb347 0deg,#ff2d95 110deg,#a855f7 220deg,#ff2d95 300deg,#ffb347 360deg);border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.18);";
    const preview = document.createElement("img");
    preview.src = mediaUrl(group.latest);
    preview.alt = "";
    preview.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;border:2px solid #090909;box-sizing:border-box;";
    ring.appendChild(preview);
    const caption = document.createElement("p");
    caption.textContent = group.name;
    caption.style.cssText = "margin:4px 0 0;text-align:center;";
    ring.addEventListener("click", () => openStoryGroup(group));
    caption.addEventListener("click", () => openStoryGroup(group));
    item.append(ring, caption);
    otherStoriesBox.appendChild(item);
  }
}


function openStoryPanel(title, bodyHtml) {
  document.getElementById("instapro-story-panel")?.remove();
  const panel=document.createElement("section"); panel.id="instapro-story-panel";
  panel.style.cssText="position:absolute;left:0;right:0;bottom:0;z-index:30;background:#fff;color:#161616;border-radius:22px 22px 0 0;max-height:75%;display:flex;flex-direction:column;box-shadow:0 -12px 40px #0008;font-family:Arial,sans-serif;";
  panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid #eee;"><strong>'+escapeHtml(title)+'</strong><button class="isp-close" style="border:0;background:transparent;font-size:25px;color:#222;">×</button></div><div class="isp-body" style="overflow:auto;padding:12px 16px;">'+bodyHtml+'</div>';
  viewer.appendChild(panel); panel.querySelector(".isp-close").onclick=()=>panel.remove(); return panel;
}
async function getOtherUsers() {
  const user=signedInUser||auth.currentUser; if(!user) throw new Error("Pehle Google login karein.");
  const snap=await getDocs(collection(db,"users"));
  return snap.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.uid!==user.uid);
}
function userLabel(u){return u.username||u.displayName||u.name||u.email?.split("@")[0]||"InstaPro User";}
async function openStoryViewers(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||ownerId(story)!==user.uid){alert("Viewer list sirf apni story par dikhegi.");return;}
  const panel=openStoryPanel("Story viewers","<p>Viewers load ho rahe hain…</p>");
  try{
    // Always read the latest Firestore document so a previously opened story
    // object cannot hide likes added from another profile/device.
    const latestSnap=await getDoc(doc(db,"stories",story.id));
    if(!latestSnap.exists()){
      panel.querySelector(".isp-body").innerHTML='<p style="text-align:center;color:#777;padding:20px 0;">Yeh story ab available nahi hai.</p>';
      return;
    }
    const latest=latestSnap.data();
    const ownerUid=ownerId(story);
    const rawViewIds=Array.isArray(latest.seenBy)?latest.seenBy:[];
    const rawLikedIds=Array.isArray(latest.likedBy)?latest.likedBy:[];
    // The story owner must never appear in their own viewers/likers list.
    const viewIds=rawViewIds.filter(uid=>uid && uid!==ownerUid);
    const likedIds=rawLikedIds.filter(uid=>uid && uid!==ownerUid);
    story.seenBy=viewIds;
    story.likedBy=likedIds;
    const ids=[...new Set([...viewIds,...likedIds])];
    if(!ids.length){
      panel.querySelector(".isp-body").innerHTML='<p style="text-align:center;color:#777;padding:20px 0;">Abhi kisi ne story nahi dekhi ya like nahi ki.</p>';
      return;
    }
    const people=await Promise.all(ids.map(async uid=>{
      try{const s=await getDoc(doc(db,"users",uid));return s.exists()?{uid,...s.data()}:{uid,username:"InstaPro User"};}
      catch{return {uid,username:"InstaPro User"};}
    }));
    const body=panel.querySelector(".isp-body");
    body.innerHTML='<p style="font-size:13px;color:#777;margin-bottom:8px;">'+viewIds.length+' views · '+likedIds.length+' likes</p>'+
      people.map(p=>{
        const liked=likedIds.includes(p.uid);
        const viewed=viewIds.includes(p.uid);
        return '<button type="button" data-story-viewer-uid="'+escapeHtml(p.uid)+'" style="display:flex;align-items:center;gap:10px;padding:10px 0;width:100%;border:0;border-bottom:1px solid #eee;background:transparent;text-align:left;color:#161616;cursor:pointer;">'+
          '<img src="'+escapeHtml(p.photoURL||p.photo||"https://www.gravatar.com/avatar/?d=mp")+'" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex:0 0 42px;">'+
          '<span style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;"><strong>'+escapeHtml(userLabel(p))+'</strong><small style="color:#777;">'+(viewed?'Viewed':'')+(viewed&&liked?' · ':'')+(liked?'❤️ Liked your story':'')+'</small></span>'+
          '<span style="color:#0095f6;font-size:12px;font-weight:700;">View profile ›</span></button>';
      }).join("");
    body.querySelectorAll("[data-story-viewer-uid]").forEach(row=>{
      row.addEventListener("click",()=>{
        const targetUid=row.getAttribute("data-story-viewer-uid");
        panel.remove();
        if(typeof window.openProfile==="function") window.openProfile(targetUid);
        else alert("Profile system abhi load nahi hua. Dobara try karein.");
      });
    });
  }catch(e){console.error("Story viewer list refresh error:",e);panel.querySelector(".isp-body").textContent="Viewer list load nahi hui. Firestore Rules check karein.";}
}
async function openStoryDmShare(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||user.isAnonymous){alert("Story DM mein send karne ke liye Google login karein.");return;}
  if(story.privacy?.allowSharing===false){alert("Owner ne story sharing band ki hui hai.");return;}
  const panel=openStoryPanel("Send story in DM","<p>Users load ho rahe hain…</p>");
  try{
    const users=await getOtherUsers(),body=panel.querySelector(".isp-body");
    body.innerHTML='<input class="isd-search" placeholder="Search username…" style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:12px;padding:11px;color:#111;background:#fff;"><div class="isd-users" style="margin-top:8px;"></div>';
    const draw=()=>{
      const term=body.querySelector(".isd-search").value.trim().toLowerCase();
      const matches=users.filter(u=>(userLabel(u)+" "+(u.email||"")).toLowerCase().includes(term)).slice(0,80);
      body.querySelector(".isd-users").innerHTML=matches.length?matches.map(u=>'<button data-uid="'+escapeHtml(u.uid)+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 0;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;color:#111;"><img src="'+escapeHtml(u.photoURL||u.photo||"https://www.gravatar.com/avatar/?d=mp")+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;"><span style="flex:1;">'+escapeHtml(userLabel(u))+'</span><b style="color:#0095f6;">Send</b></button>').join(""):"<p>No users found.</p>";
      body.querySelectorAll("[data-uid]").forEach(btn=>btn.onclick=async()=>{
        btn.disabled=true;const target=users.find(u=>u.uid===btn.dataset.uid);
        try{
          const cid=chatIdFor(user.uid,target.uid);
          await setDoc(doc(db,"chats",cid),{participants:[user.uid,target.uid],lastMessage:"Shared a story",lastSenderUid:user.uid,updatedAt:serverTimestamp()},{merge:true});
          await addDoc(collection(db,"chats",cid,"messages"),{text:"Shared a story",message:"Shared a story",senderUid:user.uid,receiverUid:target.uid,uid:user.uid,createdAt:serverTimestamp(),read:false,messageType:"story_share",storyId:story.id,storyMediaUrl:mediaUrl(story),storyOwnerUid:ownerId(story)});
          await addDoc(collection(db,"users",target.uid,"notifications"),{type:"story_share",message:"shared a story with you",fromUid:user.uid,fromUsername:user.displayName||user.email?.split("@")[0]||"InstaPro User",storyId:story.id,storyMediaUrl:mediaUrl(story),createdAt:serverTimestamp(),read:false});
          panel.remove();alert("Story DM mein send ho gayi.");
        }catch(e){console.error(e);alert("DM mein story send nahi hui. Firestore Rules check karein.");btn.disabled=false;}
      });
    };
    body.querySelector(".isd-search").addEventListener("input",draw);draw();
  }catch(e){console.error(e);panel.querySelector(".isp-body").textContent="Users load nahi hue. Firestore Rules check karein.";}
}
async function openStoryMention(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||user.isAnonymous){alert("Mention ke liye Google login karein.");return;}
  const panel=openStoryPanel("Mention someone","<p>Users load ho rahe hain…</p>");
  try{
    const users=await getOtherUsers(),body=panel.querySelector(".isp-body");
    body.innerHTML='<input class="ism-search" placeholder="Search username…" style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:12px;padding:11px;color:#111;background:#fff;"><div class="ism-users" style="margin-top:8px;"></div>';
    const draw=()=>{
      const term=body.querySelector(".ism-search").value.trim().toLowerCase();
      const matches=users.filter(u=>(userLabel(u)+" "+(u.email||"")).toLowerCase().includes(term)).slice(0,80);
      body.querySelector(".ism-users").innerHTML=matches.length?matches.map(u=>'<button data-uid="'+escapeHtml(u.uid)+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 0;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;color:#111;"><img src="'+escapeHtml(u.photoURL||u.photo||"https://www.gravatar.com/avatar/?d=mp")+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;"><span style="flex:1;">'+escapeHtml(userLabel(u))+'</span><b style="color:#0095f6;">@ Mention</b></button>').join(""):"<p>No users found.</p>";
      body.querySelectorAll("[data-uid]").forEach(btn=>btn.onclick=async()=>{
        btn.disabled=true;const target=users.find(u=>u.uid===btn.dataset.uid);
        try{
          await updateDoc(doc(db,"stories",story.id),{mentionedUids:arrayUnion(target.uid),mentionedUsernames:arrayUnion(userLabel(target))});
          await addDoc(collection(db,"users",target.uid,"notifications"),{type:"story_mention",message:"mentioned you in a story",fromUid:user.uid,fromUsername:user.displayName||user.email?.split("@")[0]||"InstaPro User",storyId:story.id,storyMediaUrl:mediaUrl(story),createdAt:serverTimestamp(),read:false});
          story.mentionedUids=[...new Set([...(story.mentionedUids||[]),target.uid])];panel.remove();alert("@"+userLabel(target)+" ko story mein mention kar diya.");
        }catch(e){console.error(e);alert("Mention save nahi hua. Firestore Rules check karein.");btn.disabled=false;}
      });
    };
    body.querySelector(".ism-search").addEventListener("input",draw);draw();
  }catch(e){console.error(e);panel.querySelector(".isp-body").textContent="Users load nahi hue. Firestore Rules check karein.";}
}
async function openStoryPrivacy(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||ownerId(story)!==user.uid){alert("Privacy sirf apni story ki badal sakte hain.");return;}
  const privacy=story.privacy||{};
  const panel=openStoryPanel("Story settings",`
    <p style="font-size:13px;color:#666;">Settings Firebase mein save hongi aur dusre devices par bhi update hongi.</p>
    <label style="display:block;margin:14px 0 6px;font-weight:600;">Who can see this story?</label>
    <select class="isp-audience" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#111;">
      <option value="everyone">Everyone</option><option value="closeFriends">Close friends</option><option value="onlyMe">Only me</option>
    </select>
    <label style="display:block;margin:14px 0 6px;font-weight:600;">Story replies</label>
    <select class="isp-replies" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#111;">
      <option value="everyone">Everyone</option><option value="following">People I follow</option><option value="off">Turn off replies</option>
    </select>
    <label style="display:flex;align-items:center;gap:10px;margin:14px 0;"><input class="isp-sharing" type="checkbox"> Allow story sharing in DM</label>
    <label style="display:block;margin:14px 0 6px;font-weight:600;">Hide story from</label>
    <input class="isp-hide-search" placeholder="Search people…" style="width:100%;padding:10px;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;color:#111;background:#fff;">
    <div class="isp-hide-list" style="max-height:150px;overflow:auto;margin-top:8px;"><p style="color:#777;font-size:12px;">Loading people…</p></div>
    <label style="display:block;margin:14px 0 6px;font-weight:600;">Manage close friends</label>
    <div class="isp-close-friends-list" style="max-height:150px;overflow:auto;margin-top:8px;"><p style="color:#777;font-size:12px;">Loading people…</p></div>
    <button class="isp-save" style="width:100%;margin-top:16px;padding:12px;border:0;border-radius:12px;background:#0095f6;color:#fff;font-weight:700;">Save settings</button>
    <button class="isp-delete" style="width:100%;margin-top:8px;padding:12px;border:1px solid #e44;border-radius:12px;background:transparent;color:#e44;font-weight:700;">Delete story</button>`);
  panel.querySelector(".isp-audience").value=privacy.audience||story.audience||"everyone";
  panel.querySelector(".isp-replies").value=privacy.replies||"everyone";
  panel.querySelector(".isp-sharing").checked=privacy.allowSharing!==false;
  let people=[];
  let savedCloseFriends=[];
  try {
    people=await getOtherUsers();
    const ownerSnap=await getDoc(doc(db,"users",user.uid));
    const rawFriends=ownerSnap.exists()&&Array.isArray(ownerSnap.data().closeFriends)?ownerSnap.data().closeFriends:[];
    savedCloseFriends=rawFriends.map(item=>typeof item==="string"?item:item?.uid).filter(Boolean);
    const list=panel.querySelector(".isp-hide-list");
    const friendsList=panel.querySelector(".isp-close-friends-list");
    const draw=()=>{
      const term=panel.querySelector(".isp-hide-search").value.trim().toLowerCase();
      const hidden=Array.isArray(privacy.hiddenFromUids)?privacy.hiddenFromUids:[];
      const matches=people.filter(p=>(userLabel(p)+" "+(p.email||"")).toLowerCase().includes(term)).slice(0,100);
      list.innerHTML=matches.length?matches.map(p=>'<label style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #eee;color:#222;"><input type="checkbox" data-hide-uid="'+escapeHtml(p.uid)+'" '+(hidden.includes(p.uid)?"checked":"")+'><span>'+escapeHtml(userLabel(p))+'</span></label>').join(""):'<p style="color:#777;">No users found.</p>';
      friendsList.innerHTML=matches.length?matches.map(p=>'<label style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #eee;color:#222;"><input type="checkbox" data-close-friend-uid="'+escapeHtml(p.uid)+'" '+(savedCloseFriends.includes(p.uid)?"checked":"")+'><span>'+escapeHtml(userLabel(p))+'</span></label>').join(""):'<p style="color:#777;">No users found.</p>';
    };
    panel.querySelector(".isp-hide-search").addEventListener("input",draw);draw();
  } catch(e) {
    console.warn("Hide-from list could not load:",e);
    panel.querySelector(".isp-hide-list").textContent="People list load nahi hui.";
    panel.querySelector(".isp-close-friends-list").textContent="People list load nahi hui.";
  }
  panel.querySelector(".isp-save").onclick=async()=>{
    const save=panel.querySelector(".isp-save");save.disabled=true;
    const next={
      audience:panel.querySelector(".isp-audience").value,
      replies:panel.querySelector(".isp-replies").value,
      allowSharing:panel.querySelector(".isp-sharing").checked,
      hiddenFromUids:[...panel.querySelectorAll("[data-hide-uid]:checked")].map(input=>input.dataset.hideUid),
      closeFriendsUids:[...panel.querySelectorAll("[data-close-friend-uid]:checked")].map(input=>input.dataset.closeFriendUid),
      updatedAt:Date.now()
    };
    try{
      await setDoc(doc(db,"users",user.uid),{closeFriends:next.closeFriendsUids}, {merge:true});
      await updateDoc(doc(db,"stories",story.id),{privacy:next,audience:next.audience});
      story.privacy=next;story.audience=next.audience;
      panel.remove();renderStories();alert("Story settings Firebase mein save ho gayi.");
    }catch(e){console.error(e);alert("Settings save nahi hui. Firestore Rules check karein.");save.disabled=false;}
  };
  panel.querySelector(".isp-delete").onclick=async()=>{
    if(!confirm("Kya aap is story ko permanently delete karna chahte hain?"))return;
    const button=panel.querySelector(".isp-delete");button.disabled=true;
    try{
      await deleteDoc(doc(db,"stories",story.id));
      const userRef=doc(db,"users",user.uid);
      const userSnap=await getDoc(userRef);
      if(userSnap.exists()){
        const highlights=Array.isArray(userSnap.data().highlights)?userSnap.data().highlights:[];
        await updateDoc(userRef,{highlights:highlights.filter(h=>h?.storyId!==story.id)});
      }
      allStories=allStories.filter(item=>item.id!==story.id);
      panel.remove();renderStories();alert("Story delete ho gayi.");
      if(currentGroup.length<=1)closeViewer();else showAt(Math.min(currentIndex,currentGroup.length-1));
    }catch(e){console.error(e);alert("Story delete nahi hui. Firestore Rules check karein.");button.disabled=false;}
  };
}

async function addStoryToHighlights(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||ownerId(story)!==user.uid){alert("Sirf apni story ko highlight kar sakte hain.");return;}
  const userRef=doc(db,"users",user.uid);
  const snap=await getDoc(userRef);
  const old=snap.exists()&&Array.isArray(snap.data().highlights)?snap.data().highlights:[];
  if(old.some(item=>item?.storyId===story.id)){alert("Yeh story pehle se highlight mein hai.");return;}
  const title=(prompt("Highlight ka naam likhein:","Highlight")||"").trim().slice(0,40);
  if(!title)return;
  const highlight={storyId:story.id,title,emoji:"✦",mediaUrl:mediaUrl(story),createdAt:Date.now()};
  try{
    await updateDoc(userRef,{highlights:arrayUnion(highlight)});
    alert("Story profile Highlights mein add ho gayi.");
  }catch(e){
    console.error("Story highlight save error:",e);
    alert("Highlight save nahi hui. Firestore Rules check karein.");
  }
}

function openStoryComments() {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  if (!story || !viewer) return;
  if (!user || user.isAnonymous) { alert("Story comment karne ke liye Google login karein."); return; }
  if (stopStoryComments) stopStoryComments();
  stopStoryComments = null;
  document.getElementById("instapro-story-comments")?.remove();
  if (viewerTimer) clearTimeout(viewerTimer);
  viewerTimer = null;
  const activeMedia = viewer.querySelector(".is-media video");
  if (activeMedia) activeMedia.pause();

  const drawer = document.createElement("section");
  drawer.id = "instapro-story-comments";
  drawer.style.cssText = "position:absolute;left:0;right:0;bottom:0;z-index:20;background:#fff;color:#171717;border-radius:20px 20px 0 0;max-height:68%;min-height:42%;display:flex;flex-direction:column;box-shadow:0 -12px 40px #0008;animation:instaStorySheetIn .24s ease-out;font-family:Arial,sans-serif;";
  drawer.innerHTML = `
    <style>
      @keyframes instaStorySheetIn { from { transform:translateY(35px);opacity:.5 } to { transform:translateY(0);opacity:1 } }
      @keyframes instaStoryCommentIn { from { transform:translateY(8px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      .isc-row { display:flex;gap:9px;align-items:flex-start;padding:10px 0;animation:instaStoryCommentIn .18s ease-out;overflow-wrap:anywhere; }
      .isc-row img { width:30px;height:30px;border-radius:50%;object-fit:cover;background:#ddd;flex-shrink:0; }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid #eee;">
      <strong style="font-size:15px;">Story comments</strong>
      <button type="button" class="isc-close" aria-label="Close comments" style="border:0;background:transparent;font-size:25px;color:#222;">×</button>
    </div>
    <div class="isc-list" style="overflow:auto;flex:1;padding:6px 16px;"><p style="font-size:13px;color:#777;">Loading comments…</p></div>
    <form class="isc-form" style="display:flex;gap:8px;padding:12px;border-top:1px solid #eee;">
      <input class="isc-input" maxlength="500" placeholder="Add a comment…" style="flex:1;min-width:0;border:1px solid #ddd;border-radius:22px;padding:11px 14px;outline:none;color:#111;background:#fff;">
      <button type="submit" style="border:0;background:#0095f6;color:#fff;border-radius:22px;padding:0 16px;font-weight:600;">Post</button>
    </form>`;
  viewer.appendChild(drawer);

  const close = () => {
    if (stopStoryComments) stopStoryComments();
    stopStoryComments = null;
    drawer.remove();
    showAt(currentIndex);
  };
  drawer.querySelector(".isc-close").onclick = close;
  drawer.querySelector(".isc-form").onsubmit = async event => {
    event.preventDefault();
    const input = drawer.querySelector(".isc-input");
    const value = input.value.trim();
    if (!value) return;
    const submit = drawer.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await addDoc(collection(db, "stories", story.id, "comments"), {
        uid: user.uid,
        username: user.displayName || user.email?.split("@")[0] || "InstaPro User",
        photo: user.photoURL || "",
        text: value,
        createdAt: serverTimestamp()
      });
      input.value = "";
      await notifyStoryOwner(ownerId(story), "story_comment", "commented on your story", story);
    } catch (error) {
      console.error("Story comment save error:", error);
      alert("Comment save nahi hua. Firestore Rules check karein.");
    } finally { if (submit.isConnected) submit.disabled = false; }
  };

  stopStoryComments = onSnapshot(
    query(collection(db, "stories", story.id, "comments"), orderBy("createdAt", "asc")),
    snapshot => {
      const list = drawer.querySelector(".isc-list");
      if (!list) return;
      if (snapshot.empty) {
        list.innerHTML = '<p style="font-size:13px;color:#777;text-align:center;padding:25px 0;">No comments yet. Be the first!</p>';
        return;
      }
      list.innerHTML = snapshot.docs.map(item => {
        const comment = item.data();
        const photo = comment.photo || "https://www.gravatar.com/avatar/?d=mp";
        return '<div class="isc-row"><img src="' + escapeHtml(photo) + '" alt=""><div style="font-size:13px;line-height:1.45;"><strong>' + escapeHtml(comment.username || "InstaPro User") + '</strong><div style="margin-top:2px;">' + escapeHtml(comment.text || "") + '</div></div></div>';
      }).join("");
      list.scrollTop = list.scrollHeight;
    },
    error => {
      console.error("Story comments listener error:", error);
      const list = drawer.querySelector(".isc-list");
      if (list) list.innerHTML = '<p style="font-size:13px;color:#b00;">Comments load nahi hue. Firestore Rules check karein.</p>';
    }
  );
}

let storyFloatingHeartInterval = null;
function stopStoryFloatingHearts() {
  if (storyFloatingHeartInterval) clearInterval(storyFloatingHeartInterval);
  storyFloatingHeartInterval = null;
}
function startStoryFloatingHearts() {
  stopStoryFloatingHearts();
  if (!viewer) return;
  const stage = viewer.querySelector(".is-stage");
  if (!stage) return;
  let heartIndex = 0;
  const heartColors = ["#ff3158", "#ff4fa3", "#ff4d4d", "#ff78c8", "#ff1744", "#ff9dce", "#e040fb", "#ff6b35"];
  storyFloatingHeartInterval = setInterval(() => {
    if (!viewer || !viewer.isConnected || !stage.isConnected) {
      stopStoryFloatingHearts();
      return;
    }
    const heart = document.createElement("span");
    const color = heartColors[heartIndex++ % heartColors.length];
    heart.textContent = ["♥", "❤", "💗", "♥", "💖"][heartIndex % 5];
    heart.setAttribute("aria-hidden", "true");
    heart.style.cssText = "position:absolute;left:" + (8 + Math.random() * 84) + "%;bottom:" + (12 + Math.random() * 22) + "%;z-index:4;pointer-events:none;color:" + color + ";font-size:" + (23 + Math.random() * 22) + "px;line-height:1;text-shadow:0 2px 12px " + color + "99;will-change:transform,opacity;opacity:0;";
    stage.appendChild(heart);
    const drift = (Math.random() - .5) * 90;
    const rotate = (Math.random() - .5) * 50;
    const duration = 1450 + Math.random() * 750;
    if (heart.animate) heart.animate([
      { transform:"translate3d(0,12px,0) scale(.45) rotate(0deg)", opacity:0 },
      { transform:"translate3d(" + (drift * .25) + "px,-35px,0) scale(1.05) rotate(" + (rotate * .3) + "deg)", opacity:.95, offset:.22 },
      { transform:"translate3d(" + drift + "px,-" + (stage.clientHeight * (.30 + Math.random() * .24)) + "px,0) scale(.72) rotate(" + rotate + "deg)", opacity:0 }
    ], { duration, easing:"cubic-bezier(.18,.72,.28,1)", fill:"forwards" });
    setTimeout(() => heart.remove(), duration + 100);
  }, 480);
}
function closeViewer() {
  stopStoryFloatingHearts();
  if (viewerTimer) clearTimeout(viewerTimer);
  if (stopStoryComments) stopStoryComments();
  stopStoryComments = null;
  document.getElementById("instapro-story-comments")?.remove();
  viewerTimer = null;
  if (stopCurrentStory) stopCurrentStory();
  stopCurrentStory = null;
  if (viewer) {
    const video = viewer.querySelector("video");
    if (video) video.pause();
    const audio = viewer.querySelector(".is-story-music-audio");
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    viewer.remove();
  }
  viewer = null;
  currentGroup = [];
}
function openStoryGroup(group, startIndex = 0) {
  if (!group?.stories?.length) return;
  closeViewer();
  currentGroup = group.stories.slice();
  currentIndex = 0;
  viewer = document.createElement("div");
  viewer.className = "instapro-story-viewer";
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.28);color:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;animation:instaStoryViewerIn .18s ease-out;backdrop-filter:blur(18px) saturate(145%);-webkit-backdrop-filter:blur(18px) saturate(145%);";
  if (!document.getElementById("instapro-story-animations")) {
    const style = document.createElement("style");
    style.id = "instapro-story-animations";
    style.textContent = "@keyframes instaStoryViewerIn{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:scale(1)}} @keyframes instaStoryBarGlow{0%{opacity:.65}50%{opacity:1}100%{opacity:.65}} .instapro-story-viewer .is-stage{position:relative;width:min(100vw,450px);height:min(100dvh,800px);aspect-ratio:9/16;max-height:100dvh;overflow:hidden;background:#080808;border-radius:0;box-shadow:0 8px 40px #0008} .instapro-story-viewer .is-media{position:absolute!important;inset:0;width:100%!important;height:100%!important;z-index:1} .instapro-story-viewer .is-media img,.instapro-story-viewer .is-media video{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;background:transparent!important} .instapro-story-viewer .is-head,.instapro-story-viewer .is-progress,.instapro-story-viewer .is-footer{background:transparent!important;left:10px!important;right:10px!important} .instapro-story-viewer .is-progress{top:10px!important;z-index:7!important} .instapro-story-viewer .is-head{top:23px!important;z-index:7!important;padding-top:4px} .instapro-story-viewer .is-footer{bottom:calc(8px + env(safe-area-inset-bottom))!important;z-index:8!important;padding-bottom:8px;background:linear-gradient(transparent,rgba(0,0,0,.35))!important} .instapro-story-viewer .is-prev,.instapro-story-viewer .is-next{z-index:2!important;top:12%!important;bottom:14%!important} .instapro-story-viewer .is-close,.instapro-story-viewer .is-add-story,.instapro-story-viewer .is-send,.instapro-story-viewer .is-like,.instapro-story-viewer .is-comments,.instapro-story-viewer .is-share{cursor:pointer;flex-shrink:0;touch-action:manipulation} .insta-story-account .sRing{transition:transform .18s ease,filter .18s ease} .insta-story-account .sRing:active{transform:scale(.94);filter:brightness(1.15)} .is-like{transition:transform .15s ease} .is-like:active{transform:scale(1.25)} @media(min-width:500px){.instapro-story-viewer .is-stage{border-radius:12px;height:min(90dvh,800px);width:min(calc(90dvh * 9 / 16),450px)} .instapro-story-viewer .is-head{top:24px!important}} @media(max-width:499px){.instapro-story-viewer .is-stage{width:100vw;height:100dvh;aspect-ratio:auto;border-radius:0}}";
    style.textContent += " .instapro-story-viewer button,.instapro-story-viewer input,.instapro-story-viewer select{background-color:transparent!important;box-shadow:none!important} .instapro-story-viewer .is-footer{display:flex;flex-wrap:wrap;align-items:center;gap:clamp(3px,1vw,7px);box-sizing:border-box;padding:8px 4px calc(8px + env(safe-area-inset-bottom))!important;bottom:0!important;background:linear-gradient(transparent,rgba(0,0,0,.48))!important} .instapro-story-viewer .is-footer button{appearance:none;-webkit-appearance:none;background:transparent!important;border-color:transparent!important;padding:5px 2px;min-width:28px;min-height:34px;touch-action:manipulation;flex:0 0 auto} .instapro-story-viewer .is-reply{order:-1;min-width:0;flex:1 0 100%;width:100%;max-width:100%;box-sizing:border-box;background:transparent!important;margin-bottom:3px} .instapro-story-viewer .is-footer .is-viewers{margin-right:auto} .instapro-story-viewer .is-head button,.instapro-story-viewer .is-prev,.instapro-story-viewer .is-next{background:transparent!important;box-shadow:none!important} @media(max-width:380px){.instapro-story-viewer .is-footer{gap:3px;padding-left:3px!important;padding-right:3px!important}.instapro-story-viewer .is-footer button{min-width:27px;min-height:36px;font-size:19px!important;padding:4px 1px}.instapro-story-viewer .is-reply{flex-basis:100%;padding:10px 9px!important}}";
    style.textContent += " .instapro-story-viewer .is-stage{background:transparent!important;isolation:isolate} .instapro-story-viewer .is-head{padding:7px 9px!important;border:1px solid rgba(255,255,255,.17);border-radius:20px;background:rgba(12,12,16,.20)!important;backdrop-filter:blur(18px) saturate(155%);-webkit-backdrop-filter:blur(18px) saturate(155%);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)} .instapro-story-viewer .is-head button,.instapro-story-viewer .is-footer button{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.22)!important;border-radius:50%;background:rgba(255,255,255,.10)!important;color:#fff!important;backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 14px rgba(0,0,0,.12);transition:background .18s ease,transform .18s ease,border-color .18s ease} .instapro-story-viewer .is-head button{width:36px;height:36px;padding:0!important;font-size:23px!important} .instapro-story-viewer .is-footer{gap:7px!important;padding:10px 9px calc(10px + env(safe-area-inset-bottom))!important;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(10,10,14,.24)!important;backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 26px rgba(0,0,0,.14)} .instapro-story-viewer .is-footer button{min-width:36px!important;min-height:36px!important;padding:0 8px!important;font-size:20px!important} .instapro-story-viewer .is-footer .is-viewers{border-radius:18px!important;padding:0 10px!important;font-size:14px!important} .instapro-story-viewer .is-reply{min-height:42px!important;border:1px solid rgba(255,255,255,.30)!important;border-radius:22px!important;background:rgba(255,255,255,.09)!important;color:#fff!important;padding:0 14px!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)!important} .instapro-story-viewer .is-reply::placeholder{color:rgba(255,255,255,.76)} .instapro-story-viewer .is-footer button:active,.instapro-story-viewer .is-head button:active{transform:scale(.92);background:rgba(255,255,255,.22)!important} .instapro-story-viewer .is-like{color:#fff!important} .instapro-story-viewer .is-like[aria-pressed=true]{color:#ff426f!important;transform:scale(1.08);text-shadow:0 0 14px rgba(255,48,100,.55)} .instapro-story-viewer .is-heart-pop{font-family:Arial,sans-serif!important} .instapro-story-viewer .is-progress>div{background:rgba(255,255,255,.28)!important;box-shadow:0 0 8px rgba(255,255,255,.10)} .instapro-story-viewer .is-progress>div>div{border-radius:8px;box-shadow:0 0 7px rgba(255,255,255,.45)} .instapro-story-viewer #instapro-story-panel{background:rgba(18,18,24,.40)!important;color:#fff!important;border:1px solid rgba(255,255,255,.20);backdrop-filter:blur(28px) saturate(170%);-webkit-backdrop-filter:blur(28px) saturate(170%)} .instapro-story-viewer #instapro-story-panel button,.instapro-story-viewer #instapro-story-panel input{background:rgba(255,255,255,.09)!important;color:#fff!important;border-color:rgba(255,255,255,.20)!important} @media(max-width:380px){.instapro-story-viewer .is-footer{gap:4px!important;padding-left:5px!important;padding-right:5px!important}.instapro-story-viewer .is-footer button{min-width:32px!important;min-height:34px!important;padding:0 5px!important;font-size:18px!important}.instapro-story-viewer .is-reply{padding:0 11px!important}}";
    style.textContent += " .instapro-story-viewer .is-footer{display:flex;flex-wrap:nowrap;justify-content:space-around;align-items:center;gap:4px;padding:10px 7px calc(10px + env(safe-area-inset-bottom))!important;background:rgba(8,10,16,.22)!important;border:1px solid rgba(255,255,255,.16);border-radius:24px;backdrop-filter:blur(22px) saturate(165%);-webkit-backdrop-filter:blur(22px) saturate(165%);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 24px rgba(0,0,0,.16)} .instapro-story-viewer .is-footer button:not(.is-send):not(.is-like){display:flex;flex:1 1 0;min-width:0!important;min-height:64px!important;padding:5px 2px!important;flex-direction:column;justify-content:center;align-items:center;gap:5px;border:1px solid transparent!important;border-radius:15px!important;background:rgba(255,255,255,.035)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important} .instapro-story-viewer .is-tool-icon{display:flex;align-items:center;justify-content:center;font-size:25px;line-height:1;height:29px;text-shadow:0 1px 5px #0008} .instapro-story-viewer .is-tool-label{font-family:Georgia,serif;font-size:12px;font-style:italic;font-weight:600;white-space:nowrap} .instapro-story-viewer .is-view-count{font-size:10px;font-weight:500;opacity:.8} .instapro-story-viewer .is-footer button:active{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.24)!important;transform:scale(.96)} .instapro-story-viewer .is-footer .is-viewers{display:flex} .instapro-story-viewer .is-footer .is-share{display:flex} @media(max-width:380px){.instapro-story-viewer .is-tool-label{font-size:10px}.instapro-story-viewer .is-tool-icon{font-size:22px}}";style.textContent += " .instapro-story-viewer .is-stage{overflow:hidden} .instapro-story-viewer .is-footer{left:10px!important;right:10px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;display:flex!important;flex-wrap:wrap!important;justify-content:space-between!important;align-items:center!important;gap:6px!important;padding:10px!important;z-index:20!important;box-sizing:border-box!important} .instapro-story-viewer .is-footer .is-reply{order:0!important;display:block;flex:1 1 calc(100% - 48px)!important;width:calc(100% - 48px)!important;min-width:0!important;max-width:none!important;height:42px!important;min-height:42px!important;margin:0!important;box-sizing:border-box!important;font-size:14px!important;color:#fff!important} .instapro-story-viewer .is-footer .is-send{order:1!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;padding:0!important;border-radius:50%!important;background:#0095f6!important;color:#fff!important;font-size:20px!important;border:0!important} .instapro-story-viewer .is-footer .is-viewers,.instapro-story-viewer .is-footer .is-highlight,.instapro-story-viewer .is-footer .is-share,.instapro-story-viewer .is-footer .is-mention,.instapro-story-viewer .is-footer .is-more{order:2!important;flex:1 1 0!important;min-width:0!important;min-height:58px!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:5px 2px!important;border-radius:14px!important;white-space:nowrap!important} .instapro-story-viewer .is-footer .is-like{order:3!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;padding:0!important;border-radius:50%!important;font-size:27px!important;color:#fff!important;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.3)!important} .instapro-story-viewer .is-footer .is-tool-icon{font-size:23px!important;height:26px!important} .instapro-story-viewer .is-footer .is-tool-label{font-size:11px!important;line-height:14px!important} .instapro-story-viewer .is-footer .is-reply:disabled{opacity:.6!important} @media(max-width:380px){.instapro-story-viewer .is-footer{left:6px!important;right:6px!important;padding:7px!important;gap:4px!important}.instapro-story-viewer .is-footer .is-tool-label{font-size:10px!important}.instapro-story-viewer .is-footer .is-viewers,.instapro-story-viewer .is-footer .is-highlight,.instapro-story-viewer .is-footer .is-share,.instapro-story-viewer .is-footer .is-mention,.instapro-story-viewer .is-footer .is-more{min-height:52px!important}}";style.textContent += " .instapro-story-viewer .isp-panel,.instapro-story-viewer .isc-drawer{background:rgba(18,20,30,.42)!important;color:#fff!important;border:1px solid rgba(255,255,255,.22)!important;backdrop-filter:blur(28px) saturate(175%)!important;-webkit-backdrop-filter:blur(28px) saturate(175%)!important;box-shadow:0 18px 55px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.16)!important} .instapro-story-viewer .isp-panel>div:first-child,.instapro-story-viewer .isc-drawer>div:first-child{border-color:rgba(255,255,255,.16)!important} .instapro-story-viewer .isp-panel button,.instapro-story-viewer .isp-panel input,.instapro-story-viewer .isp-panel select,.instapro-story-viewer .isc-drawer button,.instapro-story-viewer .isc-drawer input{background:rgba(255,255,255,.09)!important;color:#fff!important;border-color:rgba(255,255,255,.22)!important;border-radius:12px!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)} .instapro-story-viewer .isp-panel input::placeholder,.instapro-story-viewer .isc-drawer input::placeholder{color:rgba(255,255,255,.72)!important} .instapro-story-viewer .isp-panel img,.instapro-story-viewer .isc-drawer img{border:1px solid rgba(255,255,255,.22)}";style.textContent += " .instapro-story-viewer{background:#08090d!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important} .instapro-story-viewer .is-stage{width:100vw!important;height:100dvh!important;max-height:none!important;max-width:none!important;aspect-ratio:auto!important;background:#08090d!important;box-shadow:none!important} .instapro-story-viewer .is-progress{top:calc(8px + env(safe-area-inset-top))!important;left:10px!important;right:10px!important;gap:3px!important} .instapro-story-viewer .is-head{top:calc(22px + env(safe-area-inset-top))!important;left:12px!important;right:12px!important;min-height:52px!important;gap:9px!important;padding:7px 9px!important;border-radius:28px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(10,10,14,.30)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;box-shadow:none!important} .instapro-story-viewer .is-avatar{width:42px!important;height:42px!important;border:2px solid #d62976!important;padding:2px!important;object-fit:cover!important} .instapro-story-viewer .is-name{font-size:15px!important;font-weight:700!important} .instapro-story-viewer .is-head button{width:42px!important;height:42px!important;font-size:25px!important;border:1px solid rgba(255,255,255,.20)!important;background:rgba(0,0,0,.18)!important} .instapro-story-viewer .is-music-toggle{top:calc(82px + env(safe-area-inset-top))!important;right:12px!important;border-radius:24px!important;background:rgba(8,8,12,.32)!important;border:1px solid rgba(255,255,255,.18)!important;backdrop-filter:blur(14px)!important} .instapro-story-viewer .is-footer{left:12px!important;right:12px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;display:flex!important;flex-wrap:nowrap!important;justify-content:space-around!important;align-items:stretch!important;gap:4px!important;padding:8px 6px!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:27px!important;background:rgba(7,8,12,.48)!important;backdrop-filter:blur(20px) saturate(145%)!important;-webkit-backdrop-filter:blur(20px) saturate(145%)!important;box-shadow:none!important} .instapro-story-viewer .is-footer .is-viewers,.instapro-story-viewer .is-footer .is-highlight,.instapro-story-viewer .is-footer .is-share,.instapro-story-viewer .is-footer .is-mention,.instapro-story-viewer .is-footer .is-more{flex:1 1 0!important;min-width:0!important;min-height:66px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:5px 1px!important;border:1px solid transparent!important;border-radius:16px!important;background:rgba(255,255,255,.025)!important;box-shadow:none!important;color:#fff!important;white-space:nowrap!important} .instapro-story-viewer .is-tool-icon{height:30px!important;font-size:27px!important;font-family:Arial,sans-serif!important;font-style:normal!important;font-weight:400!important} .instapro-story-viewer .is-tool-label{font-family:Arial,sans-serif!important;font-size:12px!important;font-style:normal!important;font-weight:600!important;line-height:15px!important} .instapro-story-viewer .is-view-count{font-size:11px!important} @media(max-width:380px){.instapro-story-viewer .is-footer{left:7px!important;right:7px!important;gap:2px!important;padding:6px 3px!important}.instapro-story-viewer .is-footer .is-viewers,.instapro-story-viewer .is-footer .is-highlight,.instapro-story-viewer .is-footer .is-share,.instapro-story-viewer .is-footer .is-mention,.instapro-story-viewer .is-footer .is-more{min-height:60px!important}.instapro-story-viewer .is-tool-label{font-size:10px!important}.instapro-story-viewer .is-tool-icon{font-size:24px!important}}";
style.textContent += " .instapro-story-viewer .is-footer{display:flex!important;flex-wrap:wrap!important;justify-content:space-between!important;align-items:center!important;gap:5px!important;box-sizing:border-box!important;padding:9px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important} .instapro-story-viewer .is-footer .is-reply{order:0!important;flex:1 1 calc(100% - 49px)!important;width:calc(100% - 49px)!important;max-width:none!important;min-width:0!important;height:42px!important;min-height:42px!important;margin:0!important} .instapro-story-viewer .is-footer .is-send{order:1!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important} .instapro-story-viewer .is-footer .is-viewers,.instapro-story-viewer .is-footer .is-highlight,.instapro-story-viewer .is-footer .is-share,.instapro-story-viewer .is-footer .is-mention,.instapro-story-viewer .is-footer .is-more,.instapro-story-viewer .is-footer .is-like{order:2!important;flex:1 1 0!important;min-width:0!important;min-height:54px!important;max-width:none!important;padding:4px 1px!important} .instapro-story-viewer .is-footer .is-tool-label{font-size:10px!important;line-height:13px!important} .instapro-story-viewer .is-footer .is-tool-icon{font-size:23px!important;height:25px!important} .instapro-story-viewer .is-footer .is-like{flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;border-radius:50%!important} @media(max-width:380px){.instapro-story-viewer .is-footer{left:7px!important;right:7px!important;padding:6px!important;gap:3px!important}.instapro-story-viewer .is-footer .is-tool-label{font-size:9px!important}}";
    document.head.appendChild(style);
  }
  if (!document.getElementById("instapro-story-like-pop-style")) {
    const reactionStyle = document.createElement("style");
    reactionStyle.id = "instapro-story-like-pop-style";
    reactionStyle.textContent = `
      .instapro-story-viewer .is-viewers{position:relative!important;overflow:visible!important}
      .instapro-story-viewer .is-viewers .is-like-pop{position:absolute;left:50%;top:-8px;transform:translate(-50%,0) scale(.15);opacity:0;pointer-events:none;font-family:Arial,sans-serif;font-size:29px;line-height:1;z-index:30;filter:drop-shadow(0 2px 8px rgba(255,40,120,.65))}
      .instapro-story-viewer .is-viewers.is-liked-activity .is-like-pop{animation:instaStoryHeartPop 1.45s cubic-bezier(.18,.8,.25,1) both}
      .instapro-story-viewer .is-viewers.is-liked-activity .is-tool-icon{animation:instaActivityPulse .85s ease-out both}
      @keyframes instaStoryHeartPop{0%{opacity:0;transform:translate(-50%,8px) scale(.15) rotate(-18deg)}18%{opacity:1;transform:translate(-50%,-12px) scale(1.3) rotate(8deg)}38%{opacity:1;transform:translate(-50%,-24px) scale(1) rotate(-5deg)}72%{opacity:.95;transform:translate(-50%,-43px) scale(.82) rotate(8deg)}100%{opacity:0;transform:translate(-50%,-62px) scale(.45) rotate(15deg)}}
      @keyframes instaActivityPulse{0%{transform:scale(1);color:#fff}35%{transform:scale(1.5);color:#ff3b86;text-shadow:0 0 12px #ff3b86}70%{transform:scale(.9);color:#ffb4d2}100%{transform:scale(1);color:#fff}}
      .instapro-story-viewer .is-viewers .is-like-spark{position:absolute;left:50%;top:2px;pointer-events:none;z-index:29;font-size:12px;opacity:0}
      .instapro-story-viewer .is-viewers.is-liked-activity .is-like-spark{animation:instaStorySpark 1.1s ease-out both}
      @keyframes instaStorySpark{0%{opacity:0;transform:translate(-50%,0) scale(.2)}25%{opacity:1;transform:translate(calc(-50% + var(--dx)), -15px) scale(1.2)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)), -38px) scale(.5)}}
      @media(prefers-reduced-motion:reduce){.instapro-story-viewer .is-viewers.is-liked-activity .is-like-pop,.instapro-story-viewer .is-viewers.is-liked-activity .is-tool-icon,.instapro-story-viewer .is-viewers.is-liked-activity .is-like-spark{animation:none!important}}
    `;
    document.head.appendChild(reactionStyle);
  }
  viewer.innerHTML = `
    <div class="is-stage">
      <div class="is-progress" style="position:absolute;top:12px;left:10px;right:10px;display:flex;gap:4px;z-index:5;"></div>
      <div class="is-head" style="position:absolute;top:24px;left:14px;right:14px;z-index:5;display:flex;align-items:center;gap:9px;text-shadow:0 1px 4px #000;">
        <button class="is-profile-link" type="button" aria-label="Open profile" style="display:flex;align-items:center;gap:9px;flex:1;min-width:0;border:0!important;background:transparent!important;padding:0!important;color:#fff!important;border-radius:24px!important;justify-content:flex-start!important;">
          <img class="is-avatar" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover;background:#333;flex-shrink:0;">
          <span class="is-name" style="font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          <span class="is-time" style="font-size:13px;opacity:.8;white-space:nowrap;"></span>
        </button>
        <button class="is-add-story" aria-label="Add another story" title="Add another story" style="display:none;background:transparent!important;border:0;color:#fff;font-size:25px;padding:0 5px;">＋</button>
        <button class="is-close" aria-label="Close story" style="background:transparent!important;border:0;color:#fff;font-size:27px;padding:0 5px;">×</button>
      </div>
      <div class="is-media" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
      <button class="is-music-toggle" type="button" aria-label="Play story music" title="Story music" style="display:none;position:absolute;top:72px;right:14px;z-index:12;border:1px solid #ffffff45;border-radius:22px;background:rgba(0,0,0,.45);color:#fff;padding:8px 11px;font-size:13px;backdrop-filter:blur(10px);">♫ Music</button>
      <button class="is-prev" aria-label="Previous story" style="position:absolute;left:0;top:15%;bottom:15%;width:35%;border:0;background:transparent!important;"></button>
      <button class="is-next" aria-label="Next story" style="position:absolute;right:0;top:15%;bottom:15%;width:35%;border:0;background:transparent!important;"></button>
      <div class="is-footer" style="position:absolute;bottom:18px;left:14px;right:14px;z-index:6;display:flex;gap:4px;align-items:center;justify-content:space-around;">
        <button class="is-viewers" aria-label="Activity and story viewers" title="Activity" style="display:none;"><span class="is-like-pop" aria-hidden="true">💖</span><span class="is-like-spark" style="--dx:-22px" aria-hidden="true">✨</span><span class="is-like-spark" style="--dx:22px" aria-hidden="true">💗</span><span class="is-tool-icon">◉</span><span class="is-tool-label">Activity <b class="is-view-count">0</b></span></button>
        <button class="is-highlight" aria-label="Add story to highlights" title="Highlight" style="display:none;"><span class="is-tool-icon">♡</span><span class="is-tool-label">Highlight</span></button>
        <button class="is-share" aria-label="Send story in DM" title="Send"><span class="is-tool-icon">➤</span><span class="is-tool-label">Send</span></button>
        <button class="is-mention" aria-label="Mention someone" title="Mention" style="display:none;"><span class="is-tool-icon">@</span><span class="is-tool-label">Mention</span></button>
        <button class="is-more" aria-label="Story privacy settings" title="More" style="display:none;"><span class="is-tool-icon">⋮</span><span class="is-tool-label">More</span></button>
        <input class="is-reply" aria-label="Reply to story" placeholder="Reply to story..." style="display:none;">
        <button class="is-send" aria-label="Send reply" title="Reply" style="display:none;">➤</button>
        <button class="is-like" aria-label="Like story" title="Like" style="display:none;">♡</button>
      </div>
    </div>`
  document.body.appendChild(viewer);
  viewer.querySelector(".is-close").onclick = closeViewer;
  viewer.querySelector(".is-profile-link").onclick = (event) => {
    event.stopPropagation();
    const story = currentGroup?.[currentIndex];
    const uid = story ? ownerId(story) : "";
    if (!uid) return;
    if (typeof window.openProfile === "function") window.openProfile(uid);
    else if (typeof window.showProfile === "function") window.showProfile(uid);
    else window.dispatchEvent(new CustomEvent("instapro:open-profile", { detail: { uid } }));
  };
  viewer.querySelector(".is-add-story").onclick = openUpload;
  viewer.querySelector(".is-prev").onclick = () => showAt(currentIndex - 1);
  viewer.querySelector(".is-next").onclick = () => showAt(currentIndex + 1);
  viewer.querySelector(".is-like").onclick = toggleStoryLike;
  viewer.querySelector(".is-highlight").onclick = addStoryToHighlights;
  viewer.querySelector(".is-viewers").onclick = openStoryViewers;
  viewer.querySelector(".is-share").onclick = openStoryDmShare;
  viewer.querySelector(".is-mention").onclick = openStoryMention;
  viewer.querySelector(".is-more").onclick = openStoryPrivacy;
  viewer.querySelector(".is-send").onclick = async () => {
    const input = viewer?.querySelector(".is-reply");
    const value = input?.value.trim();
    if (!value) return;
    const btn = viewer.querySelector(".is-send");
    btn.disabled = true;
    try {
      await sendReplyToDM(value);
      input.value = "";
      alert("Story reply DM mein send ho gaya.");
    } catch (error) {
      console.error("Story DM reply error:", error);
      alert(error.message || "DM reply send nahi hua. Firestore Rules check karein.");
    } finally { if (btn?.isConnected) btn.disabled = false; }
  };
  viewer.querySelector(".is-reply").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); viewer.querySelector(".is-send").click(); }
  });
  viewer.addEventListener("click", event => {
    if (event.target === viewer) closeViewer();
  });
  startStoryFloatingHearts();
  showAt(Math.max(0, Math.min(startIndex, currentGroup.length - 1)));
}
function showAt(index) {
  if (!viewer) return;
  if (viewerTimer) clearTimeout(viewerTimer);
  viewerTimer = null;
  if (index >= currentGroup.length) { closeViewer(); return; }
  if (index < 0) { closeViewer(); return; }
  currentIndex = index;
  const story = currentGroup[currentIndex];
  const mediaBox = viewer.querySelector(".is-media");
  const oldMedia = mediaBox.querySelector("img,video");
  if (oldMedia?.tagName === "VIDEO") oldMedia.pause();
  const previousAudio = viewer.querySelector(".is-story-music-audio");
  if (previousAudio) { previousAudio.pause(); previousAudio.removeAttribute("src"); previousAudio.load(); previousAudio.remove(); }
  const musicToggle = viewer.querySelector(".is-music-toggle");
  if (musicToggle) { musicToggle.style.display = "none"; musicToggle.textContent = "♫ Music"; musicToggle.onclick = null; }
  mediaBox.innerHTML = "";
  const url = mediaUrl(story);
  const media = document.createElement(isVideo(story) ? "video" : "img");
  media.src = url;
  media.alt = "Story";
  media.style.cssText = "max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;background:transparent;";
  const storyEffectFilters = {
    "PREMIUM GLITCH 01":"contrast(1.35) saturate(1.7) hue-rotate(18deg)","PREMIUM GLITCH 02":"contrast(1.4) saturate(1.55) hue-rotate(315deg)","RGB SPLIT":"contrast(1.3) saturate(1.6) hue-rotate(35deg)","NEON CYBER":"brightness(1.08) contrast(1.5) saturate(1.8) hue-rotate(145deg)","CHROMA BURST":"contrast(1.45) saturate(1.9) hue-rotate(70deg)","VHS DREAM":"sepia(.16) contrast(1.25) saturate(1.6) hue-rotate(330deg)","LASER PINK":"contrast(1.35) saturate(1.7) hue-rotate(285deg)","ELECTRIC BLUE":"contrast(1.4) saturate(1.65) hue-rotate(175deg)","ACID RAINBOW":"contrast(1.25) saturate(2) hue-rotate(95deg)","PRISM GLITCH":"contrast(1.5) saturate(1.8) hue-rotate(220deg)","PIXEL PULSE":"contrast(1.35) saturate(1.5) hue-rotate(260deg)","HOLOGRAM":"brightness(1.12) contrast(1.25) saturate(1.65) hue-rotate(160deg)"
  };
  const chosenStoryEffect = String(story.storyFilter || "Normal");
  if (storyEffectFilters[chosenStoryEffect]) {
    media.style.filter = storyEffectFilters[chosenStoryEffect];
    if (/GLITCH|RGB|VHS|PIXEL/i.test(chosenStoryEffect)) {
      media.style.animation = "ipStoryGlitchPulse .24s steps(2,end) infinite";
      if (!document.getElementById("ip-story-glitch-viewer-style")) {
        const glitchStyle = document.createElement("style");
        glitchStyle.id = "ip-story-glitch-viewer-style";
        glitchStyle.textContent = "@keyframes ipStoryGlitchPulse{0%{transform:translate(0,0);filter:hue-rotate(0deg) saturate(1.5)}25%{transform:translate(-1px,1px);filter:hue-rotate(22deg) saturate(1.9)}50%{transform:translate(1px,-1px);filter:hue-rotate(-18deg) saturate(1.6)}75%{transform:translate(-1px,0);filter:hue-rotate(12deg) saturate(2)}100%{transform:translate(0,0);filter:hue-rotate(0deg) saturate(1.5)}}";
        document.head.appendChild(glitchStyle);
      }
    }
  }
  if (media.tagName === "VIDEO") {
    media.autoplay = true;
    media.playsInline = true;
    media.controls = false;
    media.onended = () => showAt(currentIndex + 1);
    media.onerror = () => { viewerTimer = setTimeout(() => showAt(currentIndex + 1), 2500); };
  }
  mediaBox.appendChild(media);

  // Story music is stored separately as musicUrl; play it while this story is open.
  const soundtrackUrl = story.musicUrl || story.soundtrackUrl || story.audioUrl || "";
  if (soundtrackUrl) {
    const audio = document.createElement("audio");
    audio.className = "is-story-music-audio";
    audio.src = soundtrackUrl;
    audio.preload = "auto";
    const musicStart = Math.max(0, Number(story.musicStartTime || 0));
    const musicEnd = Number(story.musicEndTime || 0);
    audio.loop = !(musicEnd > musicStart);
    audio.playsInline = true;
    audio.style.display = "none";
    viewer.appendChild(audio);
    if (musicToggle) {
      const artwork = story.musicArtwork || "";
      musicToggle.innerHTML = (artwork ? '<img src="' + artwork.replace(/"/g,"&quot;") + '" alt="" style="width:24px;height:24px;object-fit:cover;border-radius:6px;margin-right:7px">' : '') + '<span>' + (story.musicName || "Music").replace(/[&<>]/g,"") + '</span>';
      musicToggle.style.display = "flex";
      musicToggle.style.alignItems = "center";
      musicToggle.style.maxWidth = "min(72vw,280px)";
      musicToggle.style.overflow = "hidden";
      musicToggle.style.whiteSpace = "nowrap";
      audio.addEventListener("loadedmetadata", () => { if (musicStart < audio.duration) audio.currentTime = musicStart; }, {once:true});
      audio.addEventListener("timeupdate", () => { if (musicEnd > musicStart && audio.currentTime >= musicEnd) { audio.currentTime = musicStart < audio.duration ? musicStart : 0; if (!audio.paused) audio.play().catch(()=>{}); } });
      musicToggle.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          if (audio.paused) { if (musicEnd > musicStart && (audio.currentTime < musicStart || audio.currentTime >= musicEnd)) audio.currentTime = musicStart; await audio.play(); }
          else { audio.pause(); }
        } catch (error) {
          console.warn("Story soundtrack playback failed:", error);
          musicToggle.textContent = "▶ Tap for music";
        }
      };
    }
    const startStoryMusic = async () => {
      try {
        if (musicEnd > musicStart && (audio.currentTime < musicStart || audio.currentTime >= musicEnd)) {
          audio.currentTime = musicStart < (Number.isFinite(audio.duration) ? audio.duration : musicEnd) ? musicStart : 0;
        }
        await audio.play();
        if (musicToggle?.isConnected) {
          musicToggle.style.opacity = "1";
          musicToggle.title = "Tap to pause music";
        }
      } catch (error) {
        // Mobile browsers may block autoplay until the user taps inside the Story viewer.
        if (musicToggle?.isConnected) musicToggle.title = "Tap to play music";
      }
    };
    audio.addEventListener("loadeddata", () => {
      if (musicStart > 0 && musicStart < audio.duration) audio.currentTime = musicStart;
    }, { once: true });
    viewer.addEventListener("pointerdown", startStoryMusic, { once: true });
    startStoryMusic();
    audio.addEventListener("error", () => {
      console.warn("Story music URL failed to load:", soundtrackUrl);
      if (musicToggle?.isConnected) musicToggle.title = "Music unavailable";
    }, { once: true });
  }

  // Instagram-style double-tap on the story media toggles the Firebase-backed like.
  let lastStoryTap = 0;
  let storyTapTimer = null;
  media.addEventListener("click", event => {
    const now = Date.now();
    if (now - lastStoryTap < 320) {
      event.preventDefault();
      clearTimeout(storyTapTimer);
      lastStoryTap = 0;
      const userNow = signedInUser || auth.currentUser;
      if (!userNow || userNow.isAnonymous) {
        alert("Story like karne ke liye Google login karein.");
        return;
      }
      if (!currentLiked) {
        const heart = viewer?.querySelector(".is-heart-pop");
        if (heart) {
          heart.style.display = "block";
          heart.animate([{transform:"scale(.4)",opacity:0},{transform:"scale(1.15)",opacity:1},{transform:"scale(1)",opacity:0}], {duration:650});
          setTimeout(() => { if (heart.isConnected) heart.style.display = "none"; }, 700);
        }
        toggleStoryLike();
      }
    } else {
      lastStoryTap = now;
      storyTapTimer = setTimeout(() => { lastStoryTap = 0; }, 340);
    }
  });

  const avatar = viewer.querySelector(".is-avatar");
  const photo = currentGroup[0]?.photo || story.photo || story.photoURL || "";
  if (photo) avatar.src = photo; else avatar.removeAttribute("src");
  viewer.querySelector(".is-name").textContent = currentGroup[0]?.name || ownerName(story);
  const profileLink = viewer.querySelector(".is-profile-link");
  if (profileLink) profileLink.setAttribute("aria-label", "Open " + (currentGroup[0]?.name || ownerName(story)) + " profile");

  const progress = viewer.querySelector(".is-progress");
  progress.innerHTML = "";
  currentGroup.forEach((_, i) => {
    const track = document.createElement("div");
    track.style.cssText = "height:3px;flex:1;border-radius:3px;background:rgba(255,255,255,.4);overflow:hidden;";
    const fill = document.createElement("div");
    fill.style.cssText = "height:100%;width:" + (i < index ? "100%" : "0%") + ";background:#fff;";
    track.appendChild(fill);
    progress.appendChild(track);
  });
  seenStoryIds.add(story.id);
  const user = signedInUser || auth.currentUser;
  const isOwnStory = !!user && ownerId(story) === user.uid;
  const replyInput = viewer.querySelector(".is-reply");
  const sendButton = viewer.querySelector(".is-send");
  const likeButton = viewer.querySelector(".is-like");
  if (replyInput) replyInput.style.setProperty("display", isOwnStory ? "none" : "block", "important");
  if (sendButton) sendButton.style.setProperty("display", isOwnStory ? "none" : "inline-flex", "important");
  const viewersButton=viewer.querySelector(".is-viewers");
  if(viewersButton){viewersButton.style.setProperty("display",isOwnStory?"flex":"none","important");viewersButton.querySelector(".is-view-count").textContent=String(Array.isArray(story.seenBy)?story.seenBy.length:0);
    const hasStoryLikes = Array.isArray(story.likedBy) && story.likedBy.length > 0;
    viewersButton.classList.toggle("is-liked-activity", hasStoryLikes);
    if (hasStoryLikes) {
      viewersButton.setAttribute("aria-label", "Activity — story has likes");
      // Replay the small heart burst when this story is opened.
      viewersButton.querySelectorAll(".is-like-pop,.is-like-spark,.is-tool-icon").forEach(node => {
        node.style.animation = "none";
        void node.offsetWidth;
        node.style.animation = "";
      });
    } else {
      viewersButton.setAttribute("aria-label", "Activity and story viewers");
    }}
  const repliesAllowed=(story.privacy?.replies||"everyone")!=="off";
  if(replyInput&&!isOwnStory)replyInput.disabled=!repliesAllowed;
  if(sendButton&&!isOwnStory)sendButton.disabled=!repliesAllowed;
  if(replyInput&&!isOwnStory&&!repliesAllowed)replyInput.placeholder="Replies turned off";
  const addStoryButton = viewer.querySelector(".is-add-story");
  if (addStoryButton) addStoryButton.style.display = isOwnStory ? "" : "none";
  if (likeButton) likeButton.style.setProperty("display", isOwnStory ? "none" : "inline-flex", "important");
  const mentionButton=viewer.querySelector(".is-mention");
  const moreButton=viewer.querySelector(".is-more");
  const highlightButton=viewer.querySelector(".is-highlight");
  if(highlightButton)highlightButton.style.setProperty("display",isOwnStory?"flex":"none","important");
  if(mentionButton)mentionButton.style.setProperty("display",isOwnStory?"flex":"none","important");
  if(moreButton)moreButton.style.setProperty("display",isOwnStory?"flex":"none","important");
  currentLiked = !!user && (Array.isArray(story.likedBy) ? story.likedBy : []).includes(user.uid);
  updateLikeButton();
  if (user && !user.isAnonymous) {
    const storyRef = doc(db, "stories", story.id);
    const seenBy = Array.isArray(story.seenBy) ? story.seenBy : [];
    if (ownerId(story) !== user.uid && !seenBy.includes(user.uid)) {
      updateDoc(storyRef, { seenBy: arrayUnion(user.uid), viewsCount: increment(1) })
        .catch(error => console.warn("Story view save error:", error));
    }
    if(stopCurrentStory)stopCurrentStory();
    stopCurrentStory = onSnapshot(storyRef, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      story.seenBy = Array.isArray(data.seenBy) ? data.seenBy : [];
      story.likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
      currentLiked = story.likedBy.includes(user.uid);
      const count=viewer?.querySelector(".is-view-count");
      if(count)count.textContent=String(story.seenBy.length);
      updateLikeButton();
    }, error => console.warn("Story stats listener error:", error));
  }
  if (!isVideo(story)) {
    // Still photos stay visible for 30 seconds, like a full-length Story segment.
    let elapsed = 0;
    const duration = 30000;
    const start = Date.now();
    const fill = progress.children[index]?.firstElementChild;
    const animate = () => {
      if (!viewer || currentIndex !== index) return;
      elapsed = Date.now() - start;
      if (fill) fill.style.width = Math.min(100, elapsed / duration * 100) + "%";
      if (elapsed >= duration) showAt(index + 1);
      else viewerTimer = setTimeout(animate, 60);
    };
    animate();
  } else {
    const fill = progress.children[index]?.firstElementChild;
    const advanceWhenVideoEnds = () => {
      if (viewer && currentIndex === index) showAt(index + 1);
    };
    media.ontimeupdate = () => {
      if (fill && media.duration && Number.isFinite(media.duration) && media.duration > 0) {
        fill.style.width = Math.min(100, media.currentTime / media.duration * 100) + "%";
      }
    };
    // Video Stories follow their actual media duration; do not force-advance at 30 seconds.
    media.onended = advanceWhenVideoEnds;
    media.onerror = advanceWhenVideoEnds;
    media.addEventListener("loadedmetadata", () => {
      if (viewer && currentIndex === index && Number.isFinite(media.duration) && media.duration > 0 && fill) {
        fill.style.width = Math.min(100, media.currentTime / media.duration * 100) + "%";
      }
    }, { once: true });
  }
}

// Re-render when login state resolves, not only when the Firestore listener fires.
onAuthStateChanged(auth, user => {
  signedInUser = user || null;
  renderStories();
});

document.addEventListener("open-highlight-story", async event => {
  const storyId=event.detail?.storyId;
  if(!storyId)return;
  try{
    const snap=await getDoc(doc(db,"stories",storyId));
    if(!snap.exists()){alert("Highlighted story available nahi hai.");return;}
    const story={id:snap.id,...snap.data()};
    const uid=ownerId(story);
    openStoryGroup({uid,name:ownerName(story),photo:story.photo||story.photoURL||"",stories:[story]});
  }catch(error){console.error("Open highlighted story error:",error);alert("Highlight open nahi hua.");}
});

document.addEventListener("open-notification-story", event => {
  const storyId = event.detail?.storyId;
  if (!storyId) return;
  const groups = groupsByUser(activeStories());
  const group = groups.find(item => item.stories.some(story => story.id === storyId));
  if (!group) {
    alert("Yeh Story ab expire ho chuki hai.");
    return;
  }
  const index = group.stories.findIndex(story => story.id === storyId);
  openStoryGroup(group, Math.max(0, index));
});

function refreshExpiry() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  const active = allStories.filter(s => expiry(s) > Date.now());
  if (!active.length) return;
  const next = Math.min(...active.map(expiry));
  expiryTimer = setTimeout(() => {
    allStories = allStories.filter(s => expiry(s) > Date.now());
    renderStories();
  }, Math.max(100, next - Date.now() + 100));
}
if (otherStoriesBox) {
  otherStoriesBox.style.display = "flex";
  stopStories = onSnapshot(collection(db, "stories"), async snapshot => {
    const now = Date.now();
    const rawStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(story => expiry(story) > now && mediaUrl(story));
    // Account-private gating was removed from Insta Pro. Do not hide other users' public stories
    // just because the legacy privacy module is unavailable or throws an error.
    allStories = rawStories;
    renderStories();
    refreshExpiry();
  }, error => {
    console.error("InstaPro stories load error:", error);
  });
}
window.addEventListener("pagehide", () => {
  if (stopStories) stopStories();
  if (expiryTimer) clearTimeout(expiryTimer);
  closeViewer();
});
