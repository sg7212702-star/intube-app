import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentFilter='none', currentRatio='original', rot=0;
window.finalImageBase64=null;
const $ = id => document.getElementById(id);

// --- BUTTONS KAAM KARWANE WALA JS ---
window.closeEditor = () => {
  $('instaEditor').style.display='none';
  $('textOverlays').innerHTML='';
  $('captionPage').style.display='none';
  $('fileInput').value='';
};

window.showTab = (t) => {
  if(t==='filter'){
    $('filterRow').style.display='flex';
    $('editRow').style.display='none';
    $('tabFilter').style.borderBottom='2.5px solid white';
    $('tabFilter').style.color='white';
    $('tabEdit').style.borderBottom='none';
    $('tabEdit').style.color='rgba(255,255,255,0.5)';
  } else {
    $('filterRow').style.display='none';
    $('editRow').style.display='flex';
    $('editRow').style.flexWrap='wrap';
    $('tabEdit').style.borderBottom='2.5px solid white';
    $('tabEdit').style.color='white';
    $('tabFilter').style.borderBottom='none';
    $('tabFilter').style.color='rgba(255,255,255,0.5)';
  }
};

window.applyFilter = (f, el) => {
  currentFilter = f;
  updateEdit();
  document.querySelectorAll('.fbox').forEach(b=> b.style.border='1px solid rgba(255,255,255,0.2)');
  if(el){ let b=el.querySelector('.fbox'); if(b) b.style.border='2.5px solid white'; }
};

window.updateEdit = () => {
  let br = $('brightRange')? $('brightRange').value : 100;
  let ct = $('contrastRange')? $('contrastRange').value : 100;
  let st = $('saturateRange')? $('saturateRange').value : 100;
  $('editorImage').style.filter = currentFilter + ` brightness(${br}%) contrast(${ct}%) saturate(${st}%)`;
};

window.changeRatio = () => {
  let img = $('editorImage');
  if(currentRatio==='original'){ img.style.aspectRatio='1/1'; img.style.objectFit='cover'; currentRatio='1:1'; }
  else if(currentRatio==='1:1'){ img.style.aspectRatio='4/5'; currentRatio='4:5'; }
  else { img.style.aspectRatio='auto'; img.style.objectFit='contain'; currentRatio='original'; }
};

window.rotateImg = () => {
  rot = (rot+90)%360;
  $('editorImage').style.transform = `rotate(${rot}deg)`;
};

window.addText = () => {
  let t = prompt('Text likho:');
  if(!t) return;
  let d = document.createElement('div');
  d.textContent = t;
  d.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:white;font-size:30px;font-weight:900;text-shadow:0 2px 12px black;padding:8px 14px;cursor:pointer;pointer-events:auto;z-index:10;';
  d.onclick = function(){ if(confirm('Delete?')) this.remove(); };
  $('textOverlays').style.pointerEvents='auto';
  $('textOverlays').appendChild(d);
};

window.clearTexts = () => { $('textOverlays').innerHTML=''; };

window.goToCaption = () => {
  $('captionThumb').src = $('editorImage').src;
  $('captionPage').style.display='flex';
};

window.backToEdit = () => { $('captionPage').style.display='none'; };

// File select -> Editor kholo
document.addEventListener('DOMContentLoaded', ()=>{
  let fi = $('fileInput');
  if(!fi) return;
  fi.addEventListener('change', e=>{
    let f = e.target.files[0]; if(!f) return;
    let r = new FileReader();
    r.onload = ev=>{
      window.finalImageBase64 = ev.target.result;
      $('editorImage').src = window.finalImageBase64;
      $('editorImage').style.filter='none';
      $('editorImage').style.transform='rotate(0deg)';
      rot=0; currentFilter='none';
      if($('brightRange')) $('brightRange').value=100;
      if($('contrastRange')) $('contrastRange').value=100;
      if($('saturateRange')) $('saturateRange').value=100;
      $('textOverlays').innerHTML='';
      $('instaEditor').style.display='flex';
      $('captionPage').style
