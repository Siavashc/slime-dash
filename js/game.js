// ============================================================
// SLIME DASH — one-button cave racer
// Hold = float up, release = drop. Collect orbs. Don't touch walls.
// ============================================================
"use strict";

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);

// logical tunnel height
const LH = 1000;
const METER = 46; // world units per meter

// ---------- canvas sizing ----------
let W = 0, H = 0, DPR = 1, S = 1; // S: scale factor world->screen
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  S = H / LH;
}
window.addEventListener("resize", resize);
resize();

const sx = (wx, camX) => (wx - camX) * S;
const sy = (wy) => wy * S;

// ---------- tunnel generation ----------
const cps = [];        // control points: {x, cy, hw, pinch}
let cpsGenX = 0;
function rand(a, b) { return a + Math.random() * (b - a); }

function genCpsTo(x) {
  while (cpsGenX < x + 2400) {
    const d = cpsGenX / METER; // meters so far
    if (cps.length === 0) {
      cps.push({ x: 0, cy: 500, hw: 240, pinch: 0 });
      cpsGenX = 250;
      continue;
    }
    const prev = cps[cps.length - 1];
    // difficulty curves
    const ramp01 = Math.min(1, d / 900);           // width ramp over first 900 m
    let hw = 205 - 55 * ramp01;
    let pinch = 0;
    // plateau (calm zone) every ~300 m of progress
    const cycle = (cpsGenX / 300 / METER) % 1;
    const calm = cpsGenX > 0 && cycle > 0.72;
    if (calm) hw = 290;
    if (!calm && cpsGenX > 500 * METER && Math.random() < 0.16) { hw *= 0.62; pinch = 1; }
    let cy = prev.cy + rand(-300, 300);
    cy = Math.max(hw * 0.55, Math.min(LH - hw * 0.55, cy));
    cps.push({ x: cpsGenX, cy, hw, pinch, calm });
    cpsGenX += 250;
  }
}
function smoothstep(t) { return t * t * (3 - 2 * t); }
function tunnelAt(x) {
  genCpsTo(x);
  let i = Math.floor(x / 250);
  if (i < 0) i = 0;
  const a = cps[i], b = cps[Math.min(i + 1, cps.length - 1)];
  const t = (x - a.x) / 250;
  return { cy: a.cy + (b.cy - a.cy) * smoothstep(t), hw: a.hw + (b.hw - a.hw) * smoothstep(t), pinch: b.pinch, calm: b.calm };
}

// ---------- world state ----------
let state = "MENU";
let camX = 0, px = 0, py = 500, vy = 0, speed = 330;
let holding = false, runCoins = 0, combo = 0, comboT = 0, score = 0;
let obstacles = [], coinsArr = [], parts = [], pops = [], trail = [], bubbles = [];
let genX = 0, timeScale = 1, shake = 0, flashT = 0, graceT = 0;
let revivedUsed = false, deaths = 0, ghostPassed = false, closeT = 0;
let firstRun = true, deathTimer = 0, lastDeath = "";
const SLIME_R = 26;

function clearRun() { obstacles = []; coinsArr = []; parts = []; pops = []; trail = []; ghostPassed = false; }

function startRun() {
  state = "PLAY"; camX = 0; px = 220; py = 500; vy = 0;
  speed = 330; runCoins = 0; combo = 0; comboT = 0; score = 0;
  clearRun(); cps.length = 0; cpsGenX = 0; genX = 0;
  timeScale = 1; shake = 0; flashT = 0; graceT = 1.25; revivedUsed = false;
  holding = false;
  GameState.touchStreak();
  firstRun = false;
  genWorld();
  UI.showHUD(); SFX.startMusic();
  // teach by playing: hint bar on the first two runs
  if (window.showHint) {
    try {
      if (GameState.deaths < 2) {
        window.showHint(true);
        clearTimeout(window._hintTO);
        window._hintTO = setTimeout(() => window.showHint(false), 4200);
      } else window.showHint(false);
    } catch (e) {}
  }
}

