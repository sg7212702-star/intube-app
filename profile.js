import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { bindFollowerSystem } from "./notifications.js";

const myId = localStorage.getItem('my_user_id');
if(!myId) location.href="login.html";

const pPic = document.getElementById('pPic');
const pName = document.getElementById('pName');
const pBio = document.getElementById('pBio');

async function loadProfile(){
  const snap = await getDoc(doc(db,"users",myId));
  if(snap.exists()){
    const u = snap.data();
    if(pName) pName.innerText = u.userName || u.name || "New User";
    if(pBio) pBio.innerText = u.bio || "Welcome to InstaPro ✨";
    if(pPic && u.userPic) pPic.src = u.userPic;
  }
  // posts count
  const q = query(collection(db,"posts"), where("userId","==",myId));
  onSnapshot(q, s=>{
    document.getElementById('postCount') && (document.getElementById('postCount').innerText = s.size);
    const grid = document.getElementById('postGrid');
    if(grid){ grid.innerHTML=""; s.forEach(d=>{ grid.innerHTML+=`<img src="${d.data().mediaUrl}" style="width:100%;aspect-ratio:1;object-fit:cover">` }) }
  });
}
loadProfile();
bindFollowerSystem(myId, "followerCount", "followingCount");

// Edit Profile - Insta Sheet
window.openEdit = () => document.getElementById('editSheet').style.display="flex";
window.closeEdit = () => document.getElementById('editSheet').style.display="none";

window.saveProfile = async () => {
  const name = document.getElementById('eName').value;
  const bio = document.getElementById('eBio').value;
  const pic = document.getElementById('ePic').value;
  await setDoc(doc(db,"users",myId), {userName:name, bio, userPic:pic}, {merge:true});
  localStorage.setItem('my_name', name);
  closeEdit(); loadProfile();
  alert("Profile Updated ✅");
}

// Share Profile - Instagram jaisa
window.shareProfile = async () => {
  const url = `https://sg7212.github.io/?uid=${myId}`;
  try{
    if(navigator.share){
      await navigator.share({title:"InstaPro Profile", text:`Follow me on InstaPro - ${localStorage.getItem('my_name')}`, url});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link Copied! 🔗\n"+url);
    }
  }catch(e){ await navigator.clipboard.writeText(url); alert("Link Copied: "+url); }
}
