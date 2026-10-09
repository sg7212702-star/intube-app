// menu.js - ULTIMATE AUTO-FIND FIX
(function(){
function init(){
  document.getElementById('menuStyle')?.remove();
  document.getElementById('mOverlay')?.remove();
  document.getElementById('mSheet')?.remove();
  document.getElementById('subPage')?.remove();

  let css=document.createElement('style');
  css.id='menuStyle';
  css.innerHTML=`
#mOverlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;display:none}
#mSheet{position:fixed;left:0;right:0;bottom:0;background:#151515;border-radius:22px 22px 0 0;z-index:1000000;display:none;max-height:85vh;overflow:auto;padding-bottom:10px;animation:up .3s}
@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}
#mSheet button{width:100%;padding:18px 20px;background:none;border:none;border-bottom:1px solid #222;color:#fff;text-align:left;font-size:15px}
#subPage{position:fixed;inset:0;background:#0e0e14;z-index:1000001;display:none;overflow:auto}
.sub-item{width:100%;padding:16px;background:#1a1a2e;border-radius:12px;margin:8px 0;color:#fff;display:flex;justify-content:space-between;border:none}
.toggle{width:44px;height:26px;background:#444;border-radius:20px;position:relative}
.toggle.on{background:#0095f6}
.toggle i{position:absolute;left:2px;top:2px;width:22px;height:22px;background:#fff;border-radius:50%;transition:.3s}
.toggle.on i{left:20px}
`;
  document.head.appendChild(css);

  document.body.insertAdjacentHTML('beforeend',`
<div id="mOverlay"></div>
<div id="mSheet">
<div style="width:40px;height:5px;background:#444;border-radius:10px;margin:12px auto"></div>
<button id="oSettings">⚙️ Settings and privacy</button>
<button id="oActivity">📊 Your activity</button>
<button id="oArchive">🗄️ Archive</button>
<button id="oSaved">🔖 Saved</button>
<div style="padding:12px 20px;font-size:11px;opacity:.5">ACCOUNT</div>
<button id="oLogin">🔄 Switch account</button>
<button id="oLogout" style="color:#ff5a5b">🚪 Log out</button>
</div>
<div id="subPage"><div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid #222;position:sticky;top:0;background:#0e0e14"><button id="subBack" style="background:none;border:none;color:#fff;font-size:22px">←</button><b id="subTitle"></b></div><div id="subContent" style="padding:16px"></div></div>
`);

  const sheet=document.getElementById('mSheet');
  const overlay=document.getElementById('mOverlay');
  const subPage=document.getElementById('subPage');
  const open=()=>{ sheet.style.display='block'; overlay.style.display='block'; document.body.style.overflow='hidden'; };
  const close=()=>{ sheet.style.display='none'; overlay.style.display='none'; document.body.style.overflow=''; };

  // *** MAIN FIX: Document-level click - chahe button kabhi bhi bane ***
  document.addEventListener('click', (e)=>{
    let t=e.target;
    // Agar ☰ button ya uske andar ka icon click hua
    let isMenu = t.id==='menuBtn' || t.textContent.trim()==='☰' || t.innerText==='☰' || (t.closest && t.closest('#view-profile') && t.closest('button') && t.closest('#view-profile').querySelectorAll('button').length>0 && t.getBoundingClientRect().x>250);
    // Aur sahi check: Profile view me top right corner
    if(t.closest){
      let vp=t.closest('#view-profile');
      if(vp){
        let r=t.getBoundingClientRect();
        // Top right corner me click = menu
        if(r.x>200 && r.y<120){
          let btn=t.closest('button');
          if(btn){ e.preventDefault(); open(); return; }
        }
      }
    }
    if(t.id==='menuBtn' || t.innerHTML==='☰' || t.textContent==='☰'){
      e.preventDefault(); open();
    }
  }, true);

  // Purane button ko bhi direct bind
  const directBind=()=>{
    let pv=document.getElementById('view-profile');
    if(!pv) return;
    pv.querySelectorAll('button,div[role="button"]').forEach(b=>{
      let r=b.getBoundingClientRect();
      if(r.x>250 && r.y<150 && r.width<100 && r.width>20){
        b.id='menuBtn';
        b.onclick=(ev)=>{ ev.preventDefault(); open(); };
      }
    });
  };
  setInterval(directBind, 1000);
  directBind();

  overlay.onclick=close;
  document.getElementById('subBack').onclick=()=>subPage.style.display='none';

  document.getElementById('oSettings').onclick=()=>{
    document.getElementById('subTitle').innerText='Settings and privacy';
    document.getElementById('subContent').innerHTML=`<button class="sub-item" id="p1">🔒 Account Privacy <span>›</span></button><button class="sub-item" id="p2">🔑 Change Password <span>›</span></button><button class="sub-item" id="p3">ℹ️ About <span>›</span></button>`;
    subPage.style.display='block';
    setTimeout(()=>{
      document.getElementById('p1').onclick=()=>{
        let isP=localStorage.getItem('private_account')==='true';
        document.getElementById('subTitle').innerText='Account Privacy';
        document.getElementById('subContent').innerHTML=`<div style="background:#1a1a2e;border-radius:12px;padding:16px;border:1px solid #222"><div style="display:flex;justify-content:space-between;align-items:center"><div><b>Private Account</b><br><span style="font-size:12px;opacity:.6">Only approved can see</span></div><div id="tog" class="toggle ${isP?'on':''}"><i></i></div></div><div id="pst" style="margin-top:12px;font-size:12px">${isP?'🔒 Private':'🌐 Public'}</div></div>`;
        setTimeout(()=>{ document.getElementById('tog').onclick=function(){ let on=this.classList.contains('on'); this.classList.toggle('on'); localStorage.setItem('private_account',!on); document.getElementById('pst').innerHTML=!on?'🔒 Private':'🌐 Public'; }; },50);
      };
      document.getElementById('p2').onclick=()=>{ document.getElementById('subTitle').innerText='Password'; document.getElementById('subContent').innerHTML=`<p style="opacity:.6">Change from Edit Profile</p>`; };
      document.getElementById('p3').onclick=()=>{ document.getElementById('subTitle').innerText='About'; document.getElementById('subContent').innerHTML=`<p>InstaPro Clean v1</p>`; };
    },50);
  };
  document.getElementById('oActivity').onclick=()=>{ document.getElementById('subTitle').innerText='Your Activity'; document.getElementById('subContent').innerHTML=`<p style="opacity:.6">No activity</p>`; subPage.style.display='block'; };
  document.getElementById('oArchive').onclick=()=>{ document.getElementById('subTitle').innerText='Archive'; document.getElementById('subContent').innerHTML=`<p style="opacity:.6">No archived</p>`; subPage.style.display='block'; };
  document.getElementById('oSaved').onclick=()=>{ document.getElementById('subTitle').innerText='Saved'; document.getElementById('subContent').innerHTML=`<p style="opacity:.6">No saved</p>`; subPage.style.display='block'; };
  document.getElementById('oLogin').onclick=()=>{ let n=prompt('Username:'); if(n){ localStorage.setItem('my_user_name',n); location.reload(); } };
  document.getElementById('oLogout').onclick=()=>{ if(confirm('Log out?')){ localStorage.clear(); location.reload(); } };
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
})();
