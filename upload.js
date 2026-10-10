// upload.js - ONLY IMAGE - Firestore Base64 - No Storage = No Billing
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function compress(file){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement("canvas"); let w=img.width,h=img.height,M=720;
        if(w>h){ if(w>M){h*=M/w;w=M} } else { if(h>M){w*=M/h;h=M} }
        c.width=w;c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
        res(c.toDataURL("image/jpeg",0.70)); // 70% quality = billing 0
      }; img.src=e.target.result;
    }; r.readAsDataURL(file);
  });
}

$("postFile")?.addEventListener("change", async e=>{
  const f=e.target.files[0]; if(!f) return;
  if(f.type.includes("video")){ alert("Video upload band hai - Billing bachane ke liye sirf Photo allow hai!"); return; }
  const url=await compress(f);
  await addDoc(collection(db,"posts"),{url, type:"image", likes:0, createdAt:serverTimestamp()});
  alert("✅ Posted!"); location.reload();
});

$("storyFile")?.addEventListener("change", async e=>{
  const f=e.target.files[0]; if(!f) return;
  const url=await compress(f);
  await addDoc(collection(db,"stories"),{url, createdAt:serverTimestamp()});
  alert("✅ Story Added!");
});

$("optPost")?.addEventListener("click", ()=>$("postFile")?.click());
$("optStory")?.addEventListener("click", ()=>$("storyFile")?.click());
// VIDEO HATA DIYA
const optReel=$("optReel"); if(optReel) optReel.style.display="none";
