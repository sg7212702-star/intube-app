// reels.js - same posts ko reel ki tarah dikhayega
import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const rBox=document.getElementById("reelsBox");
if(rBox){ onSnapshot(collection(db,"posts"),(s)=>{ rBox.innerHTML=""; s.forEach(d=>{ rBox.innerHTML+=`<img src="${d.data().fileUrl}" style="width:100%;height:90vh;object-fit:cover">`; }); }); }

// explore.js
import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const eBox=document.getElementById("exploreGrid");
if(eBox){ onSnapshot(collection(db,"posts"),(s)=>{ eBox.innerHTML=""; s.forEach(d=>{ eBox.innerHTML+=`<img src="${d.data().fileUrl}" style="width:100%;aspect-ratio:1;object-fit:cover">`; }); }); }

// profile.js
import { db } from "./firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const pGrid=document.getElementById("profileGrid");
if(pGrid){ onSnapshot(collection(db,"posts"),(s)=>{ pGrid.innerHTML=""; s.forEach(d=>{ pGrid.innerHTML+=`<img src="${d.data().fileUrl}" style="width:100%;aspect-ratio:1;object-fit:cover">`; }); }); }
