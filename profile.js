// SAFE PROFILE - No crash
document.addEventListener('DOMContentLoaded', ()=>{
  const m=document.getElementById('editModal');
  if(m) m.style.display='none';
});

const eb = document.getElementById('editProfileBtn');
if(eb) eb.onclick = ()=> { document.getElementById('editModal').style.display='flex'; }
const cb = document.getElementById('closeEditModal');
if(cb) cb.onclick = ()=> { document.getElementById('editModal').style.display='none'; }
