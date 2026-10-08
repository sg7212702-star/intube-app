// stories.js - FINAL FIXED - 100% WORKING
import { db, auth } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot,
  doc, deleteDoc, updateDoc,
  arrayUnion, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUD = "kujnbe0a";
const PRESET = "intube_free";

// --- HTML ID FIX ---
const tray = document.getElementById("storyTray") || document.getElementById("storiesList") || document.getElementById("stories");
const viewer = document.getElementById("storyViewer");
const pBox = document.getElementById("storyProgress");
const sImg = document.getElementById("storyImg") || document.getElementById("storyImage");
const sVideo = document.getElementById("storyVideo");
const fileInput = document.getElementById("storyFile") || document.getElementById("storyInput");

let groups = [];
let curU = 0;
let curS = 0;
let timer = null;
let prog = 0;
let paused = false;

document.getElementById("addStory")?.addEventListener("click", (e)=>{
  e.preventDefault();
  fileInput?.click();
});

// --- UPLOAD - FIXED WITH ERROR SHOW ---
fileInput?.addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(!auth.currentUser) return alert("login karo pehle");

  console.log("Upload start:", file.name);
  const originalText = document.querySelector('#storyModal button')?.innerText;

  try{
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", PRESET);
    const type = file.type.startsWith("video")? "video" : "image";

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`,{method:"POST",body:fd});
    const data = await res.json();

    console.log("Cloudinary response:", data);
    if(!data.secure_url){
      throw new Error(data.error?.message || "Cloudinary preset error - intube_free unsigned hona chahiye");
    }

    await addDoc(collection(db,"stories"),{
      uid: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "User",
      userPhoto: auth.currentUser.photoURL || "",
      storyUrl: data.secure_url,
      type: type,
      views: [],
      createdAt: serverTimestamp(),
      expiresAt: Date.now()+86400000
    });

    console.log("Story saved to Firestore");
    fileInput.value = "";
    const modal = document.getElementById("storyModal");
    if(modal) modal.hidden = true;

  }catch(err){
    console.error(err);
    alert("Upload fail: "+err.message);
  }
});

// --- LOAD - FIXED ORDERBY ---
const q = query(collection(db,"stories"), orderBy("expiresAt","desc"));
onSnapshot(q, (snap)=>{
  let all = [];
  snap.forEach(d=>{
    const s = { id:d.id,...d.data() };
    if(s.expiresAt && s.expiresAt < Date.now()){
      deleteDoc(doc(db,"stories",d.id));
      return;
    }
    all.push(s);
  });

  const map = {};
  all.forEach(s=>{
    if(!map[s.uid]){
      map[s.uid] = { uid: s.uid, userName: s.userName, userPhoto: s.userPhoto, stories: [] };
    }
    map[s.uid].stories.push(s);
  });
  Object.values(map).forEach(g=>{
    g.stories.sort((a,b)=> (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
  });
  groups = Object.values(map);
  renderTray();
});

function renderTray(){
    if(!tray) return;
    tray.innerHTML = "";

    groups.forEach((g,i)=>{
        if(g.uid === auth.currentUser?.uid) return; // apni story ko yaha mat dikhao, left wala hi hai
        const seen = g.stories.every(s=> s.views?.includes(auth.currentUser?.uid));
        const div = document.createElement("div");
        div.className = "story";
        div.innerHTML = `<div class="storyRing ${seen?'seen':''}"><img src="${g.userPhoto}"></div><span>${g.userName?.split(' ')[0]}</span>`;
        div.onclick = ()=> openViewer(i,0);
        tray.appendChild(div);
    });
}
window.openViewer = (u,s)=>{
  curU=u; curS=s; viewer.hidden=false;
  document.body.style.overflow="hidden"; show();
};

function show(){
  const g = groups[curU]; const st = g.stories[curS];
  try{ updateDoc(doc(db,"stories",st.id),{views: arrayUnion(auth.currentUser.uid)}); }catch(e){}
  document.getElementById("viewerUser") && (document.getElementById("viewerUser").innerText = g.userName);
  document.getElementById("storyUserName") && (document.getElementById("storyUserName").innerText = g.userName);
  if(document.getElementById("storyUserPhoto")) document.getElementById("storyUserPhoto").src = g.userPhoto;

  pBox.innerHTML = "";
  g.stories.forEach((_,i)=>{
    const bar = document.createElement("div"); bar.className="prog-bar"; bar.style.cssText="flex:1;height:3px;background:rgba(255,255,255,.3);border-radius:10px;overflow:hidden;margin:0 2px";
    const fill = document.createElement("div"); fill.className="prog-fill"; fill.style.cssText="height:100%;background:#fff;width:0%";
    if(i<curS) fill.style.width="100%"; if(i==curS) fill.id="activeFill";
    bar.appendChild(fill); pBox.appendChild(bar);
  });

  if(st.type=="video"){ sImg.hidden=true; sVideo.hidden=false; sVideo.src=st.storyUrl; sVideo.play(); sVideo.onended=nextStory; startProgress(10); }
  else{ sVideo.hidden=true; sVideo.pause(); sImg.hidden=false; sImg.src=st.storyUrl; startProgress(5); }
}

function startProgress(sec){
  clearInterval(timer); prog=0;
  const fill = document.getElementById("activeFill");
  timer = setInterval(()=>{
    if(paused) return;
    prog+=0.15; // tumhara wala
    if(fill) fill.style.width=prog+"%";
    if(prog>=100) nextStory();
  }, sec*10);
}

function nextStory(){
  const g=groups[curU];
  if(curS<g.stories.length-1){ curS++; show(); }
  else if(curU<groups.length-1){ curU++; curS=0; show(); }
  else closeViewer();
}
function prevStory(){
  if(curS>0){ curS--; show(); }
  else if(curU>0){ curU--; curS=groups[curU].stories.length-1; show(); }
}
function closeViewer(){ viewer.hidden=true; document.body.style.overflow=""; clearInterval(timer); sVideo?.pause(); }

document.getElementById("closeViewer")?.addEventListener("click",closeViewer);
document.getElementById("nextStory")?.addEventListener("click",nextStory);
document.getElementById("prevStory")?.addEventListener("click",prevStory);
