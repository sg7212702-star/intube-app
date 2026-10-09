import { db, storage, currentUid } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
async function realUpload(file, type){
 if(!file) return;
 const r=ref(storage, `${type}/${Date.now()}_${file.name}`);
 await uploadBytes(r,file); const url=await getDownloadURL(r);
 await addDoc(collection(db, type==="story"?"stories":"posts"), {
   url, type: file.type.startsWith("video")?"video":"image",
   uid: currentUid, likes:0, comments:0, shares:0,
   score: Date.now(), // Algorithm start score = time
   createdAt: serverTimestamp()
 });
 alert("Real-Time Upload Done ✅");
}
document.getElementById("postFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"post"));
document.getElementById("storyFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"story"));
document.getElementById("reelFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"post"));
