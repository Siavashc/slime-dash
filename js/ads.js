// ---- Pluggable ad layer ----
// Modes:
//  - "adsgram": Telegram Mini App (script from sad.adsgram.com loaded by tma.js when blockId configured)
//  - "portal-stub": portals inject their own SDK; we expose harmless no-ops so the UI
//    still shows rewarded buttons ONLY when a real provider is wired (buttons auto-hide otherwise).
// Configure in config.js (or inline) — see DEPLOY.md.
window.GameAds = (() => {
  let controller = null;
  let blockId = window.ADSGRAM_BLOCK_ID || "";

  function available() {
    if (blockId && window.Adsgram) return true;
    return false; // portal interstitials are handled by portal SDKs directly
  }
  async function init() {
    try {
      if (blockId && !window.Adsgram) {
        // load Adsgram SDK dynamically (Telegram Mini App context)
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://sad.adsgram.com/js/sg/main.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
          setTimeout(res, 4000);
        });
      }
      if (blockId && window.Adsgram) {
        controller = window.Adsgram.init({ blockId, debug: false });
      }
    } catch (e) { controller = null; }
  }
  async function showRewarded() {
    if (!controller) throw new Error("no-ad-provider");
    return controller.show();
  }
  // convenience: shows ad and calls cb only on completed watch
  async function rewarded(cb) {
    try {
      if (!available()) { window.UI && UI.toast(t("toastNoAd")); return false; }
      await showRewarded();
      cb && cb();
      return true;
    } catch (e) { window.UI && UI.toast(t("toastNoAd")); return false; }
  }
  return { init, available, showRewarded, rewarded };
})();