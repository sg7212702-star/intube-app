import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentFilter='none', currentRatio='original';
window.finalImageBase64=null;

window.closeEditor=()=>{ document.getElementById('instaEditor').style.display='none'; }
window.applyFilter=(f)=>{ currentFilter=f; document.getElementById('editorImage').style.filter=f; }
window.showFilters=()=>{ const r=document.getElementById('filterRow'); r.style.display = r.style.display==='flex'?'none':'flex'; }
window.changeRatio=()=>{
 const img=document.getElementById('editorImage');
 if(currentRatio==='original'){img.style.aspectRatio='1/1';img.style.objectFit='cover';currentRatio='1:1';}
 else if(currentRatio==='1:1'){img.style.aspectRatio='4/5';currentRatio='4:5';}
 else{img.style.aspectRatio='auto';img.style.objectFit='contain';currentRatio='original';}
}
window.addText=()=>{
 const t=prompt('Text likho:'); if(!t) return;
 const d=document.createElement('div');
 d.textContent=t;
 d.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:28px;font-weight:bold;text-shadow:2px 2px 4px black;';
 document.getElementById('textOverlays').appendChild(d);
}
window.addAudio=()=>alert('Audio jald ayega!');
window.addOverlay=()=>alert('Overlay jald!');
window.showEdit=()=>{
 const b=prompt('Brightness 50-200:','110');
 if(b) document.getElementById('editorImage').style.filter=currentFilter+` brightness(${b}%)`;
}

// File select -> Instagram editor kholo
const fileInput = document.getElementById('fileInput');
if(fileInput){
 fileInput.addEventListener('change', function(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
   window.finalImageBase64=ev.target.result;
   document.getElementById('editorImage').src=window.finalImageBase64;
   document.getElementById('thumbPreview').src=window.finalImageBase64;
   document.getElementById('instaEditor').style.display='flex';
   const cs=document.getElementById('createSheet');
   const ov=document.getElementById('overlay');
   if(cs) cs.style.display='none';
   if(ov) ov.style.display='none';
  };
  reader.readAsDataURL(file);
 });
}

// NEXT = DIRECT POST TO FEED - REAL TIME
window.postNow = async ()=>{
 const btn=document.querySelector('button[onclick="postNow()"]');
 if(!window.finalImageBase64){ alert('Photo select karo'); return; }
 btn.textContent='Posting...'; btn.disabled=true;

 try{
  // Canvas pe filter ke saath final image banao
  const img=document.getElementById('editorImage');
  const canvas=document.getElementById('editorCanvas');
  const ctx=canvas.getContext('2d');
  canvas.width=img.naturalWidth || 800;
  canvas.height=img.naturalHeight || 800;
  ctx.filter=img.style.filter || 'none';
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  // Text overlay bhi add karo
  document.querySelectorAll('#textOverlays div').forEach(t=>{
   ctx.font='bold 40px Arial'; ctx.fillStyle='white';
   ctx.strokeStyle='black'; ctx.lineWidth=4;
   ctx.strokeText(t.textContent, 50, 100);
   ctx.fillText(t.textContent, 50, 100);
  });

  const finalBase64 = canvas.toDataURL('image/jpeg', 0.85);

  await addDoc(collection(db,"posts"),{
   url: finalBase64,
   type: 'post',
   userId: localStorage.getItem('my_user_id') || 'user_'+Date.now(),
   userName: localStorage.getItem('my_user_name') || 'User',
   caption: '',
   time: Date.now(),
   filter: currentFilter,
   likes: [],
   likesCount: 0
  });

  document.getElementById('instaEditor').style.display='none';
  document.getElementById('textOverlays').innerHTML='';
  alert('Posted! ✅ Feed check karo');
  location.reload();

 }catch(err){
  alert('Fail: '+err.message);
  console.error(err);
  btn.textContent='Next'; btn.disabled=false;
 }
};
