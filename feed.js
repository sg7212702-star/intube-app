import { db } from "./firebase-config.js";

import {
collection,
query,
orderBy,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const feed = document.getElementById("feed");

function renderPost(post){

const media = post.type==="video"
? `<video src="${post.url}" controls></video>`
: `<img src="${post.url}">`;

return `
<div class="glass post">
<div style="padding:12px">
<b>${post.userName || "INTUBE User"}</b>
</div>

${media}

<div style="padding:12px">
${post.caption || ""}
</div>
</div>
`;
}

const q = query(
collection(db,"posts"),
orderBy("createdAt","desc")
);

onSnapshot(q,(snap)=>{

let html="";

snap.forEach(doc=>{

html += renderPost({
id:doc.id,
...doc.data()
});

});

feed.innerHTML = html;

});
