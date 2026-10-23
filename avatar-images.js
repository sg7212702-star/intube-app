// InstaPro avatar-image compatibility for Android WebView.
// Avatar hosts (especially Google profile-photo URLs) may reject an embedded
// request with a WebView referrer. Retry once without a referrer before fallback.
(() => {
  const FALLBACK = "https://www.gravatar.com/avatar/?d=mp";
  const RETRIED = "instaproAvatarRetried";
  const isAvatar = img => {
    if (!(img instanceof HTMLImageElement)) return false;
    const marker = [
      img.id, img.className, img.alt,
      img.closest("[class]")?.className || "",
      img.closest("[data-open-reel-profile]") ? "reel-profile-avatar" : ""
    ].join(" ").toLowerCase();
    return /avatar|profile photo|your profile|profilepic|profile-photo|reel-profile-avatar|ipp-avatar|story-avatar/.test(marker);
  };

  function prepare(img) {
    if (!isAvatar(img)) return;
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    // Keep avatar images eager: lazy loading inside hidden/mobile panels can stall.
    img.loading = "eager";
  }

  function watch(root) {
    if (root instanceof HTMLImageElement) prepare(root);
    root.querySelectorAll?.("img").forEach(prepare);
  }

  watch(document);
  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) watch(node);
      });
      if (record.type === "attributes" && record.target instanceof HTMLImageElement) prepare(record.target);
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["src", "class", "alt"]
  });

  document.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !isAvatar(img)) return;
    const src = img.currentSrc || img.src || "";
    if (!src || src === FALLBACK || img.dataset[RETRIED] === "1") {
      if (src !== FALLBACK) img.src = FALLBACK;
      return;
    }
    img.dataset[RETRIED] = "1";
    img.referrerPolicy = "no-referrer";
    try {
      const url = new URL(src, location.href);
      url.searchParams.set("_ip_avatar_retry", String(Date.now()));
      img.src = url.href;
    } catch (_) {
      img.src = src;
    }
  }, true);
})();
