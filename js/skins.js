// ---- Skins / shop + persisted save state ----
window.SKINS = [
  { id: "classic", name: "Mint",    body: "#34e8a4", glow: "#1fbf8a", eyes: "#062b20", price: 0 },
  { id: "lagoon",  name: "Lagoon",  body: "#38bdf8", glow: "#0ea5e9", eyes: "#052a3d", price: 50 },
  { id: "grape",   name: "Grape",   body: "#a78bfa", glow: "#8b5cf6", eyes: "#25135c", price: 100 },
  { id: "bubble",  name: "Bubble",  body: "#ff5d8f", glow: "#f43f5e", eyes: "#4a0517", price: 150 },
  { id: "magma",   name: "Magma",   body: "#ff8a3d", glow: "#f97316", eyes: "#46190a", price: 250 },
  { id: "toxic",   name: "Toxic",   body: "#d7f75b", glow: "#a3e635", eyes: "#2a3305", price: 400 },
  { id: "gold",    name: "Gold",    body: "#ffd166", glow: "#fbbf24", eyes: "#4d3103", price: 750 },
  { id: "void",    name: "Void",    body: "#8a7dff", glow: "#6d5ce7", eyes: "#f5d0fe", price: 1500 },
];

window.Save = {
  read() {
    try {
      return JSON.parse(localStorage.getItem("slimedash_save")) || {};
    } catch (e) { return {}; }
  },
  patch(obj) {
    const s = Object.assign(this.read(), obj);
    localStorage.setItem("slimedash_save", JSON.stringify(s));
    return s;
  },
};

window.GameState = {
  coins: 0,
  best: 0,
  yesterdayBest: 0,
  streak: 0,
  lastPlayDay: "",
  owned: ["classic"],
  equipped: "classic",
  muted: false,
  deaths: 0,
  load() {
    const s = Save.read();
    this.coins = s.coins | 0;
    this.best = s.best | 0;
    this.yesterdayBest = s.yesterdayBest | 0;
    this.streak = s.streak | 0;
    this.lastPlayDay = s.lastPlayDay || "";
    this.owned = Array.isArray(s.owned) && s.owned.length ? s.owned : ["classic"];
    this.equipped = this.owned.includes(s.equipped) ? s.equipped : "classic";
    this.muted = !!s.muted;
    this.deaths = s.deaths | 0;
    // daily best rollover
    const today = new Date().toISOString().slice(0, 10);
    if (s.day !== today) {
      this.yesterdayBest = s.day ? (s.best | 0) : (s.yesterdayBest | 0); // yesterday's final best
      this._day = today;
    } else {
      this.yesterdayBest = s.yesterdayBest | 0;
      this._day = today;
    }
    // streak: played yesterday → +1 kept; skipped → reset (only updated on first play of day)
  },
  write() {
    Save.patch({
      coins: this.coins, best: this.best, yesterdayBest: this.yesterdayBest,
      streak: this.streak, lastPlayDay: this.lastPlayDay, owned: this.owned,
      equipped: this.equipped, muted: this.muted, day: this._day, deaths: this.deaths,
    });
  },
  touchStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (this.lastPlayDay === today) return;
    if (this.lastPlayDay === yest) this.streak += 1;
    else this.streak = 1;
    this.lastPlayDay = today;
    this.write();
  },
  skin() { return SKINS.find((s) => s.id === this.equipped) || SKINS[0]; },
};