function genWorld() {
  obstacles = []; coinsArr = []; genX = 900;
  parts.length = 0; trail.length = 0;
  while (genX < 2600) { spawnChunk(); }
}
let sawCount = 0;
function spawnChunk() {
  const T = tunnelAt(genX);
  const d = genX / METER;
  if (T.calm) {
    // coin shower
    for (let i = 0; i < 8; i++) {
      const x = genX + i * 56;
      const T2 = tunnelAt(x);
      const t = i / 7;
      const cy2 = T2.cy + Math.sin(t * Math.PI * 2) * (T2.hw - 70) * 0.6;
      coinsArr.push({ x, y: cy2, got: false, ph: i });
    }
    genX += 560;
    return;
  }
  const r = Math.random();
  if (d > 120 && r < 0.30) {
    // wall spikes (pair)
    obstacles.push({ type: "spike", x: genX, side: Math.random() < 0.5 ? -1 : 1 });
    if (d > 400) obstacles.push({ type: "spike", x: genX + 300, side: Math.random() < 0.5 ? -1 : 1 });
    genX += 620;
  } else if (d > 220 && r < 0.62) {
    sawCount++;
    const moving = d > 380 && sawCount % 2 === 0;
    obstacles.push({
      type: "saw", x: genX + 150, y: T.cy + rand(-T.hw + 80, T.hw - 80),
      r: 30 + Math.min(14, d / 90), rot: rand(0, 6),
      move: moving ? { a: T.hw - 95, sp: rand(1.4, 2.4), ph: rand(0, 6) } : null,
    });
    genX += 520;
  } else {
    // orb line along path
    for (let i = 0; i < 4; i++) coinsArr.push({ x: genX + i * 60, y: T.cy + rand(-50, 50), got: false, ph: i });
    genX += 420;
  }
  genCpsTo(genX + 600);
}

