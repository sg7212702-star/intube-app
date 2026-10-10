// profile.js - InstaPro Complete Profile System
import { db, auth } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const avatarBtn = document.getElementById("myAvatar");
const avatarInput = document.createElement("input");
avatarInput.type = "file"; avatarInput.accept = "image/*"; avatarInput.style.display = "none";
document.body.appendChild(avatarInput);

let myData = JSON.parse(localStorage.getItem("insta_user") || '{"name":"You","bio":"Digital creator ✨","avatar":"https://i.pravatar.cc/100?img=12"}');

// Avatar click se change
document.querySelectorAll("[data-v='profile']").forEach(b=>{
  b.addEventListener("click",()=> openProfile());
});
avatarBtn?.addEventListener("click",()=> openProfile());

if(avatarInput){
 avatarInput.addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = async ()=>{
   myData.avatar = r.result;
   localStorage.setItem("insta_user", JSON.stringify(myData));
   if(avatarBtn) avatarBtn.src = r.result;
   try{ await setDoc(doc(db,"users", "my_profile"), {...myData, updatedAt: serverTimestamp() }, {merge:true}); }catch(err){}
   alert("Profile photo updated! ✅");
   if(document.getElementById("pAvatar")) document.getElementById("pAvatar").src = r.result;
  };
  r.readAsDataURL(f);
 });
}

export function openProfile(){
 // Profile Sheet Create karo agar nahi hai
 let sheet = document.getElementById("profileSheet");
 if(!sheet){
  sheet = document.createElement("div");
  sheet.id = "profileSheet";
  sheet.className = "sheetGlass";
  sheet.style.cssText = "z-index:2000; max-height:85vh; overflow-y:auto;";
  sheet.innerHTML = `
  <div class="handle"></div>
  <div style="text-align:center; padding:10px 20px 20px">
   <div style="position:relative; width:90px; height:90px; margin:0 auto">
    <img id="pAvatar" src="${myData.avatar}" style="width:90px;height:90px;border-radius:50%;border:3px solid #ff2a6d;object-fit:cover">
    <button id="editAvBtn" style="position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:#ff2a6d;border:2px solid #000;color:#fff">✏️</button>
   </div>
   <h2 id="pName" style="margin-top:12px">${myData.name}</h2>
   <p id="pBio" style="color:#aaa; font-size:14px; margin-top:4px">${myData.bio}</p>
   <div style="display:flex; gap:20px; justify-content:center; margin:16px 0">
    <div><b>12</b><br><span style="color:#888;font-size:12px">Posts</span></div>
    <div><b>1.2k</b><br><span style="color:#888;font-size:12px">Followers</span></div>
    <div><b>180</b><br><span style="color:#888;font-size:12px">Following</span></div>
   </div>
   <input id="editName" placeholder="Name" value="${myData.name}" style="width:100%;padding:12px;border-radius:12px;border:1px solid #333;background:#222;color:#fff;margin-top:10px">
   <textarea id="editBio" placeholder="Bio" style="width:100%;padding:12px;border-radius:12px;border:1px solid #333;background:#222;color:#fff;margin-top:10px;resize:none" rows="2">${myData.bio}</textarea>
   <button id="saveProfile" style="width:100%;padding:14px;border-radius:14px;background:linear-gradient(90deg,#ff2a6d,#8a5cff);border:none;color:#fff;font-weight:700;margin-top:12px">Save Profile</button>
   <button id="closeP" style="width:100%;padding:12px;border-radius:14px;background:#222;border:none;color:#aaa;margin-top:8px">Close</button>
  </div>`;
  document.body.appendChild(sheet);

  sheet.querySelector("#editAvBtn").onclick = ()=> avatarInput.click();
  sheet.querySelector("#closeP").onclick = ()=> { sheet.classList.remove("open"); document.getElementById("overlay").classList.remove("show"); };
  sheet.querySelector("#saveProfile").onclick = async ()=>{
   myData.name = document.getElementById("editName").value;
   myData.bio = document.getElementById("editBio").value;
   localStorage.setItem("insta_user", JSON.stringify(myData));
   document.getElementById("pName").textContent = myData.name;
   document.getElementById("pBio").textContent = myData.bio;
   try{ await setDoc(doc(db,"users", "my_profile"), {...myData, updatedAt: serverTimestamp() }, {merge:true}); }catch(e){}
   alert("Profile Saved! ✅");
  };
 }
 sheet.classList.add("open");
 document.getElementById("overlay").classList.add("show");
 document.getElementById("overlay").onclick = ()=>{ sheet.classList.remove("open"); document.getElementById("overlay").classList.remove("show"); };
}

console.log("profile.js loaded ✅");
