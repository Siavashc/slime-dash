# Slime Dash 🢄 Neon Cave Racer

One-button hyper-casual HTML5 game. **Hold = float up, release = drop.**
Steer a deformable slime through an endless bioluminescent cave: collect orb
chains for combo multipliers, dodge wall spikes and spinning goo-saws, hit
safe zones for coin showers, and beat your best (ghost line marks it inside
the cave).

- Pure Vanilla Canvas2D + WebAudio (all SFX/music synthesized — zero asset
  downloads).
- Desktop (Space/W/↑) + mobile (touch/hold).
- EN + فارسی.
- Monetization-ready: [Adsgram](https://adsgram.ai) rewarded ads (revive / ×2
  coins / grant) for Telegram Mini App; auto-hides ad buttons when no provider
  is configured. Portal-agnostic (drop-in for Playgama / any SDK host).
- See `../DEPLOY.md` for the full publish + monetize guide.

### Files
```
index.html    — shell + UI screens
style.css     — theme
js/game.js    — engine: tunnel gen, physics, juice, rendering
js/ui.js      — screens, shop, HUD
js/main.js    — config + wiring (ADSGRAM_BLOCK_ID / SHARE_URL live here)
js/i18n.js    — EN/FA
js/skins.js   — 8-skin shop + save state
js/audio.js   — procedural WebAudio SFX + music
js/ads.js     — pluggable rewarded-ad adapter
js/tma.js     — Telegram Mini App integration + score sharing
assets/       — icon / banner / thumbnail
```

License: all code and art generated for this project. Slime mascot reused from
the owner's own asset library.