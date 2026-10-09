import { db } from './firebase.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const storyBar = document.getElementById('storyBar');
const otherStoriesDiv = document.getElementById('otherStories');
let myId = localStorage.getItem('my_user_id');
let myFollowing = JSON.parse(localStorage.getItem('my_following')||'[]');
window.allStories = [];
let unsubscribe = null;

// Instagram Algorithm Score
function getStoryScore(s){
  let score = 0;
  let now = Date.now();
  let ageHours = (now - s.createdAt) / 3600000;

  // 1. Unseen boost (Sabse important - IG ka main logic)
  let isSeen = localStorage.getItem('seen_'+s.id);
  if(!isSeen) score += 1000;

  // 2. Close Friends / Following boost
  if(myFollowing.includes(s.userId)) score += 500;

  // 3. Recency boost (Nayi story upar) - Time decay
  score += Math.max(0, 200 - (ageHours * 15));

  // 4. Engagement boost (Zyada views/likes wali upar)
  score += (s.views||0) * 0.5 + (s.likes||0) * 2;

  // 5. Your Story hamesha first
  if(s.userId === myId) score += 10000;

  return score;
}

function render(list){
  if(!storyBar) return;

  // Algorithm se sort karo
  list.sort((a,b)=> getStoryScore(b) - getStoryScore(a));
  window.allStories = list;

  const myStory = list.find(s=>s.userId===myId);
  const others = list.filter(s=>s.userId!==myId);

  // REAL IG UI
  storyBar.innerHTML = `
    <div class="sItem" id="yourStoryBtn">
      <div class="sPlusRing ${myStory?'hasStory':''}">
        ${myStory?`<img src="${myStory.userPic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:'+'}
      </div>
      <div class="sName">Your story</div>
    </div>
    ${others.map(s=>{
      let isSeen = localStorage.getItem('seen_'+s.id);
      return `
      <div class="sItem" onclick="openStoryViewer('${s.id}')">
        <div class="sRing ${isSeen?'seen':'unseen'}">
          <img src="${s.userPic}" loading="lazy">
        </div>
        <div class="sName">${s.userName.split(' ')[0].substring(0,8)}</div>
      </div>`;
    }).join('')}
  `;

  // Your story par click = upload + agar story hai to viewer
  const yBtn = document.getElementById('yourStoryBtn');
  if(yBtn) yBtn.onclick = ()=>{
    if(myStory) openStoryViewer(myStory.id);
    else document.getElementById('storyFileInput')?.click();
  };

  if(otherStoriesDiv) otherStoriesDiv.innerHTML = '';
}

// REALTIME FIREBASE LISTENER - Instagram jaisa live update
function startRealtimeListener(){
  if(unsubscribe) unsubscribe();

  // Sirf 24 ghante ki stories (expiresAt > now)
  const q = query(
    collection(db,'stories'),
    where('expiresAt','>', Date.now()),
    orderBy('expiresAt','desc')
  );

  unsubscribe = onSnapshot(q, (snap)=>{
    let list = [];
    snap.docChanges().forEach(change=>{
      let data = {id: change.doc.id,...change.doc.data()};
      // Realtime animation ke liye
      if(change.type === 'added'){
        console.log('🔥 New story live:', data.userName);
      }
      list.push(data);
    });

    // Agar docChanges khali hai to full list lo
    if(list.length === 0){
      list = snap.docs.map(d=>({id:d.id,...d.data()}));
    }

    // Duplicate user ki stories ko group karo (ek user ki multiple stories)
    let grouped = {};
    list.forEach(s=>{
      if(!grouped[s.userId]) grouped[s.userId] = s;
      else {
        // Agar same user ki nayi story hai to latest rakho
        if(s.createdAt > grouped[s.userId].createdAt) grouped[s.userId] = s;
      }
    });

    let finalList = Object.values(grouped);
    render(finalList);
  }, (err)=>{
    console.error('Story realtime error:', err);
  });
}

// Viewer opener
window.openStoryViewer = (id)=>{
  const s = window.allStories.find(x=>x.id===id);
  if(s && window.openStoryViewerReal){
    // Haptic feedback (IG jaisa)
    if(navigator.vibrate) navigator.vibrate(10);
    window.openStoryViewerReal(s);
  }
};

// Start
startRealtimeListener();

// Har 1 min me expiry check (purani stories auto hide)
setInterval(()=>{
  window.allStories = window.allStories.filter(s=> s.expiresAt > Date.now());
  render(window.allStories);
}, 60000);

// Following list realtime update karo (close friends algorithm ke liye)
async function loadFollowing(){
  if(!myId) return;
  try{
    let snap = await getDoc(doc(db,'users',myId));
    if(snap.exists()){
      let data = snap.data();
      myFollowing = data.following || [];
      localStorage.setItem('my_following', JSON.stringify(myFollowing));
    }
  }catch(e){}
}
loadFollowing();