// ---------- update ----------
function update(dt) {
  const effDt = dt * timeScale;
  if (state === "PLAY") {
    const T0 = tunnelAt(px);
    if (graceT <= 0) {
      if (py < T0.cy - T0.hw + SLIME_R && vy > 0) lastDeath = "wall-bottom";
      else if (py > T0.cy + T0.hw - SLIME_R && vy < 0) lastDeath = "wall-top";
      else if (Math.abs(py - T0.cy) > T0.hw - SLIME_R) lastDeath = "wall";
    }
  }
  if (state === "PLAY") {
    if (!holding) speed += 26 * effDt; // gentle creep
    const d = px / METER;
    const targetSpeed = Math.min(790, 330 + d * 1.05);
    speed += (targetSpeed - speed) * 0.4 * effDt;
    px += speed * effDt;
    // wave steering: fixed-slope, instant-intent with light goo momentum smoothing
    const vt = holding ? -0.85 * speed : 0.85 * speed;
    vy += (vt - vy) * Math.min(1, 13 * effDt);
    py += vy * effDt;
    camX = px - W * 0.32 / S;
    if (py < SLIME_R) { py = SLIME_R; vy = Math.max(vy, 120); }
    if (py > LH - SLIME_R) { py = LH - SLIME_R; vy = Math.min(vy, -120); }
    // grace shrink
    if (graceT > 0) graceT -= dt;

    while (genX < camX + 2600) { spawnChunk(); }
    // collisions
    const T = tunnelAt(px);
    const edge = T.hw - SLIME_R;
    if (graceT <= 0 && (Math.abs(py - T.cy) > edge || hitsObstacle())) return die();
    // near-miss slow-mo
    if (graceT <= 0 && Math.abs(py - T.cy) > edge - 16 && Math.abs(py - T.cy) <= edge && closeT <= 0) {
      closeT = 1.2; timeScale = 0.55; flashT = 0.5;
      SFX.close();
      pops.push({ x: px, y: py, text: t("close"), color: "#ff5d8f", t: 1 });
      for (let i = 0; i < 10; i++) parts.push(makePart(px, py, 1, "#ff5d8f"));
    }
    if (closeT > 0) closeT -= dt;
    // coins
    for (const c of coinsArr) {
      if (c.got) continue;
      const dx = c.x - px, dy = c.y - py;
      if (dx * dx + dy * dy < (SLIME_R + 13) * (SLIME_R + 13)) {
        c.got = true;
        comboT = 2.2; combo++;
        const mult = comboMult();
        runCoins += mult;
        SFX.coin(Math.min(8, combo));
        pops.push({ x: c.x, y: c.y, text: "+" + mult, color: "#34e8a4", t: 0.8 });
        for (let i = 0; i < 6; i++) parts.push(makePart(c.x, c.y, 1, "#7ef7c9"));
      }
    }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    score = Math.max(score, Math.floor((px - 220) / METER));
    // ghost pass
    if (!ghostPassed && GameState.best > 0 && score >= GameState.best) {
      ghostPassed = true; flashT = 1.2; SFX.best();
      pops.push({ x: px, y: py - 60, text: "★ " + t("newBest", { n: 0 }), color: "#ffd166", t: 1.4 });
    }
    // trail
    if (Math.random() < 0.55) {
      trail.push({ x: px - 14, y: py + vy * 0.01, r: SLIME_R * rand(0.25, 0.55), t: 0.7, c: skinGlow() });
    }
  } else if (state === "DEAD") {
    deathTimer -= dt;
  }
  timeScale += (1 - timeScale) * Math.min(1, 3 * dt);
  if (shake > 0) shake = Math.max(0, shake - 9 * dt);
  if (flashT > 0) flashT -= dt;
  // particles
  for (const p of parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= 0.99; }
  parts = parts.filter((p) => p.t > 0);
  for (const p of trail) { p.t -= dt; p.r *= 0.985; }
  trail = trail.filter((p) => p.t > 0);
  for (const p of pops) { p.t -= dt; p.y -= 44 * dt; }
  pops = pops.filter((p) => p.t > 0);
  for (const b of bubbles) { b.y -= b.v * dt; if (b.y < -40) { b.y = LH + 40; b.x = camX + rand(0, W / S); } }
  for (const o of obstacles) if (o.move) { o.ph += o.move.sp * dt * 1.0; }
  UI.tick(dt);
  UI.menuTick(dt);
}

function comboMult() {
  if (combo >= 16) return 5;
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}
function skinGlow() { return GameState.skin().glow; }

function hitsObstacle() {
  for (const o of obstacles) {
    if (o.gone) continue;
    const dx = o.x - px;
    if (dx < -120 || dx > 120) continue;
    if (o.type === "spike") {
      if (Math.abs(dx) > 34) continue;
      const T = tunnelAt(o.x);
      const tipY = o.side === -1 ? T.cy - T.hw + 62 : T.cy + T.hw - 62; // side -1: from ceiling? define: side -1 = top wall, spike down
      const baseY = o.side === -1 ? T.cy - T.hw : T.cy + T.hw;
      // inside spike region?
      if (o.side === -1) { if (py < T.cy - T.hw + 62 && py > T.cy - T.hw - 10) return true; }
      else { if (py > T.cy + T.hw - 62 && py < T.cy + T.hw + 10) return true; }
    } else {
      let yy = o.y;
      if (o.move) yy += Math.sin(o.ph) * o.move.a;
      const rr = o.r * 0.92 + SLIME_R * 0.7;
      if ((o.x - px) * (o.x - px) + (yy - py) * (yy - py) < rr * rr) return true;
    }
  }
  return false;
}

function makePart(x, y, n, color) {
  const a = rand(0, Math.PI * 2);
  const sp = rand(60, 340);
  return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: rand(3, 9), t: rand(0.5, 1.1), c: color };
}

