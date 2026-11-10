// Load the Capacitor-only hardware Back handler in the Android app.
// GitHub Pages and normal mobile browsers keep their native Back behavior.
(function () {
  const cap = window.Capacitor;
  const isNative = !!(cap && (cap.isNativePlatform?.() || cap.getPlatform?.() === "android"));
  if (!isNative) return;
  import("./native-back.bundle.js").catch(error =>
    console.error("Intube native Back handler failed to load:", error)
  );
})();
