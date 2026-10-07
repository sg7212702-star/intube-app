import { db, auth } from "./firebase-config.js";

import {
collection,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const uploadBtn = document.getElementById("uploadBtn");

const fileInput = document.getElementById("mediaFile");
const captionInput = document.getElementById("caption");

const CLOUD = "kujnbe0a";
const PRESET = "intube_free";

if(uploadBtn){

uploadBtn.onclick = async ()=>{

const file = fileInput.files[0];

if(!file){
alert("Select file");
return;
}

try{

uploadBtn.innerText="Uploading...";

const formData = new FormData();
formData.append("file",file);
formData.append("upload_preset",PRESET);

const resourceType =
file.type.startsWith("video")
? "video"
: "image";

const res = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`,
{
method:"POST",
body:formData
}
);

const data = await res.json();

await addDoc(
collection(db,"posts"),
{
url:data.secure_url,
type:resourceType,
caption:captionInput.value || "",
userId:auth.currentUser?.uid || "",
userName:auth.currentUser?.displayName || "INTUBE User",
userPhoto:auth.currentUser?.photoURL || "",
createdAt:serverTimestamp()
}
);

captionInput.value="";
fileInput.value="";

alert("Post Uploaded");

}catch(err){

alert(err.message);

}

uploadBtn.innerText="Upload";

};

  }
