// ---- Pluggable ad layer (Adsgram rewarded + interstitial) ----
// Adsgram domain 2026 = partner.adsgram.ai; SDK = https://sad.adsgram.ai/js/sad.min.js
// Block id formats: REWARD = numeric ("12345"), INTERSTITIAL = "int-456", TASK = "task-789".
// Config knobs (main.js): ADSGRAM_BLOCK_ID (rewarded, numeric) and ADSGRAM_INT_ID.
// With neither wired, the UI keeps working: rewarded buttons fall back to share/pity paths.
const ADSDK = "https://sad.adsgram.ai/js/sad.min.js";
window.GameAds = (() => {
  let rewardedCtrl = null, interCtrl = null;
  let rewBlock = window.ADSGRAM_BLOCK_ID || "";
  let intBlock = window.ADSGRAM_INT_ID || "";
  // interstitial density guardrails (per research: 3-4 interstitials/day/user ok)
  const INT_EVERY_RUNS = 2, INT_COOLDOWN_MS = 30000, INT_SKIP_FIRST_RUNS = 3;
  let runsEnded = 0, lastIntAt = 0, lastRewardedAt = 0;

  function killToasts() {
    // suppress Adsgram's default alert() popups (onBannerNotFound etc.)
    try {
      window.alert = window.alert || (() => {});
      window.alert = function (msg) {
        if (/banner|session|ad/i.test(String(msg))) return;
        console.info("[adsgram]", msg);
      };
    } catch (e) {}
  }

  function loadSDK() {
    try {
      if (!window.Adsgram && (rewBlock || intBlock)) {
        const s = document.createElement("script");
        s.src = ADSDK;
        document.head.appendChild(s);
      }
    } catch (e) {}
  }

  function available() {
    return !!(rewBlock && window.Adsgram && rewardedCtrl);
  }
  // Placement visibility vs ad delivery are separate concerns: Adsgram's
  // moderation opens the App URL in a PLAIN browser and declines by clause 11
  // ("ad placement not verifiable") if the ad buttons aren't on screen. So ad
  // buttons must render everywhere; actual delivery stays TMA-only.
  function placementVisible() {
    return !!rewBlock;
  }
  async function init() {
    try {
      if (!rewBlock && !intBlock) return;
      killToasts(); // SDK may still page.alert in plain browsers — suppress
      // Script tag present in EVERY environment (moderation sees the request).
      loadSDK();
      // Controllers only inside the Telegram webview: in a plain browser
      // Adsgram.init() would alert launch-params errors in a loop.
      const tgw = window.Telegram && window.Telegram.WebApp;
      if (!tgw || !tgw.initData) return;
      if (!window.Adsgram) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = ADSDK;
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
          setTimeout(res, 4000);
        });
      }
      if (window.Adsgram) {
        if (rewBlock) rewardedCtrl = window.Adsgram.init({ blockId: rewBlock, debug: false });
        if (intBlock) interCtrl = window.Adsgram.init({ blockId: intBlock, debug: false });
        // keep Adsgram's default alert popups suppressed (banner-not-found / too-long-session)
        try {
          const c = rewardedCtrl || interCtrl;
          if (c && c.addEventListener) {
            c.addEventListener("onBannerNotFound", () => {});
            c.addEventListener("onTooLongSession", () => {});
            c.addEventListener("onError", () => {});
          }
        } catch (e) {}
      }
    } catch (e) { rewardedCtrl = null; interCtrl = null; }
  }
  async function showRewarded() {
    if (!rewardedCtrl) throw new Error("no-ad-provider");
    return rewardedCtrl.show();
  }
  // convenience: shows ad and calls cb only on COMPLETED watch (skips don't pay)
  async function rewarded(cb) {
    try {
      if (!available()) { window.UI && UI.toast(t("toastNoAd")); return false; }
      lastRewardedAt = Date.now();
      const res = await showRewarded();
      // Adsgram ShowPromiseResult: { done, error, state, description }
      const valid = !res || (res.done !== undefined ? (res.done && !res.error) : true);
      if (valid) { cb && cb(); return true; }
      window.UI && UI.toast(t("toastNoAd"));
      return false;
    } catch (e) { window.UI && UI.toast(t("toastNoAd")); return false; }
  }
  // call at every run end; decides internally whether an interstitial plays
  function maybeInterstitial() {
    runsEnded++;
    const since = Date.now() - lastIntAt;
    const sinceRewarded = Date.now() - lastRewardedAt;
    if (!interCtrl) return false;
    if (runsEnded <= INT_SKIP_FIRST_RUNS) return false;          // nothing before run 3
    if (sinceRewarded < 45000) return false;                     // never stack on top of a rewarded ad
    if (lastIntAt !== 0 && since < INT_COOLDOWN_MS) return false;
    if ((runsEnded - INT_SKIP_FIRST_RUNS) % INT_EVERY_RUNS !== 0) return false;
    lastIntAt = Date.now();
    try { interCtrl.show(); } catch (e) {}
    return true;
  }
  return { init, loadSDK, available, placementVisible, showRewarded, rewarded, maybeInterstitial };
})();