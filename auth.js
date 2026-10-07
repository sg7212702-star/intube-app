import { auth, db } from "./firebase-config.js";

import {
GoogleAuthProvider,
signInWithPopup,
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
doc,
setDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginBtn = document.getElementById("googleLoginBtn");
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");

const provider = new GoogleAuthProvider();

if(loginBtn){
loginBtn.onclick = async () => {
try{
const result = await signInWithPopup(auth, provider);

await setDoc(
doc(db,"users",result.user.uid),
{
uid: result.user.uid,
name: result.user.displayName || "",
photo: result.user.photoURL || "",
email: result.user.email || "",
lastSeen: serverTimestamp()
},
{ merge:true }
);

}catch(err){
alert(err.message);
}
};
}

onAuthStateChanged(auth,(user)=>{
if(user){
if(loginScreen) loginScreen.style.display="none";
if(app) app.style.display="block";
window.currentUser=user;
}else{
if(loginScreen) loginScreen.style.display="flex";
if(app) app.style.display="none";
}
});

window.logoutINTUBE = async ()=>{
await signOut(auth);
};
