// feed.js - ONLY FEED
import { db } from "./firebase-config.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { toggleLike, postComment, bindLikeSystem, bindCommentCount } from "./notifications.js";

const myId = localStorage.getItem('my_user_id');
const feedContainer = document.getElementById('feedContainer');

function loadFeed(){
  const q = query(collection(db, "posts"), orderBy("time","desc"));
  
  onSnapshot(q, snap=>{
    feedContainer.innerHTML="";
    snap.forEach(d=>{
      const post = d.data();
      const postId = d.id;
      const ownerId = post.userId || post.user;

      const html = `
      <div style="border-bottom:1px solid #222;padding:12px 0">
        <!-- User -->
        <div style="display:flex;gap:10px;align-items:center;padding:8px">
          <div style="width:32px;height:32px;background:#333;border-radius:50%"></div>
          <b>${post.userName || ownerId.slice(0,8)}</b>
        </div>
        <!-- Image -->
        <img src="${post.imageUrl}" style="width:100%;aspect-ratio:1;object-fit:cover;background:#111">
        <!-- Buttons -->
        <div style="display:flex;gap:16px;padding:10px;font-size:22px">
          <span id="likeBtn_${postId}" onclick="toggleLike('${postId}','${ownerId}')" style="cursor:pointer">🤍</span>
          <span onclick="document.getElementById('cmtInput_${postId}').focus()" style="cursor:pointer">💬</span>
        </div>
        <!-- Counts -->
        <div style="padding:0 10px;font-size:14px;font-weight:600">
          <span id="likeCount_${postId}">0</span> likes • <span id="commentCount_${postId}">0</span> comments
        </div>
        <div style="padding:4px 10px;font-size:14px"><b>${post.userName||''}</b> ${post.caption||''}</div>
        <!-- Comment Input -->
        <div style="display:flex;gap:8px;padding:10px">
          <input id="cmtInput_${postId}" placeholder="Add a comment..." style="flex:1;background:#111;border:1px solid #222;padding:8px 12px;border-radius:20px;color:#fff;outline:none">
          <button onclick="handleComment('${postId}','${ownerId}')" style="background:none;border:none;color:#0095f6;font-weight:600;cursor:pointer">Post</button>
        </div>
      </div>`;

      feedContainer.insertAdjacentHTML('beforeend', html);
      
      // Live counts bind - IMPORTANT
      bindLikeSystem(postId);
      bindCommentCount(postId);
    });
  });
}

window.handleComment = async(postId, ownerId)=>{
  const input = document.getElementById(`cmtInput_${postId}`);
  const text = input.value.trim();
  if(!text) return;
  input.value="";
  await postComment(postId, ownerId, text);
};

window.toggleLike = toggleLike; // notifications.js वाला

// Start
loadFeed();
