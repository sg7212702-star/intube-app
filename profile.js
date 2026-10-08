// profile.js - COMPLETE FILE - InstaPro
// File: profile.js

// 1. FIREBASE IMPORT
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
 getFirestore, 
 doc, 
 getDoc, 
 setDoc, 
 collection, 
 query, 
 where, 
 onSnapshot, 
 orderBy, 
 updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
 getStorage, 
 ref, 
 uploadBytes, 
 getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 2. FIREBASE CONFIG
// अपना Config यहाँ Paste कर दे
const firebaseConfig = {
 apiKey: "AIzaSy...",
 authDomain: "yourapp.firebaseapp.com",
 projectId: "yourapp",
 storageBucket: "yourapp.appspot.com",
 appId: "1:..."
};

// 3. INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 4. VARS
let currentUid = null;
let profileUid = null;
const $ = (id)=> document.getElementById(id);

// 5. AUTH CHECK
onAuthStateChanged(auth, async (user)=>{
 if(!user){
  console.log("No user");
  return;
 }
 currentUid = user.uid;
 profileUid = new URLSearchParams(location.search).get("uid") || user.uid;
 console.log("Profile UID:",profileUid);
 loadProfile(profileUid);
 loadPosts(profileUid);
 loadReels(profileUid);
 loadCounts(profileUid);
});

// 6. LOAD PROFILE
async function loadProfile(uid){
 const refDoc = doc(db,"users",uid);
 const snap = await getDoc(refDoc);
 if(!snap.exists()){
  await setDoc(refDoc,{
   name:"Your Name",
   bio:"Bio - Edit से बदलेगा",
   link:"",
   avatar:"https://cdn-icons-png.flaticon.com/512/149/149071.png",
   verified:false,
   time:Date.now()
  });
  return loadProfile(uid);
 }
 const d = snap.data();
 // Avatar
 const avatars = document.querySelectorAll("#profileFeed .ring img");
 avatars.forEach(img=> img.src = d.avatar);
 // Name
 const nameEl = document.querySelector("#profileFeed b");
 if(nameEl){
  nameEl.innerHTML = d.name + (d.verified? ` <span style="color:#0095F6">✓</span>` : "");
 }
 // Bio
 const bioEl = document.querySelector("#profileFeed small");
 if(bioEl){
  bioEl.innerText = d.bio + (d.link? `\n${d.link}` : "");
 }
}

// 7. LOAD POSTS - 3x3 GRID
function loadPosts(uid){
 const q = query(
  collection(db,"posts"),
  where("uid","==",uid),
  orderBy("time","desc")
 );
 onSnapshot(q,(snap)=>{
  const grid = $("profilePostsGrid");
  const empty = $("emptyMsg");
  if(!grid) return;
  grid.innerHTML = "";
  if(snap.empty){
   if(empty) empty.style.display = "block";
   const countEl = document.querySelectorAll(".stat b")[0];
   if(countEl) countEl.innerText = "0";
   return;
  }
  if(empty) empty.style.display = "none";
  snap.forEach((docSnap)=>{
   const d = docSnap.data();
   const div = document.createElement("div");
   div.style.cssText = "aspect-ratio:1/1;background:#111;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,.05)";
   div.innerHTML = `<img src="${d.url}" style="width:100%;height:100%;object-fit:cover">`;
   div.onclick = ()=> location.href = `post.html?id=${docSnap.id}`;
   grid.appendChild(div);
  });
  const countEl = document.querySelectorAll(".stat b")[0];
  if(countEl) countEl.innerText = snap.size;
 });
}

// 8. LOAD REELS - GRID
function loadReels(uid){
 const q = query(
  collection(db,"reels"),
  where("uid","==",uid),
  orderBy("time","desc")
 );
 onSnapshot(q,(snap)=>{
  const grid = $("profileReelsGrid");
  if(!grid) return;
  grid.innerHTML = "";
  if(snap.empty) return;
  snap.forEach((docSnap)=>{
   const d = docSnap.data();
   const div = document.createElement("div");
   div.style.cssText = "aspect-ratio:9/16;background:#111;overflow:hidden;cursor
