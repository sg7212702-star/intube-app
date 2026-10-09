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
window.closeAll = closeAll; // upload.js ke liye

document.addEventListener("DOMContentLoaded",()=>{
  $("addBtn").onclick=openSheet;
  const addStory = $("addStoryBtn");
  if(addStory) addStory.onclick=openSheet;
  $("menuBtn").onclick=()=>{ $("sideMenu").classList.add("show"); $("sideOverlay").classList.add("show"); };
  $("closeMenu").onclick=closeAll;
  $("overlay").onclick=closeAll;
  $("sideOverlay").onclick=closeAll;
  $("sheetOverlay").onclick=closeAll;
  $("cancelSheet").onclick=closeAll;

  // *** MAIN FIX - Sirf file kholo, close mat karo yaha ***
  $("optPost").onclick=()=>{ $("postFile").click(); };
  $("optStory").onclick=()=>{ $("storyFile").click(); };
  $("optReel").onclick=()=>{ $("reelFile").click(); };

  document.querySelectorAll(".mItem").forEach(m=>{
    m.onclick=()=>{ alert(m.innerText); closeAll(); };
  });
});
