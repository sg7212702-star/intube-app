import { auth, db } from "./firebase-config.js";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tray = document.getElementById("storiesList");
const viewer = document.getElementById("storyViewer");
const viewerImg = document.getElementById("viewerImg");
const viewerVideo = document.getElementById("viewerVideo");
const viewerProgress = document.getElementById("viewerProgress");
const closeViewerBtn = document.getElementById("closeViewer");
const fileInput = document.getElementById("storyFile");

let groups = [];
let curGroup = 0;
let curIndex = 0;
let timer = null;
window.groups = [];

onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), (snap)=>{
    const all = [];
    snap.forEach(d=>{
        const s = d.data();
        s.id = d.id;
        // expired check
        if(s.expiresAt && s.expiresAt < Date.now()){
            deleteDoc(doc(db, "stories", d.id));
            return;
        }
        all.push(s);
    });

    // group by user
    const map = {};
    all.forEach(s=>{
        if(!map[s.uid]){
            map[s.uid] = { uid: s.uid, userName: s.userName || s.username, userPhoto: s.userPhoto, stories: [] };
        }
        map[s.uid].stories.push(s);
    });
    groups = Object.values(map);
    window.groups = groups;
    renderTray();
});

function renderTray(){
    if(!tray) return;
    tray.innerHTML = "";
    const myUid = auth.currentUser?.uid;
    const myRing = document.getElementById("myStoryRing");
    const myPlus = document.getElementById("plusIcon");
    const myText = document.getElementById("myStoryText");
    const myImg = document.getElementById("myStoryImg");
    let myStoryExists = false;

    groups.forEach((g,i)=>{
        if(g.uid === myUid) myStoryExists = true;
        if(g.uid === myUid) return; // apni story left wale button me hai

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
            if(myPlus) myPlus.style.display = "none";
            if(myText) myText.textContent = "Your Story";
            const myG = groups.find(g=>g.uid===myUid);
            if(myImg && myG) myImg.src = myG.userPhoto || myImg.src;
        }else{
            myRing.className = "ring-none";
            if(myPlus) myPlus.style.display = "flex";
            if(myText) myText.textContent = "Add Story";
        }
    }
}

function openViewer(gIdx, sIdx){
    curGroup = gIdx;
    curIndex = sIdx;
    const g = groups[curGroup];
    if(!g) return;
    const s = g.stories[curIndex];
    if(!s) return;

    if(viewer) viewer.hidden = false;
    const url = s.storyUrl || s.storyUrl1;
    const type = s.type || s.mediaType || 'image';

    if(type === 'video'){
        if(viewerImg) viewerImg.hidden = true;
        if(viewerVideo){ viewerVideo.hidden = false; viewerVideo.src = url; viewerVideo.play(); }
    }else{
        if(viewerVideo) viewerVideo.hidden = true;
        if(viewerImg){ viewerImg.hidden = false; viewerImg.src = url; }
    }

    // view add
    if(auth.currentUser &&!s.views?.includes(auth.currentUser.uid)){
        updateDoc(doc(db, "stories", s.id), { views: arrayUnion(auth.currentUser.uid) });
    }

    clearInterval(timer);
    let progress = 0;
    if(viewerProgress) viewerProgress.style.width = '0%';
    timer = setInterval(()=>{
        progress += 1;
        if(viewerProgress) viewerProgress.style.width = progress + '%';
        if(progress >= 100){
            clearInterval(timer);
            nextStory();
        }
    }, 50);

    renderTray();
}

function nextStory(){
    const g = groups[curGroup];
    if(curIndex + 1 < g.stories.length){
        openViewer(curGroup, curIndex+1);
    }else{
        if(curGroup + 1 < groups.length && groups[curGroup+1].uid!== auth.currentUser?.uid){
            openViewer(curGroup+1, 0);
        }else{
            closeViewer();
        }
    }
}

function closeViewer(){
    if(viewer) viewer.hidden = true;
    clearInterval(timer);
    if(viewerVideo){ viewerVideo.pause(); viewerVideo.src = ''; }
}

closeViewerBtn?.addEventListener("click", closeViewer);
window.openViewer = openViewer;
auth.onAuthStateChanged(()=>{ renderTray(); });
