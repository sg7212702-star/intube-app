// UPLOAD.JS - FINAL (No Billing Needed)
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("upload.js fixed ✅");

const postFile = document.getElementById("postFile");

if(postFile){
  postFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try{
        await addDoc(collection(db, "posts"), {
          imageUrl: ev.target.result,
          createdAt: serverTimestamp(),
          likes: 0
        });
        alert("Post Ho Gaya ✅");
        window.closeAll && window.closeAll();
      }catch(err){
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  });
}
