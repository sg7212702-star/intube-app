// menu.js - SAB NAVIGATION + SHEETS
const $=id=>document.getElementById(id);
function showView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById(v)?.classList.add('active');
  document.querySelectorAll('#bottomBar button').forEach(b=>b.classList.remove('active'));
  if(v=='view-home') $('homeBtn')?.classList.add('active');
  if(v=='view-reels') $('reelsBtn')?.classList.add('active');
  if(v=='view-profile') $('profileBtn')?.classList.add('active');
  if(v=='view-search') $('searchBtn')?.classList.add('active');
}
$('homeBtn').onclick=()=>showView('view-home');
$('reelsBtn').onclick=()=>showView('view-reels');
$('profileBtn').onclick=()=>showView('view-profile');
$('searchBtn').onclick=()=>showView('view-search');
$('notifBtn')?.addEventListener('click',()=>showView('view-notif'));
$('addBtn')?.addEventListener('click',()=>{
  $('createSheet').style.display='block';
  $('overlay').style.display='block';
});
function closeAll(){
  $('createSheet').style.display='none';
  $('profileMenuSheet').style.display='none';
  $('overlay').style.display='none';
}
$('createBtn').onclick=()=>{ $('createSheet').style.display='block'; $('overlay').style.display='block'; };
$('closeSheet').onclick=closeAll;
$('overlay').onclick=closeAll;
$('menuBtn').onclick=()=>{ $('profileMenuSheet').style.display='block'; $('overlay').style.display='block'; };
$('mLogout').onclick=()=>{ if(confirm('Log out?')){ localStorage.clear(); location.reload(); } };
$('mSettings').onclick=()=>{
  $('subTitle').innerText='Settings and privacy';
  $('subContent').innerHTML=`<div style="background:#1e1e2a;padding:16px;border-radius:12px">Private Account: <b>${localStorage.getItem('private_account')=='true'?'ON':'OFF'}</b><br><button onclick="localStorage.setItem('private_account',localStorage.getItem('private_account')!='true');location.reload()" style="margin-top:10px;padding:8px 16px;border-radius:10px;border:none;background:#0095f6;color:#fff">Toggle</button></div>`;
  $('subPage').style.display='block'; closeAll();
};
$('subBack').onclick=()=>$('subPage').style.display='none';
$('optPost').onclick=()=>{ $('fileInput').accept='image/*,video/*'; $('fileInput').click(); };
$('optReel').onclick=()=>{ $('fileInput').accept='video/*'; $('fileInput').click(); };
$('optStory').onclick=()=>{ $('storyInput').click(); };
