import { db, storage } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

async function doUpload(file, type){
  if(!file) return;
  // File select hote hi sheet band karo
  if(window.closeAll) window.closeAll();

  alert("Uploading start: "+file.name);
  try{
    const r = ref(storage, `${type}/${Date.now()}_${file.name}`);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    await addDoc(collection(db, type==="story"? "stories" : "posts"), {
      url: url,
      type: file.type.includes("video")? "video" : "image",
      likes:0, comments:0, score:Date.now(),
      createdAt: serverTimestamp()
    });
    alert("✅ Upload ho gaya! Feed me dekho");
    document.getElementById("postFile").value = "";
    document.getElementById("storyFile").value = "";
    document.getElementById("reelFile").value = "";
    location.reload();
  }catch(e){
    alert("Upload Fail: "+e.message);
    console.error(e);
  }
}

document.getElementById("postFile").addEventListener("change", e=>{
  console.log("post file selected", e.target.files[0]);
  doUpload(e.target.files[0], "post");
});
document.getElementById("storyFile").addEventListener("change", e=> doUpload(e.target.files[0], "story"));
document.getElementById("reelFile").addEventListener("change", e=> doUpload(e.target.files[0], "post"));
