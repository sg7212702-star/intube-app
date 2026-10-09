import { db } from "./firebase.js";
import { collection, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const feed=document.getElementById("feed");
onSnapshot(query(collection(db,"posts"), orderBy("score","desc")), snap=>{
  feed.innerHTML="";
  snap.forEach(d=>{
    const p=d.data();
    const el=document.createElement("div"); el.className="post";
    el.innerHTML=`<div class="postTop"><img src="https://i.pravatar.cc/100?u=${p.uid}"><b>${p.uid.slice(0,6)}</b><button class="more">⋯</button></div>
    ${p.type==="video"?`<video src="${p.url}" controls playsinline class="postImg"></video>`:`<img src="${p.url}" class="postImg" loading="lazy">`}
    <div class="postActions">
      <button class="like" onclick="doLike('${d.id}')"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
      <button onclick="openComment('${d.id}')">💬</button>
      <button onclick="doShare('${d.id}')">✈️</button>
      <button class="save" style="margin-left:auto">🔖</button>
    </div>
    <div class="postInfo"><b id="lc-${d.id}">${p.likes||0} likes</b> • <span id="cc-${d.id}">${p.comments||0} comments</span></div>`;
    feed.appendChild(el);
  });
});
