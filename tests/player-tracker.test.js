/* Run with: node tests/player-tracker.test.js  (needs Node.js; checks that kids keep their colours) */
global.window = {}; global.localStorage = { getItem() { return null; }, setItem() {} };
const path = require('path');
require(path.join(__dirname, '../js/core/util.js'));
require(path.join(__dirname, '../js/core/player-tracker.js'));
const WG = window.WG;
const opts = { players: 2, sideOf: (x) => (x < 960 ? 0 : 1) };
let fails = 0;
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails++; };
const noise = () => (Math.random() - 0.5) * 30;

// 1. Two kids (different sizes) cross paths, 24 fps, ~3 s; detector output order is shuffled each frame.
{
  const tr = new WG.PlayerTracker(); let swaps = 0, first = null;
  for (let f = 0; f <= 72; f++) {
    const t = f / 72, now = f * 42;
    const a = { name: 'A', x: 500 + 900 * t + noise(), y: 600 + noise(), size: 150 + noise() / 5 };
    const b = { name: 'B', x: 1400 - 900 * t + noise(), y: 620 + noise(), size: 120 + noise() / 5 };
    const ppl = Math.random() < 0.5 ? [a, b] : [b, a];
    tr.update(ppl, now, opts);
    const map = { [a.name]: a.player, [b.name]: b.player };
    if (!first) first = map; else if (map.A !== first.A) swaps++;
  }
  check('crossing: A starts orange (left)', first.A === 0 && first.B === 1);
  check('crossing: colours never swap', swaps === 0);
}

// 2. Same-size kids cross with momentum.
{
  const tr = new WG.PlayerTracker(); let bad = 0;
  for (let f = 0; f <= 72; f++) {
    const t = f / 72;
    const a = { name: 'A', x: 600 + 700 * t + noise(), y: 600, size: 140 };
    const b = { name: 'B', x: 1300 - 700 * t + noise(), y: 600, size: 140 };
    tr.update([b, a], f * 42, opts);
    if (a.player !== 0 || b.player !== 1) bad++;
  }
  check('same-size crossing: colours kept (' + bad + ' bad frames)', bad <= 2);
}

// 3. Kid B disappears for 2 s (bends down) and reappears nearby: gets the same colour back.
{
  const tr = new WG.PlayerTracker(); let now = 0;
  for (let f = 0; f < 24; f++, now += 42) tr.update([{ x: 400, y: 600, size: 150 }, { x: 1500, y: 600, size: 120 }], now, opts);
  for (let f = 0; f < 48; f++, now += 42) tr.update([{ x: 400, y: 600, size: 150 }], now, opts);
  const back = [{ x: 400, y: 600, size: 150 }, { x: 1350, y: 640, size: 118 }];
  tr.update(back, now, opts);
  check('reappearing kid keeps blue', back[1].player === 1 && back[0].player === 0);
}

// 4. One kid alone, then a second arrives: newcomer gets the free colour even on the "wrong" side.
{
  const tr = new WG.PlayerTracker(); let now = 0;
  for (let f = 0; f < 24; f++, now += 42) tr.update([{ x: 1500, y: 600, size: 150 }], now, opts); // starts right -> blue
  const two = [{ x: 1500, y: 600, size: 150 }, { x: 1700, y: 600, size: 120 }];
  tr.update(two, now, opts);
  check('newcomer gets the free colour', two[0].player === 1 && two[1].player === 0);
}

// 5. Swap button flips colours.
{
  const tr = new WG.PlayerTracker();
  const p = [{ x: 400, y: 600, size: 150 }, { x: 1500, y: 600, size: 120 }];
  tr.update(p, 0, opts); tr.swap();
  const q = [{ x: 400, y: 600, size: 150 }, { x: 1500, y: 600, size: 120 }];
  tr.update(q, 42, opts);
  check('swap flips colours', q[0].player === 1 && q[1].player === 0);
}

// 6. Speed: 3 people, 1000 frames.
{
  const tr = new WG.PlayerTracker(); const t0 = Date.now();
  for (let f = 0; f < 1000; f++) tr.update([0, 1, 2].map((i) => ({ x: 300 + i * 600 + noise(), y: 600, size: 130 + i * 10 })), f * 42, opts);
  const ms = Date.now() - t0;
  check('fast enough (' + ms + ' ms / 1000 frames)', ms < 200);
}
process.exit(fails ? 1 : 0);
