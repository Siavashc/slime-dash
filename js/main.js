// ---- Bootstrap: config, wiring, init ----
// ===== EDIT THESE AFTER DEPLOY (see DEPLOY.md) =====
window.SHARE_URL = window.SHARE_URL || "https://t.me/slimedash_game_bot/slimedash";
// Test-platform blocks (50833) — live/functional, no revenue. When the REAL
// platform 50840 finishes moderation, swap to: 53662 (reward) / int-53663.
window.ADSGRAM_BLOCK_ID = window.ADSGRAM_BLOCK_ID || "53656";
window.ADSGRAM_INT_ID = window.ADSGRAM_INT_ID || "int-53658";
// Leaderboard: no server needed — the bot publishes data/*.json into this repo
// and scores sync through Telegram-verified sendData(). See js/api.js header.

setLang(LANG);
GameState.load();
GameState.tickLives();
TMA.init();
GameAds.init();

function commitBest() {
  const isNewBest = score > GameState.best;
  if (isNewBest) { GameState.best = score; GameState.write(); }
  return isNewBest;
}

UI.fmt();
UI.goMenu();

// ----- rewards sync: the bot publishes data/pending/<uid>.json -----
// Client applies rewards to local state + remembers the version; the next
// sendData acks (the bot clears it server-side → file disappears).
function syncRewards() {
  Api.pendingFor().then((p) => {
    if (!p || !(p.v | 0)) return;
    if ((p.v | 0) <= (GameState.pendingApplied | 0)) return;
    GameState.pendingApplied = p.v | 0;
    if (p.lives) GameState.addLives(p.lives | 0);
    if (p.coins) GameState.coins += p.coins | 0;
    GameState.write();
    UI.toast("🎁 " + ((p.lives | 0) ? "+" + p.lives + " ❤️ " : "") + ((p.coins | 0) ? "+" + p.coins + " 🟢" : ""));
    SFX.buy();
    UI.fmt();
  }).catch(() => {});
}

// score sync happens only from the leaderboard panel (sendData closes the app)
window.submitRun = function (score, runCoins) {
  window._lastRun = { score: score | 0, coins: runCoins | 0 };
};

// legacy alias
function pollRewards() { try { syncRewards(); } catch (e) {} }

// ----- lives gates -----
function needLives() { return GameState.lives <= 0; }

function tryPlay() {
  SFX.unlock(); SFX.click();
  if (needLives()) { UI.openNoLives(); return; }
  UI.hide("nolives"); UI.showHUD();
  startRun();
}

$("btn-play").onclick = tryPlay;
$("btn-shop").onclick = () => { SFX.click(); UI.setShopTab("skins"); UI.show("shop"); };
$("btn-death-shop").onclick = () => { SFX.click(); UI.setShopTab("skins"); UI.show("shop"); };
$("btn-shop-close").onclick = () => { SFX.click(); UI.hide("shop"); UI.fmt(); };

$("btn-lb").onclick = () => { SFX.click(); UI.openLeaderboard(); };
$("btn-lb-close").onclick = () => { SFX.click(); UI.hide("lb"); UI.fmt(); };
$("tab-global").onclick = () => { SFX.click(); UI.setLbTab("global"); };
$("tab-group").onclick = () => { SFX.click(); UI.setLbTab("group"); };
// sync score through the bot (Telegram-verified write)
$("btn-lb-sync").onclick = () => {
  SFX.click();
  const r = window._lastRun || { score: GameState.best, coins: 0 };
  if (Api.sendRunToBot(r.score, r.coins)) {
    window._unsynced = false;
    UI.toast("📤");
  } else {
    UI.toast(t("toastNoTma"));
  }
};

$("btn-invite").onclick = () => { SFX.click(); UI.openInvite(); };
$("btn-invite-share").onclick = () => { SFX.unlock(); SFX.click(); UI.copyInvite(); };
$("btn-invite-copy").onclick = () => { SFX.unlock(); SFX.click(); UI.copyInvite(); };
$("btn-invite-close").onclick = () => { SFX.click(); UI.hide("invite"); UI.fmt(); };

// daily bonus: once per day, ad if available; free grant when no ad provider
$("btn-daily").onclick = () => {
  SFX.unlock(); SFX.click();
  if (!GameState.canDaily()) return;
  const grant = () => {
    if (!GameState.canDaily()) return;
    GameState.claimDaily();
    GameState.coins += 100;
    GameState.addLives(1);
    GameState.write(); SFX.buy();
    UI.toast(t("dailyBonusClaimed"));
    UI.fmt();
  };
  if (GameAds.available()) GameAds.rewarded(grant);
  else grant();
};

// ----- death screen -----
$("btn-retry").onclick = () => {
  SFX.click();
  const isNewBest = commitBest();
  UI.hide("death");
  if (needLives()) UI.openNoLives();
  else { UI.showHUD(); startRun(); }
};

$("btn-revive").onclick = () => {
  SFX.click();
  if (revivedUsed) return;
  GameAds.rewarded(revive);
  if (!GameAds.available()) {
    // no provider wired (dev/local web): one pity revive per session so the mechanic is testable
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
  SFX.unlock(); SFX.click();
  const r = await TMA.shareScore(score);
  if (r === "clipboard") UI.toast(t("toastCopied"));
  // share = life: throttled, real rewards for spreading the game
  if (GameState.canShareLife()) { GameState.grantShareLife(); UI.toast("❤️ +1!"); UI.fmt(); }
};

// ----- out-of-lives panel -----
$("btn-lives-ad").onclick = () => { SFX.click(); GameAds.rewarded(() => { GameState.addLives(3); UI.toast("❤️❤️❤️ +3"); UI.fmt(); }); };
$("btn-lives-share").onclick = async () => {
  SFX.click();
  await TMA.shareScore(GameState.best);
  if (GameState.canShareLife()) { GameState.grantShareLife(); UI.toast("❤️ +1!"); UI.fmt(); setTimeout(() => UI.hide("nolives"), 900); }
};
$("btn-lives-coins").onclick = () => {
  SFX.click();
  if (GameState.coins >= 100) {
    GameState.coins -= 100;
    GameState.addLives(1);
    GameState.write();
    UI.toast("❤️ +1");
    UI.hide("nolives");
    UI.hide("death");
    UI.fmt();
    startRun();
  }
};
$("btn-nolives-close").onclick = () => { SFX.click(); UI.hide("nolives"); UI.goMenu(); };

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

// gentle live regen ticker on menu (hearts refill + eta)
setInterval(() => {
  if (state === "MENU") { if (GameState.tickLives()) SFX.revive(); syncRewards(); UI.fmt(); }
}, 30000);

pollRewards();