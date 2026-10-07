// stories.js - insta clone - easy edit version
import { db, auth } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot,
  doc, deleteDoc, updateDoc,
  arrayUnion, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- config ---
const CLOUD = "kujnbe0a";
const PRESET = "be_free";

// --- html ---
const tray = document.getElementById("storyTray");
const viewer = document.getElementById("storyViewer");
const pBox = document.getElementById("storyProgress");
const sImg = document.getElementById("storyImg");
const sVideo = document.getElementById("storyVideo");
const fileInput = document.getElementById("storyFile");

// --- vars ---
let groups = [];
let curU = 0;
let curS = 0;
let timer = null;
let prog = 0;
let paused = false;

// --- feature 1 : open file picker ---
document.getElementById("addStory")?.addEventListener("click", (e)=>{
  e.preventDefault();
  fileInput?.click();
});

// --- feature 2 : upload story ---
fileInput?.addEventListener("change", async ()=>{
  const file = fileInput.files[0];
  if(!file) return;
  if(!auth.currentUser) return alert("login karo");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", PRESET);

  const type = file.type.startsWith("video")? "video" : "image";

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`,
    { method:"POST", body:fd }
  );

  const data = await res.json();

  await addDoc(collection(db,"stories"),{
    uid: auth.currentUser.uid,
    userName: auth.currentUser.displayName,
    userPhoto: auth.currentUser.photoURL,
    storyUrl: data.secure_url,
    type: type,
    views: [],
    createdAt: serverTimestamp(),
    expiresAt: Date.now()+86400000
  });

  fileInput.value = "";
});

// --- feature 3 : load stories real time ---
const q = query(
  collection(db,"stories"),
  orderBy("createdAt","desc")
);

onSnapshot(q, (snap)=>{
  let all = [];

  snap.forEach(d=>{
    const s = { id:d.id,...d.data() };
    if(s.expiresAt < Date.now()){
      deleteDoc(doc(db,"stories",d.id));
      return;
    }
    all.push(s);
  });

  const map = {};
  all.forEach(s=>{
    if(!map[s.uid]){
      map[s.uid] = {
        uid: s.uid,
        userName: s.userName,
        userPhoto: s.userPhoto,
        stories: []
      };
    }
    map[s.uid].stories.push(s);
  });

  Object.values(map).forEach(g=>{
    g.stories.sort((a,b)=>
      (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)
    );
  });

  groups = Object.values(map);
  renderTray();
});

// --- feature 4 : render tray ---
function renderTray(){
  if(!tray) return;
  tray.innerHTML = "";

  const add = document.createElement("div");
  add.className = "story-item";
  add.innerHTML = `
    <div class="story-ring my-ring">
      <img src="${auth.currentUser?.photoURL}">
      <span class="plus">+</span>
    </div>
    <p>Your Story</p>
  `;
  add.onclick = ()=> fileInput?.click();
  tray.appendChild(add);

  groups.forEach((g,i)=>{
    const seen = g.stories.every(s=>
      s.views?.includes(auth.currentUser?.uid)
    );

    const div = document.createElement("div");
    div.className = `story-item ${seen?'seen':''}`;
    div.innerHTML = `
      <div class="story-ring ${seen?'':'unseen-ring'}">
        <img src="${g.userPhoto}">
      </div>
      <p>${g.userName?.split(' ')[0]}</p>
    `;
    div.onclick = ()=> openViewer(i,0);
    tray.appendChild(div);
  });
}

// --- feature 5 : open viewer ---
window.openViewer = (u,s)=>{
  curU = u;
  curS = s;
  viewer.hidden = false;
  document.body.style.overflow = "hidden";
  show();
};

// --- feature 6 : show story ---
function show(){
  const g = groups[curU];
  const st = g.stories[curS];

  updateDoc(doc(db,"stories",st.id),{
    views: arrayUnion(auth.currentUser.uid)
  });

  document.getElementById("viewerUser").innerText = g.userName;

  pBox.innerHTML = "";
  g.stories.forEach((_,i)=>{
    const bar = document.createElement("div");
    bar.className = "prog-bar";
    const fill = document.createElement("div");
    fill.className = "prog-fill";
    if(i < curS) fill.style.width = "100%";
    if(i == curS) fill.id = "activeFill";
    bar.appendChild(fill);
    pBox.appendChild(bar);
  });

  if(st.type == "video"){
    sImg.hidden = true;
    sVideo.hidden = false;
    sVideo.src = st.storyUrl;
    sVideo.play();
    sVideo.onended = nextStory;
    startProgress(10);
  }else{
    sVideo.hidden = true;
    sVideo.pause();
    sImg.hidden = false;
    sImg.src = st.storyUrl;
    startProgress(5);
  }
}

// --- feature 7 : progress bar ---
function startProgress(sec){
  clearInterval(timer);
  prog = 0;
  const fill = document.getElementById("activeFill");
  timer = setInterval(()=>{
    if(paused) return;
    prog += 0.5;
    if(fill) fill.style.width = prog+"%";
    if(prog >= 100) nextStory();
  }, sec*10);
}

// --- feature 8 : next ---
function nextStory(){
  const g = groups[curU];
  if(curS < g.stories.length-1){
    curS++;
    show();
  }else if(curU < groups.length-1){
    curU++;
    curS = 0;
    show();
  }else{
    closeViewer();
  }
}

// --- feature 9 : prev ---
function prevStory(){
  if(curS > 0){
    curS--;
    show();
  }else if(curU > 0){
    curU--;
    curS = groups[curU].stories.length-1;
    show();
  }
}

// --- feature 10 : close ---
function closeViewer(){
  viewer.hidden = true;
  document.body.style.overflow = "";
  clearInterval(timer);
  sVideo.pause();
}

// --- feature 11 : controls ---
document.getElementById("closeViewer").onclick = closeViewer;
document.getElementById("nextStory").onclick = nextStory;
document.getElementById("prevStory").onclick = prevStory;

viewer.onclick = (e)=>{
  const w = window.innerWidth;
  if(e.clientX > w*0.7) nextStory();
  if(e.clientX < w*0.3) prevStory();
};

viewer.ontouchstart = ()=> paused = true;
viewer.ontouchend = ()=> paused = false;
