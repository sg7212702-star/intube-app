import { db, auth } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.registerUser = async ()=>{
  const name=regName.value, email=regEmail.value, pass=regPass.value;
  if(!name||!email||!pass) return alert("Sab bharo!");
  const cred=await createUserWithEmailAndPassword(auth,email,pass);
  await setDoc(doc(db,"users",cred.user.uid),{name,email,bio:"",avatar:"",posts:0,followers:0,following:0,createdAt:serverTimestamp()});
  alert("✅ Account Created - 0 se start!"); location.href="index.html";
}
window.loginUser = async ()=>{
  await signInWithEmailAndPassword(auth,logEmail.value,logPass.value); location.href="index.html";
}
onAuthStateChanged(auth,(user)=>{
  const isLoginPage = location.href.includes("login.html");
  if(!user &&!isLoginPage) location.href="login.html";
  if(user && isLoginPage) location.href="index.html";
});
