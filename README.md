Pop! - Carnival Balloon Popping Game

Open `index.html` in a browser to play the game.

Rules & features:
- You start with 10 darts (default weapon).
- Balloons spawn on the board and can contain water, poison, or coins.
- Popping water: +25 points (doubles on consecutive water pops), increases water side of the progress bar.
- Popping poison: -15 points (doubles on consecutive poison pops), increases poison side of the progress bar.
- Popping coins: awards 25–150 coins (rare higher amounts) and +10 to score.
- Progress: water vs poison. If poison fills to 100% you lose. If water fills to 100% you win.
- Coins can buy/refill weapons in the shop (darts, arrows, shuriken, kunai). Refill and buy prices are implemented per spec. The store is a slide-out side panel (tap the Store button to open/close).
- When you run out of ammo and coins to buy refills you lose.
- On win, confetti falls and the game stops.

Files:
- `index.html` - main page
- `styles.css` - styles
- `script.js` - game logic

Notes & TODOs:
- Sounds are placeholder tiny data URIs. Replace with real assets if desired.
- Touch/aim mode available: toggle Aim Mode to tap-to-aim then tap again to fire. Tutorial available on load with option to read more or skip.
- Tweak balance/weights for coin rarity and drop types as needed.
