// ==========================================
// InstaPro Professional Photo & Video Editor
// File: editor.js
// ==========================================

const InstaProEditor = (() => {
  let overlay = null;
  let selectedFile = null;
  let objectUrl = null;
  let mediaType = "image";
  let filterIndex = 0;

  const filters = [
    { name: "Original", value: "none" },
    { name: "Bright", value: "brightness(1.15) contrast(1.05)" },
    { name: "Vintage", value: "sepia(0.35) contrast(1.1)" },
    { name: "B&W", value: "grayscale(1)" },
    { name: "Warm", value: "sepia(0.2) saturate(1.3)" },
    { name: "Cool", value: "saturate(0.9) hue-rotate(10deg)" },
    { name: "Vivid", value: "saturate(1.5) contrast(1.1)" }
  ];

  function open(file) {
    if (!(file instanceof File)) {
      alert("Pehle photo ya video select karein.");
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      alert("Sirf photo ya video select karein.");
      return;
    }

    close();

    selectedFile = file;
    mediaType = file.type.startsWith("video/") ? "video" : "image";
    filterIndex = 0;
    objectUrl = URL.createObjectURL(file);

    createEditor();
  }

  function createEditor() {
    overlay = document.createElement("div");
    overlay.id = "instaproEditor";

    overlay.innerHTML = `
      <header class="ipe-header">
        <button type="button" data-action="close">✕</button>
        <strong>InstaPro Editor</strong>
        <button type="button" data-action="next">Next →</button>
      </header>

      <main class="ipe-main">
        <div class="ipe-preview" id="ipePreview"></div>

        <div class="ipe-tools">
          <button type="button" data-action="filter">🎨 Filters</button>
          <button type="button" data-action="rotate">↻ Rotate</button>
          <button type="button" data-action="reset">Reset</button>
        </div>

        <div class="ipe-filter-list" id="ipeFilters"></div>

        <section class="ipe-adjustments">
          <label>
            Brightness
            <input type="range" min="50" max="150"
              value="100" data-adjust="brightness">
          </label>

          <label>
            Contrast
            <input type="range" min="50" max="150"
              value="100" data-adjust="contrast">
          </label>

          <label>
            Saturation
            <input type="range" min="0" max="200"
              value="100" data-adjust="saturation">
          </label>
        </section>

        <p class="ipe-note">
          Photo/video preview • Edit settings apply to the preview.
        </p>
      </main>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add("ipe-open");

    const preview = overlay.querySelector("#ipePreview");

    if (mediaType === "video") {
      preview.innerHTML = `
        <video id="ipeMedia" src="${objectUrl}"
          controls playsinline></video>
      `;
    } else {
      preview.innerHTML = `
        <img id="ipeMedia" src="${objectUrl}" alt="Photo preview">
      `;
    }

    overlay.addEventListener("click", handleClick);

    overlay.querySelectorAll("[data-adjust]").forEach(input => {
      input.addEventListener("input", applyAdjustments);
    });

    renderFilters();
    applyAdjustments();
  }

  function renderFilters() {
    const list = overlay.querySelector("#ipeFilters");

    list.innerHTML = filters.map((filter, index) => `
      <button type="button"
        class="${index === filterIndex ? "active" : ""}"
        data-filter-index="${index}">
        ${filter.name}
      </button>
    `).join("");

    list.querySelectorAll("[data-filter-index]").forEach(button => {
      button.addEventListener("click", () => {
        filterIndex = Number(button.dataset.filterIndex);
        renderFilters();
        applyAdjustments();
      });
    });
  }

  function applyAdjustments() {
    if (!overlay) return;

    const media = overlay.querySelector("#ipeMedia");
    if (!media) return;

    const brightness = overlay.querySelector(
      '[data-adjust="brightness"]'
    ).value;

    const contrast = overlay.querySelector(
      '[data-adjust="contrast"]'
    ).value;

    const saturation = overlay.querySelector(
      '[data-adjust="saturation"]'
    ).value;

    const selectedFilter = filters[filterIndex].value;

    media.style.filter = `
      ${selectedFilter}
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
    `;

    media.style.transform = `rotate(${media.dataset.rotation || 0}deg)`;
  }

  function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    switch (button.dataset.action) {
      case "close":
        close();
        break;

      case "filter":
        overlay.querySelector("#ipeFilters").scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
        break;

      case "rotate": {
        const media = overlay.querySelector("#ipeMedia");
        const rotation = Number(media.dataset.rotation || 0) + 90;
        media.dataset.rotation = String(rotation % 360);
        applyAdjustments();
        break;
      }

      case "reset":
        filterIndex = 0;
        overlay.querySelectorAll("[data-adjust]").forEach(input => {
          input.value = 100;
        });
        renderFilters();
        applyAdjustments();
        break;

      case "next":
        if (typeof window.InstaProEditor.onNext === "function") {
          window.InstaProEditor.onNext({
            file: selectedFile,
            mediaType,
            previewUrl: objectUrl
          });
        } else {
          alert(
            "Editor preview taiyar hai. Abhi Upload System se connection baaki hai."
          );
        }
        break;
    }
  }

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    document.body.classList.remove("ipe-open");

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }

    selectedFile = null;
  }

  function getSelectedFile() {
    return selectedFile;
  }

  return {
    open,
    close,
    getSelectedFile,
    onNext: null
  };
})();

window.InstaProEditor = InstaProEditor;

console.log("InstaPro Editor initialized");
