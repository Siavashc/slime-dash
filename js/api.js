// ---- Slime Dash leaderboard API (zero credentials in the client) ----
//
// WRITES: Telegram-verified WebApp.sendData() → @slimedash_game_bot
//   (service message; cannot be forged by typing).
// READS:  the bot publishes snapshot JSONs into this same repo:
//   data/leaderboard.json        {top:[{uid,name,best}], groups:{..."}, updated}
//   data/pending/<uid>.json      {v, lives, coins}   (rewards waiting)
// Both are same-origin static files — nothing secret is ever shipped.
window.Api = (() => {
  const BASE = (window.DATA_BASE || (location.pathname.replace(/[^/]*$/, "")) + "data/");
  const tg = window.Telegram && window.Telegram.WebApp;
  const ready = !!tg && !!tg.initData;

  function meId() {
    try {
      const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (u && u.id) return u.id;
    } catch (e) {}
    let id = 0;
    try {
      id = +(localStorage.getItem("slimedash_uid") || 0);
      if (!id) {
        id = Math.floor(1e9 + Math.random() * 9e9);
        localStorage.setItem("slimedash_uid", id);
      }
    } catch (e) { id = Math.floor(Date.now() % 2e9); }
    return id;
  }
  function userName() {
    try {
      const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (u) return (u.first_name || "") + (u.username ? " @" + u.username : "");
    } catch (e) {}
    return "";
  }
  function startParam() {
    try {
      if (ready && tg.initDataUnsafe && tg.initDataUnsafe.start_param) return tg.initDataUnsafe.start_param;
    } catch (e) {}
    return "";
  }
  function refParam() {
    const sp = startParam();
    return sp.startsWith("ref-") ? sp.slice(4) : "";
  }
  function groupParam() {
    const sp = startParam();
    return /^g[0-9-]/.test(sp) ? sp.slice(1) : "";
  }
  function refLink() {
    return "https://t.me/slimedash_game_bot/slimedash?startapp=ref-" + meId();
  }

  async function fetchJSON(url) {
    try {
      const r = await fetch(url + "?v=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  async function leaderboard() {
    const d = await fetchJSON(BASE + "leaderboard.json");
    if (!d || !d.top || !d.top.length) return null;
    const me = meId();
    let rank = null;
    const mine = d.top.findIndex((r) => r.uid === me);
    if (mine >= 0) rank = mine + 1;
    return { top: d.top.slice(0, 10), rank };
  }
  async function groupLeaderboard() {
    const g = groupParam() || (localStorage.getItem("slimedash_lastgroup") || "");
    if (!g) return { top: [] };
    const d = await fetchJSON(BASE + "leaderboard.json");
    const gt = (d && d.groups && d.groups[g] && d.groups[g].top) || [];
    return { top: gt, group: g };
  }
  // pending rewards waiting for me {v, lives, coins} | null
  async function pendingFor() {
    return await fetchJSON(BASE + "pending/" + meId() + ".json");
  }

  // ---- WRITE: hand the run to the bot (closes the mini app; bot replies) ----
  function sendRunToBot(score, runCoins) {
    try {
      if (!ready || !tg.sendData) return false;
      const g = groupParam() || localStorage.getItem("slimedash_lastgroup") || "";
      tg.sendData(JSON.stringify({
        v: 2, score: score | 0, coins: runCoins | 0,
        ref: refParam(), group: g,
        applied: GameState.pendingApplied | 0,
        streak: GameState.streak | 0,
      }));
      return true;
    } catch (e) { return false; }
  }
  function submitScore(score, runCoins) {
    window._lastRun = { score: score | 0, coins: runCoins | 0 };
    return null; // sync happens on the leaderboard panel's send button
  }

  return {
    meId, refParam, groupParam, refLink, sendRunToBot, submitScore,
    leaderboard, groupLeaderboard, pendingFor,
    enabled: () => true,
  };
})();