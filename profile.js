// profile.js - FINAL - NO UNDEFINED - REAL USER
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadProfile(user){
  // Name fix - undefined hatao
  let name = user.displayName || user.email?.split("@")[0] || "User";
  let photo = user.photoURL || `https://i.pravatar.cc/150?img=12`;
  let email = user.email || "";

  // UI me bharo - profilePage ke andar search karo
  const nameEls = document.querySelectorAll("#profilePage b, #profilePage h2, #profileName");
  nameEls.forEach(el=>{
    if(el.textContent.includes("undefined") || el.textContent.includes("Your Profile")){
      el.textContent = name;
      el.id = "profileName";
    }
  });

  // Avatar
  const av1 = document.getElementById("myAvatar");
  const av2 = document.getElementById("myAvatarLarge");
  if(av1) av1.src = photo;
  if(av2) av2.src = photo;

  // Bio fix
  const bioEl = document.querySelector("#profilePage p");
  if(bioEl && bioEl.textContent.includes("No bio")){
    bioEl.textContent = email;
  }

  // Posts count - Real Firestore
  try{
    const q = query(collection(db,"posts"), where("uid","==",user.uid));
    const snap = await getDocs(q);
    const count = snap.size;

    // 0 posts • 0 followers • 0 following - update
    const countEl = document.querySelector("#profilePage p:nth-of-type(2), #profileCounts");
    let countDiv = document.getElementById("profileCounts");
    if(!countDiv){
      countDiv = document.createElement("p");
      countDiv.id = "profileCounts";
      countDiv.style.cssText = "opacity:.6; font-size:13px; margin-top:6px";
      const parent = document.getElementById("profileName")?.parentElement || document.querySelector("#profilePage div");
      if(parent) parent.appendChild(countDiv);
    }
    if(countDiv) countDiv.textContent = `${count} posts • 0 followers • 0 following`;

    // My posts grid
    const myPosts = document.getElementById("myPosts");
    if(myPosts){
      myPosts.innerHTML = "";
      if(count===0){
        myPosts.innerHTML = `<div style="grid-column:1/-1; text-align:center; opacity:.5; padding:20px">📸 No posts yet</div>`;
      } else {
        snap.forEach(d=>{
          const data=d.data();
          const div=document.createElement("div");
          div.style.cssText="aspect-ratio:1; background:rgba(255,255,255,.1); border-radius:4px; overflow:hidden";
          div.innerHTML=`<img src="${data.imageUrl||data.img||''}" style="width:100%; height:100%; object-fit:cover">`;
          myPosts.appendChild(div);
        });
      }
    }
    console.log("✅ Profile Loaded:", name, count+" posts");
  }catch(e){
    console.log("Profile error:", e.message);
  }
}

// Auth suno
onAuthStateChanged(auth, (user)=>{
  if(user) loadProfile(user);
  else {
    // Login nahi hai to login page
    const el=document.getElementById("profileName");
    if(el) el.textContent="Please Login";
  }
});

// Extra - Profile page khulne par reload
document.addEventListener("click",(e)=>{
  if(e.target.closest('[data-v="profile"]')){
    setTimeout(()=>{
      const u=auth.currentUser;
      if(u) loadProfile(u);
    },500);
  }
});
