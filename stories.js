// InstaPro Stories — Instagram-style realtime stories
import { db, auth } from "./firebase.js";
import {
  collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove,
  setDoc, addDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const otherStoriesBox = document.getElementById("otherStories");
const yourRing = document.getElementById("addStoryBtn");
const yourStoryItem = yourRing?.closest(".sItem");
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
  return story.uid || story.userId || story.authorId || story.ownerUid || story.userUID || "";
}
function chatIdFor(a, b) { return [a, b].sort().join("_"); }
async function sendReplyToDM(text) {
  const user = signedInUser || auth.currentUser;
  const story = currentGroup[currentIndex];
  const receiverUid = ownerId(story);
  if (!user || user.isAnonymous) throw new Error("DM bhejne ke liye Google login karein.");
  if (!receiverUid || receiverUid === user.uid) throw new Error("Apni story par DM reply nahi bhej sakte.");
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
  const btn = viewer?.querySelector(".is-like");
  if (btn) btn.disabled = true;
  try {
    const wasLiked = currentLiked;
    await updateDoc(doc(db, "stories", story.id), {
      likedBy: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    currentLiked = !wasLiked;
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
    btn.style.background = "transparent";
    btn.style.color = currentLiked ? "#ff3040" : "#fff";
  }
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
  return allStories.filter(s => mediaUrl(s) && expiry(s) > now && ((s.privacy?.audience||s.audience||"everyone")!=="onlyMe" || ownerId(s)===uid))
    .sort((a, b) => timestamp(b) - timestamp(a));
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
  if (url) {
    if (!image) {
      image = document.createElement("img");
      image.className = "insta-story-preview";
      image.alt = label;
      image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:0;";
      ring.prepend(image);
    }
    image.src = url;
    image.style.display = "block";
    ring.style.position = "relative";
    ring.style.overflow = "hidden";
    const plus = ring.querySelector("span");
    if (plus) plus.style.cssText = "position:absolute;right:-1px;bottom:-1px;z-index:3;background:#0095f6;color:#fff;border:2px solid #111;border-radius:50%;width:21px;height:21px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;";
  } else {
    image?.remove();
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

  // Hide "Your story" entirely when this account has no unexpired story.
  if (yourStoryItem) yourStoryItem.style.display = ownGroup ? "" : "none";
  // Keep active own stories in the existing ring only; upload via the create menu.
  setRingPreview(yourRing, ownGroup?.latest || null, "Your latest story");
  if (yourRing) {
    yourRing.title = ownGroup ? "View your story · + to add another" : "Add to your story";
    yourRing.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target.closest("span")) {
        openUpload();
        return;
      }
      if (ownGroup) openStoryGroup(ownGroup);
    };
  }

  // Make wrapper visually transparent; each account gets exactly one ring.
  otherStoriesBox.style.display = "contents";
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
    ring.style.cssText = "position:relative;overflow:hidden;padding:0;cursor:pointer;";
    const preview = document.createElement("img");
    preview.src = mediaUrl(group.latest);
    preview.alt = "";
    preview.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;";
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
    const ids=Array.isArray(story.seenBy)?story.seenBy:[];
    if(!ids.length){panel.querySelector(".isp-body").innerHTML='<p style="text-align:center;color:#777;padding:20px 0;">Abhi kisi ne story nahi dekhi.</p>';return;}
    const people=await Promise.all(ids.map(async uid=>{try{const s=await getDoc(doc(db,"users",uid));return s.exists()?{uid,...s.data()}:{uid,username:"InstaPro User"};}catch{return {uid,username:"InstaPro User"};}}));
    panel.querySelector(".isp-body").innerHTML='<p style="font-size:13px;color:#777;">'+people.length+' views</p>'+people.map(p=>'<div style="display:flex;align-items:center;gap:10px;padding:9px 0;"><img src="'+escapeHtml(p.photoURL||p.photo||"https://www.gravatar.com/avatar/?d=mp")+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;"><strong>'+escapeHtml(userLabel(p))+'</strong></div>').join("");
  }catch(e){console.error(e);panel.querySelector(".isp-body").textContent="Viewer list load nahi hui. Firestore Rules check karein.";}
}
async function openStoryDmShare(){
  const story=currentGroup[currentIndex],user=signedInUser||auth.currentUser;
  if(!story||!user||user.isAnonymous){alert("Story DM mein send karne ke liye Google login karein.");return;}
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
  const panel=openStoryPanel("Story privacy",'<p style="font-size:13px;color:#666;">Changes Firebase mein save honge.</p><label style="display:block;margin:14px 0 6px;font-weight:600;">Who can see this story?</label><select class="isp-audience" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#111;"><option value="everyone">Everyone</option><option value="onlyMe">Only me (hide from everyone)</option></select><label style="display:block;margin:14px 0 6px;font-weight:600;">Story replies</label><select class="isp-replies" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#111;"><option value="everyone">Allow replies</option><option value="off">Turn off replies</option></select><button class="isp-save" style="width:100%;margin-top:16px;padding:12px;border:0;border-radius:12px;background:#0095f6;color:#fff;font-weight:700;">Save privacy</button>');
  panel.querySelector(".isp-audience").value=privacy.audience||story.audience||"everyone";panel.querySelector(".isp-replies").value=privacy.replies||"everyone";
  panel.querySelector(".isp-save").onclick=async()=>{
    const save=panel.querySelector(".isp-save");save.disabled=true;
    const next={audience:panel.querySelector(".isp-audience").value,replies:panel.querySelector(".isp-replies").value,updatedAt:Date.now()};
    try{await updateDoc(doc(db,"stories",story.id),{privacy:next,audience:next.audience});story.privacy=next;story.audience=next.audience;panel.remove();renderStories();alert("Story privacy Firebase mein save ho gayi.");}
    catch(e){console.error(e);alert("Privacy save nahi hui. Firestore Rules check karein.");save.disabled=false;}
  };
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

function closeViewer() {
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
  viewer.style.cssText = "position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.92);color:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;animation:instaStoryViewerIn .18s ease-out;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);";
  if (!document.getElementById("instapro-story-animations")) {
    const style = document.createElement("style");
    style.id = "instapro-story-animations";
    style.textContent = "@keyframes instaStoryViewerIn{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:scale(1)}} @keyframes instaStoryBarGlow{0%{opacity:.65}50%{opacity:1}100%{opacity:.65}} .instapro-story-viewer .is-stage{position:relative;width:min(100vw,450px);height:min(100dvh,800px);aspect-ratio:9/16;max-height:100dvh;overflow:hidden;background:#080808;border-radius:0;box-shadow:0 8px 40px #0008} .instapro-story-viewer .is-media{position:absolute!important;inset:0;width:100%!important;height:100%!important;z-index:1} .instapro-story-viewer .is-media img,.instapro-story-viewer .is-media video{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;background:transparent!important} .instapro-story-viewer .is-head,.instapro-story-viewer .is-progress,.instapro-story-viewer .is-footer{background:transparent!important;left:10px!important;right:10px!important} .instapro-story-viewer .is-progress{top:10px!important;z-index:7!important} .instapro-story-viewer .is-head{top:23px!important;z-index:7!important;padding-top:4px} .instapro-story-viewer .is-footer{bottom:calc(8px + env(safe-area-inset-bottom))!important;z-index:8!important;padding-bottom:8px;background:linear-gradient(transparent,rgba(0,0,0,.35))!important} .instapro-story-viewer .is-prev,.instapro-story-viewer .is-next{z-index:2!important;top:12%!important;bottom:14%!important} .instapro-story-viewer .is-close,.instapro-story-viewer .is-add-story,.instapro-story-viewer .is-send,.instapro-story-viewer .is-like,.instapro-story-viewer .is-comments,.instapro-story-viewer .is-share{cursor:pointer;flex-shrink:0;touch-action:manipulation} .insta-story-account .sRing{transition:transform .18s ease,filter .18s ease} .insta-story-account .sRing:active{transform:scale(.94);filter:brightness(1.15)} .is-like{transition:transform .15s ease} .is-like:active{transform:scale(1.25)} @media(min-width:500px){.instapro-story-viewer .is-stage{border-radius:12px;height:min(90dvh,800px);width:min(calc(90dvh * 9 / 16),450px)} .instapro-story-viewer .is-head{top:24px!important}} @media(max-width:499px){.instapro-story-viewer .is-stage{width:100vw;height:100dvh;aspect-ratio:auto;border-radius:0}}";
    document.head.appendChild(style);
  }
  viewer.innerHTML = `
    <div class="is-stage">
      <div class="is-progress" style="position:absolute;top:12px;left:10px;right:10px;display:flex;gap:4px;z-index:5;"></div>
      <div class="is-head" style="position:absolute;top:24px;left:14px;right:14px;z-index:5;display:flex;align-items:center;gap:9px;text-shadow:0 1px 4px #000;">
        <img class="is-avatar" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:#333;">
        <span class="is-name" style="font-size:14px;font-weight:600;flex:1;"></span>
        <button class="is-add-story" aria-label="Add another story" title="Add another story" style="display:none;background:transparent!important;border:0;color:#fff;font-size:25px;padding:0 5px;">＋</button>
        <button class="is-close" aria-label="Close story" style="background:transparent!important;border:0;color:#fff;font-size:27px;padding:0 5px;">×</button>
      </div>
      <div class="is-media" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
      <button class="is-prev" aria-label="Previous story" style="position:absolute;left:0;top:15%;bottom:15%;width:35%;border:0;background:transparent!important;"></button>
      <button class="is-next" aria-label="Next story" style="position:absolute;right:0;top:15%;bottom:15%;width:35%;border:0;background:transparent!important;"></button>
      <div class="is-footer" style="position:absolute;bottom:18px;left:14px;right:14px;z-index:6;display:flex;gap:8px;align-items:center;">
        <button class="is-viewers" aria-label="View story viewers" title="Viewers" style="display:none;background:transparent!important;border:0;color:#fff;font-size:18px;white-space:nowrap;">◉ <span class="is-view-count">0</span></button>
        <input class="is-reply" placeholder="Reply to story..." style="min-width:0;flex:1;background:transparent!important;border:1px solid #aaa;border-radius:22px;padding:12px;color:#fff;outline:none;">
        <button class="is-send" aria-label="Send reply" title="Reply" style="background:transparent!important;border:0;color:#fff;font-size:22px;">➤</button>
        <button class="is-like" aria-label="Like story" title="Like" style="background:transparent!important;border:0;color:#fff;font-size:27px;">♡</button>
        <button class="is-comments" aria-label="Comment on story" title="Comments" style="background:transparent!important;border:0;color:#fff;font-size:22px;">💬</button>
        <button class="is-share" aria-label="Send story in DM" title="Send in DM" style="background:transparent!important;border:0;color:#fff;font-size:22px;">➤</button>
        <button class="is-mention" aria-label="Mention someone" title="Mention" style="background:transparent!important;border:0;color:#fff;font-size:20px;">@</button>
        <button class="is-more" aria-label="Story privacy settings" title="More / Privacy" style="background:transparent!important;border:0;color:#fff;font-size:24px;">⋮</button>
      </div>
    </div>`
  document.body.appendChild(viewer);
  viewer.querySelector(".is-close").onclick = closeViewer;
  viewer.querySelector(".is-add-story").onclick = openUpload;
  viewer.querySelector(".is-prev").onclick = () => showAt(currentIndex - 1);
  viewer.querySelector(".is-next").onclick = () => showAt(currentIndex + 1);
  viewer.querySelector(".is-like").onclick = toggleStoryLike;
  viewer.querySelector(".is-comments").onclick = openStoryComments;
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
  mediaBox.innerHTML = "";
  const url = mediaUrl(story);
  const media = document.createElement(isVideo(story) ? "video" : "img");
  media.src = url;
  media.alt = "Story";
  media.style.cssText = "max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;background:transparent;";
  if (media.tagName === "VIDEO") {
    media.autoplay = true;
    media.playsInline = true;
    media.controls = false;
    media.onended = () => showAt(currentIndex + 1);
    media.onerror = () => { viewerTimer = setTimeout(() => showAt(currentIndex + 1), 2500); };
  }
  mediaBox.appendChild(media);

  const avatar = viewer.querySelector(".is-avatar");
  const photo = currentGroup[0]?.photo || story.photo || story.photoURL || "";
  if (photo) avatar.src = photo; else avatar.removeAttribute("src");
  viewer.querySelector(".is-name").textContent = currentGroup[0]?.name || ownerName(story);

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
  if (replyInput) replyInput.style.display = isOwnStory ? "none" : "";
  if (sendButton) sendButton.style.display = isOwnStory ? "none" : "";
  const viewersButton=viewer.querySelector(".is-viewers");
  if(viewersButton){viewersButton.style.display=isOwnStory?"":"none";viewersButton.querySelector(".is-view-count").textContent=String(Array.isArray(story.seenBy)?story.seenBy.length:0);}
  const repliesAllowed=(story.privacy?.replies||"everyone")!=="off";
  if(replyInput&&!isOwnStory)replyInput.disabled=!repliesAllowed;
  if(sendButton&&!isOwnStory)sendButton.disabled=!repliesAllowed;
  if(replyInput&&!isOwnStory&&!repliesAllowed)replyInput.placeholder="Replies turned off";
  const addStoryButton = viewer.querySelector(".is-add-story");
  if (addStoryButton) addStoryButton.style.display = isOwnStory ? "" : "none";
  if (likeButton) likeButton.style.display = isOwnStory ? "none" : "";
  const mentionButton=viewer.querySelector(".is-mention");
  const moreButton=viewer.querySelector(".is-more");
  if(mentionButton)mentionButton.style.display=isOwnStory?"":"none";
  if(moreButton)moreButton.style.display=isOwnStory?"":"none";
  currentLiked = !!user && (Array.isArray(story.likedBy) ? story.likedBy : []).includes(user.uid);
  updateLikeButton();
  if (user && !user.isAnonymous) {
    const storyRef = doc(db, "stories", story.id);
    const seenBy = Array.isArray(story.seenBy) ? story.seenBy : [];
    if (!seenBy.includes(user.uid)) {
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
    let elapsed = 0;
    const duration = 5000;
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
    media.ontimeupdate = () => {
      if (fill && media.duration && Number.isFinite(media.duration)) fill.style.width = Math.min(100, media.currentTime / media.duration * 100) + "%";
    };
    media.onended = () => showAt(index + 1);
    viewerTimer = setTimeout(() => { if (viewer && currentIndex === index) showAt(index + 1); }, 30000);
  }
}

// Re-render when login state resolves, not only when the Firestore listener fires.
onAuthStateChanged(auth, user => {
  signedInUser = user || null;
  renderStories();
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
  otherStoriesBox.style.display = "contents";
  stopStories = onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), snapshot => {
    const now = Date.now();
    allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(story => expiry(story) > now && mediaUrl(story));
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
