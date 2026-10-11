// notifications.js - FULL SCREEN GLASS - FEED KE UPAR NAHI
export function openNotif(){
  let page = document.getElementById("notifFullPage");
  if(!page){
    page = document.createElement("div");
    page.id = "notifFullPage";
    page.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(10,10,12,0.92);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px);z-index:9999;display:flex;flex-direction:column">
        <div style="height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.12)">
          <div style="display:flex;align-items:center;gap:12px">
            <div id="closeNotifFull" style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(15px);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;cursor:pointer">←</div>
            <b style="font-size:18px">Notifications</b>
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px">
          <div style="text-align:center;padding:60px 20px;opacity:.7">
            <div style="font-size:48px">🔔</div>
            <h3 style="margin:12px 0 6px">No notifications yet</h3>
            <p style="font-size:13px;opacity:.6">Real time - Jab koi aapko like karega, follow karega,<br>yahan dikhega. Abhi sab 0 se start hai!</p>
          </div>
          <div id="realNotifList"></div>
        </div>
      </div>
    `;
    document.body.appendChild(page);
    document.getElementById("closeNotifFull").onclick = () => {
      page.style.display = "none";
      document.body.style.overflow = "auto";
    };
  }
  page.style.display = "block";
  document.body.style.overflow = "hidden";
}

// Purana chhota box hata do agar hai
const oldBox = document.getElementById("notifBox");
if(oldBox) oldBox.remove();
