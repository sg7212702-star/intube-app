// upload.js - INSTAGRAM UPLOAD - PHOTO + VIDEO - WORKING - NO BILLING
import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = id=>document.getElementById(id);
let selectedType = "post"; // post or story

// Sheet buttons
$("optPost")?.addEventListener("click", ()=>{
  selectedType = "post";
  $("postFile").setAttribute("accept","image/*,video/*");
  $("postFile").click();
});

$("optStory")?.addEventListener("click", ()=>{
  selectedType = "story";
  $("storyFile").setAttribute("accept","image/*,video/*");
  $("storyFile").click();
});

// Compress Image/Video to Base64 - No Storage Billing
function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = e=>{
      // Compress if image > 1MB
      if(file.type.startsWith("image/") && e.target.result.length > 900000){
        const img = new Image();
        img.onload = ()=>{
          const canvas = document.createElement("canvas");
          const max = 1080;
          let w=img.width, h=img.height;
          if(w>max || h>max){
            if(w>h){ h*=max/w; w=max; } else { w*=max/h; h=max; }
          }
          canvas.width=w; canvas.height=h;
          canvas.getContext("2d").drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL("image/jpeg",0.7));
        };
        img.src = e.target.result;
      } else {
        resolve(e.target.result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload Handler
async function handleFile(file, type){
  if(!file) return;
  const user = auth.currentUser;
  if(!user) return alert("Login karo pehle!");

  // Loading
  const loading = document.createElement("div");
  loading.style.cssText="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.9); padding:20px 30px; border-radius:14px; z-index:999999; border:1px solid rgba(255,255,255,.1);";
  loading.innerHTML=`⏳ Uploading ${type}...<br><small style="opacity:.6">${file.name}</small>`;
  document.body.appendChild(loading);

  try{
    const base64 = await fileToBase64(file);
    const isVideo = file.type.startsWith("video/");

    if(type==="story"){
      // Story - 24hr
      await addDoc(collection(db,"stories"),{
        uid: user.uid,
        email: user.email,
        username: user.displayName || user.email.split("@")[0],
        photo: user.photoURL || "",
        imageUrl: base64,
        type: isVideo? "video" : "image",
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + 24*60*60*1000
      });
      alert("✅ Story Upload Ho Gaya! 24hr tak dikhega");
    } else {
      // Post -
