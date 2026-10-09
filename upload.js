import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Auto User ID banayega, error kabhi nahi dega
function getMyId(){
  let id = localStorage.getItem('my_user_id');
  if(!id){
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    localStorage.setItem('my_user_id', id);
    localStorage.setItem('my_user_name', 'User_'+id.slice(-4));
  }
  return id;
}

async function compress(file){
  return new Promise((res)=>{
    if(file.type.includes('video')){
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e=>{
      img.src = e.target.result;
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if(w>800){ h = h*800/w; w = 800; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        res(canvas.toDataURL('image/jpeg',0.6));
      };
    };
    reader.readAsDataURL(file);
  });
}

const fileInput = document.getElementById('fileInput');

if(fileInput){
 fileInput.addEventListener('change', async e=>{
  let f = e.target.files[0]; if(!f) return;

  const myId = getMyId(); // Yahi fix hai - ID khud banayega
  const myName = localStorage.getItem('my_user_name') || 'User';

  let url = await compress(f);
  try{
   await addDoc(collection(db,"posts"),{
     url: url,
     imageUrl: url,
     type: f.type.includes('video')? 'reel':'post',
     userId: myId,
     user: myId,
     userName: myName,
     likes: [], likesCount: 0, comments: [], time: Date.now(), caption: ''
   });
   alert('Posted! ✅');
   document.getElementById('createSheet').style.display='none';
   document.getElementById('overlay').style.display='none';
  }catch(err){
   alert('Upload Error: '+err.message);
  }
  fileInput.value = '';
 });
}
