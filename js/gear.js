// ---- Equipment (gear) catalog ----
// Two gear slots. Some gears are purchaseable with coins, some also granted by
// referrals / challenges. All effects handled in game.js.
window.GEAR = [
  {
    id: "shield", icon: "🛡", name: "Bubble Shield", price: 300,
    desc: "gearDescShield",
  },
  {
    id: "brake", icon: "🪂", name: "Soft Start", price: 350,
    desc: "gearDescBrake",
  },
  {
    id: "phase", icon: "👻", name: "Ghost Goo", price: 450,
    desc: "gearDescPhase",
  },
  {
    id: "combo", icon: "✨", name: "Combo Heart", price: 400,
    desc: "gearDescCombo",
  },
  {
    id: "magnet", icon: "🧲", name: "Coin Magnet", price: 500,
    desc: "gearDescMagnet",
  },
  {
    id: "lucky", icon: "🍀", name: "Lucky Clovers", price: 600,
    desc: "gearDescLucky",
  },
  {
    id: "doubler", icon: "💰", name: "Goo Tycoon", price: 800,
    desc: "gearDescDoubler",
  },
  {
    id: "heart", icon: "❤️", name: "Extra Heart", price: 1000,
    desc: "gearDescHeart",
  },
];
window.gearById = (id) => window.GEAR.find((g) => g.id === id);