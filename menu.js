// menu.js - CLEAN - NO HARDCODED NAME - FIXED
(function(){
const init = () =>{
document.getElementById('menuStyle')?.remove();
document.getElementById('mOverlay')?.remove();
document.getElementById('mSheet')?.remove();
document.getElementById('subPage')?.remove();

let css = document.createElement('style');
css.id = 'menuStyle';
css.innerHTML = `
#mOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998}
#mSheet{display:none;position:fixed;left:0;right:0;bottom:0;background:#151515;border-radius:20px 20px 0 0;z-index:9999;max-height:85vh;overflow:auto}
#mSheet button{width:100%;padding:16px 20px;background:none;border:none;border-bottom:1px solid #222;color:#fff;text-align:left;font-size:15px}
#subPage{display:none;position:fixed;inset:0;background:#0e0e14;z-index:10000;overflow:auto}
.sub-item{width:100%;padding:16px;background:#1a0e1e;border-radius:12px;margin:8px 0;color:#fff;display:flex;justify-content:space-between;align-items:center;border:none}
.toggle{width:44px;height:26px;background:#444;border-radius:20px;position:relative}
.toggle.on{background:#0095f6}
.toggle i{position:absolute;left:2px;top:2px;width:22px;height:22px;background:#fff;border-radius:50%;transition:.3s}
.toggle.on i{left:20px}
`;
document.head.appendChild(css);

document.body.insertAdjacentHTML('beforeend', `
<div id="mOverlay"></div>
<div id="mSheet">
<div style="width:40px;height:5px;background:#444;border-radius:10px;margin:10px auto"></div>
<button id="oSettings">⚙️ Settings and privacy</button>
<button id="oActivity">📊 Your activity</button>
<button id="oArchive">📦 Archive</button>
<button id="oSaved">🔖 Saved</button>
<div style="padding:12px 20px;font-size:11px;opacity:.5">ACCOUNT</div>
<button id="oLogin">🔄 Switch account</button>
<button id="oLogout" style="color:#ff5a5b">🚪 Log out</button>
</div>
<div id="subPage"><div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid #222;position:sticky;top:0;background:#0e0e14"><button id="subBack">←</button><b id="subTitle"></b></div><div id="subContent" style="padding:16px"></div></div>
`);

const sheet = document.getElementById('mSheet');
const overlay = document.getElementById('mOverlay');
const subPage = document.getElementById('subPage');
const open = () => { sheet.style.display='block'; overlay.style.display='block'; }
const close = () => { sheet.style.display='none'; overlay.style.display='none'; }
const openSub = (t,h) => { document.getElementById('subTitle').innerText=t; document.getElementById('subContent').innerHTML=h; subPage.style.display='block'; }

// --- YAHI MAIN FIX HAI ---
function bindMenuBtn(){
  // 1. Original ID
  let btn = document.getElementById('menuBtn');
  // 2. Profile ke top right wala ☰ - chahe koi bhi ID ho
  if(!btn){
    let pv = document.getElementById('view-profile');
    if(pv){
      pv.querySelectorAll('button').forEach(b=>{
        if(b.textContent.includes('☰') || b.innerHTML.trim() === '☰' || b.innerText.trim() === '☰'){
          btn = b;
        }
      });
      // Agar text nahi mila to right corner wala button
      if(!btn){
        let all = pv.querySelectorAll('button');
        if(all.length > 0) btn = all[all.length - 1];
      }
    }
  }
  if(btn){
    btn.id = 'menuBtn';
    btn.style.pointerEvents = 'auto';
    btn.style.zIndex = '5';
    btn.onclick = open;
    console.log('MenuBtn Bound:', btn);
  }
}

bindMenuBtn();
setTimeout(bindMenuBtn, 1000);
setTimeout(bindMenuBtn, 2000);

overlay.addEventListener('click', close);
document.getElementById('subBack').addEventListener('click', ()=> subPage.style.display="none");

document.getElementById('oSettings').addEventListener('click', ()=>{
openSub('Settings and privacy', `
<button class="sub-item" id="p1">🔒 Account Privacy <span></span></button>
<button class="sub-item" id="p2">🔑 Change Password <span></span></button>
<button class="sub-item" id="p3">ℹ️ About <span></span></button>
`);
setTimeout(()=>{
document.getElementById('p1').onclick=()=>{
let isP=localStorage.getItem('private_account')==='true';
openSub('Account Privacy', `
<div style="background:#1a0e1e;border-radius:12px;padding:16px;border:1px solid #222">
<div style="display:flex;justify-content:space-between;align-items:center">
<div><b>Private Account</b><br><span style="font-size:12px;opacity:.6">Only approved followers can see</span></div>
<div id="tog" class="toggle ${isP?'on':''}"><i></i></div>
</div>
<div id="pst" style="margin-top:12px;font-size:12px">${isP?'🔒 Private':'🌐 Public'}</div>
</div>
`);
setTimeout(()=>{
document.getElementById('tog').onclick=function(){
let on=this.classList.contains('on');
this.classList.toggle('on');
localStorage.setItem('private_account',!on);
document.getElementById('pst').innerHTML=!on?'🔒 Private':'🌐 Public';
};
},50);
};
document.getElementById('p2').onclick=()=>openSub('Password', `<p style="opacity:.6">Edit from profile</p>`);
document.getElementById('p3').onclick=()=>openSub('About', `<p>InstaPro - Clean</p>`);
},50);
});

document.getElementById('oActivity').onclick=()=>openSub('Your Activity', `<p style="opacity:.6">No activity yet</p>`);
document.getElementById('oArchive').onclick=()=>openSub('Archive', `<p style="opacity:.6">No archived</p>`);
document.getElementById('oSaved').onclick=()=>openSub('Saved', `<p style="opacity:.6">No saved</p>`);
document.getElementById('oLogin').onclick=()=>{ let n=prompt('Enter username:'); if(n){ localStorage.setItem('my_user_name',n); location.reload(); } };
document.getElementById('oLogout').onclick=()=>{ if(confirm('Log out?')){ localStorage.clear(); location.reload(); } };

};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
