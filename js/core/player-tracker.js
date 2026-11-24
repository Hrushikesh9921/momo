/* PlayerTracker: keeps each kid's colour for as long as they play, even when they swap sides.

   Every camera frame gives a list of people (shoulder centre + shoulder width, in wall coordinates).
   We keep one "track" per kid and match each new person to the track that best explains them:
     - where the kid should be now (last position + their recent movement),
     - how big their shoulders look (siblings of different sizes are easy to tell apart).
   A kid who briefly disappears (bends down, walks behind the other kid) keeps their track for a few
   seconds and gets the same colour back when they reappear.

   Pure logic, no camera or drawing, so it can be unit-tested. Used by tracker.js. */
(function (WG) {
  const KEEP_MS = 4000;      // how long a kid's colour is remembered after they disappear
  const NEAR = 380;          // max jump (wall px) for a kid seen a moment ago
  const FAR_PER_S = 900;     // allowed jump grows by this much per second unseen

  WG.PlayerTracker = class {
    constructor() { this.reset(); }

    reset() { this.tracks = []; this.nextId = 1; }

    // people: [{ x, y, size }]   now: ms   opts: { players, sideOf(x) -> 0|1 }
    // Returns the same array with .player and .trackId set on each person.
    update(people, now, opts) {
      const twoP = opts.players > 1;
      this.tracks = this.tracks.filter((t) => now - t.seen <= KEEP_MS);

      // Try every way of pairing people with tracks (there are only ever a few) and keep the cheapest.
      const pairs = bestPairs(people, this.tracks, now);
      const used = new Set();
      people.forEach((p, i) => {
        const t = pairs[i];
        if (t) { used.add(t); this.follow(t, p, now); p.trackId = t.id; p.player = twoP ? t.player : 0; }
      });

      // New kids: give them a colour nobody is using; if both are taken, use the side they stand on.
      for (const p of people) {
        if (p.trackId) continue;
        let player = 0;
        if (twoP) {
          const taken = new Set(this.tracks.filter((t) => now - t.seen < 600 || used.has(t)).map((t) => t.player));
          const side = opts.sideOf(p.x);
          player = !taken.has(side) ? side : !taken.has(1 - side) ? 1 - side : side;
          // a remembered (but currently missing) kid with this colour gives it up to the newcomer
          this.tracks = this.tracks.filter((t) => used.has(t) || t.player !== player || now - t.seen < 600);
        }
        const t = { id: this.nextId++, player, x: p.x, y: p.y, vx: 0, vy: 0, size: p.size, seen: now, born: now };
        this.tracks.push(t); used.add(t);
        p.trackId = t.id; p.player = player;
      }
      return people;
    }

    follow(t, p, now) {
      const dt = Math.max(0.016, (now - t.seen) / 1000);
      if (dt < 0.5) {
        t.vx = WG.lerp(t.vx, (p.x - t.x) / dt, 0.4);
        t.vy = WG.lerp(t.vy, (p.y - t.y) / dt, 0.4);
      } else { t.vx = 0; t.vy = 0; }
      t.x = p.x; t.y = p.y; t.size = WG.lerp(t.size, p.size, 0.15); t.seen = now;
    }

    // Grown-up shortcut: swap the two colours (if the tracker guessed wrong at the start)
    swap() { for (const t of this.tracks) t.player = 1 - t.player; }
  };

  function cost(p, t, now) {
    const gone = Math.max(0, (now - t.seen) / 1000);
    const k = Math.min(gone, 0.4); // predict a short way ahead only
    const px = t.x + t.vx * k, py = t.y + t.vy * k;
    const d = Math.hypot(p.x - px, p.y - py);
    const limit = NEAR + FAR_PER_S * gone;
    if (d > limit) return Infinity;
    const sizeDiff = Math.abs(Math.log((p.size + 1) / (t.size + 1)));
    return d + sizeDiff * 400 + gone * 60;
  }

  // Cheapest assignment of people -> tracks (null = new kid). Brute force: at most ~4 people.
  function bestPairs(people, tracks, now) {
    const n = people.length;
    const C = people.map((p) => tracks.map((t) => cost(p, t, now)));
    let best = new Array(n).fill(null), bestScore = Infinity;
    const NEW = 700; // cost of calling someone a brand-new kid
    const pick = new Array(n);
    (function go(i, usedMask, score) {
      if (score >= bestScore) return;
      if (i === n) { bestScore = score; best = pick.map((j) => (j == null ? null : tracks[j])); return; }
      for (let j = 0; j < tracks.length; j++) {
        if (usedMask & (1 << j) || C[i][j] === Infinity) continue;
        pick[i] = j; go(i + 1, usedMask | (1 << j), score + C[i][j]);
      }
      pick[i] = null; go(i + 1, usedMask, score + NEW);
    })(0, 0, 0);
    return best;
  }
})(window.WG);
