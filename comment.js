import { db } from "./firebase.js";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
window.openComment = async (postId)=>{
  const text=prompt("Comment likho:");
  if(!text) return;
  await addDoc(collection(db,"posts",postId,"comments"), { text, createdAt: serverTimestamp() });
  await updateDoc(doc(db,"posts",postId), { comments: increment(1), score: increment(3) }); // Comment = +3 Score
};
window.doShare = async (id)=>{
  await updateDoc(doc(db,"posts",id), { shares: increment(1), score: increment(4) });
  alert("Shared! Score +4");
};
