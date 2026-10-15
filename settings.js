import { auth, db } from "./firebase.js";
import { collection, doc, onSnapshot, getDoc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let stopSettings = null;
let state = { darkMode: false, notificationsPaused: false };
let view = "menu";
const box = () => document.getElementById("sideMenu");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function styles() {
 if (document.getElementById("ip-settings-style")) return;
 const s=document.createElement("style"); s.id="ip-settings-style";
 s.textContent=`
 #sideMenu.ip-settings{z-index:100010;max-height:90dvh;overflow:auto;box-sizing:border-box}
 #sideMenu .ip-list{display:grid;gap:8px;padding:12px}
 #sideMenu .ip-row{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:13px 12px;border:0;border-radius:13px;background:rgba(127,127,127,.1);color:inherit;font:inherit;cursor:pointer}
 #sideMenu .ip-ico{font-size:21px;width:28px;text-align:center}
 #sideMenu .ip-label{flex:1;font-weight:600}
 #sideMenu .ip-sub{display:block;font-size:12px;opacity:.68;font-weight:400;margin-top:3px}
 #sideMenu .ip-back{padding:8px;border:0;background:transparent;color:inherit}
 #sideMenu .ip-content{padding:12px;max-height:65dvh;overflow:auto}
 #sideMenu .ip-content img,#sideMenu .ip-content video{width:100%;max-height:250px;object-fit:cover;border-radius:12px}
 #sideMenu .ip-switch{width:42px;height:24px;border-radius:20px;background:#888;position:relative;flex-shrink:0}
 #sideMenu .ip-switch:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:white;transition:transform .18s}
 #sideMenu .ip-switch.on{background:#0095f6} #sideMenu .ip-switch.on:after{transform:translateX(18px)}
 body.ip-dark{background:#101114!important;color:#f5f5f5!important}
 body.ip-dark .page,body.ip-dark .storyGlass{color:#f5f5f5}
 `; document.head.appendChild(s);
}
function closeMenu(){const m=box();m?.classList.remove("show");const o=document.getElementById("sideOverlay");if(o){o.classList.remove("show");o.style.display="none";}}
function apply(){document.body.classList.toggle("ip-dark",!!state.darkMode);}
async function save(key,value){
 const u=auth.currentUser;if(!u||u.isAnonymous){alert("Pehle login karein.");return false;}
 try{await setDoc(doc(db,"users",u.uid,"settings","app"),{[key]:value,updatedAt:new Date()},{merge:true});return true;}
 catch(e){console.error("Settings save failed:",e);alert("Setting save nahi hui. Internet aur Firestore Rules check karein.");return false;}
}
function head(title,back=true){return '<div class="sideHead"><b>'+esc(title)+'</b><button id="ipClose">✕</button></div>'+(back?'<button class="ip-back" data-action="back">‹ Back</button>':"");}
function row(icon,label,action,sub=""){return '<button class="ip-row" data-action="'+action+'"><span class="ip-ico">'+icon+'</span><span class="ip-label">'+esc(label)+(sub?'<span class="ip-sub">'+esc(sub)+'</span>':"")+'</span><span>›</span></button>';}
function toggle(icon,label,key,sub){return '<button class="ip-row" data-toggle="'+key+'"><span class="ip-ico">'+icon+'</span><span class="ip-label">'+esc(label)+'<span class="ip-sub">'+esc(sub)+'</span></span><span class="ip-switch '+(state[key]?"on":"")+'"></span></button>';}
function bind(){
 const m=box();m?.querySelector("#ipClose")?.addEventListener("click",closeMenu);
 m?.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>action(b.dataset.action)));
 m?.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",async()=>{const k=b.dataset.toggle;const previous=!!state[k];const next=!previous;state[k]=next;if(k==="darkMode")apply();renderSettings();const saved=await save(k,next);if(!saved){state[k]=previous;if(k==="darkMode")apply();if(view==="settings")renderSettings();}}));
}
function renderMenu(){
 view="menu";const m=box();if(!m)return;
 m.innerHTML=head("Menu",false)+'<div class="ip-list">'+row("⚙️","Settings and privacy","settings","Account and preferences")+row("🔖","Saved","saved","Bookmarked posts")+row("🕒","Your activity","activity","Your posts")+row("🔔","Notifications","notifications","Notification preference")+row("🌙","Dark mode","dark",state.darkMode?"On":"Off")+row("❓","Help","help","Support information")+row("🚪","Log out","logout","Sign out")+'</div>';bind();
}
function renderSettings(){
 view="settings";const m=box();if(!m)return;
 m.innerHTML=head("Settings and privacy")+'<div class="ip-list"><p style="font-size:13px;opacity:.75;padding:8px">Preferences sync to Firebase in real time.</p>'+toggle("🌙","Dark mode","darkMode","Change app appearance")+toggle("🔔","Pause notifications","notificationsPaused","Save your notification preference")+row("👤","Account and login","account","Current account details")+row("🛡️","Privacy information","privacy","Limits of these settings")+'</div>';bind();
}
async function action(a){
 const m=box();if(!m)return;
 if(a==="back")return renderMenu();
 if(a==="settings")return renderSettings();
 if(a==="dark"){state.darkMode=!state.darkMode;apply();renderMenu();return save("darkMode",state.darkMode);}
 if(a==="notifications")return renderSettings();
 if(a==="account"){const u=auth.currentUser;m.innerHTML=head("Account and login")+'<div class="ip-content"><b>'+esc(u?.displayName||"InstaPro User")+'</b><p>'+esc(u?.email||"Email unavailable")+'</p><small>UID: '+esc(u?.uid||"Not signed in")+'</small></div>';bind();return;}
 if(a==="privacy"){m.innerHTML=head("Privacy information")+'<div class="ip-content">Settings switches save preferences in Firebase. Account privacy, blocking and content-access restrictions must also be enforced in app queries and Firestore Security Rules; this menu alone does not secure private content.</div>';bind();return;}
 if(a==="help"){m.innerHTML=head("Help")+'<div class="ip-content"><h3>InstaPro Help</h3><p>For help, note the error message and send it with a screenshot to the app developer.</p></div>';bind();return;}
 if(a==="logout"){if(!confirm("Kya aap logout karna chahte hain?"))return;try{await signOut(auth);location.href="login.html";}catch(e){alert("Logout fail: "+e.message);}return;}
 if(a==="saved"||a==="activity")return postsPage(a);
}
async function postsPage(mode){
 const m=box(),u=auth.currentUser;if(!m||!u||u.isAnonymous){alert("Pehle login karein.");return;}
 m.innerHTML=head(mode==="saved"?"Saved posts":"Your activity")+'<div class="ip-content">Loading…</div>';bind();const content=m.querySelector(".ip-content");
 try{
  let posts=[];
  if(mode==="saved"){
   const snap=await getDocs(collection(db,"savedPosts",u.uid,"posts"));
   for(const d of snap.docs){const p=await getDoc(doc(db,"posts",d.id));if(p.exists())posts.push({id:p.id,...p.data()});}
  }else{
   const snap=await getDocs(collection(db,"posts"));
   posts=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>(p.uid||p.userId||p.authorId)===u.uid);
   posts.sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt));
  }
  if(!content.isConnected)return;
  if(!posts.length){content.textContent=mode==="saved"?"No saved posts yet.":"Your posts will appear here.";return;}
  content.innerHTML=posts.map(p=>{const url=p.mediaUrl||p.imageUrl||p.url||p.videoUrl||"";const vid=/video/i.test(String(p.type||p.mediaType||p.contentType||""))||/\.(mp4|webm|mov)(\?|$)/i.test(url);return '<article style="padding:10px 0;border-bottom:1px solid #8884"><p>'+esc(p.caption||(mode==="saved"?"Saved post":"Your post"))+'</p>'+(url?(vid?'<video controls playsinline src="'+esc(url)+'"></video>':'<img src="'+esc(url)+'" alt="Post">'):"")+'</article>';}).join("");
 }catch(e){console.error(e);if(content.isConnected)content.textContent="Data load nahi hua. Firestore Rules/permissions check karein.";}
}
function stamp(v){return v?.toMillis?v.toMillis():typeof v==="number"?v:0;}
export function initSettingsMenu(){
 const m=box();if(!m)return;styles();m.classList.add("ip-settings");
 const u=auth.currentUser;
 if(!u||u.isAnonymous){renderMenu();return;}
 if(stopSettings)stopSettings();
 stopSettings=onSnapshot(doc(db,"users",u.uid,"settings","app"),snap=>{state={darkMode:false,notificationsPaused:false,...(snap.exists()?snap.data():{})};apply();if(m.classList.contains("show")){if(view==="settings")renderSettings();else renderMenu();}},e=>console.error("Settings listener error:",e));
 renderMenu();
}
