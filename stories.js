import { db, auth } from "./firebase-config.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

let storiesData = [];
let currentStory = 0;
let timer;

const addStory = document.querySelector(".addStory");
const storyModal = document.getElementById("storyModal");
const uploadStoryBtn = document.getElementById("uploadStoryBtn");
const storyFile = document.getElementById("storyFile");

const storiesList = document.getElementById("storiesList");

const storyViewer = document.getElementById("storyViewer");
const storyImage = document.getElementById("storyImage");
const storyUserPhoto = document.getElementById("storyUserPhoto");
const storyUserName = document.getElementById("storyUserName");
const storyProgress = document.getElementById("storyProgress");

const CLOUD = "kujnbe0a";
const PRESET = "intube_free";

/* Upload Modal */

addStory?.addEventListener("click", () => {
  storyModal.hidden = false;
});

storyModal?.addEventListener("click", e => {
  if(e.target === storyModal){
    storyModal.hidden = true;
  }
});

/* Upload Story */

uploadStoryBtn?.addEventListener("click", async () => {

  const file = storyFile.files[0];

  if(!file){
    alert("Select Story");
    return;
  }

  try{

    uploadStoryBtn.innerText="Uploading...";

    const formData = new FormData();
    formData.append("file",file);
    formData.append("upload_preset",PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
      {
        method:"POST",
        body:formData
      }
    );

    const data = await res.json();

    await addDoc(collection(db,"stories"),{
      imageUrl:data.secure_url,
      userId:auth.currentUser?.uid || "",
      userName:auth.currentUser?.displayName || "INTUBE User",
      userPhoto:auth.currentUser?.photoURL || "",
      createdAt:serverTimestamp()
    });

    storyModal.hidden=true;
    storyFile.value="";

    alert("Story Uploaded");

  }catch(err){
    alert(err.message);
  }

  uploadStoryBtn.innerText="Upload Story";

});

/* Open Story */

function openStory(index){

  currentStory=index;

  const story=storiesData[index];

  if(!story)return;

  storyViewer.hidden=false;

  storyImage.src=story.imageUrl;

  storyUserPhoto.src=
    story.userPhoto ||
    "https://ui-avatars.com/api/?name=INTUBE";

  storyUserName.innerText=
    story.userName || "INTUBE User";

  cstoryUserPhoto.onclick = () => {
  alert("Profile: " + (story.userName || "INTUBE User"));
};

storyUserName.onclick = () => {
  alert("Profile: " + (story.userName || "INTUBE User"));
};

clearTimeout(timer);

  storyProgress.style.transition="none";
  storyProgress.style.width="0%";

  setTimeout(()=>{
    storyProgress.style.transition="width 5s linear";
    storyProgress.style.width="100%";
  },50);

  timer=setTimeout(()=>{

  if(currentStory < storiesData.length - 1){

    nextStory();

  }else{

    storyViewer.hidden = true;

    storyProgress.style.width = "0%";

  }

},5000);
}

/* Next Story */

function nextStory(){

  if(currentStory < storiesData.length-1){

    openStory(currentStory+1);

  }else{

    storyViewer.hidden=true;

  }

}

/* Previous Story */

function prevStory(){

  if(currentStory > 0){

    openStory(currentStory-1);

  }

}

/* Realtime Stories */

const q=query(
  collection(db,"stories"),
  orderBy("createdAt","desc")
);

onSnapshot(q,(snapshot)=>{

  storiesData=[];

  storiesList.innerHTML="";

  snapshot.forEach(doc=>{

    const story=doc.data();

    storiesData.push(story);

  });

  storiesData.forEach((story,index)=>{

    const div=document.createElement("div");

    div.className="story";

    div.innerHTML=`
      <div class="storyRing">
        <img src="${
          story.userPhoto ||
          'https://ui-avatars.com/api/?name=User'
        }">
      </div>
      <span>${story.userName || "User"}</span>
    `;

    div.onclick=()=>openStory(index);

    storiesList.appendChild(div);

  });

});

/* Left Right Tap */

storyViewer?.addEventListener("click",(e)=>{

  const half=window.innerWidth/2;

  if(e.clientX < half){

    prevStory();

  }else{

    nextStory();

  }

});
/* Close */

window.addEventListener("keydown",(e)=>{

  if(e.key==="Escape"){

    storyViewer.hidden=true;

  }

});

/* Close on swipe down */

let startY = 0;

storyViewer?.addEventListener("touchstart",(e)=>{
  startY = e.touches[0].clientY;
});

storyViewer?.addEventListener("touchend",(e)=>{

  const endY = e.changedTouches[0].clientY;

  if(endY - startY > 120){

    storyViewer.hidden = true;

    clearTimeout(timer);

    storyProgress.style.width = "0%";

    }

});

});
  
