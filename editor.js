// InstaPro Glass Media Editor — opens before Post/Story upload.
(() => {
  "use strict";

  const FILTERS = [
    ["Original", "none"],
    ["Bright", "brightness(1.14) contrast(1.05)"],
    ["Vintage", "sepia(.38) contrast(1.08)"],
    ["B&W", "grayscale(1)"],
    ["Warm", "sepia(.18) saturate(1.3)"],
    ["Cool", "saturate(.9) hue-rotate(12deg)"],
    ["Vivid", "saturate(1.55) contrast(1.08)"],
    ["Fade", "contrast(.88) brightness(1.08) saturate(.82)"]
  ];

  let root = null;
  let sourceFile = null;
  let sourceUrl = "";
  let audioUrl = "";
  let audioFile = null;
  let sourceInput = null;
  let uploadType = "post";
  let filterIndex = 0;
  let rotation = 0;
  let mirrored = false;
  let cropMode = false;
  let audioElement = null;
  let selectedMusicTrack = null;

  function addStyles() {
    if (document.getElementById("ipe-glass-styles")) return;
    const style = document.createElement("style");
    style.id = "ipe-glass-styles";
    style.textContent = `
      #instaproEditor{position:fixed;inset:0;z-index:1000000;background:#07070b;color:#fff;font-family:inherit;display:flex;flex-direction:column;overflow:hidden}
      #instaproEditor *{box-sizing:border-box}
      #instaproEditor .ipe-head{height:58px;display:flex;align-items:center;gap:12px;padding:0 14px;background:rgba(20,20,27,.62);border-bottom:1px solid rgba(255,255,255,.12);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);flex-shrink:0}
      #instaproEditor .ipe-head strong{font-size:16px;flex:1;text-align:center;letter-spacing:.2px}
      #instaproEditor button{color:#fff;cursor:pointer;font:inherit}
      #instaproEditor .ipe-glass{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.105);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:15px;min-height:40px;padding:9px 13px;box-shadow:inset 0 1px rgba(255,255,255,.08)}
      #instaproEditor .ipe-next{background:rgba(116,75,255,.45);border-color:rgba(176,154,255,.65);font-weight:700;white-space:nowrap}
      #instaproEditor .ipe-main{overflow:auto;overscroll-behavior:contain;flex:1;padding-bottom:calc(20px + env(safe-area-inset-bottom))}
      #instaproEditor .ipe-preview-wrap{position:relative;margin:12px auto 14px;width:calc(100% - 24px);max-width:540px;height:min(49vh,520px);min-height:230px;display:flex;align-items:center;justify-content:center;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at top,rgba(104,83,158,.22),transparent 65%),#111;border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 50px rgba(0,0,0,.32)}
      #instaproEditor #ipeMedia{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;transition:filter .12s,transform .12s}
      #instaproEditor .ipe-preview-wrap.ipe-crop #ipeMedia{object-fit:cover}
      #instaproEditor .ipe-preview-tag{position:absolute;left:10px;top:10px;padding:6px 10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);backdrop-filter:blur(12px);border-radius:99px;font-size:11px}
      #instaproEditor .ipe-tools{display:flex;gap:8px;overflow-x:auto;padding:3px 12px 10px;scrollbar-width:none}
      #instaproEditor .ipe-tools::-webkit-scrollbar,#instaproEditor .ipe-filter-list::-webkit-scrollbar{display:none}
      #instaproEditor .ipe-tools button{flex:0 0 auto}
      #instaproEditor .ipe-section{margin:7px 12px 13px;padding:13px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045)}
      #instaproEditor .ipe-section-title{font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      #instaproEditor .ipe-filter-list{display:flex;gap:8px;overflow-x:auto;padding:2px 0 5px;scrollbar-width:none}
      #instaproEditor .ipe-filter-list button{min-width:76px;border-radius:13px;padding:10px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font-size:12px}
      #instaproEditor .ipe-filter-list button.active{border-color:#b7a2ff;background:rgba(132,95,255,.25)}
      #instaproEditor .ipe-range{display:grid;grid-template-columns:88px 1fr 35px;gap:10px;align-items:center;font-size:12px;margin:13px 0}
      #instaproEditor .ipe-range input{width:100%;accent-color:#b7a2ff}
      #instaproEditor .ipe-range output{text-align:right;opacity:.75;font-variant-numeric:tabular-nums}
      #instaproEditor .ipe-music-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #instaproEditor .ipe-music-row .ipe-music-name{font-size:12px;opacity:.75;flex:1;min-width:100px;overflow-wrap:anywhere}
      #instaproEditor .ipe-hidden{display:none!important}
      #instaproEditor .ipe-hint{font-size:11px;line-height:1.5;opacity:.6;margin:9px 0 0}
      #instaproEditor .ipe-footer{position:sticky;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;background:rgba(8,8,12,.82);border-top:1px solid rgba(255,255,255,.12);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
      #instaproEditor .ipe-footer button{flex:1;min-height:46px;border-radius:16px}
      #instaproEditor .ipe-cancel{background:rgba(255,255,255,.07)}
      #instaproEditor .ipe-publish{background:rgba(117,80,255,.5);border:1px solid rgba(187,166,255,.7);font-weight:750}
      @media(min-width:700px){#instaproEditor .ipe-main{width:100%;max-width:760px;margin:auto}#instaproEditor .ipe-preview-wrap{height:420px}#instaproEditor .ipe-footer{justify-content:center}#instaproEditor .ipe-footer button{max-width:260px}}
      /* Instagram-style vertical Reels editing layout */
      #instaproEditor.ipe-reel-mode{background:#000}
      #instaproEditor.ipe-reel-mode .ipe-head{height:52px;background:#000;border-bottom:0;backdrop-filter:none}
      #instaproEditor.ipe-reel-mode .ipe-head strong{font-size:15px}
      #instaproEditor.ipe-reel-mode .ipe-main{padding:0 0 12px;overflow-y:auto}
      #instaproEditor.ipe-reel-mode .ipe-preview-wrap{width:min(100%,520px);height:min(66vh,720px);min-height:360px;aspect-ratio:9/16;margin:0 auto 10px;border:0;border-radius:18px;background:#111;box-shadow:none;overflow:hidden}
      #instaproEditor.ipe-reel-mode #ipeMedia{width:100%;height:100%;max-width:none;max-height:none;object-fit:contain}
      #instaproEditor.ipe-reel-mode .ipe-preview-wrap.ipe-crop #ipeMedia{object-fit:cover}
      #instaproEditor.ipe-reel-mode .ipe-preview-tag{top:10px;left:10px;background:rgba(0,0,0,.48);font-size:10px}
      #instaproEditor .ipe-reel-rail{position:absolute;right:9px;top:50%;transform:translateY(-45%);display:flex;flex-direction:column;gap:10px;z-index:3}
      #instaproEditor .ipe-reel-rail button{width:42px;height:42px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;background:rgba(0,0,0,.48);border:1px solid rgba(255,255,255,.28);box-shadow:0 2px 10px #0004}
      #instaproEditor.ipe-reel-mode .ipe-tools{padding:4px 12px 9px;gap:7px}
      #instaproEditor.ipe-reel-mode .ipe-tools button{border-radius:999px;min-height:36px;padding:7px 12px;font-size:12px}
      #instaproEditor.ipe-reel-mode .ipe-section{margin:7px 12px 10px;padding:11px;border-radius:14px;background:#111;border-color:#292929}
      #instaproEditor.ipe-reel-mode .ipe-footer{background:#000;border-top:1px solid #252525;padding-top:9px}
      #instaproEditor.ipe-reel-mode .ipe-footer button{border-radius:999px;min-height:44px}
      #instaproEditor.ipe-reel-mode .ipe-publish{background:#fff;color:#111;border:0}
      #instaproEditor.ipe-reel-mode .ipe-cancel{background:#242424;border-color:#444}
      @media(max-width:380px){#instaproEditor.ipe-reel-mode .ipe-preview-wrap{height:62vh;min-height:320px}#instaproEditor .ipe-reel-rail{right:6px;gap:7px}#instaproEditor .ipe-reel-rail button{width:36px;height:36px;font-size:16px}}
      @media(min-width:700px){#instaproEditor.ipe-reel-mode .ipe-main{max-width:620px}#instaproEditor.ipe-reel-mode .ipe-preview-wrap{height:min(68vh,720px);width:min(100%,405px)}#instaproEditor.ipe-reel-mode .ipe-footer button{max-width:260px}}
    `;
    document.head.appendChild(style);
  }

  function setupReelOption() {
    const sheet = document.getElementById("createSheet");
    if (!sheet || document.getElementById("optReel")) return;
    const cancel = document.getElementById("cancelSheet");
    const option = document.createElement("div");
    option.className = "sOpt";
    option.id = "optReel";
    option.textContent = "🎬 Reel";
    sheet.insertBefore(option, cancel || null);
    option.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const input = document.getElementById("postFile");
      if (!input) { alert("Reel upload input nahi mila."); return; }
      const createSheet = document.getElementById("createSheet");
      if (createSheet) { createSheet.classList.remove("show"); createSheet.style.bottom = "-100%"; }
      ["overlay", "sheetOverlay"].forEach(id => {
        const layer = document.getElementById(id);
        if (layer) { layer.classList.remove("show"); layer.style.display = "none"; }
      });
      input.dataset.instaProUploadType = "reel";
      input.value = "";
      input.click();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupReelOption, { once: true });
  } else {
    setupReelOption();
  }

  function open(file, type, input) {
    if (!(file instanceof File) || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      alert("Sirf photo ya video select karein.");
      return;
    }
    close();
    addStyles();
    sourceFile = file;
    uploadType = type || "post";
    sourceInput = input || null;
    filterIndex = 0;
    rotation = 0;
    mirrored = false;
    cropMode = false;
    sourceUrl = URL.createObjectURL(file);
    root = document.createElement("section");
    root.id = "instaproEditor";
    root.classList.toggle("ipe-reel-mode", uploadType === "reel");
    root.innerHTML = `
      <header class="ipe-head">
        <button class="ipe-glass" data-action="close" aria-label="Close editor">✕</button>
        <strong>${uploadType === "reel" ? "Edit Reel" : "InstaPro Studio"}</strong>
        <button class="ipe-glass ipe-next" data-action="next">Next →</button>
      </header>
      <main class="ipe-main">
        <div class="ipe-preview-wrap" id="ipePreviewWrap">
          <span class="ipe-preview-tag">${uploadType === "reel" ? "REEL PREVIEW" : "✦ STUDIO EDITOR"}</span><div class="ipe-reel-rail ${uploadType === "reel" ? "" : "ipe-hidden"}"><button type="button" data-action="browseMusic" aria-label="Add music" title="Add music">♫</button><button type="button" data-action="filters" aria-label="Filters" title="Filters">✧</button><button type="button" data-action="crop" aria-label="Fit or fill" title="Fit / Fill">▣</button><button type="button" data-action="rotate" aria-label="Rotate" title="Rotate">↻</button></div>
          <div id="ipePreview" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
        </div>
        <div class="ipe-tools">
          <button class="ipe-glass" data-action="filters">🎨 Filters</button>
          <button class="ipe-glass" data-action="rotate">↻ Rotate</button>
          <button class="ipe-glass" data-action="mirror">⇋ Mirror</button>
          <button class="ipe-glass" data-action="crop">▣ Fit / Fill</button>
          <button class="ipe-glass" data-action="reset">⟲ Reset</button>
        </div>
        <section class="ipe-section">
          <div class="ipe-section-title"><span>✨ Filters</span><span style="opacity:.55;font-size:11px">Choose a look</span></div>
          <div class="ipe-filter-list" id="ipeFilters"></div>
        </section>
        <section class="ipe-section">
          <div class="ipe-section-title"><span>🎚️ Adjust</span><span style="opacity:.55;font-size:11px">Live preview</span></div>
          <label class="ipe-range">Brightness <input type="range" min="50" max="150" value="100" data-adjust="brightness"><output>100%</output></label>
          <label class="ipe-range">Contrast <input type="range" min="50" max="150" value="100" data-adjust="contrast"><output>100%</output></label>
          <label class="ipe-range">Saturation <input type="range" min="0" max="200" value="100" data-adjust="saturation"><output>100%</output></label>
          <label class="ipe-range">Media volume <input type="range" min="0" max="100" value="100" data-adjust="volume"><output>100%</output></label>
        </section>
        <section class="ipe-section">
          <div class="ipe-section-title"><span>🎵 Add music</span><span style="opacity:.55;font-size:11px">Choose audio</span></div>
          <div class="ipe-music-row">
            <button class="ipe-glass" data-action="browseMusic">🔎 Browse Library</button>
            <button class="ipe-glass" data-action="chooseMusic">＋ From device</button>
            <button class="ipe-glass" data-action="musicPlay" id="ipeMusicPlay" disabled>▶ Preview</button>
            <button class="ipe-glass" data-action="musicRemove" id="ipeMusicRemove" disabled>Remove</button>
            <span class="ipe-music-name" id="ipeMusicName">No music selected</span>
          </div>
          <label class="ipe-range">Music volume <input type="range" min="0" max="100" value="70" data-adjust="musicVolume"><output>70%</output></label>
          <p class="ipe-hint">Library audio can be previewed and saved with the post as a soundtrack reference. Important: this current flow does not mix the music into the actual video file yet.</p>
          <input id="ipeMusicInput" class="ipe-hidden" type="file" accept="audio/*">
        </section>
      </main>
      <footer class="ipe-footer">
        <button class="ipe-glass ipe-cancel" data-action="close">Cancel</button>
        <button class="ipe-publish" data-action="next">${uploadType === "reel" ? "Next →" : "Next: Continue →"}</button>
      </footer>`;
    document.body.appendChild(root);
    document.body.style.overflow = "hidden";

    const preview = root.querySelector("#ipePreview");
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.id = "ipeMedia";
      video.src = sourceUrl;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      preview.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.id = "ipeMedia";
      img.src = sourceUrl;
      img.alt = "Selected media preview";
      preview.appendChild(img);
    }

    root.addEventListener("click", handleClick);
    root.querySelectorAll("[data-adjust]").forEach(input => input.addEventListener("input", adjust));
    renderFilters();
    adjust();
    if (window.__instaProSelectedMusicTrack) {
      const pickedTrack = window.__instaProSelectedMusicTrack;
      window.__instaProSelectedMusicTrack = null;
      selectLibraryMusic(pickedTrack);
    }
  }

  function renderFilters() {
    if (!root) return;
    const list = root.querySelector("#ipeFilters");
    list.innerHTML = FILTERS.map((f, i) => `<button type="button" class="${i === filterIndex ? "active" : ""}" data-filter-index="${i}">${f[0]}</button>`).join("");
    list.querySelectorAll("[data-filter-index]").forEach(button => button.addEventListener("click", () => {
      filterIndex = Number(button.dataset.filterIndex);
      renderFilters();
      adjust();
    }));
  }

  function adjust() {
    if (!root) return;
    const media = root.querySelector("#ipeMedia");
    if (!media) return;
    const val = key => Number(root.querySelector('[data-adjust="' + key + '"]').value);
    media.style.filter = `${FILTERS[filterIndex][1]} brightness(${val("brightness")}%) contrast(${val("contrast")}%) saturate(${val("saturation")}%)`;
    media.style.transform = `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})`;
    if (media.tagName === "VIDEO") media.volume = val("volume") / 100;
    root.querySelectorAll("[data-adjust]").forEach(input => {
      const out = input.parentElement.querySelector("output");
      if (out) out.value = input.value + "%";
    });
    root.querySelector("#ipePreviewWrap").classList.toggle("ipe-crop", cropMode);
    if (audioElement) audioElement.volume = val("musicVolume") / 100;
  }

  function chooseMusic() {
    root?.querySelector("#ipeMusicInput")?.click();
  }

  function onMusicSelected(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("audio/")) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioFile = file;
    selectedMusicTrack = null;
    audioUrl = URL.createObjectURL(file);
    if (audioElement) audioElement.pause();
    audioElement = new Audio(audioUrl);
    audioElement.loop = true;
    audioElement.volume = Number(root.querySelector('[data-adjust="musicVolume"]').value) / 100;
    root.querySelector("#ipeMusicName").textContent = file.name;
    root.querySelector("#ipeMusicPlay").disabled = false;
    root.querySelector("#ipeMusicRemove").disabled = false;
    event.target.value = "";
  }

  function selectLibraryMusic(track) {
    if (!root || !track?.audioUrl) return;
    if (audioElement) audioElement.pause();
    if (audioUrl && !selectedMusicTrack) URL.revokeObjectURL(audioUrl);
    audioFile = null;
    selectedMusicTrack = track;
    audioUrl = track.audioUrl;
    audioElement = new Audio(audioUrl);
    audioElement.loop = true;
    audioElement.volume = Number(root.querySelector('[data-adjust="musicVolume"]').value) / 100;
    root.querySelector("#ipeMusicName").textContent = `${track.title || "Music"}${track.artistName ? " — " + track.artistName : ""}`;
    root.querySelector("#ipeMusicPlay").disabled = false;
    root.querySelector("#ipeMusicRemove").disabled = false;
    root.querySelector("#ipeMusicPlay").textContent = "▶ Preview";
  }

  async function toggleMusicPreview() {
    if (!audioElement) return;
    const button = root.querySelector("#ipeMusicPlay");
    if (audioElement.paused) {
      try {
        await audioElement.play();
        button.textContent = "⏸ Pause";
      } catch (error) {
        alert("Music preview nahi chal paya: " + error.message);
      }
    } else {
      audioElement.pause();
      button.textContent = "▶ Preview";
    }
  }

  function removeMusic() {
    if (audioElement) audioElement.pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioElement = null;
    audioUrl = "";
    audioFile = null;
    selectedMusicTrack = null;
    if (!root) return;
    root.querySelector("#ipeMusicName").textContent = "No music selected";
    root.querySelector("#ipeMusicPlay").disabled = true;
    root.querySelector("#ipeMusicPlay").textContent = "▶ Preview";
    root.querySelector("#ipeMusicRemove").disabled = true;
    root.querySelector("#ipeMusicInput").value = "";
  }

  function handleClick(event) {
    const filterButton = event.target.closest("[data-filter-index]");
    if (filterButton) return;
    const button = event.target.closest("[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "close": close(); break;
      case "filters": root.querySelector("#ipeFilters").scrollIntoView({behavior: "smooth", block: "center"}); break;
      case "rotate": rotation = (rotation + 90) % 360; adjust(); break;
      case "mirror": mirrored = !mirrored; adjust(); break;
      case "crop": cropMode = !cropMode; adjust(); break;
      case "reset":
        filterIndex = 0; rotation = 0; mirrored = false; cropMode = false;
        root.querySelectorAll('[data-adjust]').forEach(input => {
          input.value = input.dataset.adjust === "musicVolume" ? 70 : 100;
        });
        renderFilters(); adjust(); break;
      case "chooseMusic": chooseMusic(); break;
      case "browseMusic":
        if (window.InstaProMusic?.openPicker) window.InstaProMusic.openPicker(selectLibraryMusic);
        else alert("Music Library load ho rahi hai. Thodi der baad dobara try karein.");
        break;
      case "musicPlay": toggleMusicPreview(); break;
      case "musicRemove": removeMusic(); break;
      case "next": continueUpload(); break;
    }
  }

  async function renderEditedImage(file) {
    const media = root?.querySelector("#ipeMedia");
    if (!media || media.tagName !== "IMG") return file;
    const image = new Image();
    image.src = sourceUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Edited photo load nahi ho payi."));
    });
    const sideways = Math.abs(rotation % 180) === 90;
    const canvas = document.createElement("canvas");
    canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
    canvas.height = sideways ? image.naturalWidth : image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo editor canvas start nahi hua.");
    const val = key => Number(root.querySelector('[data-adjust="' + key + '"]').value);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(mirrored ? -1 : 1, 1);
    ctx.filter = `${FILTERS[filterIndex][1]} brightness(${val("brightness")}%) contrast(${val("contrast")}%) saturate(${val("saturation")}%)`;
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type || "image/jpeg", 0.94));
    if (!blob) throw new Error("Edited photo export nahi ho paya.");
    const name = file.name.replace(/\\.[^.]+$/, "") + "-instapro." + ((blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg"));
    return new File([blob], name, { type: blob.type || file.type, lastModified: Date.now() });
  }

  async function continueUpload() {
    if (!sourceFile || !sourceInput) {
      alert("Editor ka upload connection nahi mila. Gallery se dobara select karein.");
      return;
    }
    const input = sourceInput;
    const desiredType = uploadType;
    let file = sourceFile;
    try {
      if (file.type.startsWith("image/")) file = await renderEditedImage(file);
      window.__instaProPendingMusicFile = audioFile || null;
      window.__instaProPendingMusicTrack = selectedMusicTrack ? {...selectedMusicTrack} : null;
      close();
      if (desiredType === "reel") input.dataset.instaProUploadType = "reel";
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dataset.ipeBypassEditor = "true";
      input.dispatchEvent(new Event("change", {bubbles: true}));
    } catch (error) {
      alert("Upload continue nahi ho paya: " + error.message);
    }
  }

  function close() {
    if (sourceInput && sourceFile) delete sourceInput.dataset.instaProUploadType;
    if (root) root.remove();
    root = null;
    if (audioElement) audioElement.pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    audioElement = null;
    audioUrl = "";
    audioFile = null;
    selectedMusicTrack = null;
    sourceUrl = "";
    sourceFile = null;
    sourceInput = null;
    document.body.style.overflow = "";
  }

  // Legacy editor interception disabled: upload.js owns the Post, Story, and Reel editor flows.
  // Keep the API available for compatibility, but do not intercept file input change events.

  window.InstaProEditor = { open, close };
  console.log("InstaPro Glass Editor initialized");
})();
