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
      #instaproEditor .ipe-head strong{display:none}
      #instaproEditor button{color:#fff;cursor:pointer;font:inherit}
      #instaproEditor .ipe-glass{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.105);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:15px;min-height:40px;padding:9px 13px;box-shadow:inset 0 1px rgba(255,255,255,.08)}
      #instaproEditor .ipe-next{background:#202027;border-color:#202027;font-weight:600;white-space:nowrap;color:#fff;min-width:76px}\n      #instaproEditor .ipe-head [data-action="close"]{width:42px;height:42px;min-height:42px;padding:0;border:0;background:transparent;font-size:0;position:relative}\n      #instaproEditor .ipe-head [data-action="close"]::before,#instaproEditor .ipe-head [data-action="close"]::after{content:"";position:absolute;left:10px;top:20px;width:22px;height:2px;background:#f5f5f5;border-radius:2px;transform:rotate(45deg)}\n      #instaproEditor .ipe-head [data-action="close"]::after{transform:rotate(-45deg)}
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
      #instaproEditor .ipe-footer{position:sticky;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;background:rgba(8,8,12,.82);border-top:1px solid rgba(255,255,255,.12);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}\n      #instaproEditor .ipe-bottom-tools{flex-shrink:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px;padding:10px 5px calc(7px + env(safe-area-inset-bottom));background:#090909;border-top:1px solid #1d1d1d}\n      #instaproEditor .ipe-bottom-tools button{border:0;background:transparent;min-width:0;min-height:55px;padding:3px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#e7e7e7;font-size:11px}\n      #instaproEditor .ipe-bottom-tools svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n      #instaproEditor .ipe-bottom-tools button:active{opacity:.65}
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
      #instaproEditor.ipe-reel-mode .ipe-footer{background:#000;border-top:1px solid #252525;padding-top:9px}\n      #instaproEditor.ipe-reel-mode .ipe-bottom-tools{background:#080808}
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
        <strong></strong>
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
      </footer>\n      <nav class="ipe-bottom-tools" aria-label="Editor tools">
        <button type="button" data-tool="edit"><svg viewBox="0 0 24 24"><path d="M3 6l6 6-6 6M21 6l-6 6 6 6M9 12h6"/></svg><span>Edit</span></button>
        <button type="button" data-tool="audio"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>Audio</span></button>
        <button type="button" data-tool="text"><svg viewBox="0 0 24 24"><path d="M3 5h18M12 5v15"/></svg><span>Text</span></button>
        <button type="button" data-tool="effects"><svg viewBox="0 0 24 24"><path d="M12 2l2.7 6.1L21 9l-4.6 4.3 1.2 6.4L12 16.4l-5.6 3.3 1.2-6.4L3 9l6.3-.9z"/></svg><span>Effects</span></button>
        <button type="button" data-tool="overlay"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Overlay</span></button>
        <button type="button" data-tool="captions"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9h12M6 13h7M6 16h5"/></svg><span>Captions</span></button>
      </nav>`;
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
    root.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => {
      const target = {
        edit: root.querySelector(".ipe-tools"),
        audio: root.querySelector("#ipeAudioSection"),
        text: root.querySelector('[data-adjust="brightness"]')?.closest(".ipe-section"),
        effects: root.querySelector("#ipeEffectsSection"),
        overlay: root.querySelector(".ipe-tools"),
        captions: root.querySelector('[data-adjust="contrast"]')?.closest(".ipe-section")
      }[button.dataset.tool];
      if (target) target.scrollIntoView({behavior:"smooth", block:"center"});
      if (button.dataset.tool === "edit") root.querySelector('[data-action="rotate"]')?.focus({preventScroll:true});
      if (button.dataset.tool === "overlay") root.querySelector('[data-action="crop"]')?.focus({preventScroll:true});
    }));
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


  // Full-screen Reel Editor lives in this file; upload.js only invokes it and handles upload.
  function openPremiumReelEditor(file) {
    return new Promise(resolve => {
      document.getElementById("ip-premium-reel-editor")?.remove();
      const sourceUrl=URL.createObjectURL(file), modal=document.createElement("div");
      modal.id="ip-premium-reel-editor";
      modal.style.cssText="position:fixed;inset:0;z-index:2147483001;background:#08080b;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden";
      modal.innerHTML=`<style>
  #ip-premium-reel-editor{background:#000!important;font-family:system-ui,sans-serif!important}#ip-premium-reel-editor *{box-sizing:border-box}
  #ip-premium-reel-editor button{color:#fff;cursor:pointer;touch-action:manipulation}
  #ip-premium-reel-editor .head{height:58px;flex:0 0 58px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#08080b;border-bottom:1px solid #24242b}
  #ip-premium-reel-editor .circle{width:40px;height:40px;flex:0 0 40px;border:0;border-radius:50%;background:#191a1e;font-size:27px}
  #ip-premium-reel-editor .try{height:38px;min-width:36px;border:0;border-radius:12px;background:#191a1e;padding:0 10px;font-size:17px;font-weight:750}
  #ip-premium-reel-editor .nexttop{width:40px;height:40px;flex:0 0 40px;border:0;border-radius:14px;background:#f02c87;color:#fff!important;font-size:24px}
  #ip-premium-reel-editor .stage{position:relative;flex:1;min-height:140px;background:#000;display:flex;justify-content:center;align-items:center;overflow:hidden;padding:6px 0}
  #ip-premium-reel-editor video{width:auto;height:100%;max-width:100%;aspect-ratio:9/16;object-fit:contain;background:#000;border:1px solid #242424;border-radius:20px}
  #ip-premium-reel-editor .overlay{position:absolute;top:43%;left:10%;right:10%;text-align:center;font-weight:850;font-size:28px;white-space:pre-wrap;text-shadow:0 2px 9px #000;pointer-events:none}
  #ip-premium-reel-editor .transport{height:54px;flex:0 0 54px;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
  #ip-premium-reel-editor .transport button{width:44px;height:44px;border:0;border-radius:50%;background:#202126;font-size:20px}
  #ip-premium-reel-editor .timeline{flex:0 0 auto;background:#000;border:0;border-radius:0;padding-bottom:4px;overflow:hidden;box-shadow:none}
  #ip-premium-reel-editor .ruler{height:28px;display:flex;align-items:center;justify-content:space-around;color:#aaa;font-size:11px}#ip-premium-reel-editor #ipr-timeline-scroll{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-behavior:auto;scrollbar-width:none;touch-action:pan-x}#ip-premium-reel-editor #ipr-timeline-scroll::-webkit-scrollbar{display:none}#ip-premium-reel-editor #ipr-timeline-content{width:100%;will-change:width}#ip-premium-reel-editor #ipr-ruler{justify-content:flex-start;padding:0;gap:0}#ip-premium-reel-editor #ipr-ruler span{flex:0 0 auto;min-width:0;border-left:0;padding:0 4px;box-sizing:border-box;white-space:nowrap}#ip-premium-reel-editor #ipr-track{scroll-margin:30px}#ip-premium-reel-editor .split-line{position:absolute;top:26px;bottom:0;width:1px;background:#ec2483;z-index:5;pointer-events:none}#ip-premium-reel-editor #ipr-playhead{position:absolute;z-index:20;left:50%;top:0;height:126px;width:2px;background:#fff;transform:translateX(-1px);pointer-events:none;box-shadow:0 0 3px #000}#ip-premium-reel-editor #ipr-timeline-scroll{position:relative;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}#ip-premium-reel-editor .segment-mark{position:absolute;top:0;bottom:0;width:2px;background:transparent;z-index:3;pointer-events:auto}
  #ip-premium-reel-editor .track{height:70px;background:#222328;display:flex;align-items:center;padding:0 12px;gap:7px;border:2px solid transparent}
  #ip-premium-reel-editor .track.selected{border-color:transparent;border-radius:0;margin:0}
  #ip-premium-reel-editor .clipstrip{height:56px;flex:1;min-width:0;overflow:hidden;border-radius:5px;background:repeating-linear-gradient(90deg,#45464b 0 35px,#27282d 35px 39px)}
  #ip-premium-reel-editor .clipstrip video{width:100%;height:100%;max-width:none;aspect-ratio:auto;object-fit:cover;border:0;border-radius:0;opacity:.8}
  #ip-premium-reel-editor #ipr-scrubber{display:none!important}#ip-premium-reel-editor #ipr-track>.handle{display:none!important}#ip-premium-reel-editor .handle{width:18px;height:40px;border:0;border-radius:8px;background:#fff;color:#111!important;font-weight:900}
  #ip-premium-reel-editor .addclip{width:44px;height:44px;border:0;border-radius:12px;background:#fff;color:#111!important;font-size:29px}
  #ip-premium-reel-editor .trackrow{height:48px;display:flex;align-items:center;gap:12px;padding:0 20px;border-top:4px solid #000;background:#222328;color:#c5c5d0}
  #ip-premium-reel-editor .trackrow button{border:0;background:transparent;font-size:15px;font-weight:600}
  #ip-premium-reel-editor .trackrow b{font-size:23px;color:#ec2483;margin-right:5px}
  #ip-premium-reel-editor .tools{display:flex;flex:0 0 auto;gap:10px;overflow-x:auto;padding:12px 8px 8px;background:#000;scrollbar-width:none}
  #ip-premium-reel-editor .tools button{flex:0 0 88px;min-width:78px;height:74px;border:0;border-radius:15px;background:#191a1f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:27px}
  #ip-premium-reel-editor .tools button small{font-size:12px;font-weight:550;white-space:nowrap}
  #ip-premium-reel-editor .tools button.active{background:#272831;outline:1px solid #4b4c5a}
  #ip-premium-reel-editor .panel{flex:0 0 auto;max-height:17vh;overflow:auto;padding:8px 13px;background:#141519}
  #ip-premium-reel-editor .row{display:flex;align-items:center;gap:8px;margin:7px 0}
  #ip-premium-reel-editor label{font-size:12px;min-width:54px}
  #ip-premium-reel-editor input[type=range]{flex:1;min-width:0;accent-color:#f02c87}
  #ip-premium-reel-editor input[type=text],#ip-premium-reel-editor input[type=search],#ip-premium-reel-editor textarea{width:100%;min-width:0;padding:9px;background:#24242c;color:#fff;border:1px solid #ffffff20;border-radius:9px}
  #ip-premium-reel-editor .panel button{padding:8px 10px;background:#282932;border:1px solid #ffffff20;border-radius:9px}
  #ip-premium-reel-editor .foot{padding:8px 18px calc(8px + env(safe-area-inset-bottom));background:#000}
  #ip-premium-reel-editor .next{width:100%;height:44px;border:0;border-radius:24px;background:#4c55f5;font-weight:850;font-size:16px}
  @media(max-height:760px){#ip-premium-reel-editor .head{height:56px;flex-basis:56px}#ip-premium-reel-editor .circle,#ip-premium-reel-editor .nexttop{width:44px;height:44px}#ip-premium-reel-editor .try{height:44px}#ip-premium-reel-editor .track{height:60px}#ip-premium-reel-editor .clipstrip{height:48px}#ip-premium-reel-editor .tools button{height:62px;flex-basis:76px}#ip-premium-reel-editor .panel{max-height:13vh}}
  </style>
  <div class="head"><button class="circle" data-act="cancel" aria-label="Close editor">×</button><div style="flex:1;text-align:center;font-size:17px;font-weight:800;letter-spacing:.2px">Reel Editor</div><button class="try" data-act="undo" aria-label="Undo">↶</button><button class="try" data-act="redo" aria-label="Redo">↷</button><button class="nexttop" data-act="next" aria-label="Export">↑</button></div>
  <div class="stage"><video id="ipr-video" playsinline></video><div class="overlay" id="ipr-overlay"></div></div>
  <div class="transport"><button data-act="play">▶</button><span id="ipr-current-time" style="font-size:17px;color:#ddd">0:00 / 0:00</span><div style="display:flex;gap:8px"><button data-act="undo">↶</button><button data-act="redo">↷</button></div></div>
  <div class="timeline" style="position:relative"><div id="ipr-timeline-scroll" style="overflow-x:auto;overflow-y:hidden;touch-action:pan-x;scrollbar-width:thin"><div id="ipr-timeline-content" style="min-width:100%;position:relative"><div class="ruler" id="ipr-ruler"><span>0s</span><span>1s</span><span>2s</span><span>3s</span></div><input id="ipr-scrubber" aria-label="Timeline playhead" type="range" min="0" max="100" value="0" step=".05" style="display:block;width:100%;height:18px;margin:0;accent-color:#fff;touch-action:pan-x">
  <div class="track" id="ipr-track"><button class="handle" data-act="trim-start">Ⅱ</button><div class="clipstrip" id="ipr-clipstrip"><video id="ipr-thumb-video" muted playsinline></video></div><button class="handle" data-act="trim-end">Ⅱ</button><button class="addclip" data-act="add-clip">+</button></div></div></div><div id="ipr-playhead" aria-hidden="true" style="position:absolute;left:50%;top:0;bottom:0;pointer-events:none;z-index:20"></div>
  <div class="trackrow"><span>🔊</span><button data-tool="music"><b>＋</b>Add audio</button></div><div class="trackrow"><span>T</span><button data-tool="text"><b>＋</b>Add text</button></div>
  <div class="tools" id="ipr-main-tools"><button data-tool="trim"><span>✂</span><small>Edit</small></button><button data-tool="music"><span>♫</span><small>Audio</small></button><button data-tool="text"><span>Aa</span><small>Text</small></button><button data-tool="effects"><span>✣</span><small>Effects</small></button><button data-tool="stickers"><span>▧</span><small>Overlay</small></button><button data-tool="captions"><span>▤</span><small>Captions</small></button><button data-tool="filter"><span>◉</span><small>Filters</small></button><button data-tool="voice"><span>♩</span><small>Voice</small></button><button data-tool="crop"><span>⌗</span><small>Crop</small></button><button data-tool="speed"><span>◴</span><small>Speed</small></button><button data-tool="audio"><span>◖))</span><small>Volume</small></button><button data-tool="split"><span>⫽</span><small>Split</small></button><button data-tool="delete"><span>⌫</span><small>Delete</small></button></div>
  <div class="tools" id="ipr-clip-tools" style="display:none"><button data-tool="split"><span>✂</span><small>Split</small></button><button data-tool="delete"><span>♲</span><small>Delete</small></button><button data-tool="silences"><span>✣</span><small>Cut silences</small></button><button data-tool="audio"><span>◖))</span><small>Volume</small></button><button data-tool="speed"><span>◴</span><small>Speed</small></button><button data-tool="crop"><span>⌗</span><small>Crop</small></button></div>
  <div class="panel" id="ipr-panels" style="display:none">
  <section data-panel="trim"><div class="row"><label>Start</label><input id="ipr-start" type="range" min="0" max="100" value="0" step=".1"><b id="ipr-st">0:00</b></div><div class="row"><label>End</label><input id="ipr-end" type="range" min="0" max="100" value="100" step=".1"><b id="ipr-en">0:00</b></div><small id="ipr-dur">Clip duration loading…</small></section>
  <section data-panel="filter" hidden><div style="display:flex;gap:7px;overflow:auto"><button data-filter="none">Normal</button><button data-filter="contrast(1.15) saturate(1.2)">Vivid</button><button data-filter="sepia(.35) saturate(1.2)">Warm</button><button data-filter="grayscale(1)">Mono</button><button data-filter="brightness(1.12) saturate(.8)">Fade</button><button data-filter="hue-rotate(25deg) saturate(1.25)">Dream</button></div></section>
  <section data-panel="text" hidden><div class="row"><input id="ipr-title" type="text" maxlength="120" placeholder="Add a title (optional)"></div><div class="row"><textarea id="ipr-caption" maxlength="2200" rows="2" placeholder="Write a caption…"></textarea></div><div class="row"><input id="ipr-hashtags" type="text" maxlength="500" placeholder="Add hashtags"></div><div class="row"><input id="ipr-tags" type="text" maxlength="500" placeholder="Tag people"></div><div class="row"><input id="ipr-text" type="text" maxlength="120" placeholder="Add text over video"></div></section>
  <section data-panel="music" hidden><div class="row"><input id="ipr-music-search" type="search" placeholder="Search songs, singers, Bollywood…"><button id="ipr-music-search-btn">Search</button></div><div id="ipr-music-status" style="font-size:11px;color:#bbb;margin:6px 0">Search music library, preview, then Use.</div><div id="ipr-music-results" style="display:grid;gap:8px"></div><audio id="ipr-music-preview" controls style="width:100%;height:36px;margin-top:8px"></audio></section>
  <section data-panel="speed" hidden><div class="row"><label>Speed</label><input id="ipr-speed" type="range" min=".5" max="2" step=".25" value="1"><b id="ipr-speed-label">1×</b></div></section>
  <section data-panel="audio" hidden><div class="row"><label>Original audio</label><button id="ipr-mute">On</button></div><div class="row"><label>Volume</label><input id="ipr-volume" type="range" min="0" max="1" step=".05" value="1"></div></section>
  <section data-panel="voice" hidden><div class="row"><button data-act="voice-record">🎙 Record voiceover</button><span id="ipr-voice-status">Voiceover tool</span></div></section><section data-panel="captions" hidden><div class="row"><button data-act="make-captions">Generate captions</button><span>Use Text to add captions.</span></div></section>
  <section data-panel="stickers" hidden><div class="row"><button data-act="sticker-heart">♡ Heart</button><button data-act="sticker-star">✦ Star</button><button data-act="sticker-smile">☺ Smile</button></div></section>
  <section data-panel="effects" hidden><div class="row"><button data-filter="none">Normal</button><button data-filter="contrast(1.2) saturate(1.3)">Glow</button><button data-filter="sepia(.2) contrast(1.1)">Vintage</button><button data-filter="grayscale(1)">B&W</button></div></section>
  <section data-panel="silences" hidden><p style="font-size:12px">Silence detection isn't supported in this browser yet. Trim the start/end instead.</p></section><section data-panel="crop" hidden><div class="row"><button data-act="crop-fit">Fit</button><button data-act="crop-fill">Fill screen</button></div></section><section data-panel="delete" hidden><p>Delete this clip?</p><button data-act="delete-confirm">Delete clip</button></section>
  </div><div class="foot"><button class="next" data-act="next">Next →</button></div>`;
      document.body.appendChild(modal);
      const video=modal.querySelector("#ipr-video"), start=modal.querySelector("#ipr-start"), end=modal.querySelector("#ipr-end"), cap=modal.querySelector("#ipr-caption"), titleInput=modal.querySelector("#ipr-title"), hashtagsInput=modal.querySelector("#ipr-hashtags"), tagsInput=modal.querySelector("#ipr-tags"), txt=modal.querySelector("#ipr-text"), overlay=modal.querySelector("#ipr-overlay");
      let duration=0,filter="none",musicTrack=null,muted=false,closed=false;
      video.src=sourceUrl;
      const fmt=n=>{n=Math.max(0,Math.floor(Number(n)||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
      const finish=result=>{if(closed)return;closed=true;video.pause();URL.revokeObjectURL(sourceUrl);modal.remove();resolve(result);};
      const effectiveDuration=()=>Math.max(0,duration-deletedRanges.reduce((sum,r)=>sum+Math.max(0,Math.min(duration,r.end)-Math.max(0,r.start)),0));const removedBefore=t=>deletedRanges.reduce((sum,r)=>sum+(t>=r.end?Math.max(0,r.end-r.start):t>r.start?Math.max(0,t-r.start):0),0);const toTimelineTime=t=>Math.max(0,Math.min(effectiveDuration(),t-removedBefore(t)));const toSourceTime=t=>{let source=Math.max(0,Math.min(duration,t));for(let i=0;i<deletedRanges.length;i++){const r=deletedRanges[i];if(source>=r.start)source+=r.end-r.start;}return Math.min(duration,source);};const labels=()=>{modal.querySelector("#ipr-st").textContent=fmt(start.value);modal.querySelector("#ipr-en").textContent=fmt(end.value);modal.querySelector("#ipr-dur").textContent="Original: "+fmt(duration)+" • After cuts: "+fmt(Math.max(0,effectiveDuration()-(duration-Number(end.value)+Number(start.value))));};
      video.addEventListener("loadedmetadata",()=>{duration=Number.isFinite(video.duration)?video.duration:0;start.max=end.max=String(duration);end.value=String(duration);labels();setupTimeline();refreshClipTrack();video.play().catch(()=>{});});
      start.addEventListener("input",()=>{if(+start.value>=+end.value)end.value=String(Math.min(duration,+start.value+.2));labels();});
      end.addEventListener("input",()=>{if(+end.value<=+start.value)start.value=String(Math.max(0,+end.value-.2));labels();});
      start.addEventListener("change",()=>{video.currentTime=+start.value||0;});
      video.addEventListener("timeupdate",()=>{if(duration&&video.currentTime>=+end.value)video.pause();});
      txt.addEventListener("input",()=>overlay.textContent=txt.value);
      const panelBox=modal.querySelector("#ipr-panels"),mainTools=modal.querySelector("#ipr-main-tools"),clipTools=modal.querySelector("#ipr-clip-tools"),track=modal.querySelector("#ipr-track"),thumbVideo=modal.querySelector("#ipr-thumb-video");
      const timelineScroll=modal.querySelector("#ipr-timeline-scroll"),timelineContent=modal.querySelector("#ipr-timeline-content"),scrubber=modal.querySelector("#ipr-scrubber"),ruler=modal.querySelector("#ipr-ruler");
      let pixelsPerSecond=80, splitPoints=[],deletedRanges=[],selectedRange=null,scrollRaf=0,manualScrollUntil=0,editHistory=[],redoHistory=[];const saveEditState=()=>{editHistory.push({splitPoints:[...splitPoints],deletedRanges:deletedRanges.map(r=>({...r})),start:start.value,end:end.value});if(editHistory.length>40)editHistory.shift();redoHistory=[];};const restoreEditState=state=>{splitPoints=[...state.splitPoints];deletedRanges=state.deletedRanges.map(r=>({...r}));start.value=state.start;end.value=state.end;selectedRange=null;setupTimeline();refreshClipTrack();renderSplitParts();labels();updateTime();};
      const setupTimeline=()=>{if(!duration)return;const viewWidth=timelineScroll.clientWidth||320;pixelsPerSecond=Math.max(45,Math.min(100,viewWidth/Math.max(1,Math.min(effectiveDuration(),12))));const width=Math.max(viewWidth,Math.ceil(effectiveDuration()*pixelsPerSecond));timelineContent.style.width=width+"px";timelineContent.style.minWidth=width+"px";track.style.width=width+"px";track.style.boxSizing="border-box";scrubber.max=String(effectiveDuration());scrubber.value=String(toTimelineTime(video.currentTime||0));scrubber.style.width="100%";ruler.innerHTML="";const step=effectiveDuration()>90?10:effectiveDuration()>35?5:effectiveDuration()>15?2:1;ruler.style.width=width+"px";ruler.style.display="block";ruler.style.position="relative";for(let t=0;t<=effectiveDuration()+.001;t+=step){const tick=document.createElement("span");tick.textContent=t+"s";tick.style.cssText="position:absolute;left:"+(t*pixelsPerSecond)+"px;top:0;transform:translateX(0);height:100%;padding-left:4px;box-sizing:border-box";ruler.appendChild(tick);}timelineScroll.scrollLeft=Math.max(0,Math.min(width-viewWidth,toTimelineTime(video.currentTime||0)*pixelsPerSecond-viewWidth/2));renderSplitParts();};
      let timelineAutoScroll=false,timelineUserScrubbing=false,programmaticScrollUntil=0,timelinePointerStart=null,autoScrollFrame=0;
      const timelineTimeAtX=x=>Math.max(0,Math.min(effectiveDuration(),(x-timelineScroll.getBoundingClientRect().left+timelineScroll.scrollLeft)/pixelsPerSecond));
      const seekTimeline=t=>{const safe=Math.max(0,Math.min(effectiveDuration(),t));video.currentTime=toSourceTime(safe);scrubber.value=String(safe);manualScrollUntil=performance.now()+650;};
      scrubber.addEventListener("input",()=>{const t=Math.min(effectiveDuration(),Math.max(0,+scrubber.value));seekTimeline(t);programmaticScrollUntil=performance.now()+180;timelineScroll.scrollLeft=Math.max(0,t*pixelsPerSecond-timelineScroll.clientWidth/2);});
      timelineScroll.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;timelinePointerStart={x:e.clientX,y:e.clientY,left:timelineScroll.scrollLeft,time:performance.now()};timelineUserScrubbing=true;manualScrollUntil=performance.now()+1200;if(!video.paused)video.pause();},{passive:true});
      const stopTimelineScrub=e=>{if(!timelinePointerStart)return;const moved=Math.abs(e.clientX-timelinePointerStart.x)>8||Math.abs(e.clientY-timelinePointerStart.y)>12;if(!moved){const t=timelineTimeAtX(e.clientX);seekTimeline(t);timelineScroll.scrollLeft=Math.max(0,t*pixelsPerSecond-timelineScroll.clientWidth/2);}timelinePointerStart=null;setTimeout(()=>{timelineUserScrubbing=false;},120);};
      timelineScroll.addEventListener("pointerup",stopTimelineScrub,{passive:true});timelineScroll.addEventListener("pointercancel",()=>{timelinePointerStart=null;timelineUserScrubbing=false;},{passive:true});
      timelineScroll.addEventListener("scroll",()=>{if(timelineAutoScroll||performance.now()<programmaticScrollUntil||!timelineUserScrubbing)return;manualScrollUntil=performance.now()+900;const t=Math.min(effectiveDuration(),Math.max(0,(timelineScroll.scrollLeft+timelineScroll.clientWidth/2)/pixelsPerSecond));if(Math.abs(toTimelineTime(video.currentTime||0)-t)>.08)video.currentTime=toSourceTime(t);scrubber.value=String(t);},{passive:true});
      const autoFollowTimeline=()=>{if(video.paused||closed){autoScrollFrame=0;return;}const raw=Number(video.currentTime)||0,cut=deletedRanges.find(r=>raw>=r.start-.025&&raw<r.end-.025);if(cut){video.currentTime=Math.min(duration,cut.end+.03);autoScrollFrame=requestAnimationFrame(autoFollowTimeline);return;}if(performance.now()>manualScrollUntil&&!timelineUserScrubbing&&duration){const mapped=toTimelineTime(raw),max=Math.max(0,effectiveDuration()*pixelsPerSecond-timelineScroll.clientWidth),target=Math.max(0,Math.min(max,mapped*pixelsPerSecond-timelineScroll.clientWidth/2)),delta=target-timelineScroll.scrollLeft;if(Math.abs(delta)>.5){timelineAutoScroll=true;timelineScroll.scrollLeft+=delta*.22;timelineAutoScroll=false;}}if(document.activeElement!==scrubber)scrubber.value=String(toTimelineTime(raw));autoScrollFrame=requestAnimationFrame(autoFollowTimeline);};
      video.addEventListener("play",()=>{if(!autoScrollFrame)autoScrollFrame=requestAnimationFrame(autoFollowTimeline);});
      video.addEventListener("pause",()=>{if(autoScrollFrame){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=0;}});
      video.addEventListener("timeupdate",()=>{if(document.activeElement!==scrubber)scrubber.value=String(toTimelineTime(video.currentTime||0));});
      timelineScroll.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){timelineScroll.scrollLeft+=e.deltaY;e.preventDefault();}},{passive:false});
      const refreshClipTrack=()=>{const viewWidth=timelineScroll.clientWidth||320;const width=Math.max(viewWidth,Math.ceil(effectiveDuration()*pixelsPerSecond));timelineContent.style.width=width+"px";timelineContent.style.minWidth=width+"px";track.style.width=width+"px";track.style.minWidth=width+"px";track.style.position="relative";track.style.boxSizing="border-box";thumbVideo.style.width="100%";};
      const showTool=name=>{panelBox.style.display="block";modal.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==name);};
      modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{const name=b.dataset.tool;const panelName=name==="trim"?"trim":name==="overlay"?"stickers":name==="ai"?"effects":name;if(["split","delete","silences","audio","speed","crop","trim"].includes(name)){track.classList.add("selected");mainTools.style.display="none";clipTools.style.display="flex";}else{track.classList.remove("selected");mainTools.style.display="flex";clipTools.style.display="none";}modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));showTool(panelName);}));
      modal.querySelector('[data-tool="split"]').addEventListener("click",()=>{const viewWidth=timelineScroll.clientWidth;const playheadTimelineTime=Math.max(0,Math.min(effectiveDuration(),(timelineScroll.scrollLeft+viewWidth/2)/pixelsPerSecond));const t=toSourceTime(playheadTimelineTime);if(Number.isFinite(t)&&Math.abs((video.currentTime||0)-t)>.12)video.currentTime=t;if(t<=0.15||t>=duration-0.15){alert("Split karne ke liye white line ko clip ke beech mein le jayein.");return;}if(deletedRanges.some(r=>t>r.start&&t<r.end)){alert("Deleted section ke andar split nahi ho sakta.");return;}if(!splitPoints.some(p=>Math.abs(p-t)<.12)){saveEditState();splitPoints.push(t);splitPoints.sort((a,b)=>a-b);}const mapped=toTimelineTime(t);timelineScroll.scrollLeft=Math.max(0,Math.min(effectiveDuration()*pixelsPerSecond-viewWidth,mapped*pixelsPerSecond-viewWidth/2));track.classList.add("selected");renderSplitParts();const parts=splitPoints.map(p=>Math.round(p*10)/10+"s").join(" | ");modal.querySelector("#ipr-dur").textContent="Split at white playhead • "+parts;});
      const renderSplitParts=()=>{track.querySelectorAll(".split-line,.deleted-part,.selected-part,.ipr-transition").forEach(m=>m.remove());const cuts=[...deletedRanges].sort((a,b)=>a.start-b.start);const points=[0,...splitPoints.filter(p=>p>0&&p<duration),duration].sort((a,b)=>a-b);for(const p of splitPoints.filter(p=>p>0&&p<duration&&!cuts.some(r=>p>=r.start&&p<=r.end))){const marker=document.createElement("div");marker.className="split-line";marker.style.cssText="position:absolute;top:0;bottom:0;left:"+(toTimelineTime(p)*pixelsPerSecond)+"px;width:2px;background:#ec2483;z-index:5;pointer-events:none";marker.title="Split at "+p.toFixed(1)+"s";track.appendChild(marker);}let visibleIndex=0;for(let k=0;k<points.length-1;k++){const a=points[k],b=points[k+1];if(cuts.some(r=>a>=r.start-.001&&b<=r.end+.001))continue;const left=toTimelineTime(a)*pixelsPerSecond,width=Math.max(2,(b-a)*pixelsPerSecond);const el=document.createElement("div");el.className="segment-mark";el.style.cssText="position:absolute;top:3px;bottom:3px;left:"+(left+2)+"px;width:"+Math.max(1,width-4)+"px;pointer-events:auto;z-index:6;background:transparent;border:0;box-sizing:border-box;border-radius:3px;";el.title="Clip "+(++visibleIndex)+" ("+a.toFixed(1)+"–"+b.toFixed(1)+"s)";el.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();selectedRange={start:a,end:b};video.pause();video.currentTime=a;track.classList.add("selected");mainTools.style.setProperty("display","none","important");clipTools.style.setProperty("display","flex","important");panelBox.style.display="none";modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.remove("active"));modal.querySelector("#ipr-dur").textContent="Selected clip: "+a.toFixed(1)+"s – "+b.toFixed(1)+"s. Clip tools ready.";track.querySelectorAll(".selected-part").forEach(x=>{x.classList.remove("selected-part");x.style.boxShadow="";x.style.background="transparent";});el.classList.add("selected-part");el.style.boxShadow="inset 0 0 0 2px #ec2483";el.style.background="rgba(236,36,131,.10)";});if(selectedRange&&Math.abs(selectedRange.start-a)<.03&&Math.abs(selectedRange.end-b)<.03){el.classList.add("selected-part");el.style.boxShadow="inset 0 0 0 2px #ec2483";el.style.background="rgba(236,36,131,.10)";}track.appendChild(el);}cuts.forEach(r=>{const joinTime=toTimelineTime(r.start),button=document.createElement("button");button.type="button";button.className="ipr-transition";button.textContent="✦";button.title="Add transition animation";button.style.cssText="position:absolute;top:43px;left:"+(joinTime*pixelsPerSecond-14)+"px;z-index:12;width:28px;height:28px;border-radius:50%;border:1px solid #ffca38;background:#21182c;color:#ffd84d;font-size:15px;padding:0;box-shadow:0 0 8px #000";button.addEventListener("click",ev=>{ev.stopPropagation();const options=["None","Fade","Flash","Zoom","Swipe"];const chosen=prompt("Join animation: "+options.slice(1).join(", ")+"\nType one animation name or None:",r.transition||"Fade");if(chosen&&options.some(o=>o.toLowerCase()===chosen.trim().toLowerCase())){r.transition=options.find(o=>o.toLowerCase()===chosen.trim().toLowerCase());button.textContent=r.transition==="None"?"＋":r.transition==="Fade"?"◐":r.transition==="Flash"?"✧":r.transition==="Zoom"?"⊕":"⇢";button.title="Transition: "+r.transition;} });track.appendChild(button);});};track.addEventListener("click",e=>{if(e.target.closest("[data-act]")||e.target.closest(".segment-mark")||e.target.closest(".deleted-part"))return;/* A second tap must never clear clip selection. Only explicit navigation/tools can change the tool row. */if(!selectedRange)selectedRange={start:0,end:duration};track.classList.add("selected");mainTools.style.setProperty("display","none","important");clipTools.style.setProperty("display","flex","important");panelBox.style.display="none";});
      thumbVideo.src=sourceUrl;thumbVideo.currentTime=0;
      const updateTime=()=>{const raw=Number(video.currentTime)||0;const removedBefore=deletedRanges.reduce((sum,r)=>sum+(raw>=r.end?Math.max(0,r.end-r.start):raw>r.start?Math.max(0,raw-r.start):0),0);const now=Math.max(0,raw-removedBefore);const total=Math.max(0,effectiveDuration()-(duration-Number(end.value)+Number(start.value)));modal.querySelector("#ipr-current-time").textContent=fmt(now)+" / "+fmt(total);};
      const playButton=modal.querySelector('[data-act="play"]');const syncPlayButton=()=>{playButton.textContent=video.paused?"▶":"Ⅱ";playButton.setAttribute("aria-label",video.paused?"Play video":"Pause video");};playButton.addEventListener("click",()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});video.addEventListener("play",syncPlayButton);video.addEventListener("pause",syncPlayButton);syncPlayButton();
      video.addEventListener("timeupdate",updateTime);
      modal.querySelector('[data-act="trim-start"]').addEventListener("click",()=>{showTool("trim");start.focus();start.value=Math.min(+end.value-.2,Math.max(0,video.currentTime));labels();});
      modal.querySelector('[data-act="trim-end"]').addEventListener("click",()=>{showTool("trim");end.focus();end.value=Math.max(+start.value+.2,Math.min(duration,video.currentTime));labels();});
      modal.querySelector('[data-act="add-clip"]').addEventListener("click",()=>{const picker=document.createElement("input");picker.type="file";picker.accept="video/*";picker.onchange=()=>{const f=picker.files?.[0];if(f){finish(null);setTimeout(()=>{const input=document.getElementById("reelFile");if(input){input.dataset.instaProUploadType="reel";const dt=new DataTransfer();dt.items.add(f);input.files=dt.files;input.dispatchEvent(new Event("change",{bubbles:true}));}},50);}};picker.click();});
      modal.querySelector('[data-act="try-edits"]').addEventListener("click",()=>{showTool("effects");mainTools.style.display="flex";clipTools.style.display="none";});
      modal.querySelector('[data-act="undo"]').addEventListener("click",()=>{if(!editHistory.length){video.style.filter="none";filter="none";txt.value="";overlay.textContent="";start.value=0;end.value=duration;labels();return;}redoHistory.push({splitPoints:[...splitPoints],deletedRanges:deletedRanges.map(r=>({...r})),start:start.value,end:end.value});restoreEditState(editHistory.pop());});
      modal.querySelector('[data-act="redo"]').addEventListener("click",()=>{if(!redoHistory.length){showTool("text");mainTools.style.display="flex";clipTools.style.display="none";return;}editHistory.push({splitPoints:[...splitPoints],deletedRanges:deletedRanges.map(r=>({...r})),start:start.value,end:end.value});restoreEditState(redoHistory.pop());});
      modal.querySelector('[data-act="crop-fit"]').addEventListener("click",()=>{video.style.objectFit="contain";});
      modal.querySelector('[data-act="crop-fill"]').addEventListener("click",()=>{video.style.objectFit="cover";});
      modal.querySelector('[data-act="delete-confirm"]').addEventListener("click",()=>{if(!selectedRange){alert("Pehle timeline me us cut part par tap karein jise delete karna hai.");return;}if(selectedRange.end-selectedRange.start<.12){alert("Selected clip bahut chhota hai.");return;}saveEditState();deletedRanges.push({...selectedRange});deletedRanges.sort((a,b)=>a.start-b.start);selectedRange=null;setupTimeline();refreshClipTrack();renderSplitParts();labels();updateTime();showTool("delete");modal.querySelector("#ipr-dur").textContent="Clip removed — gap closed. Timeline length: "+fmt(effectiveDuration())+". Join par ✦ dabakar animation choose karein.";});
      modal.querySelector('[data-act="voice-record"]').addEventListener("click",()=>{modal.querySelector("#ipr-voice-status").textContent="Voiceover recording is not supported in this web editor yet.";});
      modal.querySelector('[data-act="make-captions"]').addEventListener("click",()=>{showTool("text");txt.focus();});
      modal.querySelector('[data-act="sticker-heart"]').addEventListener("click",()=>{txt.value+=" ♡";overlay.textContent=txt.value;});
      modal.querySelector('[data-act="sticker-star"]').addEventListener("click",()=>{txt.value+=" ✦";overlay.textContent=txt.value;});
      modal.querySelector('[data-act="sticker-smile"]').addEventListener("click",()=>{txt.value+=" ☺";overlay.textContent=txt.value;});
      modal.querySelector("#ipr-volume").addEventListener("input",e=>{video.volume=+e.target.value;});
  
      modal.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;modal.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));video.style.filter=filter;}));
      modal.querySelector("#ipr-speed").addEventListener("input",e=>{video.playbackRate=+e.target.value;modal.querySelector("#ipr-speed-label").textContent=e.target.value+"×";});
      modal.querySelector("#ipr-mute").addEventListener("click",e=>{muted=!muted;video.muted=muted;e.currentTarget.textContent=muted?"Off":"On";});
      const musicSearch=modal.querySelector("#ipr-music-search"), musicStatus=modal.querySelector("#ipr-music-status"), musicResults=modal.querySelector("#ipr-music-results"), musicPreview=modal.querySelector("#ipr-music-preview");
      const searchLibrary=async()=>{
        const term=musicSearch.value.trim();
        if(!term){musicStatus.textContent="Song ya singer ka naam likhein.";return;}
        musicStatus.textContent="Music library search ho rahi hai…";musicResults.replaceChildren();
        try{
          const response=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(term)+"&country=IN&media=music&entity=song&limit=30");
          if(!response.ok)throw new Error("Music search request failed");
          const data=await response.json();
          const tracks=(data.results||[]).filter(t=>t.trackName&&t.previewUrl).map(t=>({trackName:t.trackName,artistName:t.artistName||"Unknown artist",collectionName:t.collectionName||"",previewUrl:t.previewUrl,artworkUrl100:(t.artworkUrl100||"").replace("100x100bb","300x300bb"),trackId:t.trackId,license:"Preview only",filePage:t.trackViewUrl||""}));
          if(!tracks.length){musicStatus.textContent="Is search ke liye playable preview nahi mila. Dusra song ya singer search karein.";return;}
          musicStatus.textContent=tracks.length+" tracks mile. Preview sun kar Use dabayein.";
          tracks.forEach((track,index)=>{
            const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #ffffff20;border-radius:11px;background:#202027";
            if(track.artworkUrl100){const img=document.createElement("img");img.src=track.artworkUrl100;img.alt="";img.style.cssText="width:44px;height:44px;object-fit:cover;border-radius:8px";row.appendChild(img);}
            const info=document.createElement("div");info.style.cssText="flex:1;min-width:0";
            const title=document.createElement("b");title.textContent=track.trackName;title.style.cssText="display:block;font-size:12px;overflow-wrap:anywhere";
            const artist=document.createElement("small");artist.textContent=track.artistName;artist.style.cssText="display:block;font-size:10px;opacity:.7";
            info.append(title,artist);row.appendChild(info);
            const play=document.createElement("button");play.type="button";play.textContent="▶";play.style.cssText="padding:7px;border:1px solid #ffffff20;border-radius:8px;background:#333";
            play.addEventListener("click",async()=>{try{musicPreview.src=track.previewUrl;await musicPreview.play();musicStatus.textContent="Playing preview: "+track.trackName;}catch(err){musicStatus.textContent="Preview play nahi ho paya. Dusra track try karein.";}});
            const use=document.createElement("button");use.type="button";use.textContent="Use";use.style.cssText="padding:8px;border:0;border-radius:8px;background:linear-gradient(120deg,#8d5cff,#ff398a);font-weight:800";
            use.addEventListener("click",()=>{musicTrack=track;window.__instaProPendingMusicFile=null;window.__instaProPendingMusicTrack={title:track.trackName,artistName:track.artistName,audioUrl:track.previewUrl,id:String(track.trackId||""),license:track.license,licenseUrl:"",filePage:track.filePage,source:"music-library"};musicStatus.textContent="Selected: "+track.trackName+" — "+track.artistName;musicPreview.pause();});
            row.append(play,use);musicResults.appendChild(row);
          });
        }catch(err){console.warn("Reels music library search:",err);musicStatus.textContent="Music library connect nahi ho payi. Internet check karke dobara try karein.";}
      };
      modal.querySelector("#ipr-music-search-btn").addEventListener("click",searchLibrary);
      musicSearch.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchLibrary();}});
      musicPreview.addEventListener("ended",()=>{musicPreview.currentTime=0;});
      modal.querySelector('[data-act="cancel"]').addEventListener("click",()=>finish(null));
      modal.querySelector('[data-act="next"]').addEventListener("click",async e=>{
        const btn=e.currentTarget;btn.disabled=true;btn.textContent="Rendering Reel…";
        try{
          const st=Math.max(0,+start.value||0),en=Math.min(duration,+end.value||duration);
          if(!duration||en-st<.25)throw new Error("Trim range must be at least 0.25 seconds.");
          if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){finish({file,title:titleInput.value.trim(),caption:cap.value.trim(),hashtags:hashtagsInput.value.trim(),taggedPeople:tagsInput.value.trim(),musicTrack});return;}
          video.pause();video.currentTime=st;
          await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(new Error("Video seek timeout")),5000);video.addEventListener("seeked",()=>{clearTimeout(timer);res();},{once:true});});
          const canvas=document.createElement("canvas"),vw=video.videoWidth||720,vh=video.videoHeight||1280,scale=Math.min(1,1080/Math.max(vw,vh));
          canvas.width=Math.max(2,Math.round(vw*scale/2)*2);canvas.height=Math.max(2,Math.round(vh*scale/2)*2);
          const ctx=canvas.getContext("2d"),stream=canvas.captureStream(30);let ac=null,musicEl=null,activeTransition="None",transitionStarted=0;
          try{ac=new(window.AudioContext||window.webkitAudioContext)();const dest=ac.createMediaStreamDestination();if(!muted){const vs=video.captureStream?video.captureStream():null;if(vs)vs.getAudioTracks().forEach(t=>ac.createMediaStreamSource(new MediaStream([t])).connect(dest));}if(musicTrack&&musicTrack.previewUrl){musicEl=new Audio(musicTrack.previewUrl);musicEl.loop=true;const ms=ac.createMediaElementSource(musicEl);ms.connect(dest);await ac.resume();await musicEl.play().catch(()=>{});}dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));}catch(err){console.warn("Audio mix unavailable",err);}
          const draw=()=>{if(closed)return;const progress=activeTransition!=="None"?Math.max(0,Math.min(1,(performance.now()-transitionStarted)/320)):1;ctx.save();ctx.filter=filter; if(activeTransition==="Fade"&&progress<1)ctx.globalAlpha=progress; if(activeTransition==="Flash"&&progress<1)ctx.fillStyle="#fff"; if(activeTransition==="Zoom"&&progress<1){const scale=1.18-.18*progress,w=canvas.width*scale,h=canvas.height*scale;ctx.drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}else if(activeTransition==="Swipe"&&progress<1){ctx.drawImage(video,canvas.width*(1-progress),0,canvas.width,canvas.height);ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width*(1-progress),canvas.height);}else if(activeTransition==="Flash"&&progress<.22){ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);}else{ctx.drawImage(video,0,0,canvas.width,canvas.height);}ctx.restore();if(progress>=1)activeTransition="None";if(txt.value.trim()){ctx.save();ctx.font="800 "+Math.max(24,canvas.width*.055)+"px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=9;const words=txt.value.trim().split(/\s+/),rows=[];let row="";for(const word of words){const test=row?row+" "+word:word;if(ctx.measureText(test).width>canvas.width*.78&&row){rows.push(row);row=word;}else row=test;}if(row)rows.push(row);rows.slice(0,5).forEach((line,i)=>ctx.fillText(line,canvas.width/2,canvas.height*.43+(i-(Math.min(rows.length,5)-1)/2)*Math.max(28,canvas.width*.065),canvas.width*.78));ctx.restore();}if(!video.paused&&!video.ended)requestAnimationFrame(draw);};
          const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported(t))||"",chunks=[],recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
          recorder.ondataavailable=ev=>{if(ev.data&&ev.data.size)chunks.push(ev.data);};const stopped=new Promise(res=>recorder.onstop=res);recorder.start(250);await video.play();draw();
          await new Promise(res=>{let lastCutEnd=-1;const check=()=>{if(video.currentTime>=en-.02||video.ended){video.pause();res();return;}const cut=deletedRanges.find(r=>r.end>st&&r.start<en&&video.currentTime>=Math.max(st,r.start)-.04&&video.currentTime<Math.min(en,r.end)-.025);if(cut&&cut.end>lastCutEnd){lastCutEnd=cut.end;activeTransition=cut.transition||"None";transitionStarted=performance.now();video.currentTime=Math.min(en,cut.end+.04);return;}setTimeout(check,25);};check();});
          if(recorder.state!=="inactive")recorder.stop();await stopped;if(musicEl){musicEl.pause();URL.revokeObjectURL(musicEl.src);}if(ac)await ac.close().catch(()=>{});stream.getTracks().forEach(t=>t.stop());
          const type=chunks[0]&&chunks[0].type||mime||"video/webm",ext=type.includes("mp4")?"mp4":"webm",blob=new Blob(chunks,{type});if(!blob.size)throw new Error("Edited video export failed.");
          finish({file:new File([blob],file.name.replace(/\.[^.]+$/,"")+"-instapro-reel."+ext,{type,lastModified:Date.now()}),title:titleInput.value.trim(),caption:cap.value.trim(),hashtags:hashtagsInput.value.trim(),taggedPeople:tagsInput.value.trim(),musicTrack});
        }catch(err){console.error("Reels editor export failed",err);btn.disabled=false;btn.textContent="Retry Export";alert("Export fail: "+(err.message||"Unknown error")+". Please retry.");}
      });
    });
  }
  window.InstaProReelEditor = { open: openPremiumReelEditor };

  window.InstaProEditor = { open, close };
  console.log("InstaPro Glass Editor initialized");
})();
