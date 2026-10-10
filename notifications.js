// notifications.js - REAL GLASS
export function openNotif(){
  let box=document.getElementById("notifBox");
  if(!box){
    box=document.createElement("div"); box.id="notifBox";
    box.innerHTML=`<div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.25)"><b>Notifications</b><span id="closeNotifBox" style="cursor:pointer">✕</span></div><div style="padding:20px;text-align:center;opacity:.7">🔔<p>No notifications yet</p><p style="font-size:12px">Real time - Jab koi like karega yahan ayega</p></div>`;
    box.style.cssText="position:fixed;top:70px;right:12px;width:330px;max-height:65vh;background:rgba(255,255,255,0.15);backdrop-filter:blur(25px) saturate(180%);-webkit-backdrop-filter:blur(25px);border:1px solid rgba(255,255,255,0.35);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.25);z-index:9999;transform:translateX(120%);transition:.35s;overflow:hidden";
    document.body.appendChild(box);
    box.querySelector("#closeNotifBox").onclick=()=>{ box.style.transform="translateX(120%)"; document.getElementById("notifOverlay").style.display="none"; };
  }
  box.style.transform="translateX(0)";
  let ov=document.getElementById("notifOverlay");
  if(!ov){ ov=document.createElement("div"); ov.id="notifOverlay"; ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.15);z-index:9998;display:none"; document.body.appendChild(ov); ov.onclick=()=>{ box.style.transform="translateX(120%)"; ov.style.display="none"; }; }
  ov.style.display="block";
}
