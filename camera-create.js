// Insta Pro camera: single-page POST / STORY / REEL modes; one camera stream only.
const $c = id => document.getElementById(id);
let cameraOverlay, preview, captureButton, galleryInput;
let stream = null, recorder = null, recordedChunks = [], activeMode = "STORY";
let activeTool = "", facing = "user", cameraReady = false, flashOn = false;
let recordSwipeStartX = null, lastFilterSwipeAt = 0, selectedFilter = "original";

function buildCamera() {
  if ($c("ipCameraCreate")) return;
  const style = document.createElement("style");
  style.id = "ipCameraCreateStyle";
  style.textContent = `
  #ipCameraCreate{position:fixed;inset:0;z-index:200000;display:none;overflow:hidden;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;isolation:isolate}
  #ipCameraCreate.open{display:block}#ipCameraCreate *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  #ipCameraCreate video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#171717}
  #ipCamShade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#0006,transparent 24%,transparent 70%,#0005)}
  .ipCamTop{position:absolute;z-index:5;top:max(10px,env(safe-area-inset-top));left:12px;right:12px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center}
  .ipCamIcon{width:42px;height:42px;background:transparent;color:#fff;border:0;display:grid;place-items:center;font-size:28px}
  .ipCamIcon svg{width:27px;height:27px;stroke:#fff;fill:none}
  .ipCamPills{display:flex;justify-content:center;gap:8px}.ipCamPill{width:44px;height:36px;border:0;border-radius:22px;background:#373737d0;color:#eee;display:grid;place-items:center;font-size:14px}
  .ipCamPill svg{width:19px;height:19px;stroke:currentColor;fill:none}
  .ipCamAudio{position:absolute;z-index:5;top:calc(max(10px,env(safe-area-inset-top)) + 52px);left:50%;transform:translateX(-50%);height:34px;padding:0 15px;border:0;border-radius:20px;background:#0009;color:white;font-size:14px;font-weight:600;white-space:nowrap}
  .ipCamToolSet{position:absolute;z-index:5;left:12px;top:50%;transform:translateY(-43%);display:flex;flex-direction:column;gap:12px}
  .ipCamToolSet[hidden]{display:none!important}.ipCamTool{width:38px;height:38px;border:0;border-radius:10px;background:#0009;color:#fff;display:grid;place-items:center;position:relative;padding:0}
  .ipCamTool svg{width:23px;height:23px;stroke:#fff;fill:none;stroke-width:1.8}.ipCamTool.active{outline:1.5px solid #fff}
  .ipCamTool .num{position:absolute;font-size:12px;font-weight:800}
  .ipCamBottom{position:absolute;z-index:4;left:0;right:0;bottom:0;height:205px;background:#000;padding-bottom:calc(10px + env(safe-area-inset-bottom))}
  .ipCamCaptureRow{position:absolute;top:-38px;left:0;right:0;height:84px;display:flex;align-items:center;justify-content:center}
  #recordBtn{width:76px;height:76px;flex:0 0 76px;border-radius:50%;background:#fff;border:4px solid #000;box-shadow:0 0 0 3px #fff;padding:0;touch-action:pan-y}
  #recordBtn.recording{background:#ff2a6d}
  .ipCamLenses{position:absolute;left:calc(50% + 60px);top:50%;transform:translateY(-50%);display:flex;gap:10px;align-items:center}
  .ipCamLens{width:48px;height:48px;border-radius:50%;padding:3px;border:0;background:linear-gradient(135deg,#27d6ff,#6656ff,#e13cff,#2ce5ed)}
  .ipCamLens span{display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 25%,#71f5ff,#2864ee 48%,#271c88);border:2px solid #111}
  .ipCamAvatarLens{width:48px;height:48px;border-radius:50%;background:#bcecff;border:2px solid #e9f9ff;display:grid;place-items:center;color:#fff}
  .ipCamAvatarLens svg{width:28px;height:28px;stroke:currentColor;fill:none}
  .ipCamUtility{position:absolute;top:56px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:center}
  .ipCamGallery{width:38px;height:38px;border:2px solid #fff;border-radius:8px;background:linear-gradient(135deg,#526e8c,#d1b6a3 52%,#344e4a);display:grid;place-items:center;color:#fff;font-size:21px}
  .ipCamFlip{width:38px;height:38px;background:transparent;color:#fff;border:0;font-size:28px}
  #modeBar{position:absolute;top:104px;left:0;right:0;height:30px;display:flex;justify-content:center;align-items:center;gap:13px;white-space:nowrap;letter-spacing:2px;font-size:12px;font-weight:700}
  #modeBar .mode{height:28px;border:0;background:transparent;color:#929292;letter-spacing:2px;padding:0 1px;font-size:12px}
  #modeBar .mode.active{color:#fff;font-weight:900;position:relative}#modeBar .mode.active:after{content:"";position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:22px;height:2px;background:#fff;border-radius:2px}
  /* Instagram-style filter carousel, permanently visible above the shutter */
  #filterBar{display:flex;position:absolute;z-index:9;left:50%;right:auto;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));width:min(100vw,430px);height:82px;border-radius:0;padding:6px 18px;background:linear-gradient(transparent,rgba(0,0,0,.28));gap:14px;align-items:center;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;touch-action:pan-x;pointer-events:auto}
  #filterBar::-webkit-scrollbar{display:none;width:0;height:0}#filterBar.visible{display:flex}
  .ipCamFilter{flex:0 0 58px;width:58px;min-width:58px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:transparent;color:#fff;padding:0;border:0;scroll-snap-align:center;font-size:10px;font-weight:600;text-shadow:0 1px 3px #000}
  .ipCamSwatch{width:48px;height:48px;border-radius:50%;border:2px solid #ffffff70;display:block;box-shadow:0 0 0 1px #0004 inset}
  .ipCamFilter.active .ipCamSwatch{border:2px solid #ff2a6d;box-shadow:0 0 0 2px #fff}
  .ipCamOriginal{background:linear-gradient(135deg,#181818,#383838)}.ipCamWarm{background:linear-gradient(135deg,#ffd16b,#f07824 60%,#8e3a18)}.ipCamCool{background:linear-gradient(135deg,#b5efff,#338cde 55%,#2d3c99)}.ipCamMono{background:linear-gradient(135deg,#fff,#777 55%,#222)}.ipCamVintage{background:linear-gradient(135deg,#e6c08b,#98613d 55%,#49301f)}
  .ipCamCaptureRow{z-index:10}
  @media(max-height:650px){.ipCamBottom{height:190px}.ipCamToolSet{gap:8px}.ipCamTool{width:35px;height:35px}#filterBar{bottom:calc(78px + env(safe-area-inset-bottom));height:74px}.ipCamFilter{height:64px}.ipCamSwatch{width:42px;height:42px}#modeBar{top:98px}.ipCamUtility{top:50px}}
  #ipCamToast{position:absolute;z-index:12;left:50%;bottom:225px;transform:translateX(-50%);max-width:90%;padding:10px 14px;border-radius:18px;background:#232323f2;font-size:13px;text-align:center;pointer-events:none}
  #ipCamGalleryInput{display:none}
  @media(max-height:650px){.ipCamBottom{height:190px}.ipCamToolSet{gap:8px}.ipCamTool{width:35px;height:35px}#filterBar{bottom:105px}#modeBar{top:98px}.ipCamUtility{top:50px}}
  `;
  document.head.appendChild(style);
  cameraOverlay = document.createElement("div");
  cameraOverlay.id = "ipCameraCreate";
  cameraOverlay.innerHTML = `
    <video id="ipCamPreview" autoplay playsinline muted></video><div id="ipCamShade"></div>
    <div class="ipCamTop">
      <button class="ipCamIcon" id="ipCamClose" aria-label="Close"><svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="ipCamPills">
        <button class="ipCamPill" id="ipCamFlash" aria-label="Flash off"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round"><path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z"/><path d="m4 4 16 16"/></svg></button>
        <button class="ipCamPill" id="ipCamZoom">1x</button>
        <button class="ipCamPill" id="ipCamTimer" aria-label="Timer"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></svg></button>
      </div>
      <button class="ipCamIcon" id="ipCamSettings" aria-label="Settings"><svg viewBox="0 0 24 24" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 13.5 21 15l-2 4-2.5-1a8 8 0 0 1-2 1L14 21h-4l-.5-2a8 8 0 0 1-2-1L5 19l-2-4 2-1.5v-2L3 10l2-4 2.5 1a8 8 0 0 1 2-1L10 4h4l.5 2a8 8 0 0 1 2 1L19 6l2 4-2 1.5Z"/></svg></button>
    </div>
    <button class="ipCamAudio" id="ipCamAudio">♫ Add audio</button>
    <div class="ipCamToolSet" id="storyTools">
      <button class="ipCamTool" data-tool="create" aria-label="Create"><span style="font-size:20px;font-weight:700">Aa</span></button>
      <button class="ipCamTool" data-tool="boomerang" aria-label="Boomerang"><span style="font-size:25px">∞</span></button>
      <button class="ipCamTool" data-tool="effects" aria-label="Effects"><svg viewBox="0 0 24 24"><path d="m8 2 1.6 5.4L15 9l-5.4 1.6L8 16l-1.6-5.4L1 9l5.4-1.6L8 2Z"/></svg></button>
      <button class="ipCamTool" data-tool="layout" aria-label="Layout"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/></svg></button>
      <button class="ipCamTool" data-tool="handsfree" aria-label="Hands-free"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg></button>
    </div>
    <div class="ipCamToolSet" id="reelTools" hidden>
      <button class="ipCamTool" data-tool="music" aria-label="Music"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></button>
      <button class="ipCamTool" id="effectsBtn" aria-label="Effects" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="m8 2 1.6 5.4L15 9l-5.4 1.6L8 16l-1.6-5.4L1 9l5.4-1.6L8 2Z"/><path d="m18 12 1.2 3.8L23 17l-3.8 1.2L18 22l-1.2-3.8L13 17l3.8-1.2L18 12Z"/></svg></button>
      <button class="ipCamTool" data-tool="avatar" aria-label="Avatar"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="9" r="3"/><path d="M6.5 19c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/></svg></button>
      <button class="ipCamTool" data-tool="draw" aria-label="Draw"><svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.5 7.5 3 3"/></svg></button>
      <button class="ipCamTool" data-tool="duration" aria-label="15 seconds"><svg viewBox="0 0 24 24" stroke-dasharray="2.2 2.2"><circle cx="12" cy="12" r="9"/></svg><span class="num">15</span></button>
    </div>
    <div class="ipCamToolSet" id="postTools" hidden>
      <button class="ipCamTool" data-tool="post-media" aria-label="Choose post media"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8" r="1.5"/><path d="m4 17 5-5 3 3 3-4 5 6"/></svg></button>
    </div>
    <div id="filterBar">
      <button class="ipCamFilter active" data-filter="original"><span class="ipCamSwatch ipCamOriginal"></span><span>Original</span></button>
      <button class="ipCamFilter" data-filter="warm"><span class="ipCamSwatch ipCamWarm"></span><span>Warm</span></button>
      <button class="ipCamFilter" data-filter="cool"><span class="ipCamSwatch ipCamCool"></span><span>Cool</span></button>
      <button class="ipCamFilter" data-filter="mono"><span class="ipCamSwatch ipCamMono"></span><span>Mono</span></button>
      <button class="ipCamFilter" data-filter="vintage"><span class="ipCamSwatch ipCamVintage"></span><span>Vintage</span></button>
    </div>
    <div id="ipCamToast"></div>
    <div class="ipCamBottom">
      <div class="ipCamCaptureRow"><button id="recordBtn" aria-label="Record"></button><div class="ipCamLenses"><button class="ipCamLens" id="ipCamLens" aria-label="Lens"><span></span></button><button class="ipCamAvatarLens" id="ipCamAvatarLens" aria-label="Avatar lens">♙</button></div></div>
      <div class="ipCamUtility"><button class="ipCamGallery" id="ipCamGallery" aria-label="Gallery">▧</button><button class="ipCamFlip" id="ipCamFlip" aria-label="Flip camera">⇄</button></div>
      <div id="modeBar"><button class="mode" data-mode="POST">POST</button><button class="mode active" data-mode="STORY">STORY</button><button class="mode" data-mode="REEL">REEL</button></div>
    </div>
    <input id="ipCamGalleryInput" type="file" accept="image/*,video/*" multiple>
  `;
  document.body.appendChild(cameraOverlay);
  preview=$c("ipCamPreview");captureButton=$c("recordBtn");galleryInput=$c("ipCamGalleryInput");
  $c("ipCamClose").onclick=closeCamera;
  $c("ipCamFlip").onclick=async()=>{facing=facing==="user"?"environment":"user";await startCamera();};
  $c("ipCamFlash").onclick=async()=>{flashOn=!flashOn;const track=stream?.getVideoTracks?.()[0];try{if(track?.getCapabilities?.().torch)await track.applyConstraints({advanced:[{torch:flashOn}]});else{flashOn=false;toast("Flash is not supported by this camera.");}}catch(_){flashOn=false;toast("Flash is not supported by this camera.");}};
  $c("ipCamSettings").onclick=()=>toast("Camera settings are controlled by your device and browser.");
  $c("ipCamZoom").onclick=()=>toast("Zoom depends on camera support.");
  $c("ipCamTimer").onclick=()=>toast("Timer off.");
  $c("ipCamAudio").onclick=()=>toast("Audio picker is not connected yet.");
  $c("ipCamGallery").onclick=()=>galleryInput.click();
  galleryInput.onchange=()=>{const files=[...(galleryInput.files||[])];if(files.length)sendFiles(files);galleryInput.value="";};
  $c("effectsBtn").onclick=()=>toast("Filters are not available in Reel mode.");
  $c("ipCamLens").onclick=()=>{if(activeMode==="POST"){toggleFilters(true);$c("filterBar").scrollBy({left:100,behavior:"smooth"});}else{toast("Filters are not available in "+activeMode+" mode.");}};
  $c("ipCamAvatarLens").onclick=()=>toast("Avatar lens selected.");
  cameraOverlay.querySelectorAll("[data-tool]").forEach(btn=>{btn.type="button";btn.onclick=()=>runTool(btn.dataset.tool);});
  cameraOverlay.querySelectorAll("[data-mode]").forEach(btn=>{btn.type="button";btn.onclick=e=>{e.preventDefault();e.stopPropagation();setMode(btn.dataset.mode);};});
  cameraOverlay.querySelectorAll("[data-filter]").forEach(btn=>{btn.type="button";btn.onclick=()=>selectFilter(btn.dataset.filter);});
  captureButton.addEventListener("touchstart",e=>{recordSwipeStartX=e.touches[0]?.clientX??null;},{passive:true});
  captureButton.addEventListener("touchmove",e=>{if(activeMode!=="POST"||recordSwipeStartX===null||!e.touches.length)return;const dx=e.touches[0].clientX-recordSwipeStartX;if(Math.abs(dx)>40){toggleFilters(true);const bar=$c("filterBar");bar.scrollBy({left:dx<0?90:-90,behavior:"smooth"});const opts=[...bar.querySelectorAll("[data-filter]")];const i=opts.findIndex(b=>b.dataset.filter===selectedFilter);const j=Math.max(0,Math.min(opts.length-1,i+(dx<0?1:-1)));selectFilter(opts[j].dataset.filter);opts[j].scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});recordSwipeStartX=e.touches[0].clientX;lastFilterSwipeAt=Date.now();}},{passive:true});
  captureButton.addEventListener("touchend",()=>recordSwipeStartX=null,{passive:true});
  captureButton.addEventListener("touchcancel",()=>recordSwipeStartX=null,{passive:true});
  captureButton.onclick=()=>{if(Date.now()-lastFilterSwipeAt<500)return;capture();};
}
function toast(message){const el=$c("ipCamToast");if(!el)return;el.textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.textContent="",2200);}
function setMode(mode){
  if(!["POST","STORY","REEL"].includes(mode))return;
  activeMode=mode;activeTool="";
  cameraOverlay.querySelectorAll("#modeBar .mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));
  $c("storyTools").hidden=mode!=="STORY";$c("reelTools").hidden=mode!=="REEL";$c("postTools").hidden=mode!=="POST";
  $c("ipCamAudio").style.display=mode==="REEL"?"block":"none";
  // Filters are not available in Story or Reel mode.
  const filterBar=$c("filterBar");
  filterBar.style.display=mode==="POST"?"flex":"none";
  if(mode!=="POST"){
    selectedFilter="original";
    if(preview)preview.style.filter="none";
    cameraOverlay.querySelectorAll("[data-filter]").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter==="original"));
    toggleFilters(false);
  }
  if(mode==="REEL")toast("Reel mode ready. Same camera stream is running.");
  else if(mode==="STORY")toast("Story mode ready.");
  else toast("Post mode ready.");
}
function toggleFilters(force){  const bar=$c("filterBar");if(activeMode!=="POST"){bar.classList.remove("visible");bar.style.display="none";return;}const yes=typeof force==="boolean"?force:!bar.classList.contains("visible");  bar.classList.toggle("visible",yes);$c("effectsBtn").classList.toggle("active",yes);$c("effectsBtn").setAttribute("aria-expanded",String(yes));$c("ipCamLens")?.classList.toggle("active",yes);  if(yes){const chosen=bar.querySelector("[data-filter=\""+selectedFilter+"\"]");chosen?.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});bar.setAttribute("aria-label","Swipe left or right to browse filters");}}
function selectFilter(name){const values={original:"none",warm:"sepia(0.4) saturate(1.3)",cool:"hue-rotate(180deg) saturate(0.8)",mono:"grayscale(1)",vintage:"sepia(0.8) contrast(0.9)"};if(!(name in values))return;selectedFilter=name;preview.style.filter=values[name];cameraOverlay.querySelectorAll("[data-filter]").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===name));}
async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera API unavailable");
    const old=stream;stream=null;if(old)old.getTracks().forEach(t=>t.stop());
    const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1920}},audio:true});
    if(!cameraOverlay?.classList.contains("open")){next.getTracks().forEach(t=>t.stop());return;}
    stream=next;preview.srcObject=stream;preview.style.transform=facing==="user"?"scaleX(-1)":"scaleX(1)";cameraReady=true;await preview.play().catch(()=>{});
  }catch(e){cameraReady=false;toast("Camera permission needed. You can still choose media from Gallery.");console.warn("Insta Pro camera:",e);}
}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}cameraReady=false;if(preview)preview.srcObject=null;}
function closeCamera(){cameraOverlay?.classList.remove("open");if(recorder?.state==="recording"){try{recorder.stop();}catch(_){}}stopCamera();document.body.style.overflow="";}
function openCamera(){buildCamera();cameraOverlay.classList.add("open");document.body.style.overflow="hidden";setMode("STORY");startCamera();}
function runTool(tool){activeTool=tool;if(tool==="post-media"){galleryInput.click();return;}if(tool==="music"){$c("ipCamAudio").click();return;}if(tool==="effects"){toggleFilters();return;}if(tool==="duration"){toast("Reel duration: 15 seconds.");return;}if(tool==="avatar"||tool==="draw"||tool==="boomerang"||tool==="layout"||tool==="create")toast(tool.charAt(0).toUpperCase()+tool.slice(1)+" tool selected.");if(tool==="handsfree"){toast("Hands-free recording started.");startRecording();}}
function capture(){
  if(activeMode==="REEL"||activeTool==="handsfree"){if(recorder?.state==="recording"){recorder.stop();captureButton.classList.remove("recording");return;}startRecording();return;}
  if(!cameraReady||!preview.videoWidth){toast("Camera unavailable. Use Gallery below.");return;}
  const canvas=document.createElement("canvas");canvas.width=preview.videoWidth;canvas.height=preview.videoHeight;const ctx=canvas.getContext("2d");if(facing==="user"){ctx.translate(canvas.width,0);ctx.scale(-1,1);}ctx.filter=getComputedStyle(preview).filter||"none";ctx.drawImage(preview,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob)sendFiles([new File([blob],"instapro-camera-"+Date.now()+".jpg",{type:"image/jpeg"})]);},"image/jpeg",.94);
}
function startRecording(){
  if(!stream||!window.MediaRecorder){toast("Video recording is not supported. Select a video from Gallery.");return;}
  if(!cameraReady||!preview.videoWidth){toast("Camera is still starting. Please try again.");return;}
  let outputStream=null, renderCanvas=null, renderFrame=0;
  try{
    recordedChunks=[];
    // Render the live preview through a canvas so the selected filter is baked into the saved Reel/Story.
    renderCanvas=document.createElement("canvas");
    renderCanvas.width=preview.videoWidth||720;
    renderCanvas.height=preview.videoHeight||1280;
    const ctx=renderCanvas.getContext("2d",{alpha:false});
    const filterValues={original:"none",warm:"sepia(0.4) saturate(1.3)",cool:"hue-rotate(180deg) saturate(0.8)",mono:"grayscale(1)",vintage:"sepia(0.8) contrast(0.9)"};
    const drawFrame=()=>{
      if(!ctx||!preview.videoWidth)return;
      ctx.save();ctx.clearRect(0,0,renderCanvas.width,renderCanvas.height);
      ctx.filter=filterValues[selectedFilter]||"none";
      if(facing==="user"){ctx.translate(renderCanvas.width,0);ctx.scale(-1,1);}
      ctx.drawImage(preview,0,0,renderCanvas.width,renderCanvas.height);ctx.restore();
      renderFrame=requestAnimationFrame(drawFrame);
    };
    drawFrame();
    outputStream=renderCanvas.captureStream(30);
    stream.getAudioTracks().forEach(t=>outputStream.addTrack(t));
    const mime=["video/webm;codecs=vp8,opus","video/webm;codecs=vp9,opus","video/webm","video/mp4;codecs=h264"].find(t=>MediaRecorder.isTypeSupported(t));
    recorder=new MediaRecorder(outputStream,mime?{mimeType:mime}:undefined);
    recorder.ondataavailable=e=>{if(e.data?.size)recordedChunks.push(e.data);};
    recorder.onstop=()=>{
      cancelAnimationFrame(renderFrame);
      outputStream?.getTracks().forEach(t=>t.stop());
      captureButton.classList.remove("recording");
      if(!recordedChunks.length)return;
      const type=recorder.mimeType||"video/webm",ext=type.includes("mp4")?"mp4":"webm";
      sendFiles([new File(recordedChunks,"instapro-"+activeMode.toLowerCase()+"-"+Date.now()+"."+ext,{type})]);
    };
    recorder.start();captureButton.classList.add("recording");
    toast("Recording… tap the centre button to finish.");
  }catch(e){
    if(renderFrame)cancelAnimationFrame(renderFrame);
    outputStream?.getTracks().forEach(t=>t.stop());
    toast("Recording could not start. Please use Gallery.");console.warn(e);
  }
}
function sendFiles(files){
  const isVideo=files.some(f=>f.type.startsWith("video/"));let inputId=activeMode==="REEL"?"reelFile":activeMode==="STORY"?"storyFile":"postFile";if(activeMode==="POST"&&isVideo)inputId="postFile";const input=$c(inputId);if(!input){toast("Upload option is unavailable. Please try again.");return;}
  try{const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));input.files=dt.files;input.dataset.instaProUploadType=activeMode.toLowerCase();closeCamera();input.dispatchEvent(new Event("change",{bubbles:true}));}catch(e){toast("Could not open editor. Please select the file again.");console.error(e);}
}
window.openInstaProCamera=openCamera;
function initInstaProCameraCreate(){buildCamera();const plus=$c("addBtn");if(plus&&plus.dataset.ipCameraBound!=="1"){plus.dataset.ipCameraBound="1";plus.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openCamera();},true);}if(!document.documentElement.dataset.ipCameraEscapeBound){document.documentElement.dataset.ipCameraEscapeBound="1";document.documentElement.dataset.ipCameraEscapeBound="1";document.addEventListener("keydown",e=>{if(e.key==="Escape"&&cameraOverlay?.classList.contains("open"))closeCamera();});}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initInstaProCameraCreate,{once:true});else initInstaProCameraCreate();
