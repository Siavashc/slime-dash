// ---- Telegram Mini App integration (optional; plain-web default) ----
window.TMA = (() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const ready = !!tg && !!tg.initData;

  function init() {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      uiColor(tg.colorScheme === "dark" ? "#0b0f1e" : "#0b0f1e");
      tg.setHeaderColor && tg.setHeaderColor("#0b0f1e");
      tg.setBackgroundColor && tg.setBackgroundColor("#0b0f1e");
    } catch (e) {}
  }
  function uiColor(c) { try { tg.setSecondHeaderColor && tg.setSecondHeaderColor(c); } catch (e) {} }

  // share score: in TMA → forward to a chat; on web → clipboard
  async function shareScore(score) {
    const url = botDeepLink();
    const text = LANG === "fa"
      ? "امتیازم توی «Slime Dash»: " + score + "متر — کی بیشتر می‌ره؟"
      : "I steered for " + score + "m in Slime Dash — beat that!";
    if (ready && tg.openTelegramLink) {
      tg.openTelegramLink(
        "https://t.me/share/url?url=" + encodeURIComponent(url) +
        "&text=" + encodeURIComponent(text));
      return true;
    }
    try {
      await navigator.clipboard.writeText(text + " — " + url);
      return "clipboard";
    } catch (e) { return false; }
  }
  function botDeepLink() {
    return window.SHARE_URL || "https://t.me/SlimeDashBot/slimedash";
  }
  return { init, ready, shareScore };
})();