import { db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let myData = JSON.parse(localStorage.getItem("insta_user") || '{"name":"You","bio":"Digital creator ✨","avatar":"https://i.pravatar.cc/100?img=12"}');

// Global banao
window.openProfile = function(){
  let sheet = document.getElementById("profileSheet");
  let overlay = document.getElementById("overlay");

  if(!sheet){
    sheet = document.createElement("div");
    sheet.id = "profileSheet";
    sheet.innerHTML = `
    <div style="width:40px;height:5px;background:rgba(255,255,255,.3);border-radius:10px;margin:10px auto"></div>
    <div style="text-align:center;padding:10px 20px 30px">
      <div style="position:relative;width:100px;height:100px;margin:0 auto">
        <img id="pAvatar" src="${myData.avatar}" style="width:100px;height:100px;border-radius:50%;border:3px solid #ff2a6d;object-fit:cover">
        <button id="editAvBtn" style="position:absolute;bottom:0;right:0;width:36px;height:36px;border-radius:50%;background:#ff2a6d;border:3px solid #1c1c1e;color:#fff;font-size:16px">✏️</button>
      </div>
      <h2 style="margin-top:14px;font-size:22px;color:#fff">${myData.name}</h2>
      <p style="color:#aaa;font-size:14px;margin-top:4px">${myData.bio}</p>

      <div style="display:flex;gap:30px;justify-content:center;margin:20px 0;color:#fff">
        <div><b>12</b><br><span style="color:#888;font-size:12px">Posts</span></div>
        <div><b>1.2k</b><br><span style="color:#888;font-size:12px">Followers</span></div>
        <div><b>180</b><br><span style="color:#888;font-size:12px">Following</span></div>
      </div>

      <input id="editName" value="${myData.name}" placeholder="Name" style="width:100%;padding:14px;border-radius:14px;border:1px solid #333;background:#2a2a2e;color:#fff;margin-top:10px;font-size:15px">
      <textarea id="editBio" placeholder="Bio" style="width:100%;padding:14px;border-radius:14px;border:1px solid #333;background:#2a2a2e;color:#fff;margin-top:12px;font-size:15px;resize:none" rows="3">${myData.bio}</textarea>

      <button id="saveProfile" style="width:100%;padding:16px;border-radius:16px;background:linear-gradient(90deg,#ff2a6d,#8a5cff);border:none;color:#fff;font-weight:700;font-size:16px;margin-top:16px">Save Profile</button>
      <button id="closeP" style="width:100%;padding:14px;border-radius:16px;background:#2a2a2e;border:none;color:#aaa;margin-top:10px;font-size:15px">Close</button>
    </div>`;
    document.body.appendChild(sheet);

    // CSS direct yahi lagao
    sheet.style.cssText = "position:fixed;bottom:-100%;left:50%;transform:translateX(-50%);width:100%;max-width:500px;max-height:85vh;overflow-y:auto;background:#1c1c1e;border-radius:28px 28px 0 0;z-index:9999;transition:.4s;border:1px solid rgba(255,255,255,.1);";

    // Events
    sheet.querySelector("#closeP").onclick = ()=> closeProfile();
    sheet.querySelector("#editAvBtn").onclick = ()=> document.getElementById("avatarInputHidden").click();
    sheet.querySelector("#saveProfile").onclick = async ()=>{
      myData.name = document.getElementById("editName").value || "You";
      myData.bio = document.getElementById("editBio").value || "Digital creator ✨";
      localStorage.setItem("insta_user", JSON.stringify(myData));
      document.getElementById("myAvatar").src = myData.avatar;
      try{ await setDoc(doc(db,"users","my_profile"), {...myData, updatedAt: serverTimestamp()}, {merge:true}); }catch(e){}
      alert("Saved ✅"); closeProfile(); location.reload();
    };
  }

  // Hidden input for avatar
  if(!document.getElementById("avatarInputHidden")){
    const inp = document.createElement("input"); inp.type="file"; inp.id="avatarInputHidden"; inp.accept="image/*"; inp.style.display="none";
    inp.onchange = (e)=>{
      const f=e.target.files[0]; if(!f) return;
      const r=new FileReader();
      r.onload=()=>{ myData.avatar=r.result; document.getElementById("pAvatar").src=r.result; document.getElementById("myAvatar").src=r.result; localStorage.setItem("insta_user",JSON.stringify(myData)); };
      r.readAsDataURL(f);
    };
    document.body.appendChild(inp);
  }

  sheet.style.bottom = "0";
  overlay.style.display = "block"; overlay.classList.add("show");
  overlay.onclick = ()=> closeProfile();
};

window.closeProfile = function(){
  const s=document.getElementById("profileSheet"); if(s) s.style.bottom="-100%";
  const o=document.getElementById("overlay"); if(o){ o.classList.remove("show"); o.style.display="none"; }
};

// Bottom profile button se open
document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll("[data-v='profile'], #myAvatar").forEach(b=>{
    b.addEventListener("click",(e)=>{ e.preventDefault(); window.openProfile(); });
  });
});

console.log("profile FIXED ✅");
