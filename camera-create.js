// Instagram-style full-screen camera/create experience for Insta Pro.
const $c = (id) => document.getElementById(id);
let stream = null, recorder = null, recordedChunks = [], activeMode = "STORY", activeTool = "", flashOn = false, facing = "environment", cameraReady = false;
let cameraOverlay, preview, captureButton, timerEl, galleryInput;

function buildCamera() {
  if ($c("ipCameraCreate")) return;
  const style = document.createElement("style");
  style.id = "ipCameraCreateStyle";
  style.textContent = `
  #ipCameraCreate{position:fixed;inset:0;z-index:200000;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;display:none;overflow:hidden;isolation:isolate}
  #ipCameraCreate.open{display:block}
  #ipCameraCreate video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#050505}
  #ipCamShade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.42),transparent 24%,transparent 68%,rgba(0,0,0,.68))}
  .ipCamTop{position:absolute;top:calc(env(safe-area-inset-top) + 18px);left:22px;right:22px;display:flex;align-items:center;justify-content:space-between;z-index:3}
  .ipCamIcon{border:0;background:transparent;color:white;font-size:35px;line-height:1;padding:4px;text-shadow:0 1px 4px #222}
  .ipCamTools{position:absolute;left:clamp(12px,4vw,24px);top:clamp(150px,34%,360px);bottom:clamp(220px,27%,330px);display:flex;flex-direction:column;justify-content:space-evenly;gap:clamp(4px,1.2vh,16px);z-index:3;max-height:55%;overflow:hidden}
  .ipCamTool{display:flex;align-items:center;gap:clamp(12px,4vw,24px);border:0;background:transparent;color:white;text-align:left;font-size:clamp(14px,2.5vh,18px);font-weight:650;padding:2px 0;text-shadow:0 1px 4px #111;min-height:0;flex:0 1 auto}
  .ipCamTool .ico{font-size:clamp(27px,4.8vh,36px);width:clamp(42px,11vw,62px);text-align:center;line-height:1;flex-shrink:0}
  .ipCamTool.selected{opacity:1}
  .ipCamTool.selected .ico{filter:drop-shadow(0 0 5px rgba(255,255,255,.65))}
  .ipCamBottom{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 24px);z-index:4}
  .ipCamControls{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;justify-items:center;gap:0;margin:0 auto clamp(24px,4vh,42px);max-width:560px;padding:0 18px}
  #ipCamGallery{width:62px;height:62px;border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,.8);background:rgba(20,20,20,.65);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;position:static;justify-self:start;overflow:hidden}
  #ipCamCapture{width:clamp(78px,14vw,106px);height:clamp(78px,14vw,106px);border:6px solid #eee;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 4px #111;position:relative}
  #ipCamCapture:after{content:"";position:absolute;inset:8px;border-radius:50%;border:2px solid rgba(0,0,0,.55)}
  #ipCamCapture.recording{background:#f33}
  .ipCamModes{display:flex;justify-content:center;align-items:center;gap:clamp(14px,4vw,24px);white-space:nowrap;overflow-x:auto;padding:0 16px;scrollbar-width:none}
  .ipCamModes button{color:#bdbdbd;background:transparent;border:0;font-size:16px;letter-spacing:2.5px;padding:8px 2px;font-weight:500;position:relative;transition:color .18s,transform .18s}
  .ipCamModes button.active{color:#fff;font-weight:800;transform:scale(1.04)}
  .ipCamModes button.active:after{content:"";position:absolute;left:2px;right:2px;bottom:0;height:2px;border-radius:2px;background:#fff}
  .ipCamModes button:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:3px}
  #ipCamClose{font-size:34px}
  #ipCameraCreate.reelMode .ipCamTools{top:38%;bottom:220px;left:18px;gap:clamp(18px,3vh,30px);justify-content:flex-start}
  #ipCameraCreate.reelMode .ipCamTool{width:46px;justify-content:center}
  #ipCameraCreate.reelMode .ipCamTool span:last-child{display:none}
  #ipCameraCreate.reelMode .ipCamTool .ico{font-size:32px;width:44px}
  .ipReelAudio{position:absolute;top:clamp(110px,16%,190px);left:50%;transform:translateX(-50%);z-index:4;border:0;border-radius:28px;background:rgba(0,0,0,.58);color:white;padding:14px 24px;font-size:16px;font-weight:600;white-space:nowrap}
  .ipReelTopExtras{display:none;position:absolute;top:calc(env(safe-area-inset-top) + 20px);left:50%;transform:translateX(-50%);z-index:4;gap:12px}
  #ipCameraCreate.reelMode .ipReelTopExtras{display:flex}
  .ipReelTopExtras button{border:0;border-radius:50%;width:58px;height:58px;background:rgba(40,40,40,.78);color:white;font-size:22px;font-weight:700}
  .ipReelEffects{display:none;position:absolute;right:18px;bottom:clamp(145px,20%,220px);z-index:4;gap:12px;align-items:center}
  #ipCameraCreate.reelMode .ipReelEffects{display:flex}
  .ipReelEffects button{border:2px solid rgba(255,255,255,.7);border-radius:50%;width:58px;height:58px;background:rgba(255,255,255,.15);color:#fff;font-size:24px}
  #ipCamToast{position:absolute;top:20%;left:24%;right:8%;text-align:center;font-size:13px;color:white;z-index:5;text-shadow:0 1px 4px #000;pointer-events:none}
  @media(max-height:760px){.ipCamTools{top:26%;bottom:220px;gap:4px}.ipCamTool .ico{font-size:25px;width:44px}.ipCamTool{gap:10px;font-size:14px}.ipCamControls{margin-bottom:18px}#ipCamGallery{width:50px;height:50px}#ipCamCapture{width:78px;height:78px}.ipCamModes button{font-size:14px;letter-spacing:2px}}
  `;
  document.head.appendChild(style);
  cameraOverlay = document.createElement("div");
  cameraOverlay.id = "ipCameraCreate";
  cameraOverlay.innerHTML = `
    <video id="ipCamPreview" autoplay playsinline muted></video><div id="ipCamShade"></div>
    <div class="ipCamTop"><button class="ipCamIcon" id="ipCamClose" aria-label="Close">×</button><button class="ipCamIcon" id="ipCamFlash" aria-label="Flash">ϟ̸</button><button class="ipCamIcon" id="ipCamSettings" aria-label="Camera settings">⚙</button></div>
    <div class="ipCamTools">
      <button class="ipCamTool" data-tool="create"><span class="ico">Aa</span><span>Create</span></button>
      <button class="ipCamTool" data-tool="boomerang"><span class="ico">∞</span><span>Boomerang</span></button>
      <button class="ipCamTool" data-tool="effects"><span class="ico">✿</span><span>Effects</span></button>
      <button class="ipCamTool" data-tool="layout"><span class="ico">▣</span><span>Layout</span></button>
      <button class="ipCamTool" data-tool="handsfree"><span class="ico">◉</span><span>Hands-free</span></button>
      <button class="ipCamTool" data-tool="close"><span class="ico">⌃</span><span>Close</span></button>
    </div>
    <div id="ipCamToast"></div>
    <div class="ipCamBottom"><div class="ipCamControls"><button id="ipCamGallery" aria-label="Open gallery" type="button">▧</button><button id="ipCamCapture" aria-label="Take photo or start recording"></button><button class="ipCamIcon" id="ipCamFlip" aria-label="Flip camera">⇄</button></div><div class="ipCamModes"><button data-mode="POST">POST</button><button data-mode="STORY" class="active">STORY</button><button data-mode="REEL">REEL</button></div></div>
    <input id="ipCamGalleryInput" type="file" accept="image/*,video/*" multiple style="display:none">
  `;
  document.body.appendChild(cameraOverlay);
  preview = $c("ipCamPreview"); captureButton = $c("ipCamCapture"); galleryInput = $c("ipCamGalleryInput");
  $c("ipCamClose").onclick = closeCamera;
  $c("ipCamFlip").onclick = async () => { facing = facing === "environment" ? "user" : "environment"; await startCamera(); };
  $c("ipCamFlash").onclick = async () => {
    flashOn = !flashOn; $c("ipCamFlash").textContent = flashOn ? "ϟ" : "ϟ̸";
    const track = stream?.getVideoTracks?.()[0];
    try { if (track?.getCapabilities?.().torch) await track.applyConstraints({advanced:[{torch:flashOn}]}); else toast("Flash is not supported by this camera."); } catch (_) { toast("Flash is not supported by this camera."); }
  };
  $c("ipCamSettings").onclick = () => toast("Camera settings: use your device camera permissions and browser settings.");
  $c("ipReelMute").onclick = () => { flashOn=!flashOn; $c("ipReelMute").textContent=flashOn?"ϟ":"ϟ̸"; const t=stream?.getVideoTracks?.()[0]; try{if(t?.getCapabilities?.().torch)t.applyConstraints({advanced:[{torch:flashOn}]});else toast("Flash is not supported by this camera.");}catch(_){toast("Flash is not supported by this camera.");} };
  $c("ipReelSpeed").onclick = () => { const b=$c("ipReelSpeed"); b.textContent=b.textContent==="1×"?"2×":b.textContent==="2×"?"3×":"1×"; toast("Recording speed set to "+b.textContent+"."); };
  $c("ipReelTimer").onclick = () => toast("Timer selected. Tap the capture button to record.");
  $c("ipReelAudio").onclick = () => toast("Add audio is not connected to a music library yet.");
  $c("ipReelEffect1").onclick = () => toast("Effects library is not connected yet.");
  $c("ipReelEffect2").onclick = () => toast("Choose a photo or video from Gallery for effects.");
  $c("ipCamGallery").onclick = () => galleryInput.click();
  galleryInput.onchange = () => { const files = [...(galleryInput.files || [])]; if(files.length) sendFiles(files); galleryInput.value = ""; };
  cameraOverlay.querySelectorAll("[data-mode]").forEach(btn => btn.onclick = () => setMode(btn.dataset.mode));
  cameraOverlay.querySelectorAll("[data-tool]").forEach(btn => btn.onclick = () => runTool(btn.dataset.tool));
  captureButton.onclick = capture;
}
function toast(message) { const el=$c("ipCamToast"); if(!el)return; el.textContent=message; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.textContent="",2400); }
function setMode(mode) {
  activeMode = mode;
  cameraOverlay.classList.toggle("reelMode", mode === "REEL");
  $c("ipReelAudio").style.display = mode === "REEL" ? "block" : "none";
  cameraOverlay.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  if (mode === "REEL") toast("Reels camera ready. Tap the centre button to record.");
  else if (mode === "STORY") toast("Story mode: take a photo or record a clip.");
  else if (mode === "POST") toast("Post mode: take a photo or choose media from Gallery.");
}
async function startCamera() {
  if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported in this app.");
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1920}},audio:true});
    preview.srcObject=stream; cameraReady=true;
    const track=stream.getVideoTracks()[0]; const caps=track.getCapabilities?.()||{};
    $c("ipCamFlash").style.opacity=caps.torch? "1":".65";
  } catch(e) {
    cameraReady=false; preview.srcObject=null;
    toast("Camera permission needed. You can still choose media from Gallery.");
    console.warn("Insta Pro camera:",e);
  }
}
function closeCamera() {
  cameraOverlay?.classList.remove("open");
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  if(recorder?.state==="recording"){try{recorder.stop();}catch(_){}}
  document.body.style.overflow="";
}
function openCamera() {
  buildCamera(); cameraOverlay.classList.add("open"); document.body.style.overflow="hidden"; setMode("STORY");
  startCamera();
}
function runTool(tool) {
  if(tool==="close"){closeCamera();return;}
  activeTool=tool;
  if(tool==="create") toast("Create mode selected. Tap capture to take a photo.");
  else if(tool==="boomerang") toast("Boomerang effect selected.");
  else if(tool==="effects") toast("Effects selected. Live effects depend on camera support.");
  else if(tool==="layout") toast("Layout selected. Capture photos separately to create a layout.");
  else if(tool==="handsfree") { toast("Hands-free recording: recording will start now."); startRecording(); }
}
async function capture() {
  if(activeMode==="LIVE"){toast("Live streaming is not configured yet.");return;}
  if(activeMode==="REEL" || activeTool==="handsfree") {
    if(recorder?.state==="recording"){recorder.stop();captureButton.classList.remove("recording");return;}
    startRecording();return;
  }
  if(!cameraReady || !preview.videoWidth){toast("Camera unavailable. Use Gallery below.");return;}
  const canvas=document.createElement("canvas"); canvas.width=preview.videoWidth; canvas.height=preview.videoHeight;
  const ctx=canvas.getContext("2d"); if(facing==="user") {ctx.translate(canvas.width,0);ctx.scale(-1,1);} ctx.drawImage(preview,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{if(!blob)return;const file=new File([blob],"instapro-camera-"+Date.now()+".jpg",{type:"image/jpeg"});sendFiles([file]);}, "image/jpeg",.94);
}
function startRecording() {
  if(!stream || !window.MediaRecorder){toast("Video recording is not supported. Select a video from Gallery.");return;}
  try {
    recordedChunks=[];
    const mime=["video/mp4;codecs=h264","video/webm;codecs=vp8","video/webm"].find(t=>MediaRecorder.isTypeSupported(t));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
    recorder.ondataavailable=e=>{if(e.data?.size)recordedChunks.push(e.data);};
    recorder.onstop=()=>{captureButton.classList.remove("recording");if(!recordedChunks.length)return;const type=recorder.mimeType||"video/webm";const ext=type.includes("mp4")?"mp4":"webm";sendFiles([new File(recordedChunks,"instapro-camera-"+Date.now()+"."+ext,{type})]);};
    recorder.start(); captureButton.classList.add("recording");toast("Recording… tap the centre button to finish.");
  } catch(e){toast("Recording could not start. Please use Gallery.");console.warn(e);}
}
function sendFiles(files) {
  const isVideo=files.some(f=>f.type.startsWith("video/"));
  let inputId=activeMode==="REEL"?"reelFile":activeMode==="STORY"?"storyFile":"postFile";
  if(activeMode==="POST" && isVideo) inputId="postFile";
  const input=$c(inputId); if(!input){toast("Upload option is unavailable. Please try again.");return;}
  try {
    const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f)); input.files=dt.files;
    input.dataset.instaProUploadType=activeMode.toLowerCase();
    closeCamera(); input.dispatchEvent(new Event("change",{bubbles:true}));
  } catch(e){toast("Could not open editor. Please select the file again.");console.error(e);}
}
window.openInstaProCamera = openCamera;
function initInstaProCameraCreate() {
  buildCamera();
  // Capture the plus-button event before older handlers can open the Post/Story/Reels chooser.
  const plus = $c("addBtn");
  if (plus && plus.dataset.ipCameraBound !== "1") {
    plus.dataset.ipCameraBound = "1";
    plus.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openCamera();
    }, true);
  }
  if (!document.documentElement.dataset.ipCameraEscapeBound) {
    document.documentElement.dataset.ipCameraEscapeBound = "1";
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && cameraOverlay?.classList.contains("open")) closeCamera();
    });
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInstaProCameraCreate, { once: true });
} else {
  initInstaProCameraCreate();
}
