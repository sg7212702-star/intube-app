import { db } from "./firebase.js";
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
window.doLike = async (id)=>{
  const ref=doc(db,"posts",id);
  // Instagram Algorithm: Like = +2 Score
  await updateDoc(ref, { likes: increment(1), score: increment(2) });
};
