// ---- Procedural audio: no asset files, all WebAudio synth ----
window.SFX = (() => {
  let ctx = null, master = null, musicGain = null, musicTimer = null, musicStep = 0;
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }
  function tone(freq, dur, type = "sine", vol = 0.5, slide = 0, delay = 0) {
    ensure(); if (!ctx || GameState.muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol = 0.3, low = 400, high = 3000) {
    ensure(); if (!ctx || GameState.muted) return;
    const t0 = ctx.currentTime;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = (low + high) / 2; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }
  // --- music: gentle 8-note cave pad loop, A minor pentatonic ---
  const NOTES = [220, 261.6, 293.7, 329.6, 392, 440, 392, 329.6];
  function musicTick() {
    ensure(); if (!ctx || GameState.muted) return;
    const n = NOTES[musicStep % NOTES.length];
    const t0 = ctx.currentTime;
    [[n, 0.6], [n * 2, 0.25], [n / 2, 0.5]].forEach(([f, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(v, t0);
      g.gain.linearRampToValueAtTime(0.0, t0 + 0.42);
      o.connect(g); g.connect(musicGain);
      o.start(t0); o.stop(t0 + 0.5);
    });
    musicStep++;
  }
  return {
    unlock,
    coin(mult = 1) { tone(660 * (1 + (mult - 1) * 0.08), 0.09, "square", 0.22, 240); tone(990, 0.07, "sine", 0.12, 120, 0.02); },
    jump() { tone(180, 0.16, "sine", 0.4, 260, 0); },
    drop() { tone(300, 0.14, "sine", 0.3, -160, 0); },
    close() { tone(1400, 0.1, "sine", 0.25, -500); },
    splat() { noise(0.35, 0.5, 80, 900); tone(120, 0.3, "sine", 0.5, -70); },
    click() { tone(500, 0.05, "square", 0.15); },
    buy() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "triangle", 0.3, 0, i * 0.07)); },
    revive() { [330, 440, 660].forEach((f, i) => tone(f, 0.18, "sine", 0.4, 0, i * 0.06)); },
    best() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, "triangle", 0.35, 0, i * 0.08)); },
    startMusic() {
      ensure(); if (!ctx || musicTimer) return;
      musicTick(); musicTimer = setInterval(musicTick, 430);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
  };
})();