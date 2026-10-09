import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentFilter = 'none';
let currentRatio = 'original';
window.finalImageBase64 = null;

window.closeEditor = function(){
  document.getElementById('instaEditor').style.display='none';
  document.getElementById('textOverlays').innerHTML='';
}
window.applyFilter = function(f){
  currentFilter = f;
  document.getElementById('editorImage').style.filter = f;
}
window.showFilters = function(){
  document.getElementById('editRow').style.display='none';
  document.getElementById('filterRow').style.display='flex';
}
window.showEdit = function(){
  document.getElementById('filterRow').style.display='none';
  document.getElementById('editRow').style.display='flex';
}
window.changeRatio = function(){
  let img = document.getElementById('editorImage');
  if(currentRatio==='original'){img.style.aspectRatio='1/1';img.style.objectFit='cover';currentRatio='1:1';}
  else if(currentRatio==='1:1'){img.style.aspectRatio='4/5';currentRatio='4:5';}
  else{img.style.aspectRatio='auto';img.style.objectFit='contain';currentRatio='original';}
}
window.addText = function(){
  let t=prompt('Text likho:'); if(!t) return;
  let d=document.createElement('div'); d.textContent=t;
  d.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:28px;font-weight:bold;text-shadow:2px 2px 4px black;';
  document.getElementById('textOverlays').appendChild(d);
}
window.doBrightness = function(){
  let b=prompt('Brightness 50-200:','115');
  if(b) document.getElementById('editorImage').style.filter = currentFilter + ' brightness('+b+'%)';
}
window.doContrast = function(){
  let c=prompt('Contrast 50-200:','120');
  if(c) document.getElementById('editorImage').style.filter = currentFilter + ' contrast('+c+'%)';
}

// SIRF SELECTED PHOTO KHULEGA - SCREENSHOT NAHI
const fileInput = document.getElementById('fileInput');
if(fileInput){
  fileInput.addEventListener('change', function(e){
    let file = e.target.files[0];
    if(!file) return;
    console.log('Selected file:', file.name, file.type);
    let reader = new FileReader();
    reader.onload = function(ev){
      window.finalImageBase64 = ev.target.result; // sirf yahi photo
      let img = document.getElementById('editorImage');
      let thumb = document.getElementById('thumbPreview');
      img.style.filter='none'; // reset
      img.src = window.finalImageBase64;
      thumb.src = window.finalImageBase64;
      document.getElementById('textOverlays').innerHTML='';
      document.getElementById('instaEditor').style.display='flex';
      document.getElementById('createSheet').style.display='none';
      document.getElementById('overlay').style.display='none';
    };
    reader.readAsDataURL(file);
  });
}

window.postNow = async function(){
  if(!window.finalImageBase64){ alert('Photo select karo'); return; }
  let btn = document.querySelectorAll('button[onclick="postNow()"]')[1] || document.querySelector('button[onclick="postNow()"]');
  btn.textContent='Posting...'; btn.disabled=true;
  try{
    let img=document.getElementById('editorImage');
    let canvas=document.getElementById('editorCanvas');
    let ctx=canvas.getContext('2d');
    canvas.width=img.naturalWidth || 1080;
    canvas.height=img.naturalHeight || 1080;
    ctx.filter=img.style.filter || 'none';
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    document.querySelectorAll('#textOverlays div').forEach(t=>{
      ctx.font='bold 50px Arial'; ctx.fillStyle='white';
      ctx.strokeStyle='black'; ctx.lineWidth=5;
      ctx.strokeText(t.textContent, 60, 120);
      ctx.fillText(t.textContent, 60, 120);
    });
    let finalBase64=canvas.toDataURL('image/jpeg',0.85);
    await addDoc(collection(db,"posts"),{
      url: finalBase64,
      type: 'post',
      userId: localStorage.getItem('my_user_id'),
      userName: localStorage.getItem('my_user_name')||'User',
      caption:'', time: Date.now(), likes:[], likesCount:0
    });
    document.getElementById('instaEditor').style.display='none';
    alert('Posted! ✅'); location.reload();
  }catch(err){ alert('Fail:'+err.message); btn.textContent='Next → Feed'; btn.disabled=false; }
}
