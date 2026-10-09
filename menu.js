// --- MENU - NO-FAIL VERSION ---
const $=id=>document.getElementById(id);
const getUid=()=>localStorage.getItem('my_user_id');

window.openMenu=()=>{
  console.log('Menu Open Click');
  const sheet=$('menuSheet'), over=$('menuOverlay');
  if(!sheet){ alert('menuSheet nahi mila! HTML check karo'); return; }
  sheet.style.transform='translateY(0)';
  if(over) over.style.display='block';
  document.body.style.overflow='hidden';
  // stats load - fail bhi ho toh menu toh khulega
  try{ loadStats(); }catch(e){}
};
window.closeMenu=()=>{
  const sheet=$('menuSheet'), over=$('menuOverlay');
  if(sheet) sheet.style.transform='translateY(100%)';
  if(over) over.style.display='none';
  document.body.style.overflow='';
};

async function loadStats(){
  const uid=getUid(); if(!uid) return;
  const time = Math.floor((Date.now() - parseInt(localStorage.getItem('login_time')||Date.now().toString()))/60000);
  if($('m_time')) $('m_time').innerText=time+'m';
  if($('m_liveTime')) $('m_liveTime').innerText=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  if($('m_name')) $('m_name').innerText=localStorage.getItem('my_user_name')||'User';
  if($('m_email')) $('m_email').innerText=localStorage.getItem('my_user_id')?.slice(0,12)||'user';
  if($('m_pic')) $('m_pic').src=localStorage.getItem('my_pic')||'https://i.pravatar.cc/100';
  // Firebase try - agar fail bhi ho toh error mat do
  try{
    const { db } = await import('./firebase.js');
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const q=query(collection(db,"posts"), where("userId","==",uid));
    const snap=await getDocs(q);
    let likes=0; snap.forEach(d=>likes+=(d.data().likesCount||0));
    if($('m_posts')) $('m_posts').innerText=snap.size;
    if($('m_likes')) $('m_likes').innerText=likes;
  }catch(e){ console.log('stats firebase skip',e); }
}

// --- PAGES ---
window.goSettings=()=>{ closeMenu(); setTimeout(()=>{ $('settingsPage').style.transform='translateX(0)'; },250); };
window.closeSettings=()=>{ $('settingsPage').style.transform='translateX(100%)'; };
window.goActivity=()=>{ closeMenu(); setTimeout(()=>{ $('activityPage').style.transform='translateX(0)'; loadStats(); },250); };
window.closeActivity=()=>{ $('activityPage').style.transform='translateX(100%)'; };
window.goPrivacy=()=>{ $('privacyPage').style.transform='translateX(0)'; };
window.closePrivacy=()=>{ $('privacyPage').style.transform='translateX(100%)'; };
window.goHelp=()=>{ $('helpPage').style.transform='translateX(0)'; };
window.closeHelp=()=>{ $('helpPage').style.transform='translateX(100%)'; };

window.clearCache=()=>{
  if(!confirm('Cache clear?')) return;
  Object.keys(localStorage).forEach(k=>{ if(k.startsWith('seen_')) localStorage.removeItem(k); });
  alert('✅ Cleared');
};
window.showBlocked=()=>{
  const list=JSON.parse(localStorage.getItem('blocked')||'[]');
  alert(list.length? 'Blocked: '+list.length : 'No blocked users');
};
window.doRealLogout=()=>{
  localStorage.clear();
  location.href='./login.html';
};

setInterval(()=>{ if($('m_liveTime')) $('m_liveTime').innerText=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); },1000);
console.log('✅ menu.js loaded - button ready');
