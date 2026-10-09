const $=id=>document.getElementById(id);
function openSheet(){
  const s=$("createSheet"); if(s){s.classList.add("show"); s.style.bottom="0";}
  $("overlay")?.classList.add("show"); $("sheetOverlay")?.classList.add("show");
}
function closeAll(){
  const s=$("createSheet"); if(s){s.classList.remove("show"); s.style.bottom="-100%";}
  ["overlay","sheetOverlay","sideOverlay"].forEach(i=>$(i)?.classList.remove("show"));
  $("sideMenu")?.classList.remove("show");
}
window.closeAll=closeAll;

document.addEventListener("DOMContentLoaded",()=>{
  $("addBtn").onclick=openSheet;
  $("addStoryBtn")?.addEventListener("click", openSheet);
  $("menuBtn").onclick=()=>{ $("sideMenu").classList.add("show"); $("sideOverlay").classList.add("show"); };
  $("closeMenu").onclick=closeAll;
  $("overlay").onclick=closeAll; $("sideOverlay").onclick=closeAll;
  $("sheetOverlay").onclick=closeAll; $("cancelSheet").onclick=closeAll;

  // --- REAL FIX: Naya input har baar ---
  function pickAndUpload(type){
    closeAll(); // pehle sheet band
    setTimeout(()=>{
      const inp = document.createElement("input");
      inp.type="file";
      inp.accept = type==="reel" ? "video/*" : "image/*,video/*";
      inp.onchange = (e)=>{
        const file = e.target.files[0];
        if(file && window.realUpload) window.realUpload(file, type);
      };
      inp.click();
    }, 150);
  }

  $("optPost").onclick=()=> pickAndUpload("post");
  $("optStory").onclick=()=> pickAndUpload("story");
  $("optReel").onclick=()=> pickAndUpload("reel");

  document.querySelectorAll(".mItem").forEach(m=>{
    m.onclick=()=>{ alert(m.innerText); closeAll(); };
  });
});
