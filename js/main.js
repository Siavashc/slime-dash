// ---- Bootstrap: config, wiring, init ----
// ===== EDIT THESE AFTER DEPLOY (see DEPLOY.md) =====
window.SHARE_URL = window.SHARE_URL || "https://t.me/slimedash_game_bot/slimedash";
window.ADSGRAM_BLOCK_ID = window.ADSGRAM_BLOCK_ID || ""; // e.g. "int-12345" from partner.adsgram.com
// ===================================================

setLang(LANG);
GameState.load();
TMA.init();
GameAds.init();
UI.fmt();
UI.goMenu();

function commitBest() {
  const isNewBest = score > GameState.best;
  if (isNewBest) { GameState.best = score; GameState.write(); }
  return isNewBest;
}

$("btn-play").onclick = () => { SFX.unlock(); SFX.click(); startRun(); };
$("btn-shop").onclick = () => { SFX.click(); UI.renderShop(); UI.show("shop"); };
$("btn-death-shop").onclick = () => { SFX.click(); UI.renderShop(); UI.show("shop"); };
$("btn-shop-close").onclick = () => { SFX.click(); UI.hide("shop"); UI.fmt(); };

$("btn-retry").onclick = () => { SFX.click(); commitBest(); UI.hide("death"); startRun(); };

$("btn-revive").onclick = () => {
  SFX.click();
  GameAds.rewarded(revive);
  if (!GameAds.available()) {
    // no provider wired (dev/local): one pity revive per session so the mechanic is testable
    if (!window._pityRevive) { window._pityRevive = true; revive(); }
  }
};

$("btn-double").onclick = () => {
  if ($("btn-double").disabled) return;
  GameAds.rewarded(() => {
    const bank = GameState.runCoinsBank || 0;
    GameState.coins += bank;
    GameState.write(); UI.fmt();
    $("btn-double").disabled = true;
    SFX.buy();
  });
};

$("btn-share").onclick = async () => {
  commitBest();
  const r = await TMA.shareScore(score);
  if (r === "clipboard") UI.toast(t("toastCopied"));
};

$("btn-pause").onclick = () => { SFX.click(); UI.pause(); };
$("btn-resume").onclick = () => { SFX.click(); UI.resume(); };
$("btn-quit").onclick = () => {
  SFX.click(); UI.resume(); commitBest(); UI.hide("hud"); UI.hide("pause"); UI.goMenu();
};

$("btn-mute").onclick = () => {
  SFX.unlock();
  GameState.muted = !GameState.muted; GameState.write();
  $("btn-mute").textContent = GameState.muted ? "🔇" : "🔊";
  if (GameState.muted) SFX.stopMusic(); else if (state === "PLAY") SFX.startMusic();
};
$("btn-mute").textContent = GameState.muted ? "🔇" : "🔊";

$("btn-lang").onclick = () => {
  SFX.click();
  setLang(LANG === "en" ? "fa" : "en");
  applyI18n();
};

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((n) => {
    n.textContent = t(n.getAttribute("data-i18n"));
  });
}
applyI18n();
document.documentElement.dir = LANG === "fa" ? "rtl" : "ltr";

// first-run hint bar (teach by playing)
(function hint() {
  const d = document.createElement("div");
  d.id = "hintbar";
  d.textContent = i18nHowTo();
  function i18nHowTo() { return t("howto"); }
  d.style.cssText = "position:absolute;left:50%;bottom:16%;transform:translateX(-50%);" +
    "z-index:50;pointer-events:none;background:rgba(16,22,42,.92);border:1px solid rgba(94,234,212,.35);" +
    "color:#e7f0ff;font-size:13px;font-weight:600;padding:9px 16px;border-radius:14px;text-align:center;" +
    "max-width:92%;transition:opacity .4s";
  d.style.display = "none";
  d._refresh = () => { d.textContent = t("howto"); };
  document.getElementById("app").appendChild(d);
  window.showHint = (show) => {
    d.textContent = t("howto");
    d.style.display = show ? "block" : "none";
  };
})();

// menu idle-slime animation loop
(function menuLoop() {
  try { UI.menuTick(1 / 60); } catch (e) {}
  requestAnimationFrame(menuLoop);
})();