import { auth, db } from "./firebase-config.js";
import { collection, onSnapshot, query, where, deleteDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tray = document.getElementById("storiesList");
const viewer = document.getElementById("storyViewer");
const viewerImg = document.getElementById("viewerImg") || document.getElementById("storyImg");
const viewerVideo = document.getElementById("viewerVideo") || document.getElementById("storyVideo");
const viewerProgress = document.getElementById("storyProgress");
const closeViewerBtn = document.getElementById("closeViewer");
const viewerUserPhoto = document.getElementById("viewerUserPhoto");
const viewerUserName = document.getElementById("viewerUserName") || document.getElementById("viewerUser");

let groups = [];
let myOwnStories = [];
let curGroup = 0, curIndex = 0, timer = null;
window.groups = groups;

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

auth.onAuthStateChanged((user)=>{
  if(!user) return;
  const myImg = document.getElementById("myStoryImg");
  if(myImg) myImg.src = user.photoURL || DEFAULT_AVATAR;

  // My Stories
  const q = query(collection(db, "stories"), where("uid","==", user.uid));
  onSnapshot(q, (snap)=>{
    myOwnStories = [];
    snap.forEach(d=>{
      const s=d.data(); s.id=d.id;
      if(s.expiresAt && s.expiresAt < Date.now()){ deleteDoc(doc(db,"stories",d.id)); return; }
      myOwnStories.push(s);
    });
    renderMyRing();
  });

  // All Stories
  onSnapshot(collection(db, "stories"), (snap)=>{
    const all=[];
    snap.forEach(d=>{ const s=d.data(); s.id=d.id; if(s.expiresAt && s.expiresAt < Date.now()){ deleteDoc(doc(db,"stories",d.id)); return; } all.push(s); });
    const map={};
    all.forEach(s=>{ if(!map[s.uid]) map[s.uid]={uid:s.uid, userName:s.userName||s.username||"User", userPhoto:s.userPhoto||DEFAULT_AVATAR, stories:[]}; map[s.uid].stories.push(s); });
    groups=Object.values(map); window.groups=groups; renderTray();
  });
});

function renderMyRing(){
  const myRing=document.getElementById("myStoryRing");
  const myPlus=document.getElementById("plusIcon");
  const myText=document.getElementById("myStoryText");
  const myItem=document.getElementById("myStoryItem");
  if(!myRing) return;
  if(myOwnStories.length>0){
    myRing.className="storyRing ring-active";
    if(myPlus) myPlus.style.display="none";
    if(myText) myText.textContent="Your Story";
    if(myItem) myItem.onclick=()=>openMyStory();
  }else{
    myRing.className="storyRing ring-none";
    if(myPlus) myPlus.style.display="flex";
    if(myText) myText.textContent="Add Story";
    if(myItem) myItem.onclick=()=>document.getElementById("storyFile")?.click();
  }
}

function renderTray(){
  if(!tray) return;
  tray.querySelectorAll(".other-story").forEach(e=>e.remove());
  const myUid=auth.currentUser?.uid;
  groups.forEach((g,i)=>{
    if(g.uid===myUid) return;
    const seen=g.stories.every(s=>s.views?.includes(myUid));
    const div=document.createElement("div");
    div.className="story other-story";
    div.innerHTML=`<div class="storyRing ${seen?'seen':'ring-active'}"><img src="${g.userPhoto||DEFAULT_AVATAR}"></div><span>${g.userName.split(' ')[0]}</span>`;
    div.onclick=()=>openViewer(i,0);
    tray.appendChild(div);
  });
  renderMyRing();
}

function openMyStory(){
  if(myOwnStories.length===0) return;
  const g={userName:auth.currentUser.displayName||"You", userPhoto:auth.currentUser.photoURL||"", stories:myOwnStories};
  groups.unshift(g);
  openViewer(0,0);
}

window.openViewer = function(gIdx, sIdx){
  curGroup=gIdx; curIndex=sIdx;
  const g=groups[curGroup]; if(!g) return; const s=g.stories[curIndex]; if(!s) return;
  if(viewerUserPhoto) viewerUserPhoto.src=g.userPhoto||DEFAULT_AVATAR;
  if(viewerUserName) viewerUserName.textContent=g.userName||"User";
  if(viewer){ viewer.hidden=false; viewer.style.display="flex"; }

  const url = s.storyUrl || s.storyUrl1 || s.mediaUrl;
  if(s.type==="video" || s.mediaType==="video"){
    if(viewerImg) viewerImg.style.display="none";
    if(viewerVideo){ viewerVideo.style.display="block"; viewerVideo.src=url; viewerVideo.play(); }
  }else{
    if(viewerVideo) viewerVideo.style.display="none";
    if(viewerImg){ viewerImg.style.display="block"; viewerImg.src=url; }
  }
  // Progress
  if(viewerProgress) viewerProgress.style.width="0%";
  let w=0; clearInterval(timer);
  timer=setInterval(()=>{ w+=1; if(viewerProgress) viewerProgress.style.width=w+"%"; if(w>=100){ clearInterval(timer); nextStory(); } },50);
  // mark view
  if(auth.currentUser) updateDoc(doc(db,"stories",s.id), {views:arrayUnion(auth.currentUser.uid)});
}

window.nextStory = function(){
  const g=groups[curGroup]; if(!g) return;
  if(curIndex < g.stories.length-1){ openViewer(curGroup, curIndex+1); }
  else if(curGroup < groups.length-1){ openViewer(curGroup+1, 0); }
  else closeViewer();
}
window.prevStory = function(){
  if(curIndex>0) openViewer(curGroup, curIndex-1);
  else if(curGroup>0) openViewer(curGroup-1, 0);
}
window.closeViewer = function(){
  clearInterval(timer);
  if(viewer){ viewer.hidden=true; viewer.style.display="none"; }
  if(viewerVideo){ viewerVideo.pause(); viewerVideo.src=""; }
}

closeViewerBtn?.addEventListener("click", closeViewer);
viewer?.addEventListener("click", (e)=>{ if(e.target===viewer) closeViewer(); });
