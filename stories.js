import { auth, db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tray = document.getElementById("storiesList");
const viewer = document.getElementById("storyViewer");
const viewerImg = document.getElementById("viewerImg");
const viewerVideo = document.getElementById("viewerVideo");
const viewerProgress = document.getElementById("viewerProgress");
const closeViewerBtn = document.getElementById("closeViewer");

let groups = [];
let curGroup = 0;
let curIndex = 0;
let timer = null;
window.groups = groups;

// SIMPLE QUERY - orderBy hataya, ab fail nahi hoga
onSnapshot(collection(db, "stories"), (snap)=>{
    const all = [];
    snap.forEach(d=>{
        const s = d.data();
        s.id = d.id;
        // 24hr expired check
        if(s.expiresAt && typeof s.expiresAt === 'number' && s.expiresAt < Date.now()){
            deleteDoc(doc(db, "stories", d.id));
            return;
        }
        // agar createdAt Timestamp hai to number banao
        all.push(s);
    });
    console.log("Stories loaded:", all.length);

    const map = {};
    all.forEach(s=>{
        if(!map[s.uid]){
            map[s.uid] = { uid: s.uid, userName: s.userName || s.username || "User", userPhoto: s.userPhoto || "", stories: [] };
        }
        map[s.uid].stories.push(s);
    });
    groups = Object.values(map);
    window.groups = groups;
    console.log("Groups:", groups);
    renderTray();
});

function renderTray(){
    if(!tray) return;
    tray.innerHTML = "";
    const myUid = auth.currentUser?.uid;
    console.log("My UID:", myUid, "Groups:", groups.length);

    const myRing = document.getElementById("myStoryRing");
    const myPlus = document.getElementById("plusIcon");
    const myText = document.getElementById("myStoryText");
    const myImg = document.getElementById("myStoryImg");
    const myItem = document.getElementById("myStoryItem");
    let myStoryExists = false;
    let myGroupIndex = -1;

    groups.forEach((g,i)=>{
        if(g.uid === myUid){ myStoryExists = true; myGroupIndex = i; }
    });

    // Baaki users ki story dikhao
    groups.forEach((g,i)=>{
        if(g.uid === myUid) return;
        const seen = g.stories.every(s=> s.views?.includes(myUid));
        const div = document.createElement("div");
        div.className = "story";
        div.innerHTML = `<div class="storyRing ${seen?'seen':''}"><img src="${g.userPhoto || 'https://i.pravatar.cc/150'}"></div><span>${(g.userName||'User').split(' ')[0]}</span>`;
        div.onclick = ()=> openViewer(i,0);
        tray.appendChild(div);
    });

    if(myRing){
        if(myStoryExists){
            myRing.className = "ring-active";
            myRing.style.border = "3px solid #ff3040";
            myRing.style.background = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
            myRing.style.padding = "3px";
            if(myPlus) myPlus.style.display = "none";
            if(myText) myText.textContent = "Your Story";
            if(myItem) myItem.onclick = () => openViewer(myGroupIndex, 0);
            console.log("My story ACTIVE");
        }else{
            myRing.className = "ring-none";
            myRing.style.border = "2px solid #333";
            myRing.style.background = "none";
            myRing.style.padding = "0";
            if(myPlus) myPlus.style.display = "flex";
            if(myText) myText.textContent = "Add Story";
            if(myItem) myItem.onclick = () => document.getElementById("storyFile")?.click();
            console.log("My story NONE");
        }
    }
}

function openViewer(gIdx, sIdx){
    curGroup = gIdx; curIndex = sIdx;
    const g = groups[curGroup]; if(!g) return;
    const s = g.stories[curIndex]; if(!s) return;
    if(viewer) viewer.hidden = false;
    const url = s.storyUrl || s.storyUrl1 || s.mediaUrl;
    const type = s.type || s.mediaType || 'image';

    if(type === 'video'){
        if(viewerImg) viewerImg.hidden = true;
        if(viewerVideo){ viewerVideo.hidden = false; viewerVideo.src = url; viewerVideo.play().catch(()=>{}); }
    }else{
        if(viewerVideo){ viewerVideo.hidden = true; viewerVideo.pause(); }
        if(viewerImg){ viewerImg.hidden = false; viewerImg.src = url; }
    }
    if(auth.currentUser &&!s.views?.includes(auth.currentUser.uid)){
        updateDoc(doc(db, "stories", s.id), { views: arrayUnion(auth.currentUser.uid) }).catch(()=>{});
    }
    clearInterval(timer);
    let progress = 0;
    if(viewerProgress) viewerProgress.style.width = '0%';
    timer = setInterval(()=>{
        progress += 0.8;
        if(viewerProgress) viewerProgress.style.width = progress + '%';
        if(progress >= 100){ clearInterval(timer); nextStory(); }
    }, 50);
}

function nextStory(){
    const g = groups[curGroup];
    if(curIndex + 1 < g.stories.length) openViewer(curGroup, curIndex+1);
    else closeViewer();
}
function closeViewer(){
    if(viewer) viewer.hidden = true;
    clearInterval(timer);
    if(viewerVideo){ viewerVideo.pause(); viewerVideo.src=''; }
}
closeViewerBtn?.addEventListener("click", closeViewer);
window.openViewer = openViewer;

auth.onAuthStateChanged((user)=>{
    if(user){
        const img = document.getElementById("myStoryImg");
        if(img) img.src = user.photoURL || "https://i.pravatar.cc/150?u="+user.uid;
    }
    renderTray();
});
