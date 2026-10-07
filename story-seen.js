import { db, auth } from "./firebase-config.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.markStorySeen = async (storyId) => {

  if(!auth.currentUser) return;

  const viewRef = doc(
    db,
    "stories",
    storyId,
    "views",
    auth.currentUser.uid
  );

  await setDoc(viewRef,{
    userId:auth.currentUser.uid,
    seenAt:Date.now()
  });

};

window.isStorySeen = async (storyId) => {

  if(!auth.currentUser) return false;

  const viewRef = doc(
    db,
    "stories",
    storyId,
    "views",
    auth.currentUser.uid
  );

  const snap = await getDoc(viewRef);

  return snap.exists();

};