// ---------- death / revive / finish ----------
function die() {
  const T = tunnelAt(px);
  const edge = T.hw - SLIME_R;
  const hit = hitsObstacle();
  if (hit) {
    for (const o of obstacles) {
      if (o.gone) continue;
      const dx = Math.abs(o.x - px);
      if (o.type === "spike" && dx < 34 && ((o.side === -1 && py < T.cy) || (o.side !== -1 && py > T.cy))) { lastDeath = "spike-" + (o.side === -1 ? "top" : "bottom"); break; }
      if (o.type === "saw" && dx < 90) { lastDeath = "saw"; break; }
    }
  } else lastDeath = py > T.cy + T.hw - SLIME_R ? "wall-top" : "wall-bottom";
  if (!lastDeath) lastDeath = "wall";
  state = "DEAD"; deathTimer = 0.55;
  SFX.stopMusic(); SFX.splat();
  shake = 1.4; flashT = 0.4;
  for (let i = 0; i < 34; i++) parts.push(makePart(px, py, 1, GameState.skin().body));
  for (let i = 0; i < 12; i++) parts.push(makePart(px, py, 1, "#2e1240"));
  GameState.deaths++;
  UI.onDeath(score, runCoins, GameState.best);
  // bank coins immediately (never lose them); x2-ad button can top up later
  GameState.coins += runCoins;
  GameState.runCoinsBank = runCoins;
  GameState.write();
}

function revive() {
  revivedUsed = true;
  graceT = 1.6;
  for (const o of obstacles) if (Math.abs(o.x - px) < 800) o.gone = true;
  parts.length = 0;
  py = tunnelAt(px).cy;
  vy = 0;
  state = "PLAY";
  UI.showHUD(); SFX.revive(); SFX.startMusic();
  pops.push({ x: px, y: py - 70, text: t("revived"), color: "#ffd166", t: 1.3 });
}

function finishRun(banked) {
  runCoins = banked;
  const isNewBest = score > GameState.best;
  if (isNewBest) GameState.best = score;
  GameState.coins += banked;
  GameState.write();
  GameState.runCoinsBank = 0;
  return isNewBest;
}

