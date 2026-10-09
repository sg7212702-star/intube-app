import { db } from './firebase.js';
import { doc, updateDoc, increment, collection, addDoc, deleteDoc, query, where, onSnapshot, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let cur = null;
let prog = null;
let progressWidth = 0;
let isPaused = false;
let myUid = localStorage.getItem('my_user_id');
let myName = localStorage.getItem('my_name') || 'User';
let myPic = localStorage.getItem('my_pic') || '';
let replyUnsub = null;

// IG JAISA PROGRESS BAR WITH PAUSE ON HOLD
function startProgress(){
  let bar = document.getElementById('svProgress');
  if(!bar) return;
  progressWidth = 0;
  bar.style.width = '0%';
  if(prog) clearInterval(prog);

  prog = setInterval(()=>{
    if(isPaused) return;
    progressWidth += 0.6; // 5 sec me complete (~0.6 * 167)
    bar.style.width = progressWidth + '%';
    if(progressWidth >= 100){
      clearInterval(prog);
      closeStoryViewer();
    }
  }, 30);
}

// REALTIME VIEWS + LIKES LISTENER
function listenStoryStats(storyId){
  const sRef = doc(db,'stories',storyId);
  onSnapshot(sRef, (snap)=>{
    if(!snap.exists()) return;
    let data = snap.data();
    let viewEl = document.getElementById('svViewCount');
    let likeBtn = document.getElementById('svLikeBtn');
    if(viewEl) viewEl.innerText = (data.views||0) + ' views';
    if(likeBtn && data.likes!== undefined){
      // Live like count
    }
  });
}

// REALTIME REPLIES (IG jaisa live chat)
function listenReplies(storyId){
  if(replyUnsub) replyUnsub();
  const q = query(collection(db,'storyReplies'), where('storyId','==',storyId), orderBy('createdAt','asc'));
  replyUnsub = onSnapshot(q, (snap)=>{
    let box = document.getElementById('svReplies');
    if(!box) return;
    box.innerHTML = '';
    snap.forEach(d=>{
      let r = d.data();
      box.innerHTML += `<div style="color:#fff;font-size:13px;margin-bottom:6px;display:flex;gap:6px"><b>${r.userName}:</b><span>${r.text}</span></div>`;
    });
    box.scrollTop = box.scrollHeight;
  });
}

// OPEN - MAIN POWER FUNCTION
window.openStoryViewerReal = async function(s){
  cur = s;
  localStorage.setItem('seen_'+s.id,'1');

  // UI Set
  let viewer = document.getElementById('storyViewer');
  if(!viewer) return alert('story-viewer.html missing!');
  viewer.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('svPic').src = s.userPic;
  document.getElementById('svName').innerText = s.userName;
  document.getElementById('svTime').innerText = getTimeAgo(s.createdAt);

  // Media
  let img = document.getElementById('svMedia');
  let vid = document.getElementById('svVideo');
  if(s.mediaType === 'video'){
    img.style.display = 'none'; vid.style.display = 'block';
    vid.src = s.mediaUrl; vid.play().catch(()=>{});
  } else {
    vid.style.display = 'none'; img.style.display = 'block';
    img.src = s.mediaUrl;
  }

  // Delete button sirf apni story pe
  document.getElementById('svDelete').style.display = (s.userId === myUid)? 'block' : 'none';

  // View Count + Realtime
  try{ await updateDoc(doc(db,'stories',s.id),{views: increment(1)}); }catch(e){}
  listenStoryStats(s.id);
  listenReplies(s.id);

  // Like status
  let liked = localStorage.getItem('liked_'+s.id);
  document.getElementById('svLikeBtn').innerText = liked? '❤️' : '♡';
  if(liked) document.getElementById('svLikeBtn').style.color = '#ff3040';

  // Progress start
  startProgress();

  // IG jaisa hold to pause
  let mediaArea = viewer.querySelector('div:nth-child(3)');
  if(mediaArea){
    mediaArea.onmousedown = mediaArea.ontouchstart = ()=>{ isPaused = true; if(vid) vid.pause(); };
    mediaArea.onmouseup = mediaArea.ontouchend = ()=>{ isPaused = false; if(vid) vid.play(); };
  }
};

window.closeStoryViewer = function(){
  if(prog) clearInterval(prog);
  if(replyUnsub) replyUnsub();
  let viewer = document.getElementById('storyViewer');
  if(viewer) viewer.style.display = 'none';
  document.body.style.overflow = '';
  let v = document.getElementById('svVideo'); if(v){ v.pause(); v.src=''; }
  progressWidth = 0;
  cur = null;
  // Ring ko seen mark karo realtime
  let all = window.allStories || [];
  let idx = all.findIndex(x=>x.id===cur?.id);
  if(idx>=0) document.querySelectorAll('.sRing')[idx]?.classList.add('seen');
};

window.likeStory = async function(){
  if(!cur) return;
  let btn = document.getElementById('svLikeBtn');
  let liked = localStorage.getItem('liked_'+cur.id);
  if(navigator.vibrate) navigator.vibrate(20);

  if(liked){
    await updateDoc(doc(db,'stories',cur.id),{likes: increment(-1)});
    localStorage.removeItem('liked_'+cur.id);
    btn.innerText = '♡'; btn.style.color = '#fff';
  } else {
    await updateDoc(doc(db,'stories',cur.id),{likes: increment(1)});
    localStorage.setItem('liked_'+cur.id,'1');
    btn.innerText = '❤️'; btn.style.color = '#ff3040';
    btn.animate([{transform:'scale(1)'},{transform:'scale(1.4)'},{transform:'scale(1)'}],{duration:300});
  }
};

window.sendStoryReply = async function(){
  let input = document.getElementById('svReplyInput');
  let text = input.value.trim();
  if(!text ||!cur) return;
  input.value = '';
  await addDoc(collection(db,'storyReplies'),{
    storyId: cur.id,
    userId: myUid,
    userName: myName,
    userPic: myPic,
    text: text,
    createdAt: Date.now()
  });
};

window.deleteMyStory = async function(){
  if(!cur || cur.userId!== myUid) return;
  if(confirm('Delete this story?')){
    await deleteDoc(doc(db,'stories',cur.id));
    closeStoryViewer();
  }
};

window.shareStory = function(){
  if(!cur) return;
  if(navigator.share){
    navigator.share({title: cur.userName+' Story', url: cur.mediaUrl});
  } else {
    navigator.clipboard.writeText(cur.mediaUrl);
    alert('Link copied!');
  }
};

function getTimeAgo(ts){
  let diff = Date.now() - ts;
  let m = Math.floor(diff/60000);
  if(m<1) return 'now';
  if(m<60) return m+'m ago';
  let h = Math.floor(m/60);
  if(h<24) return h+'h ago';
  return Math.floor(h/24)+'d ago';
}
