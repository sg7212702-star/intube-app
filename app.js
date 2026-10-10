import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

function closeAll(){
  const s=$("createSheet"); if(s){ s.classList.remove("show"); s.style.bottom="-100%"; }
  ["overlay","sheetOverlay","sideOverlay"].forEach(id=>$(id)?.classList.remove("show"));
  $("sideMenu")?.classList.remove("show");
}
function openSheet(){
  const s=$("createSheet"); if(s){ s.classList.add("show"); s.style.bottom="0"; }
  $("overlay")?.classList.add("show"); $("sheetOverlay")?.classList.add("show");
}
function openMenu(){
  $("sideMenu")?.classList.add("show"); $("sideOverlay")?.classList.add("show");
}
window.closeAll = closeAll;

// ---- BINA STORAGE KE UPLOAD - BASE64 ----
function compressImage(file){
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.onload = e=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        const MAX = 600; // 600px tak compress - Firestore limit ke liye
        let w = img.width, h = img.height;
        if(w>h){ if(w>MAX){ h*=MAX/w; w=MAX; } }
        else{ if(h>MAX){ w*=MAX/h; h=MAX; } }
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // 70% quality
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function doUpload(file, type){
  if(!file){ return; }
  closeAll();
  alert("Uploading: "+file.name+" - Compress ho raha hai...");
  try{
    // Video ke liye storage chahiye, isliye sirf photo allow
    if(file.type.includes("video")){
      alert("Video ke liye Storage billing chahiye - Abhi sirf Photo upload karo sir!");
      return;
    }
    const base64Url = await compressImage(file);
    await addDoc(collection(db, type==="story"?"stories":"posts"), {
      url: base64Url, // Base64 hi URL hai
      type: "image",
      likes:0, comments:0, score:Date.now(),
      createdAt: serverTimestamp()
    });
    alert("✅ Photo Upload Done! Billing 0!");
    location.reload();
  }catch(e){
    console.error(e);
    alert("FAIL: "+e.message);
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("menuBtn")?.addEventListener("click", openMenu);
  $("closeMenu")?.addEventListener("click", closeAll);
  $("overlay")?.addEventListener("click", closeAll);
  $("sideOverlay")?.addEventListener("click", closeAll);
  $("sheetOverlay")?.addEventListener("click", closeAll);
  $("cancelSheet")?.addEventListener("click", closeAll);
  $("notifBtn")?.addEventListener("click", ()=> alert("🔔 3 new likes!"));

  $("addBtn")?.addEventListener("click", openSheet);
  document.querySelector(".sRing.add")?.addEventListener("click", openSheet);
  document.getElementById("addStoryBtn")?.addEventListener("click", openSheet);

  $("optPost")?.addEventListener("click", ()=> $("postFile").click());
  $("optStory")?.addEventListener("click", ()=> $("storyFile").click());
  $("optReel")?.addEventListener("click", ()=> alert("Reel ke liye Storage billing chahiye - Abhi Post use karo"));

  $("postFile")?.addEventListener("change", e=>{ if(e.target.files[0]) doUpload(e.target.files[0],"post"); });
  $("storyFile")?.addEventListener("change", e=>{ if(e.target.files[0]) doUpload(e.target.files[0],"story"); });

  document.querySelectorAll(".bBtn").forEach(b=>{
    b.addEventListener("click", ()=>{
      if(b.id==="addBtn") return;
      document.querySelectorAll(".bBtn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      const v=b.dataset.v;
      if(v==="home") window.scrollTo({top:0,behavior:"smooth"});
      else alert("Coming Soon: "+v);
    });
  });

  document.querySelectorAll(".mItem").forEach(m=>{
    m.addEventListener("click", ()=>{
      if(m.textContent.includes("Dark")){ document.body.classList.toggle("dark"); }
      else alert(m.textContent+" - Coming Soon");
      closeAll();
    });
  });
});