// ---------- rendering ----------
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const shx = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  const shy = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  ctx.translate(shx, shy);

  // bg gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#131b3a"); g.addColorStop(0.55, "#0b0f1e"); g.addColorStop(1, "#1a1030");
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

  // bubbles
  if (bubbles.length < 26 && Math.random() < 0.35) {
    bubbles.push({ x: camX + W / S + 30, y: rand(0, LH), r: rand(2, 7), v: rand(20, 70) });
  }
  drawBubbles();

  // parallax blobs
  drawParallax();

  // tunnel
  const half = Math.ceil(W / 2 / S / 250) * 250;
  const x0 = camX - 200, x1 = camX + W / S + 200;
  drawTunnel(x0, x1);

  // ghost best line
  if (GameState.best > 0) {
    const gx = 220 + GameState.best * METER;
    if (gx > x0 && gx < x1) {
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = "rgba(255,209,102,0.75)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx(gx, camX), 0); ctx.lineTo(sx(gx, camX), H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,209,102,0.9)"; ctx.font = "700 14px Segoe UI";
      ctx.save(); ctx.translate(sx(gx, camX) - 6, 40); ctx.rotate(-Math.PI / 2); ctx.textAlign = "right";
      ctx.fillText("★ " + GameState.best + "m", 0, 0); ctx.restore();
    }
  }

  // coins
  for (const c of coinsArr) {
    if (c.got) continue;
    if (c.x < x0 || c.x > x1) continue;
    const pulse = 1 + Math.sin(perfNow() / 160 + c.ph) * 0.12;
    drawOrb(sx(c.x, camX), sy(c.y), 13 * S * pulse);
  }
  // obstacles
  for (const o of obstacles) {
    if (o.gone || o.x < x0 - 80 || o.x > x1 + 80) continue;
    if (o.type === "spike") drawSpike(o);
    else drawSaw(o);
  }

  // trail
  for (const p of trail) {
    ctx.globalAlpha = p.t * 0.5;
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(sx(p.x, camX), sy(p.y), p.r * S, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // slime
  if (state !== "DEAD") drawSlime(sx(px, camX), sy(py));

  // particles
  for (const p of parts) {
    ctx.globalAlpha = Math.min(1, p.t);
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(sx(p.x, camX), sy(p.y), p.r * S * (0.3 + p.t * 0.7), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // pops
  ctx.textAlign = "center"; ctx.font = "800 22px Segoe UI";
  for (const p of pops) {
    ctx.globalAlpha = Math.min(1, p.t);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, sx(p.x, camX), sy(p.y));
  }
  ctx.globalAlpha = 1;

  // flash
  if (flashT > 0) {
    ctx.fillStyle = "rgba(255,255,255," + (flashT * 0.22) + ")";
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
}

function perfNow() { return performance.now(); }

function drawBubbles() {
  ctx.strokeStyle = "rgba(150,190,255,0.22)"; ctx.lineWidth = 1.5;
  for (const b of bubbles) {
    ctx.beginPath(); ctx.arc(sx(b.x, camX), sy(b.y), b.r * S * 2, 0, 7); ctx.stroke();
  }
}

let blobSeed = [];
const PARALLAX_SPAN = 2400;
function drawParallax() {
  if (!blobSeed.length) {
    for (let i = 0; i < 14; i++) blobSeed.push({ dx: rand(0, PARALLAX_SPAN), y: rand(0, LH), r: rand(60, 190), d: rand(0.2, 0.5) });
  }
  for (const b of blobSeed) {
    const x = ((b.dx - camX * b.d) % PARALLAX_SPAN + PARALLAX_SPAN) % PARALLAX_SPAN;
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#7f5df0";
    ctx.beginPath(); ctx.arc(x * S, sy(b.y), b.r * S, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawTunnel(x0, x1) {
  const step = 26;
  const top = [], bot = [];
  for (let x = x0; x <= x1; x += step) {
    const T = tunnelAt(x);
    top.push([sx(x, camX), sy(T.cy - T.hw)]);
    bot.push([sx(x, camX), sy(T.cy + T.hw)]);
  }
  // fill walls
  const sk = GameState.skin();
  ctx.beginPath();
  ctx.moveTo(-30, -30); ctx.lineTo(-30, -30);
  for (const [a, b] of top) ctx.lineTo(a, b);
  ctx.lineTo(W + 30, -30); ctx.lineTo(-30, -30);
  ctx.closePath();
  ctx.fillStyle = "#05070f";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, H + 30);
  for (const [a, b] of bot) ctx.lineTo(a, b);
  ctx.lineTo(W + 30, H + 30); ctx.lineTo(-30, H + 30);
  ctx.closePath();
  ctx.fillStyle = "#05070f";
  ctx.fill();
  // neon inner edges
  ctx.lineJoin = "round";
  ctx.strokeStyle = sk.body; ctx.lineWidth = 5 * S + 2;
  ctx.shadowColor = sk.glow; ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let i = 0; i < top.length; i++) { const [a, b] = top[i]; i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < bot.length; i++) { const [a, b] = bot[i]; i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // calm zone shimmer
  const tm = tunnelAt(px);
  if (tm.calm) {
    ctx.fillStyle = "rgba(52,232,164,0.05)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "700 13px Segoe UI"; ctx.fillStyle = "rgba(52,232,164,0.6)"; ctx.textAlign = "center";
    ctx.fillText("SAFE ZONE", W / 2, 60);
  }
}

function drawOrb(x, y, r) {
  ctx.shadowColor = "#34e8a4"; ctx.shadowBlur = 16;
  ctx.fillStyle = "#8affd0";
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#e2fff4";
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, 7); ctx.fill();
}

function drawSpike(o) {
  const T = tunnelAt(o.x);
  const X = sx(o.x, camX);
  ctx.save();
  let baseY, tipY;
  if (o.side === -1) { baseY = sy(T.cy - T.hw); tipY = sy(T.cy - T.hw + 62); }
  else { baseY = sy(T.cy + T.hw); tipY = sy(T.cy + T.hw - 62); }
  const g = ctx.createLinearGradient(0, baseY, 0, tipY);
  g.addColorStop(0, "#3a1030"); g.addColorStop(1, "#ff5d8f");
  ctx.fillStyle = g;
  ctx.shadowColor = "#ff5d8f"; ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(X - 30, baseY); ctx.lineTo(X + 30, baseY); ctx.lineTo(X, tipY);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSaw(o) {
  let yy = o.y;
  if (o.move) yy += Math.sin(o.ph) * o.move.a;
  const X = sx(o.x, camX), Y = sy(yy), R = o.r * S;
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(o.rot + perfNow() / 300);
  ctx.shadowColor = "#ff5d8f"; ctx.shadowBlur = 16;
  ctx.fillStyle = "#ff5d8f";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85);
    ctx.lineTo(Math.cos(a + 0.2) * R, Math.sin(a + 0.2) * R);
    ctx.lineTo(Math.cos(a + 0.4) * R * 0.85, Math.sin(a + 0.4) * R * 0.85);
    ctx.closePath(); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#31122b";
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff97b8";
  ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, 7); ctx.fill();
  ctx.restore();
}

// ---- the slime ----
let wob = 0;
function drawSlime(x, y, previewScale = 1) {
  const sk = GameState.skin();
  const sqV = Math.abs(vy) * 0.42;
  const scaleY = 1 + Math.min(0.42, sqV / 900);
  const scaleX = 1 / scaleY;
  const r = SLIME_R * S * previewScale * 1.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);
  // body
  ctx.shadowColor = sk.glow; ctx.shadowBlur = 22;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.25);
  g.addColorStop(0, lighten(sk.body, 0.4));
  g.addColorStop(0.7, sk.body);
  g.addColorStop(1, sk.glow);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.06, 0, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.42, r * 0.3, r * 0.18, -0.6, 0, 7); ctx.fill();
  // eyes
  const look = Math.max(-4, Math.min(4, vy / 180));
  ctx.fillStyle = sk.eyes;
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.05 + look, r * 0.16, r * 0.26 * (1 + Math.abs(look) * 0.04), 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.32, -r * 0.05 + look, r * 0.16, r * 0.26 * (1 + Math.abs(look) * 0.04), 0, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.16 + look, r * 0.05, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.16 + look, r * 0.05, 0, 7); ctx.fill();
  // mouth
  ctx.strokeStyle = sk.eyes; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, r * 0.34 + look * 0.5, r * 0.22, 0.15, Math.PI - 0.15); ctx.stroke();
  if (graceT > 0 && state === "PLAY") {
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 1.6, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt * 255);
  const g2 = Math.min(255, ((n >> 8) & 255) + amt * 255);
  const b = Math.min(255, (n & 255) + amt * 255);
  return "rgb(" + (r | 0) + "," + (g2 | 0) + "," + (b | 0) + ")";
}

// ---------- loop ----------
window.__dbg = () => ({ state, px, py, vy, score, speed, camX, combo, runCoins, timeScale, lastDeath });
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (state === "PLAY" || state === "DEAD" || state === "MENU") update(dt);
  if (state !== "PAUSED") draw();
  else drawPausedOverlayDim();
  requestAnimationFrame(loop);
}
function drawPausedOverlayDim() { /* css overlay covers */ }
requestAnimationFrame(loop);

// ---------- input ----------
function press() {
  SFX.unlock();
  if (state === "PLAY") holding = true;
}
function release() { holding = false; }
window.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button") || e.target.closest(".panel")) return;
  press();
});
window.addEventListener("pointerup", release);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { if (!e.repeat) { press(); e.preventDefault(); } }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") release();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "PLAY") UI.pause();
});
window.addEventListener("blur", () => { if (state === "PLAY") UI.pause(); });