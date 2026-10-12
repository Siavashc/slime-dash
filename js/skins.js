// ---- Skins / gear shop + persisted save state ----
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
  // v2: lives + gear
  lives: 3,
  gearOwned: [],
  gearEquipped: [],
  dailyDay: "",
  shareLifeAt: 0,     // epoch ms of last share-for-life reward
  myUid: 0,           // telegram user id (from initData) / 0 on web
  refsClaimed: 0,     // referral rewards already granted to me locally
  purchasesSeen: [],  // fulfilled Stars purchase payloads already granted
  pendingApplied: 0,  // version of bot-published pending rewards already applied
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
    this.lives = "lives" in s ? (s.lives | 0) : 3;
    this.gearOwned = Array.isArray(s.gearOwned) ? s.gearOwned : [];
    this.gearEquipped = Array.isArray(s.gearEquipped) ? s.gearEquipped : [];
    this.dailyDay = s.dailyDay || "";
    this.shareLifeAt = s.shareLifeAt || 0;
    this.myUid = s.myUid | 0;
    this.refsClaimed = s.refsClaimed | 0;
    this.purchasesSeen = Array.isArray(s.purchasesSeen) ? s.purchasesSeen : [];
    this.pendingApplied = s.pendingApplied | 0;
    // cap: never more than maxLives or fewer than 0
    this.lives = Math.max(0, Math.min(this.maxLives(), this.lives));
    // daily best rollover
    const today = new Date().toISOString().slice(0, 10);
    if (s.day !== today) {
      this.yesterdayBest = s.day ? (s.best | 0) : (s.yesterdayBest | 0);
      this._day = today;
    } else {
      this.yesterdayBest = s.yesterdayBest | 0;
      this._day = today;
    }
    // prune unequipped gear that isn't owned
    this.gearEquipped = this.gearEquipped.filter((g) => this.gearOwned.includes(g) && (window.GEAR || []).some((d) => d.id === g));
  },
  write() {
    Save.patch({
      coins: this.coins, best: this.best, yesterdayBest: this.yesterdayBest,
      streak: this.streak, lastPlayDay: this.lastPlayDay, owned: this.owned,
      equipped: this.equipped, muted: this.muted, day: this._day, deaths: this.deaths,
      lives: this.lives, gearOwned: this.gearOwned, gearEquipped: this.gearEquipped,
      dailyDay: this.dailyDay, shareLifeAt: this.shareLifeAt, myUid: this.myUid,
      refsClaimed: this.refsClaimed, purchasesSeen: this.purchasesSeen,
      pendingApplied: this.pendingApplied,
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
  maxLives() { return this.hasGear("heart") ? 4 : 3; },
  hasGear(id) { return this.gearEquipped.indexOf(id) !== -1; },
  canEquipMore() { return this.gearEquipped.length < 2; },
  equipGear(id) {
    if (this.gearEquipped.includes(id)) this.gearEquipped = this.gearEquipped.filter((g) => g !== id);
    else if (this.canEquipMore()) { this.gearEquipped.push(id); }
    else return false;
    this.write();
    return true;
  },
  addLives(n) {
    this.lives = Math.min(this.maxLives(), this.lives + n);
    this.write();
  },
  // daily bonus: once per calendar day
  canDaily() { return this.dailyDay !== new Date().toISOString().slice(0, 10); },
  claimDaily() { this.dailyDay = new Date().toISOString().slice(0, 10); this.write(); },
  // share-for-life throttle: one life per 3 minutes
  canShareLife() { return Date.now() - (this.shareLifeAt || 0) > 3 * 60 * 1000; },
  grantShareLife() { this.shareLifeAt = Date.now(); this.addLives(1); },
  // gentle regen: 1 life per 10 minutes up to max (never blocks the game fully)
  LIFE_RATE_MS: 10 * 60 * 1000,
  lifeTs: 0,
  tickLives() {
    const s = Save.read();
    if (!s.lifeTs) { Save.patch({ lifeTs: Date.now() }); return false; }
    let changed = false;
    let ts = s.lifeTs;
    while (this.lives < this.maxLives() && Date.now() - ts >= this.LIFE_RATE_MS) {
      ts += this.LIFE_RATE_MS;
      this.lives += 1;
      changed = true;
    }
    if (changed) { this.write(); Save.patch({ lifeTs: ts }); }
    return changed;
  },
  nextLifeEta() {
    if (this.lives >= this.maxLives()) return 0;
    const s = Save.read();
    const left = (s.lifeTs || Date.now()) + this.LIFE_RATE_MS - Date.now();
    return Math.max(0, left);
  },
};