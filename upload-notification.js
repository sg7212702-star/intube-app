// ========================================
// InstaPro Live Upload Notification
// ========================================

const InstaProUploadNotification = (() => {
  let container;

  function init() {
    if (container) return;

    const style = document.createElement("style");
    style.textContent = `
      #ipUploadNotice {
        position: fixed;
        top: 15px;
        left: 12px;
        right: 12px;
        z-index: 1000000;
        padding: 15px;
        color: #fff;
        background: #202027;
        border: 1px solid #393943;
        border-radius: 16px;
        box-shadow: 0 8px 30px #0007;
        font-family: Arial, sans-serif;
        display: none;
      }

      #ipUploadNotice .ip-un-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #ipUploadNotice .ip-un-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #35303e;
        font-size: 23px;
        flex-shrink: 0;
      }

      #ipUploadNotice .ip-un-content {
        flex: 1;
        min-width: 0;
      }

      #ipUploadNotice .ip-un-title {
        font-size: 14px;
        font-weight: 700;
      }

      #ipUploadNotice .ip-un-subtitle {
        font-size: 12px;
        color: #c4c4cc;
        margin-top: 5px;
      }

      #ipUploadNotice .ip-un-percent {
        font-size: 13px;
        font-weight: 700;
      }

      #ipUploadNotice .ip-un-track {
        height: 4px;
        margin-top: 13px;
        background: #44444d;
        border-radius: 10px;
        overflow: hidden;
      }

      #ipUploadNotice .ip-un-bar {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg,#833ab4,#fd1d1d,#fcb045);
        transition: width .2s ease;
      }

      #ipUploadNotice .ip-un-close {
        display: none;
        margin-top: 12px;
        padding: 7px 12px;
        border: 0;
        border-radius: 8px;
        color: white;
        background: #393943;
      }
    `;

    document.head.appendChild(style);

    container = document.createElement("div");
    container.id = "ipUploadNotice";

    container.innerHTML = `
      <div class="ip-un-row">
        <div class="ip-un-icon">📤</div>
        <div class="ip-un-content">
          <div class="ip-un-title">Uploading your post…</div>
          <div class="ip-un-subtitle">Please wait</div>
        </div>
        <div class="ip-un-percent">0%</div>
      </div>

      <div class="ip-un-track">
        <div class="ip-un-bar"></div>
      </div>

      <button class="ip-un-close" type="button">Dismiss</button>
    `;

    document.body.appendChild(container);

    container.querySelector(".ip-un-close").onclick = () => {
      container.style.display = "none";
    };
  }

  function show() {
    init();

    container.style.display = "block";

    container.querySelector(".ip-un-icon").textContent = "📤";
    container.querySelector(".ip-un-title").textContent =
      "Uploading your post…";

    container.querySelector(".ip-un-subtitle").textContent =
      "Your photo or video is uploading";

    container.querySelector(".ip-un-percent").textContent = "0%";
    container.querySelector(".ip-un-bar").style.width = "0%";
    container.querySelector(".ip-un-close").style.display = "none";
  }

  function progress(percent) {
    init();

    const value = Math.max(0, Math.min(100, Number(percent) || 0));

    container.querySelector(".ip-un-percent").textContent =
      `${value}%`;

    container.querySelector(".ip-un-bar").style.width =
      `${value}%`;
  }

  function success() {
    init();

    container.style.display = "block";
    container.querySelector(".ip-un-icon").textContent = "✅";
    container.querySelector(".ip-un-title").textContent =
      "Post uploaded successfully!";

    container.querySelector(".ip-un-subtitle").textContent =
      "Your post is ready to view.";

    container.querySelector(".ip-un-percent").textContent = "100%";
    container.querySelector(".ip-un-bar").style.width = "100%";
    container.querySelector(".ip-un-close").style.display = "inline-block";

    setTimeout(() => {
      if (container) container.style.display = "none";
    }, 4000);
  }

  function error(message) {
    init();

    container.style.display = "block";
    container.querySelector(".ip-un-icon").textContent = "❌";
    container.querySelector(".ip-un-title").textContent =
      "Upload failed";

    container.querySelector(".ip-un-subtitle").textContent =
      message || "Please try again.";

    container.querySelector(".ip-un-close").style.display = "inline-block";
  }

  return { show, progress, success, error };
})();

window.InstaProUploadNotification = InstaProUploadNotification;
