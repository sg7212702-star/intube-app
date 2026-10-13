// InstaPro Music Library — creator audio, search, preview and trending.
import { auth, db } from "./firebase.js";
import {
  collection, getDocs, addDoc, doc, updateDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(() => {
  "use strict";
  const CLOUD_NAME = "kujnbe0a";
  const UPLOAD_PRESET = "intube_free";
  let panel = null;
  let tracks = [];
  let activeAudio = null;
  let activeUrl = "";
  let pickerCallback = null;
  let currentCategory = "All";
  let searchText = "";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);

  function styles() {
    if (document.getElementById("ipml-styles")) return;
    const style = document.createElement("style");
    style.id = "ipml-styles";
    style.textContent = `
      #ipml{position:fixed;inset:0;z-index:1000002;background:rgba(4,5,12,.97);color:#fff;font-family:inherit;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);backdrop-filter:blur(24px)}
      #ipml *{box-sizing:border-box} #ipml button,#ipml input{font:inherit}
      #ipml .ipml-head{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #ffffff20}
      #ipml .ipml-head strong{flex:1;font-size:18px} #ipml button{cursor:pointer;color:#fff}
      #ipml .ipml-glass{border:1px solid #ffffff2b;background:#ffffff12;border-radius:14px;padding:10px 13px}
      #ipml .ipml-search{display:flex;gap:8px;padding:12px}
      #ipml .ipml-search input{min-width:0;flex:1;border:1px solid #ffffff24;border-radius:14px;padding:12px;background:#ffffff0d;color:white;outline:none}
      #ipml .ipml-cats{display:flex;gap:8px;overflow:auto;padding:0 12px 12px;scrollbar-width:none}
      #ipml .ipml-cats button{white-space:nowrap} #ipml .ipml-cats .active{background:#7454ff80;border-color:#c0adff}
      #ipml .ipml-note{font-size:11px;opacity:.65;line-height:1.45;margin:0 14px 10px}
      #ipml .ipml-list{overflow:auto;flex:1;padding:0 12px 20px}
      #ipml .ipml-track{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:8px;border:1px solid #ffffff18;background:#ffffff08;border-radius:16px}
      #ipml .ipml-cover{width:46px;height:46px;flex:0 0 46px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(135deg,#5436a8,#bf477c);font-size:22px}
      #ipml .ipml-meta{flex:1;min-width:0} #ipml .ipml-meta b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
      #ipml .ipml-meta small{display:block;opacity:.62;font-size:11px;margin-top:4px}
      #ipml .ipml-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      #ipml .ipml-empty{text-align:center;opacity:.65;padding:32px 12px;line-height:1.6}
      #ipml .ipml-upload{margin:0 12px 12px;padding:12px;border:1px solid #ffffff20;border-radius:16px;background:#ffffff08}
      #ipml .ipml-upload label{display:block;font-size:12px;margin-bottom:8px}
      #ipml .ipml-upload input[type=text],#ipml .ipml-upload select{width:100%;padding:10px;border:1px solid #ffffff24;background:#151520;color:white;border-radius:10px;margin:4px 0 8px}
      #ipml .ipml-primary{background:#7454ff75;border-color:#b9a5ff!important}
      @media(min-width:700px){#ipml{left:50%;right:auto;top:4%;bottom:4%;width:min(680px,96vw);transform:translateX(-50%);border:1px solid #ffffff25;border-radius:24px;overflow:hidden}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    styles();
    if (panel) return;
    panel = document.createElement("section");
    panel.id = "ipml";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.innerHTML = `
      <header class="ipml-head"><button class="ipml-glass" data-ipml="close">✕</button><strong>🎵 InstaPro Music</strong><button class="ipml-glass" data-ipml="refresh">↻</button></header>
      <div class="ipml-search"><input id="ipmlSearch" type="search" placeholder="Search song, artist or language…"><button class="ipml-glass" data-ipml="search">Search</button></div>
      <div class="ipml-cats" id="ipmlCats"></div>
      <p class="ipml-note">यहाँ Creator-uploaded / अनुमति प्राप्त Audio दिखेंगे। केवल वही Music अपलोड करें जिसके अधिकार आपके पास हैं। यह लाइब्रेरी अपने-आप Bollywood या अन्य फिल्मी गानों के अधिकार नहीं देती।</p>
      <div class="ipml-list" id="ipmlList"><div class="ipml-empty">Music Library लोड हो रही है…</div></div>
      <div class="ipml-upload">
        <label><b>＋ अपना Original / Licensed Audio जोड़ें</b></label>
        <input id="ipmlTitle" type="text" maxlength="100" placeholder="Song / Audio title">
        <input id="ipmlArtist" type="text" maxlength="80" placeholder="Artist / Creator name">
        <select id="ipmlLanguage"><option>Hindi</option><option>Bhojpuri</option><option>Chhattisgarhi</option><option>Punjabi</option><option>English</option><option>Other</option></select>
        <input id="ipmlFile" type="file" accept="audio/*">
        <button class="ipml-glass ipml-primary" data-ipml="upload">Upload Audio</button>
        <p class="ipml-note" style="margin:8px 0 0">Audio Cloudinary पर और विवरण Firestore में सेव होंगे। Firebase/Cloudinary rules और upload preset के कारण upload fail हो सकता है; browser console में error देखें।</p>
      </div>`;
    document.body.appendChild(panel);
    panel.addEventListener("click", onClick);
    panel.querySelector("#ipmlSearch").addEventListener("input", e => { searchText = e.target.value.trim().toLowerCase(); renderTracks(); });
    panel.querySelector("#ipmlSearch").addEventListener("keydown", e => { if (e.key === "Enter") { searchText = e.target.value.trim().toLowerCase(); renderTracks(); } });
    renderCategories();
  }

  function renderCategories() {
    const cats = ["All","Trending","Hindi","Bhojpuri","Chhattisgarhi","Punjabi","English","Original Audio"];
    const host = panel?.querySelector("#ipmlCats");
    if (!host) return;
    host.innerHTML = cats.map(c => `<button class="ipml-glass ${currentCategory===c?"active":""}" data-category="${esc(c)}">${esc(c==="Trending"?"🔥 Trending":c)}</button>`).join("");
    host.querySelectorAll("[data-category]").forEach(b => b.addEventListener("click", () => {
      currentCategory = b.dataset.category;
      renderCategories();
      renderTracks();
    }));
  }

  function filteredTracks() {
    let list = [...tracks];
    if (currentCategory === "Trending") list.sort((a,b) => (Number(b.useCount||0)*3+Number(b.playCount||0))-(Number(a.useCount||0)*3+Number(a.playCount||0)));
    else if (currentCategory === "Original Audio") list = list.filter(t => t.isOriginalAudio !== false);
    else if (currentCategory !== "All") list = list.filter(t => String(t.language||"").toLowerCase() === currentCategory.toLowerCase());
    if (searchText) list = list.filter(t => [t.title,t.artistName,t.language].some(v => String(v||"").toLowerCase().includes(searchText)));
    return list;
  }

  function renderTracks() {
    const host = panel?.querySelector("#ipmlList");
    if (!host) return;
    const list = filteredTracks();
    if (!list.length) {
      host.innerHTML = '<div class="ipml-empty">इस खोज में कोई Audio नहीं मिला।<br>अपना Original Audio जोड़ सकते हैं।</div>';
      return;
    }
    host.innerHTML = list.map(t => `
      <article class="ipml-track">
        <div class="ipml-cover">♫</div><div class="ipml-meta"><b>${esc(t.title||"Untitled Audio")}</b><small>${esc(t.artistName||"Creator")} · ${esc(t.language||"Other")} · ▶ ${Number(t.playCount||0)}</small></div>
        <div class="ipml-actions"><button class="ipml-glass" data-ipml="preview" data-id="${esc(t.id)}">▶</button><button class="ipml-glass ipml-primary" data-ipml="use" data-id="${esc(t.id)}">${pickerCallback?"Use":"Select"}</button></div>
      </article>`).join("");
  }

  async function loadTracks() {
    const host = panel?.querySelector("#ipmlList");
    if (host) host.innerHTML = '<div class="ipml-empty">Music Library लोड हो रही है…</div>';
    try {
      const snap = await getDocs(collection(db, "music"));
      tracks = snap.docs.map(d => ({id:d.id,...d.data()})).filter(t => typeof t.audioUrl === "string" && /^https:\/\//i.test(t.audioUrl));
      renderTracks();
    } catch (error) {
      console.error("Music Library load failed:", error);
      if (host) host.innerHTML = '<div class="ipml-empty">Music Library लोड नहीं हुई। Firebase Firestore rules में <b>music</b> collection का read access जाँचें।<br><br>अपना Audio फिर भी Upload करके कोशिश कर सकते हैं।</div>';
    }
  }

  function open(options = {}) {
    ensurePanel();
    pickerCallback = typeof options.onSelect === "function" ? options.onSelect : null;
    currentCategory = "All";
    searchText = "";
    panel.querySelector("#ipmlSearch").value = "";
    panel.querySelector('[data-ipml="upload"]').textContent = "Upload Audio";
    panel.style.display = "flex";
    document.body.style.overflow = "hidden";
    renderCategories();
    renderTracks();
    loadTracks();
  }

  function close() {
    if (panel) panel.style.display = "none";
    if (activeAudio) activeAudio.pause();
    activeAudio = null;
    if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = ""; }
    if (panel && !document.getElementById("instaproEditor")) document.body.style.overflow = "";
  }

  function findTrack(id) { return tracks.find(t => t.id === id); }

  async function previewTrack(track) {
    if (!track?.audioUrl) return;
    if (activeAudio) activeAudio.pause();
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = "";
    activeAudio = new Audio(track.audioUrl);
    activeAudio.volume = 0.8;
    try {
      await activeAudio.play();
      await updateDoc(doc(db,"music",track.id), {playCount: increment(1)}).catch(()=>{});
      track.playCount = Number(track.playCount||0)+1;
      renderTracks();
    } catch (error) {
      alert("Audio play nahi hua. File URL ya CORS/hosting settings check karein.");
      console.warn("Music preview failed:", error);
    }
  }

  async function useTrack(track) {
    if (!track) return;
    await updateDoc(doc(db,"music",track.id), {useCount: increment(1)}).catch(()=>{});
    track.useCount = Number(track.useCount||0)+1;
    const selected = {
      id: track.id, title: track.title || "Audio", artistName: track.artistName || "",
      audioUrl: track.audioUrl, language: track.language || "Other",
      license: track.license || "creator-provided; verify rights before use"
    };
    const callback = pickerCallback;
    close();
    if (callback) callback(selected);
    else {
      window.__instaProSelectedMusicTrack = selected;
      alert("Audio select हो गया। अब Reel चुनकर video select करें; Editor में यह Music अपने-आप चुना जाएगा।");
    }
  }

  async function uploadTrack() {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) { alert("Audio upload करने के लिए पहले Google से login करें।"); return; }
    const title = panel.querySelector("#ipmlTitle").value.trim();
    const artistName = panel.querySelector("#ipmlArtist").value.trim() || user.displayName || "InstaPro Creator";
    const language = panel.querySelector("#ipmlLanguage").value;
    const file = panel.querySelector("#ipmlFile").files?.[0];
    if (!title) { alert("Song / Audio title लिखें।"); return; }
    if (!file || !file.type.startsWith("audio/")) { alert("अपनी audio file चुनें।"); return; }
    if (file.size > 25*1024*1024) { alert("Audio 25 MB से छोटी रखें।"); return; }
    const button = panel.querySelector('[data-ipml="upload"]');
    button.disabled = true; button.textContent = "Uploading…";
    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);
      form.append("folder", "instapro-music");
      const response = await fetch(endpoint, {method:"POST",body:form});
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary audio upload failed");
      const docRef = await addDoc(collection(db,"music"), {
        title, artistName, language, audioUrl:result.secure_url,
        duration:Number(result.duration||0), ownerUid:user.uid,
        ownerName:user.displayName||artistName, isOriginalAudio:true,
        playCount:0, useCount:0, license:"creator-uploaded; uploader confirms rights",
        createdAt:serverTimestamp()
      });
      tracks.unshift({id:docRef.id,title,artistName,language,audioUrl:result.secure_url,duration:Number(result.duration||0),ownerUid:user.uid,isOriginalAudio:true,playCount:0,useCount:0});
      panel.querySelector("#ipmlTitle").value = "";
      panel.querySelector("#ipmlArtist").value = "";
      panel.querySelector("#ipmlFile").value = "";
      currentCategory = "All"; renderCategories(); renderTracks();
      alert("Audio Library में जुड़ गया। ध्यान दें: यह केवल उसी Music के लिए करें जिसके अधिकार आपके पास हैं।");
    } catch (error) {
      console.error("Music upload failed:", error);
      alert("Music upload नहीं हुआ: " + error.message + "\nCloudinary preset और Firestore rules जाँचें।");
    } finally {
      button.disabled = false; button.textContent = "Upload Audio";
    }
  }

  async function onClick(event) {
    const button = event.target.closest("[data-ipml]");
    if (!button) return;
    const action = button.dataset.ipml;
    if (action === "close") { close(); return; }
    if (action === "refresh") { await loadTracks(); return; }
    if (action === "search") { searchText = panel.querySelector("#ipmlSearch").value.trim().toLowerCase(); renderTracks(); return; }
    if (action === "upload") { await uploadTrack(); return; }
    const track = findTrack(button.dataset.id);
    if (action === "preview") { await previewTrack(track); return; }
    if (action === "use") { await useTrack(track); }
  }

  // Never leave a Music Library shortcut inside the home (+) create sheet.
  // Music is selected from the Editor's "Add music" section only.
  function removeCreateSheetShortcut() {
    document.getElementById("optMusicLibrary")?.remove();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeCreateSheetShortcut, { once: true });
  } else {
    removeCreateSheetShortcut();
  }

  window.InstaProMusic = { open, openPicker(onSelect) { open({onSelect}); }, close };
  console.log("InstaPro Music Library initialized");
})();
