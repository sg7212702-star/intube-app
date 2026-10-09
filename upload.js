import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const fileInput = document.getElementById('fileInput') || document.getElementById('mediaInput') || document.querySelector('input[type="file"]');
const captionInput = document.getElementById('captionInput') || document.getElementById('caption');
const postBtn = document.getElementById('postBtn') || document.getElementById('uploadBtn') || document.querySelector('#newPostModal button') || document.querySelector('button.bg-gradient-to-r');
const previewImg = document.getElementById('preview') || document.getElementById('previewImg');

let selectedFileBase64 = null;
let selectedType = 'post';

if(fileInput){
  fileInput.addEventListener('change', (e)=>{
    let file = e.target.files[0];
    if(!file) return;
    selectedType = file.type.startsWith('video')? 'reel' : 'post';
    let reader = new FileReader();
    reader.onload = (ev)=>{
      selectedFileBase64 = ev.target.result;
      if(previewImg){
        if(selectedType==='reel'){
          previewImg.outerHTML = `<video id="preview" src="${selectedFileBase64}" controls style="width:100%; border-radius:12px; margin-top:10px"></video>`;
        } else {
          previewImg.src = selectedFileBase64;
          previewImg.style.display = 'block';
        }
      }
      if(postBtn) postBtn.textContent = 'Post Now';
    };
    reader.readAsDataURL(file);
  });
}

async function doUpload(){
  if(!selectedFileBase64){
    alert('Pehle photo/video select karo');
    return;
  }
  let myId = localStorage.getItem('my_user_id');
  let myName = localStorage.getItem('my_user_name') || 'User';

  if(postBtn){
    postBtn.disabled = true;
    postBtn.textContent = 'Uploading...';
  }

  try{
    await addDoc(collection(db,"posts"), {
      url: selectedFileBase64,
      type: selectedType,
      userId: myId,
      userName: myName,
      caption: captionInput? captionInput.value : '',
      time: Date.now(),
      likes: [],
      likesCount: 0,
      comments: []
    });
    alert('Posted! ✅');
    selectedFileBase64 = null;
    if(fileInput) fileInput.value = '';
    if(captionInput) captionInput.value = '';
    if(previewImg) previewImg.style.display = 'none';
    // modal band karo agar hai
    let modal = document.getElementById('newPostModal') || document.getElementById('createModal');
    if(modal) modal.style.display = 'none';
    location.reload();
  }catch(err){
    alert('Upload fail: '+err.message);
    console.error(err);
  }finally{
    if(postBtn){
      postBtn.disabled = false;
      postBtn.textContent = 'Post';
    }
  }
}

if(postBtn){
  postBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    doUpload();
  });
}

window.doUpload = doUpload;
