// ---- UI controller ----
window.UI = (() => {
  const el = (id) => document.getElementById(id);
  let comboFlash = 0, lastCombo = 0;
  let shopTab = "skins";
  let lbTab = "global";

  function show(id) { el(id).classList.remove("hidden"); }
  function hide(id) { el(id).classList.add("hidden"); }

  function toast(text) {
    const tEl = el("toast");
    tEl.textContent = text;
    tEl.classList.remove("hidden");
    clearTimeout(tEl._t);
    tEl._t = setTimeout(() => tEl.classList.add("hidden"), 1800);
  }

  function hearts(n) {
    const max = GameState.maxLives();
    let s = "";
    for (let i = 0; i < max; i++) s += i < n ? "❤️" : "🖤";
    return s;
  }

  function fmt() {
    el("menu-best").textContent = GameState.best;
    el("menu-coins").textContent = GameState.coins;
    el("menu-streak").textContent = GameState.streak;
    el("menu-lives").textContent = hearts(GameState.lives);
    el("menu-lives-inline").textContent = hearts(GameState.lives);
    // daily bonus button: ALWAYS visible (moderators must see the ad placement);
    // disabled + label change when already claimed today
    const d = el("btn-daily");
    if (d) {
      const can = GameState.canDaily();
      d.disabled = !can;
      d.textContent = can ? t("dailyBtn") : t("dailyDone");
    }
    // regen eta line
    const eta = el("menu-lives-eta");
    if (eta) {
      const ms = GameState.nextLifeEta();
      if (ms > 0 && GameState.lives < GameState.maxLives()) {
        const m = Math.floor(ms / 60000), s2 = Math.floor((ms % 60000) / 1000);
        eta.textContent = "+" + hearts(1) + " " + m + ":" + String(s2).padStart(2, "0");
        eta.classList.remove("hidden");
      } else eta.classList.add("hidden");
    }
    el("hud-lives").textContent = hearts(GameState.lives);
    if (runShield !== undefined) el("hud-shield").classList.toggle("hidden", !runShield);
    const rp = el("menu-reward");
    if (rp && window._pendingReward) { rp.classList.remove("hidden"); }
  }

  function showHUD() { show("hud"); hide("menu"); hide("death"); hide("lb"); hide("invite"); hide("nolives"); }
  function goMenu() {
    hideAll(); show("menu"); hide("hud");
    state = "MENU"; camX = 0; px = 220; py = 500; vy = 0;
    clearRun(); cps.length = 0; cpsGenX = 0; genWorld();
    SFX.stopMusic(); fmt();
  }
  function hideAll() { ["menu", "death", "shop", "pause", "hud", "lb", "invite", "nolives"].forEach(hide); }

  function onDeath(score, runCoins, best) {
    el("death-score").textContent = score;
    el("death-coins-val").textContent = runCoins;
    const delta = el("death-delta");
    delta.classList.remove("pos");
    if (score > best && best > 0) { delta.textContent = t("newBest", { n: score - best }); delta.classList.add("pos"); }
    else if (best === 0) { delta.textContent = t("firstBest"); }
    else if (best > 0) { delta.textContent = t("beaten", { n: best - score }); }
    setTimeout(() => { show("death"); }, 650);
  }

  function tick(dt) {
    if (state === "PLAY" || state === "DEAD") {
      el("score-val").textContent = score | 0;
      el("coins-val").textContent = runCoins;
      el("hud-lives").textContent = hearts(GameState.lives);
      el("hud-shield").classList.toggle("hidden", !runShield);
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

  // ---------- out of lives ----------
  function openNoLives() {
    el("nolives-lives").textContent = hearts(GameState.lives);
    // ad button only when a provider is wired
    el("btn-lives-ad").classList.toggle("hidden", !GameAds.available());
    // coins button only when affordable is possible (coins < price → still show, disabled)
    const cost = 100;
    const bc = el("btn-lives-coins");
    bc.disabled = GameState.coins < cost;
    bc.textContent = "➕1 " + t("lives") + " · 🟢" + cost;
    show("nolives");
  }

  // ---------- shop (skins + gear tabs) ----------
  function renderShop() {
    el("shop-coins").textContent = GameState.coins;
    el("tab-skins").classList.toggle("on", shopTab === "skins");
    el("tab-gear").classList.toggle("on", shopTab === "gear");
    el("shop-hint").textContent = shopTab === "gear" ? t("gearSlots") : "";
    const grid = el("shop-grid");
    grid.innerHTML = "";
    if (shopTab === "skins") renderSkins(grid);
    else renderGear(grid);
  }
  function renderSkins(grid) {
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
  function renderGear(grid) {
    for (const g of GEAR) {
      const card = document.createElement("div");
      card.className = "skin-card gear-card";
      const owned = GameState.gearOwned.includes(g.id);
      const on = GameState.hasGear(g.id);
      if (owned) card.classList.add("owned");
      else card.classList.add("locked");
      if (on) card.classList.add("equipped");
      const ic = document.createElement("div"); ic.className = "gear-icon"; ic.textContent = g.icon;
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = g.name;
      const desc = document.createElement("div"); desc.className = "gear-desc"; desc.textContent = t(g.desc);
      const pr = document.createElement("div"); pr.className = "price";
      pr.textContent = !owned ? "🟢 " + g.price : (on ? "✓ " + t("gearEquippedShort") : t("gearEquip"));
      card.appendChild(ic); card.appendChild(nm); card.appendChild(desc); card.appendChild(pr);
      card.onclick = () => {
        SFX.unlock(); SFX.click();
        if (!GameState.gearOwned.includes(g.id)) {
          if (GameState.coins >= g.price) {
            GameState.coins -= g.price;
            GameState.gearOwned.push(g.id);
            GameState.equipGear(g.id); // auto-equip on purchase
            GameState.write(); SFX.buy();
            toast(t("toastUnlocked"));
          } else {
            toast(t("toastNeedCoins"));
            GameAds.rewarded(() => { GameState.coins += 50; GameState.write(); fmt(); renderShop(); });
          }
        } else {
          const ok = GameState.equipGear(g.id);
          if (!ok) toast(t("gearSlotsFull"));
          else SFX.click();
        }
        renderShop(); fmt();
      };
      grid.appendChild(card);
    }
  }

  // ---------- leaderboard ----------
  function lbRow(idx, r, me) {
    const div = document.createElement("div");
    div.className = "lb-row" + (me ? " me" : "");
    const medal = ["🥇", "🥈", "🥉"][idx] || ("#" + (idx + 1));
    const name = document.createElement("div");
    name.className = "lb-name";
    name.textContent = medal + " " + ((r.name || "Player").slice(0, 18));
    if (r.you) name.className += " you";
    const sc = document.createElement("div");
    sc.className = "lb-score";
    sc.textContent = (r.best | 0) + " m";
    div.appendChild(name); div.appendChild(sc);
    return div;
  }
  async function renderLeaderboard() {
    el("tab-global").classList.toggle("on", lbTab === "global");
    el("tab-group").classList.toggle("on", lbTab === "group");
    const list = el("lb-list");
    list.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "lb-empty"; loading.textContent = "…";
    list.appendChild(loading);
    let data = null;
    try {
      data = lbTab === "global" ? await Api.leaderboard() : await Api.groupLeaderboard();
    } catch (e) { data = null; }
    list.innerHTML = "";
    const groupEmpty = lbTab === "group" && (!data || !data.top || !data.top.length);
    if (!Api.enabled() || !data || !data.top || (!data.top.length && lbTab === "global")) {
      const d = document.createElement("div");
      d.className = "lb-empty";
      d.textContent = groupEmpty ? t("lbGroupEmpty") : t("lbEmpty");
      list.appendChild(d);
    } else if (!data.top.length && groupEmpty) {
      const d = document.createElement("div");
      d.className = "lb-empty";
      d.textContent = t("lbGroupEmpty");
      list.appendChild(d);
    } else {
      const uid = Api.meId();
      data.top.forEach((r, i) => {
        const me = lbTab === "global" ? (r.uid === uid || r.user_id === uid) : (r.uid === uid);
        list.appendChild(lbRow(i, r, me));
      });
      if (data.rank && data.rank > data.top.length) {
        const d = document.createElement("div");
        d.className = "lb-empty lb-rank-line";
        d.textContent = t("lbRank") + ": #" + data.rank + " · ♥ " + (GameState.best) + " m";
        list.appendChild(d);
      }
    }
  }
  function openLeaderboard() {
    show("lb");
    renderLeaderboard();
  }

  // ---------- invite ----------
  function openInvite() {
    el("invite-link").textContent = Api.refLink();
    Api.pendingFor().then((p) => {
      if (p && (p.v | 0) > (GameState.pendingApplied | 0) && (p.lives || p.coins)) {
        el("invite-refs").textContent = t("rewardPending");
      }
    });
    show("invite");
  }
  async function copyInvite() {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink("https://t.me/share/url?url=" +
        encodeURIComponent(Api.refLink()) + "&text=" + encodeURIComponent(t("inviteNudge")));
      return;
    }
    try {
      await navigator.clipboard.writeText(t("inviteNudge") + " " + Api.refLink());
      toast(t("toastCopied"));
    } catch (e) {}
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
    show, hide, el, openNoLives, openLeaderboard, renderLeaderboard, openInvite, copyInvite,
    setShopTab, setLbTab,
  };
  function setShopTab(tab) { shopTab = tab; renderShop(); }
  function setLbTab(tab) { lbTab = tab; renderLeaderboard(); }
})();