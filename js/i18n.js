// ---- i18n: EN + FA ----
window.I18N = {
  en: {
    tagline: "Steer the slime. Survive the cave.",
    play: "▶ PLAY", shop: "🛒 Shop", done: "✓ Done",
    best: "Best", coins: "Coins", streak: "Streak", meters: "m",
    splat: "SPLAT!", retry: "↻ Retry", revive: "REVIVE ▶ Ad", double: "×2 coins ▶ Ad",
    challenge: "💬 Challenge a friend", paused: "Paused", resume: "▶ Resume", quit: "⤶ Menu",
    ghost: "★ best",
    newBest: "NEW BEST! +{n}m",
    beaten: "{n}m short of best",
    firstBest: "New personal best!",
    toastUnlocked: "Skin equipped!",
    toastNeedCoins: "Not enough coins",
    toastOwned: "Tap to equip",
    toastCopied: "Score copied — paste it anywhere!",
    toastNoAd: "Ad not available right now",
    revived: "REVIVED! Go!",
    combo: "COMBO",
    close: "CLOSE!",
    dailyDone: "Daily bonus claimed",
    dailyBtn: "🎁 Daily bonus ▶ Ad",
    howto: "HOLD to float up · RELEASE to drop · Collect orbs · Don't touch the walls",
  },
  fa: {
    tagline: "لایز را هدایت کن. از غار زنده بمان.",
    play: "▶ بازی کن", shop: "🛒 فروشگاه", done: "✓ تمام",
    best: "رکورد", coins: "سکه", streak: "زنجیره", meters: "متر",
    splat: "لُج شد!", retry: "↻ دوباره", revive: "زنده‌شدن ▶ تبلیغ", double: "×۲ سکه ▶ تبلیغ",
    challenge: "💬 دوستت رو چالش کن", paused: "مکث", resume: "▶ ادامه", quit: "⤶ منو",
    ghost: "★ رکورد",
    newBest: "رکورد جدید! +{n}m",
    beaten: "{n}m تا رکورد",
    firstBest: "رکورد شخصی جدید!",
    toastUnlocked: "اسکین انتخاب شد!",
    toastNeedCoins: "سکه کافی نداری",
    toastOwned: "بزن تا بپوشی",
    toastCopied: "اسکور کپی شد — بفرست بقیه!",
    toastNoAd: "الان تبلیغ موجود نیست",
    revived: "مجدداً زنده شدی! برقص!",
    combo: "کمبو",
    close: "خطرناک!",
    dailyDone: "بونوس روزانه گرفته شد",
    dailyBtn: "🎁 بونوس روزانه ▶ تبلیغ",
    howto: "نگه‌دار تا بالا بره · ول کن تا پایین بیاد · توپ‌ها رو بگیر · به دیوار نخور",
  }
};
let LANG = localStorage.getItem("slimedash_lang") || "en";
window.t = (k, vars) => {
  let s = (window.I18N[LANG] && window.I18N[LANG][k]) || window.I18N.en[k] || k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace("{" + a + "}", b);
  return s;
};
window.setLang = (l) => {
  LANG = l; localStorage.setItem("slimedash_lang", l);
  document.documentElement.dir = l === "fa" ? "rtl" : "ltr";
  document.documentElement.lang = l;
};