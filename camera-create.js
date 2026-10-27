/* Intube Camera Studio — replacement camera engine.
   Keeps the existing upload.js inputs and Cloudinary upload flow intact. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const EFFECTS = [
    {id:"none",name:"Normal",css:"none",swatch:"linear-gradient(135deg,#e8c9aa,#a7b8ca 52%,#293142)"},
    {id:"sunset",name:"Sunset",css:"sepia(.2) saturate(1.45) hue-rotate(-12deg) contrast(1.08)",swatch:"linear-gradient(135deg,#ffb347,#ff416c)"},
    {id:"cinema",name:"Cinema",css:"contrast(1.22) saturate(.84) brightness(.94)",swatch:"linear-gradient(135deg,#20204f,#b86e8b)"},
    {id:"fade",name:"Fade",css:"contrast(.84) brightness(1.08) saturate(.78)",swatch:"linear-gradient(135deg,#aaa,#e8d2b8)"},
    {id:"vivid",name:"Vivid",css:"saturate(1.75) contrast(1.08)",swatch:"linear-gradient(135deg,#ff512f,#f09819)"},
    {id:"noir",name:"Noir",css:"grayscale(1) contrast(1.3)",swatch:"linear-gradient(135deg,#f6f6f6,#777 52%,#111)"}
  ];
  let root=null, video=null, stream=null, recorder=null, outputStream=null, renderCanvas=null;
  let chunks=[], raf=0, mode="STORY", facing="user", filter="none", timerSeconds=0, zoom=1;
  let ready=false, recording=false, recordingStarted=0, maxTimer=0, holdTimer=0, pointerDownAt=0, suppressClick=false;
  let audioTrack=null, handsFree=false, flash=false;

  function build() {
    if ($("ipCameraCreate")) { root=$("ipCameraCreate"); video=$("ipCamPreview"); return; }
    const style=document.createElement("style");
    style.id="ipCameraStudioStyle";
    style.textContent=`
      #ipCameraCreate{position:fixed;inset:0;z-index:2147482000;display:none;overflow:hidden;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;isolation:isolate;touch-action:manipulation}
      #ipCameraCreate.open{display:block}#ipCameraCreate *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      #ipCamPreview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#080808}
      #ipCamShade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#0007,transparent 23%,transparent 68%,#0008)}
      .ics-top{position:absolute;z-index:10;top:max(8px,env(safe-area-inset-top));left:12px;right:12px;height:44px;display:grid;grid-template-columns:44px 1fr 44px;align-items:center}
      .ics-icon{width:42px;height:42px;border:0;background:#0003;color:#fff;border-radius:50%;display:grid;place-items:center;font-size:27px}
      .ics-icon svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8}
      .ics-pills{display:flex;justify-content:center;gap:8px}.ics-pill{min-width:44px;height:34px;padding:0 10px;border:0;border-radius:22px;background:#202020bf;color:#fff;font-size:13px;font-weight:650}
      .ics-audio{position:absolute;z-index:10;top:calc(max(8px,env(safe-area-inset-top)) + 52px);left:50%;transform:translateX(-50%);height:34px;max-width:78vw;padding:0 15px;border:0;border-radius:20px;background:#0009;color:#fff;font-size:13px;font-weight:650;white-space:nowrap}
      .ics-tools{position:absolute;z-index:10;left:12px;top:47%;transform:translateY(-45%);display:flex;flex-direction:column;gap:12px}
      .ics-tools[hidden]{display:none!important}.ics-tool{position:relative;width:38px;height:38px;border:0;border-radius:11px;background:#0009;color:#fff;display:grid;place-items:center;padding:0}
      .ics-tool svg{width:23px;height:23px;stroke:currentColor;fill:none;stroke-width:1.8}.ics-tool.active{outline:1.5px solid #fff}
      .ics-tool .ics-num{position:absolute;font-size:11px;font-weight:800}
      .ics-bottom{position:absolute;z-index:12;left:0;right:0;bottom:0;height:202px;padding-bottom:env(safe-area-inset-bottom);pointer-events:none}
      .ics-gallery-row{position:absolute;left:0;right:0;top:7px;height:42px;padding:0 25px;display:flex;justify-content:space-between;align-items:center;pointer-events:auto}
      .ics-gallery{width:38px;height:38px;border:1.5px solid #fff;border-radius:9px;background:linear-gradient(135deg,#526e8c,#d1b6a3 52%,#344e4a);color:#fff;font-size:21px}
      .ics-flip{width:42px;height:42px;border:0;background:transparent;color:#fff;font-size:28px}
      #icsShutterRow{position:absolute;top:48px;left:0;right:0;height:82px;display:flex;align-items:center;justify-content:center;pointer-events:none}
      #icsShutter{width:76px;height:76px;flex:0 0 76px;border:3px solid #fff;border-radius:50%;background:transparent;box-shadow:0 0 0 2px #0007;position:relative;pointer-events:auto;touch-action:none;padding:0}
      #icsShutter:after{content:"";position:absolute;inset:5px;border-radius:50%;background:#fff;transition:all .12s}
      #icsShutter.recording{border-color:#ff315f}#icsShutter.recording:after{inset:17px;border-radius:9px;background:#ff315f}
      #icsModeBar{position:absolute;top:140px;left:0;right:0;height:34px;display:flex;align-items:center;justify-content:center;gap:18px;pointer-events:auto}
      #icsModeBar button{height:30px;padding:0 2px;border:0;background:transparent;color:#c2c2c2;font-size:12px;letter-spacing:1.8px;font-weight:750;position:relative}
      #icsModeBar button.active{color:#fff;font-weight:900}#icsModeBar button.active:after{content:"";position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:22px;height:2px;border-radius:2px;background:#fff}
      #icsFilterBar{position:absolute;z-index:11;left:0;right:0;bottom:calc(195px + env(safe-area-inset-bottom));height:75px;display:flex;align-items:center;gap:9px;padding:3px calc(50% - 29px);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;touch-action:pan-x;background:transparent;scroll-behavior:smooth}#icsFilterBar:after{content:"";position:fixed;left:50%;bottom:calc(195px + env(safe-area-inset-bottom) + 15px);transform:translateX(-50%);width:49px;height:49px;border:2px solid #fff;border-radius:50%;pointer-events:none;z-index:20;box-shadow:0 0 0 1px #0008}
      #icsFilterBar::-webkit-scrollbar{display:none}.ics-filter{flex:0 0 58px;width:58px;height:67px;border:0;background:transparent;color:#a7a7a7;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;scroll-snap-align:center;font-size:9px;font-weight:550;text-shadow:0 1px 3px #000;opacity:.82}.ics-filter.active{color:#fff;font-weight:800;opacity:1}
      .ics-swatch{display:block;width:45px;height:45px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #0005 inset}
      .ics-filter.active .ics-swatch{border:2px solid #ff2d75;box-shadow:0 0 0 2px #fff}
      #icsToast{position:absolute;z-index:20;left:50%;bottom:220px;transform:translateX(-50%);max-width:88%;padding:10px 14px;border-radius:18px;background:#222e;color:#fff;font-size:13px;text-align:center;pointer-events:none}
      #icsProgress{position:absolute;z-index:13;left:0;right:0;bottom:0;height:3px;background:#ffffff30;display:none}
      #icsProgress span{display:block;width:0;height:100%;background:#ff315f}
      #icsInput{display:none}
      @media(max-height:650px){.ics-tools{top:43%;gap:7px}.ics-tool{width:34px;height:34px}#icsFilterBar{bottom:calc(180px + env(safe-area-inset-bottom))}.ics-bottom{height:190px}#icsModeBar{top:133px}}
    `;
    document.head.appendChild(style);
    root=document.createElement("section");root.id="ipCameraCreate";root.setAttribute("aria-label","Camera");
    root.innerHTML=`
      <video id="ipCamPreview" autoplay playsinline muted></video><div id="ipCamShade"></div>
      <div class="ics-top">
        <button class="ics-icon" id="icsClose" aria-label="Close camera">×</button>
        <div class="ics-pills">
          <button class="ics-pill" id="icsFlash" aria-label="Flash">ϟ</button>
          <button class="ics-pill" id="icsZoom">1x</button>
          <button class="ics-pill" id="icsTimer" aria-label="Timer">◷</button>
        </div>
        <button class="ics-icon" id="icsSettings" aria-label="Camera settings">⚙</button>
      </div>
      <button class="ics-audio" id="icsAudio">♫ Add audio</button>
      <div class="ics-tools" id="icsStoryTools">
        <button class="ics-tool" data-action="create" aria-label="Create text"><b>Aa</b></button>
        <button class="ics-tool" data-action="boomerang" aria-label="Boomerang"><span style="font-size:25px">∞</span></button>
        <button class="ics-tool" data-action="effects" aria-label="Effects">✧</button>
        <button class="ics-tool" data-action="layout" aria-label="Layout">▦</button>
        <button class="ics-tool" data-action="handsfree" aria-label="Hands-free">◎</button>
      </div>
      <div class="ics-tools" id="icsReelTools" hidden>
        <button class="ics-tool" data-action="music" aria-label="Music">♫</button>
        <button class="ics-tool" data-action="effects" aria-label="Effects">✧</button>
        <button class="ics-tool" data-action="avatar" aria-label="Avatar">☺</button>
        <button class="ics-tool" data-action="draw" aria-label="Draw">✎</button>
        <button class="ics-tool" data-action="duration" aria-label="Duration"><span class="ics-num">15</span>◷</button>
      </div>
      <div class="ics-tools" id="icsPostTools" hidden>
        <button class="ics-tool" data-action="post-media" aria-label="Choose multiple photos">▧</button>
      </div>
      <div id="icsFilterBar" aria-label="Camera filters"></div>
      <div class="ics-bottom">
        <div class="ics-gallery-row"><button class="ics-gallery" id="icsGallery" aria-label="Open gallery">▧</button><button class="ics-flip" id="icsFlip" aria-label="Switch camera">⇄</button></div>
        <div id="icsShutterRow"><button id="icsShutter" aria-label="Take photo or record video"></button></div>
        <div id="icsModeBar"><button type="button" data-mode="POST">POST</button><button type="button" data-mode="STORY" class="active">STORY</button><button type="button" data-mode="REEL">REEL</button></div>
      </div>
      <div id="icsProgress"><span></span></div><div id="icsToast" role="status" aria-live="polite"></div>
      <input id="icsInput" type="file" accept="image/*,video/*">
    `;
    document.body.appendChild(root);video=$("ipCamPreview");
    $("icsFilterBar").innerHTML=EFFECTS.map(e=>`<button class="ics-filter${e.id==="none"?" active":""}" type="button" data-filter="${e.id}"><span class="ics-swatch" style="background:${e.swatch};filter:${e.css}"></span><span>${e.name}</span></button>`).join("");
    bind();
  }
  function toast(text){const el=$("icsToast");if(!el)return;el.textContent=text;el.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>{if(el)el.textContent="";},2200);}
  function effectCSS(){return EFFECTS.find(e=>e.id===filter)?.css||"none";}
  function setFilter(id,scroll=true){filter=id; if(video)video.style.filter=effectCSS();$("icsFilterBar")?.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===id));if(scroll){const el=$("icsFilterBar")?.querySelector('[data-filter="'+id+'"]');el?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});}}
  function setMode(next){if(!["POST","STORY","REEL"].includes(next))return;mode=next;
    $("icsModeBar").querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===next));
    $("icsStoryTools").hidden=next!=="STORY";$("icsReelTools").hidden=next!=="REEL";$("icsPostTools").hidden=next!=="POST";
    $("icsAudio").style.display=next==="REEL"?"block":"none";
    const input=$("icsInput");input.accept=next==="REEL"?"video/*":"image/*,video/*";input.multiple=next==="POST";
    setFilter(filter,false);toast(next.charAt(0)+next.slice(1).toLowerCase()+" mode");
  }
  async function startCamera(){
    stopStream();
    if(!navigator.mediaDevices?.getUserMedia){toast("Camera needs HTTPS and browser permission. Gallery is available.");return;}
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1920}},audio:true});
      if(!root?.classList.contains("open")){s.getTracks().forEach(t=>t.stop());return;}
      stream=s;video.srcObject=s;video.style.transform=facing==="user"?"scaleX(-1)":"none";await video.play();ready=true;
      const track=s.getVideoTracks()[0];if(zoom>1&&track.getCapabilities?.().zoom){const cap=track.getCapabilities().zoom;await track.applyConstraints({advanced:[{zoom:Math.min(cap.max,Math.max(cap.min,zoom))}]}).catch(()=>{});}
    }catch(err){ready=false;console.warn("Intube camera permission/device:",err);toast("Camera permission nahi mili. Gallery se media select karein.");}
  }
  function stopStream(){ready=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(video)video.srcObject=null;}
  function open(){build();root.classList.add("open");document.body.style.overflow="hidden";setMode("STORY");startCamera();}
  function close(){if(recording)stopRecording();root?.classList.remove("open");stopStream();document.body.style.overflow="";}
  function bind(){
    $("icsClose").onclick=close;
    $("icsFlip").onclick=async()=>{facing=facing==="user"?"environment":"user";await startCamera();};
    $("icsFlash").onclick=async()=>{const track=stream?.getVideoTracks?.()[0];try{const cap=track?.getCapabilities?.();if(!cap?.torch)throw Error("unsupported");flash=!flash;await track.applyConstraints({advanced:[{torch:flash}]});$("icsFlash").style.background=flash?"#ff2d75":"#202020bf";}catch(_){toast("Flash is not supported by this camera.");}};
    $("icsZoom").onclick=async()=>{zoom=zoom>=2?1:zoom+.5;$("icsZoom").textContent=zoom+"x";const track=stream?.getVideoTracks?.()[0];try{const cap=track?.getCapabilities?.().zoom;if(cap)await track.applyConstraints({advanced:[{zoom:Math.min(cap.max,Math.max(cap.min,zoom))}]});else toast("Zoom is not supported by this camera.");}catch(_){toast("Zoom is not supported by this camera.");}};
    $("icsTimer").onclick=()=>{timerSeconds=timerSeconds===0?3:timerSeconds===3?10:0;$("icsTimer").textContent=timerSeconds?timerSeconds+"s":"◷";toast(timerSeconds?"Timer "+timerSeconds+" seconds":"Timer off");};
    $("icsSettings").onclick=()=>toast("Flash, zoom and timer depend on your device camera.");
    $("icsAudio").onclick=()=>{if(window.InstaProMusic?.openPicker){window.InstaProMusic.openPicker(track=>{audioTrack=track;window.__instaProSelectedMusicTrack=track;toast(track?.title?"Audio selected: "+track.title:"Audio selected");});}else toast("Music library is loading. Try again in a moment.");};
    $("icsGallery").onclick=()=>{$("icsInput").click();};
    $("icsInput").onchange=()=>{const files=[...($("icsInput").files||[])];if(files.length)sendFiles(files);$("icsInput").value="";};
    $("icsModeBar").querySelectorAll("[data-mode]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();if(recording)stopRecording();setMode(b.dataset.mode);});
    $("icsFilterBar").querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>setFilter(b.dataset.filter));
    $("icsFilterBar").addEventListener("scroll",()=>{const center=innerWidth/2;let closest=null,d=Infinity;$("icsFilterBar").querySelectorAll("[data-filter]").forEach(b=>{const r=b.getBoundingClientRect(),n=Math.abs(r.left+r.width/2-center);if(n<d){d=n;closest=b;}});if(closest)setFilter(closest.dataset.filter,false);},{passive:true});
    root.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>tool(b.dataset.action));
    const shutter=$("icsShutter");
    shutter.addEventListener("pointerdown",e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();pointerDownAt=Date.now();suppressClick=false;holdTimer=setTimeout(()=>{suppressClick=true;if(mode==="POST"){handsFree=true;startRecording();}else startRecording();},260);});
    const release=e=>{if(holdTimer){clearTimeout(holdTimer);holdTimer=0;}if(mode==="REEL"){if(recording){stopRecording();suppressClick=true;}else if(!suppressClick){startRecording();suppressClick=true;}}else if(recording){stopRecording();suppressClick=true;}else if(!suppressClick){if(timerSeconds)countdownCapture();else capturePhoto();}try{shutter.releasePointerCapture(e.pointerId);}catch(_){}};
    shutter.addEventListener("pointerup",release);shutter.addEventListener("pointercancel",release);
    shutter.addEventListener("click",e=>{e.preventDefault();if(suppressClick){suppressClick=false;return;}if(recording)stopRecording();else if(timerSeconds)countdownCapture();else if(mode==="REEL")startRecording();else capturePhoto();});
  }
  function tool(action){if(action==="effects"){const bar=$("icsFilterBar");bar.style.display=bar.style.display==="none"?"flex":"none";return;}if(action==="music"){$("icsAudio").click();return;}if(action==="post-media"){$("icsInput").click();return;}if(action==="duration"){toast("Reel recording can last up to 90 seconds.");return;}if(action==="handsfree"){handsFree=!handsFree;toast(handsFree?"Hands-free on: tap shutter to start/stop":"Hands-free off");return;}if(["create","boomerang","layout","avatar","draw"].includes(action))toast(action[0].toUpperCase()+action.slice(1)+" effect is not yet supported in this web camera.");}
  function countdownCapture(){const shutter=$("icsShutter");shutter.disabled=true;let left=timerSeconds;const tick=()=>{if(left<=0){shutter.disabled=false;capturePhoto();return;}toast(String(left));left--;setTimeout(tick,1000);};tick();}
  function capturePhoto(){if(!ready||!video?.videoWidth){toast("Camera is still starting. Use Gallery or try again.");return;}const c=document.createElement("canvas");c.width=video.videoWidth;c.height=video.videoHeight;const ctx=c.getContext("2d");ctx.filter=effectCSS();if(facing==="user"){ctx.translate(c.width,0);ctx.scale(-1,1);}ctx.drawImage(video,0,0,c.width,c.height);c.toBlob(blob=>{if(blob)sendFiles([new File([blob],"intube-photo-"+Date.now()+".jpg",{type:"image/jpeg"})]);else toast("Could not capture photo.");},"image/jpeg",.94);}
  function startRecording(){
    if(recording)return;
    if(!ready||!stream||!video?.videoWidth){toast("Camera is still starting. Try again.");return;}
    if(!window.MediaRecorder){toast("Video recording is not supported by this browser. Use Gallery.");return;}
    try{
      chunks=[];renderCanvas=document.createElement("canvas");renderCanvas.width=video.videoWidth;renderCanvas.height=video.videoHeight;
      const ctx=renderCanvas.getContext("2d",{alpha:false});
      const draw=()=>{if(!recording||!ctx)return;ctx.save();ctx.filter=effectCSS();ctx.clearRect(0,0,renderCanvas.width,renderCanvas.height);if(facing==="user"){ctx.translate(renderCanvas.width,0);ctx.scale(-1,1);}ctx.drawImage(video,0,0,renderCanvas.width,renderCanvas.height);ctx.restore();raf=requestAnimationFrame(draw);};
      // Build a separate video stream so the chosen filter is applied to the actual saved video.
      outputStream=renderCanvas.captureStream(30);stream.getAudioTracks().forEach(t=>outputStream.addTrack(t));
      const mime=["video/webm;codecs=vp8,opus","video/webm;codecs=vp9,opus","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(outputStream,mime?{mimeType:mime}:undefined);
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      recorder.onerror=e=>{console.error("Intube recording error",e);toast("Recording failed. Please try again.");};
      recorder.onstop=()=>{cancelAnimationFrame(raf);outputStream?.getTracks().forEach(t=>t.stop());outputStream=null;recording=false;$("icsShutter")?.classList.remove("recording");$("icsProgress").style.display="none";clearTimeout(maxTimer);if(!chunks.length)return;const type=recorder.mimeType||"video/webm",ext=type.includes("mp4")?"mp4":"webm";const file=new File(chunks,"intube-"+mode.toLowerCase()+"-"+Date.now()+"."+ext,{type});if(mode==="REEL"){showReelReview(file);return;}sendFiles([file]);};
      recording=true;recordingStarted=Date.now();draw();recorder.start(200);$("icsShutter").classList.add("recording");$("icsProgress").style.display="block";toast("Recording… tap shutter to stop.");
      const limit=mode==="REEL"?90000:60000;maxTimer=setTimeout(()=>{if(recording)stopRecording();},limit);
    }catch(err){recording=false;cancelAnimationFrame(raf);outputStream?.getTracks().forEach(t=>t.stop());outputStream=null;console.error(err);toast("Recording could not start. Please use Gallery.");}
  }
  function showReelReview(file){
    root.querySelector("#icsReelReview")?.remove();
    const panel=document.createElement("div");panel.id="icsReelReview";
    panel.style.cssText="position:absolute;inset:0;z-index:2147482500;background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 24px);gap:18px";
    const preview=document.createElement("video");preview.controls=true;preview.playsInline=true;preview.autoplay=true;preview.src=URL.createObjectURL(file);preview.style.cssText="width:100%;height:min(68dvh,680px);object-fit:contain;background:#000;border-radius:12px";
    const row=document.createElement("div");row.style.cssText="display:flex;gap:12px;width:100%;max-width:420px";
    const retake=document.createElement("button");retake.type="button";retake.textContent="Retake";retake.style.cssText="flex:1;height:48px;border:1px solid #ffffff65;border-radius:26px;background:#171717;color:#fff;font-size:16px;font-weight:700";
    const next=document.createElement("button");next.type="button";next.textContent="Next →";next.style.cssText="flex:1;height:48px;border:0;border-radius:26px;background:#fff;color:#111;font-size:16px;font-weight:800";
    row.append(retake,next);panel.append(preview,row);root.appendChild(panel);
    retake.onclick=()=>{URL.revokeObjectURL(preview.src);panel.remove();chunks=[];toast("Ready to record again.");};
    next.onclick=()=>{URL.revokeObjectURL(preview.src);panel.remove();sendFiles([file]);};
  }
  function stopRecording(){if(!recording)return;recording=false;clearTimeout(maxTimer);cancelAnimationFrame(raf);try{if(recorder&&recorder.state!=="inactive")recorder.stop();}catch(e){console.warn(e);} }
  function sendFiles(files){
    const list=mode==="POST"?files:files.slice(0,1);const videoFile=list.some(f=>f.type.startsWith("video/"));
    const id=mode==="REEL"?"reelFile":mode==="STORY"?"storyFile":"postFile";const input=$(id);
    if(!input){toast("Upload option is missing. Please try again.");return;}
    try{const dt=new DataTransfer();list.forEach(f=>dt.items.add(f));input.files=dt.files;input.dataset.instaProUploadType=mode.toLowerCase();if(videoFile)input.dataset.instaProCameraRecordedVideo="true";close();input.dispatchEvent(new Event("change",{bubbles:true}));}
    catch(err){console.error("Could not pass camera media to editor:",err);toast("Could not open editor. Please choose the media again.");}
  }
  window.openInstaProCamera=open;
  window.closeInstaProCamera=close;
  function init(){build();const plus=$("addBtn");if(plus&&plus.dataset.ipCameraBound!=="2"){plus.dataset.ipCameraBound="2";plus.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();},true);}if(!document.documentElement.dataset.ipCameraEscapeBound){document.documentElement.dataset.ipCameraEscapeBound="1";document.addEventListener("keydown",e=>{if(e.key==="Escape"&&root?.classList.contains("open"))close();});}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
