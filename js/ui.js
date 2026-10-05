// ---- UI controller ----
window.UI = (() => {
  const el = (id) => document.getElementById(id);
  let comboFlash = 0, lastCombo = 0;

  function show(id) { el(id).classList.remove("hidden"); }
  function hide(id) { el(id).classList.add("hidden"); }

  function toast(text) {
    const tEl = el("toast");
    tEl.textContent = text;
    tEl.classList.remove("hidden");
    clearTimeout(tEl._t);
    tEl._t = setTimeout(() => tEl.classList.add("hidden"), 1800);
  }

  function fmt() {
    el("menu-best").textContent = GameState.best;
    el("menu-coins").textContent = GameState.coins;
    el("menu-streak").textContent = GameState.streak;
  }

  function showHUD() { show("hud"); hide("menu"); hide("death"); }

  function goMenu() {
    hideAll(); show("menu"); hide("hud");
    state = "MENU"; camX = 0; px = 220; py = 500; vy = 0;
    clearRun(); cps.length = 0; cpsGenX = 0; genWorld();
    SFX.stopMusic(); fmt();
  }
  function hideAll() { ["menu", "death", "shop", "pause", "hud"].forEach(hide); }

  function onDeath(score, runCoins, best) {
    el("death-score").textContent = score;
    el("death-coins-val").textContent = runCoins;
    const delta = el("death-delta");
    delta.classList.remove("pos");
    if (score > best && best > 0) { delta.textContent = t("newBest", { n: score - best }); delta.classList.add("pos"); }
    else if (best === 0) { delta.textContent = t("firstBest"); }
    else if (best > 0) { delta.textContent = t("beaten", { n: best - score }); }
    // revive button once/run and only if real ad provider exists
    const canRevive = !revivedUsed;
    el("btn-revive").classList.toggle("hidden", !(canRevive && GameAds.available()));
    // double coins ad availability
    el("btn-double").classList.toggle("hidden", !(runCoins > 0 && GameAds.available()));
    setTimeout(() => { show("death"); }, 650);
  }

  function tick(dt) {
    if (state === "PLAY" || state === "DEAD") {
      el("score-val").textContent = score | 0;
      el("coins-val").textContent = runCoins;
      // ghost label
      const gl = el("ghost-label");
      if (GameState.best > 0 && !ghostPassed) gl.classList.remove("hidden");
      else gl.classList.add("hidden");
      // combo
      const ch = el("hud-combo");
      if (combo >= 3 && comboT > 0) {
        if (combo !== lastCombo) { ch.classList.remove("hidden"); ch.style.animation = "none"; void ch.offsetWidth; ch.style.animation = ""; }
        el("combo-val").textContent = comboMult();
      } else ch.classList.add("hidden");
      lastCombo = combo;
    }
  }

  function pause() {
    if (state !== "PLAY") return;
    state = "PAUSED"; show("pause");
  }
  function resume() { state = "PLAY"; hide("pause"); }

  // ---------- shop ----------
  function renderShop() {
    el("shop-coins").textContent = GameState.coins;
    const grid = el("shop-grid");
    grid.innerHTML = "";
    for (const s of SKINS) {
      const card = document.createElement("div");
      card.className = "skin-card";
      const owned = GameState.owned.includes(s.id);
      const equipped = GameState.equipped === s.id;
      if (owned) card.classList.add("owned");
      else card.classList.add("locked");
      if (equipped) card.classList.add("equipped");
      const c = document.createElement("canvas"); c.width = c.height = 104;
      drawSkinPreview(c.getContext("2d"), s);
      card.appendChild(c);
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = s.name;
      const pr = document.createElement("div"); pr.className = "price";
      pr.textContent = owned ? (equipped ? "✓ ON" : "◉ Equip") : "🟢 " + s.price;
      card.appendChild(nm); card.appendChild(pr);
      card.onclick = () => {
        SFX.unlock(); SFX.click();
        const st = GameState;
        if (st.owned.includes(s.id)) {
          st.equipped = s.id; st.write(); SFX.click();
        } else if (st.coins >= s.price) {
          st.coins -= s.price; st.owned.push(s.id); st.equipped = s.id; st.write(); SFX.buy();
          toast(t("toastUnlocked"));
        } else {
          toast(t("toastNeedCoins"));
          GameAds.rewarded(() => { GameState.coins += 30; GameState.write(); renderShop(); });
        }
        renderShop();
      };
      grid.appendChild(card);
    }
  }

  function drawSkinPreview(c2d, s) {
    c2d.save();
    c2d.translate(52, 56);
    c2d.scale(2.1, 2.1);
    miniSlime(c2d, s);
    c2d.restore();
  }
  function miniSlime(c2d, s) {
    c2d.shadowColor = s.glow; c2d.shadowBlur = 16;
    const g = c2d.createRadialGradient(-12, -16, 6, 0, 0, 34);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, s.body);
    g.addColorStop(1, s.glow);
    c2d.fillStyle = g;
    c2d.beginPath(); c2d.ellipse(0, 0, 20, 22, 0, 0, 7); c2d.fill();
    c2d.shadowBlur = 0;
    c2d.fillStyle = s.eyes;
    c2d.beginPath(); c2d.ellipse(-7, -2, 3.4, 5.5, 0, 0, 7); c2d.fill();
    c2d.beginPath(); c2d.ellipse(7, -2, 3.4, 5.5, 0, 0, 7); c2d.fill();
    c2d.strokeStyle = s.eyes; c2d.lineWidth = 1.6;
    c2d.beginPath(); c2d.arc(0, 8, 5, 0.2, Math.PI - 0.2); c2d.stroke();
  }

  // menu idle slime animation
  const mc = el("menu-slime");
  const mctx = mc.getContext("2d");
  let mt = 0;
  function menuTick(dt) {
    if (el("menu").classList.contains("hidden")) return;
    mt += dt;
    const s = GameState.skin();
    mctx.clearRect(0, 0, 200, 200);
    const bounce = Math.abs(Math.sin(mt * 2.2));
    mctx.save();
    mctx.translate(100, 150 - bounce * 26);
    const squish = 1 - bounce * 0.16;
    mctx.scale(1 + (1 - squish) * 0.5, squish);
    mctx.shadowColor = s.glow; mctx.shadowBlur = 24;
    const g = mctx.createRadialGradient(-12, -16, 6, 0, 0, 34);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, s.body); g.addColorStop(1, s.glow);
    mctx.fillStyle = g;
    mctx.beginPath(); mctx.ellipse(0, 0, 20, 22, 0, 0, 7); mctx.fill();
    mctx.restore();
    mctx.shadowBlur = 0;
    mctx.fillStyle = s.eyes;
    mctx.beginPath(); mctx.ellipse(93, 138 - bounce * 26, 3.4, 5.5, 0, 0, 7); mctx.fill();
    mctx.beginPath(); mctx.ellipse(107, 138 - bounce * 26, 3.4, 5.5, 0, 0, 7); mctx.fill();
    mctx.strokeStyle = s.eyes; mctx.lineWidth = 1.6;
    mctx.beginPath(); mctx.arc(100, 144 - bounce * 26, 5, 0.2, Math.PI - 0.2); mctx.stroke();
  }

  return {
    showHUD, goMenu, onDeath, tick, pause, resume, toast, fmt, renderShop, menuTick,
    show, hide, el,
  };
})();