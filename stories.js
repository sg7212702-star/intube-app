import { auth, db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tray = document.getElementById("storiesList"); // ye sirf dusro ki list hai
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

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

// Stories Load
onSnapshot(collection(db, "stories"), (snap)=>{
    const all = [];
    snap.forEach(d=>{
        const s = d.data(); s.id = d.id;
        if(s.expiresAt && typeof s.expiresAt === 'number' && s.expiresAt < Date.now()){
            deleteDoc(doc(db, "stories", d.id)); return;
        }
        all.push(s);
    });
    const map = {};
    all.forEach(s=>{
        if(!map[s.uid]) map[s.uid] = { uid: s.uid, userName: s.userName || s.username || "User", userPhoto: s.userPhoto, stories: [] };
        map[s.uid].stories.push(s);
    });
    groups = Object.values(map);
    window.groups = groups;
    renderTray();
});

function renderTray(){
    const myUid = auth.currentUser?.uid;
    if(!myUid) return;

    const myItem = document.getElementById("myStoryItem");
    const myRing = document.getElementById("myStoryRing");
    const myPlus = document.getElementById("plusIcon");
    const myText = document.getElementById("myStoryText");
    const myImg = document.getElementById("myStoryImg");

    // MY PHOTO FIX - random nahi aayega
    if(myImg){
        myImg.src = auth.currentUser.photoURL || DEFAULT_AVATAR;
        myImg.onerror = () => myImg.src = DEFAULT_AVATAR;
    }

    // Dusro ki stories clear karo, apni nahi
    if(tray){
        // tray ke andar se sirf dusro ki story hatao
        const otherStories = tray.querySelectorAll(".other-story");
        otherStories.forEach(el=> el.remove());
    }

    let myStoryExists = false;
    let myGroupIndex = -1;
    groups.forEach((g,i)=>{ if(g.uid === myUid){ myStoryExists = true; myGroupIndex = i; } });

    // Baaki users ki story add karo
    groups.forEach((g,i)=>{
        if(g.uid === myUid) return;
        const seen = g.stories.every(s=> s.views?.includes(myUid));
        const div = document.createElement("div");
        div.className = "story other-story";
        div.innerHTML = `
            <div class="storyRing ${seen?'seen':'ring-active'}">
                <img src="${g.userPhoto || DEFAULT_AVATAR}">
            </div>
            <span>${(g.userName||'User').split(' ')[0]}</span>`;
        div.onclick = ()=> openViewer(i,0);
        tray.appendChild(div);
    });

    // MY RING LOGIC - Instagram jaisa
    if(myRing && myItem){
        if(myStoryExists){
            myRing.className = "storyRing ring-active";
            if(myPlus) myPlus.style.display = "none";
            if(myText) myText.textContent = "Your Story";
            myItem.onclick = () => openViewer(myGroupIndex, 0);
        }else{
            myRing.className = "storyRing ring-none";
            if(myPlus) myPlus.style.display = "flex";
            if(myText) myText.textContent = "Add Story";
            myItem.onclick = () => document.getElementById("storyFile")?.click();
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
    clearInterval(timer); let p=0;
    if(viewerProgress) viewerProgress.style.width='0%';
    timer = setInterval(()=>{ p+=0.8; if(viewerProgress) viewerProgress.style.width=p+'%'; if(p>=100){ clearInterval(timer); nextStory(); } }, 50);
}
function nextStory(){ const g=groups[curGroup]; if(curIndex+1<g.stories.length) openViewer(curGroup,curIndex+1); else closeViewer(); }
function closeViewer(){ if(viewer) viewer.hidden=true; clearInterval(timer); if(viewerVideo){ viewerVideo.pause(); viewerVideo.src=''; } }
closeViewerBtn?.addEventListener("click", closeViewer);
window.openViewer = openViewer;
auth.onAuthStateChanged(()=>{ renderTray(); });
