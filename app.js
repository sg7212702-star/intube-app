// InstaPro - FINAL APP.JS - All Buttons Working - No Storage Billing
import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
signInAnonymously(auth).catch(()=>{});

const $ = id => document.getElementById(id);

// ===== CLOSE ALL =====
function closeAll(){
  const sheet = $("createSheet");
  if(sheet){ sheet.classList.remove("show"); sheet.style.bottom="-100%"; }
  ["overlay","sheetOverlay","sideOverlay","notifOverlay"].forEach(id=>{
    const el=$(id); if(el) el.classList.remove("show");
  });
  const menu=$("sideMenu"); if(menu) menu.classList.remove("show");
  const notif=$("notifBox"); if(notif) notif.classList.remove("show");
}

// ===== OPEN FUNCTIONS =====
function openSheet(){
  const s=$("createSheet");
  if(s){ s.classList.add("show"); s.style.bottom="0"; }
  $("overlay")?.classList.add("show");
  $("sheetOverlay")?.classList.add("show");
}
function openMenu(){
  $("sideMenu")?.classList.add("show");
  $("sideOverlay")?.classList.add("show");
}
function openNotif(){
  $("notifBox")?.classList.add("show");
  $("notifOverlay")?.classList.add("show");
}

// ===== COMPRESS - BINA STORAGE KE =====
function compressImage(file){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement("canvas");
        let w=img.width, h=img.height, MAX=700;
        if(w>h){ if(w>MAX){ h*=MAX/w; w=MAX; } }
        else{ if(h>MAX){ w*=MAX/h; h=MAX; } }
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL("image/jpeg",0.75));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function doUpload(file, type){
  if(!file) return;
  closeAll();
  try{
    if(file.type.includes("video")){
      alert("Video ke liye billing chahiye - Sirf Photo upload karo");
      return;
    }
    alert("Uploading: "+file.name);
    const base64 = await compressImage(file);
    await addDoc(collection(db, type==="story"?"stories":"posts"),{
      url: base64,
      likes: 0,
      score: Date.now(),
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, "notifications"),{
      text: type==="story"? "New Story Added 📸" : "New Photo Posted ❤️",
      type: type,
      createdAt: serverTimestamp()
    });
    alert("✅ Upload Done - RealTime!");
  }catch(err){
    alert("FAIL: "+err.message);
    console.error(err);
  }
}

// ===== ALL BUTTONS - DOM READY =====
document.addEventListener("DOMContentLoaded", ()=>{

  // Top Buttons
  $("menuBtn")?.addEventListener("click", openMenu);
  $("notifBtn")?.addEventListener("click", openNotif);
  $("sendBtn")?.addEventListener("click", ()=>alert("Messages - Coming Soon!"));

  // Close Buttons
  $("closeMenu")?.addEventListener("click", closeAll);
  $("closeNotif")?.addEventListener("click", closeAll);
  $("overlay")?.addEventListener("click", closeAll);
  $("sideOverlay")?.addEventListener("click", closeAll);
  $("sheetOverlay")?.addEventListener("click", closeAll);
  $("notifOverlay")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);

  // PLUS BUTTONS - 3 Jagah
  $("addBtn")?.addEventListener("click", openSheet); // Bottom Glass +
  const storyRing = document.querySelector(".sRing.add");
  if(storyRing) storyRing.addEventListener("click", openSheet); // Your Story +
  const addStoryBtn = $("addStoryBtn");
  if(addStoryBtn) addStoryBtn.addEventListener("click", openSheet);

  // Create Sheet Options
  $("optPost")?.addEventListener("click", ()=> $("postFile")?.click());
  $("optStory")?.addEventListener("click", ()=> $("storyFile")?.click());
  $("optReel")?.addEventListener("click", ()=> alert("Reel ke liye Cloudinary free me jodna padega"));

  // File Inputs
  $("postFile")?.addEventListener("change", e=>{
    if(e.target.files[0]) doUpload(e.target.files[0], "post");
    e.target.value="";
  });
  $("storyFile")?.addEventListener("change", e=>{
    if(e.target.files[0]) doUpload(e.target.files[0], "story");
    e.target.value="";
  });

  // Bottom 5 Nav
  document.querySelectorAll(".bBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(btn.id==="addBtn") return; // Plus alag se handle ho gaya
      document.querySelectorAll(".bBtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const v=btn.dataset.v;
      if(v==="home") window.scrollTo({top:0, behavior:"smooth"});
      else if(v) alert(v + " - Coming Soon!");
    });
  });

  // Side Menu Items
  document.querySelectorAll(".mItem").forEach(item=>{
    item.addEventListener("click", ()=>{
      const txt=item.textContent || "";
      if(txt.includes("Dark")){
        document.body.classList.toggle("dark");
        localStorage.setItem("dark", document.body.classList.contains("dark"));
      }else{
        alert(txt.trim() + " - Coming Soon!");
      }
      closeAll();
    });
  });

  // Dark Mode Load
  if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");

  console.log("✅ InstaPro app.js - All Buttons Fixed!");
});
