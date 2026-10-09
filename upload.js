import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function realUpload(file, type){
  if(!file) return;
  if(file.size > 900000){ alert("Photo 900KB se kam rakho sir (Bina Billing limit)"); return; }

  const reader = new FileReader();
  reader.onload = async (e)=>{
    try{
      await addDoc(collection(db, type), {
        fileUrl: e.target.result,
        imageUrl: e.target.result,
        createdAt: serverTimestamp(),
        likes: 0,
        comments: [],
        caption: "New "+type+" 🔥",
        uid: "user_7212"
      });
      alert(type+" Real-Time Upload Ho Gaya ✅");
      window.closeAll();
    }catch(err){ alert(err.message); }
  };
  reader.readAsDataURL(file);
}

window.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("postFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"posts"));
  document.getElementById("storyFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"stories"));
  document.getElementById("reelFile")?.addEventListener("change", e=>realUpload(e.target.files[0],"posts"));
});
