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
  .ipCamTools{position:absolute;left:20px;top:40%;transform:translateY(-5%);display:flex;flex-direction:column;gap:24px;z-index:3}
  .ipCamTool{display:flex;align-items:center;gap:24px;border:0;background:transparent;color:white;text-align:left;font-size:17px;font-weight:600;padding:0;text-shadow:0 1px 4px #111}
  .ipCamTool .ico{font-size:35px;width:76px;text-align:center;line-height:1}
  .ipCamBottom{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 24px);z-index:4}
  .ipCamControls{display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:42px}
  #ipCamGallery{width:62px;height:62px;border-radius:14px;object-fit:cover;border:2px solid #aaa;background:#222;position:absolute;left:32px;bottom:4px}
  #ipCamCapture{width:106px;height:106px;border:6px solid #eee;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 4px #111;position:relative}
  #ipCamCapture:after{content:"";position:absolute;inset:8px;border-radius:50%;border:2px solid rgba(0,0,0,.55)}
  #ipCamCapture.recording{background:#f33}
  .ipCamModes{display:flex;justify-content:center;align-items:center;gap:20px;white-space:nowrap;overflow-x:auto;padding:0 22px;scrollbar-width:none}
  .ipCamModes button{color:#bbb;background:transparent;border:0;font-size:17px;letter-spacing:3px;padding:5px 0;font-weight:500}
  .ipCamModes button.active{color:#fff;font-weight:800}
  #ipCamClose{font-size:34px}
  #ipCamToast{position:absolute;top:25%;left:20%;right:10%;text-align:center;font-size:13px;color:white;z-index:5;text-shadow:0 1px 4px #000}
  @media(max-height:650px){.ipCamTools{top:29%;gap:14px}.ipCamTool .ico{font-size:28px;width:54px}.ipCamTool{gap:12px;font-size:15px}.ipCamControls{margin-bottom:22px}#ipCamCapture{width:82px;height:82px}}
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
    <div class="ipCamBottom"><div class="ipCamControls"><img id="ipCamGallery" alt="Open gallery"><button id="ipCamCapture" aria-label="Take photo or start recording"></button><button class="ipCamIcon" id="ipCamFlip" aria-label="Flip camera">⇄</button></div><div class="ipCamModes"><button data-mode="POST">POST</button><button data-mode="STORY" class="active">STORY</button><button data-mode="REEL">REEL</button><button data-mode="LIVE">LIVE</button></div></div>
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
  $c("ipCamSettings").onclick = () => toast("Camera settings: use the gear icon to access available camera controls.");
  $c("ipCamGallery").onclick = () => galleryInput.click();
  galleryInput.onchange = () => { const files = [...(galleryInput.files || [])]; if(files.length) sendFiles(files); galleryInput.value = ""; };
  cameraOverlay.querySelectorAll("[data-mode]").forEach(btn => btn.onclick = () => setMode(btn.dataset.mode));
  cameraOverlay.querySelectorAll("[data-tool]").forEach(btn => btn.onclick = () => runTool(btn.dataset.tool));
  captureButton.onclick = capture;
}
function toast(message) { const el=$c("ipCamToast"); if(!el)return; el.textContent=message; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.textContent="",2400); }
function setMode(mode) {
  activeMode=mode;
  cameraOverlay.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  if(mode==="LIVE") toast("Live streaming setup is not available yet. Choose Post, Story or Reel.");
  else if(mode==="REEL") toast("Tap capture to start recording; tap again to finish.");
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
  const thumb=$c("ipCamGallery"); thumb.src=""; startCamera();
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
document.addEventListener("DOMContentLoaded",()=>{
  buildCamera();
  // Open full-screen camera directly from the bottom plus button, without changing existing upload handlers.
  const plus=$c("addBtn");
  if(plus){plus.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();openCamera();},true);}
  // Keep the existing post/story/reel chooser functional as a fallback entry point.
  document.addEventListener("keydown",e=>{if(e.key==="Escape" && cameraOverlay?.classList.contains("open"))closeCamera();});
});
