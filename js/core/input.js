/* Input: merges camera hands and mouse/touchscreen into one list of "pointers" in game coordinates.
   Games only ever look at WG.input.pointers — they don't care where a touch came from.

   pointer = { id, x, y, player (0|1), src: 'cam'|'mouse', touching, justDown, speed } */
(function (WG) {
  const I = (WG.input = { pointers: [] });
  const mice = new Map(); // pointerId -> {x, y, down, justDown, lastMove}
  let lastPositions = new Map();

  // Screen <-> game coordinates (set by main.js on resize)
  WG.view = { scale: 1, ox: 0, oy: 0 };
  WG.toGame = (cx, cy) => [(cx - WG.view.ox) / WG.view.scale, (cy - WG.view.oy) / WG.view.scale];

  // Player from a horizontal position (left half = player 0, unless swapped)
  WG.playerFromX = function (x) {
    if (WG.settings.players < 2) return 0;
    const left = x < WG.W / 2 ? 0 : 1;
    return WG.settings.mirrorPlayers ? 1 - left : left;
  };

  I.attach = function (canvas) {
    const pos = (e) => WG.toGame(e.clientX, e.clientY);
    canvas.addEventListener('pointerdown', (e) => {
      const [x, y] = pos(e);
      mice.set(e.pointerId, { x, y, down: true, justDown: true, lastMove: performance.now(), type: e.pointerType });
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e);
      const m = mice.get(e.pointerId) || { down: false, justDown: false, type: e.pointerType };
      m.x = x; m.y = y; m.lastMove = performance.now();
      mice.set(e.pointerId, m);
    });
    const up = (e) => {
      const m = mice.get(e.pointerId);
      if (!m) return;
      if (e.pointerType === 'mouse') m.down = false; else mice.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mice.delete(e.pointerId); });
  };

  I.update = function (dt) {
    const list = [];
    // camera hands
    if (WG.settings.inputMode === 'camera' && WG.tracker && WG.calib.H) {
      for (const h of WG.tracker.hands) list.push({ id: h.id, x: h.x, y: h.y, player: h.player, src: 'cam', touching: true, justDown: h.justAppeared });
    }
    // mouse / touchscreen (always available, handy for testing on the laptop)
    for (const [id, m] of mice) {
      if (m.x == null) continue;
      list.push({ id: 'm' + id, x: m.x, y: m.y, player: WG.playerFromX(m.x), src: 'mouse', touching: m.down, justDown: m.justDown, hover: true });
      m.justDown = false;
    }
    // speed
    const next = new Map();
    for (const p of list) {
      const prev = lastPositions.get(p.id);
      p.speed = prev && dt > 0 ? WG.dist(p.x, p.y, prev[0], prev[1]) / dt : 0;
      p.px = prev ? prev[0] : p.x; p.py = prev ? prev[1] : p.y;
      next.set(p.id, [p.x, p.y]);
    }
    lastPositions = next;
    I.pointers = list;
  };

  // Extra radius a pointer adds when checking hits (hands are fuzzy, mouse is precise)
  I.reach = (p) => (p.src === 'cam' ? WG.settings.reach : 14);

  // All pointers touching a circle at (x, y) with radius r
  I.touchesCircle = function (x, y, r) {
    const out = [];
    for (const p of I.pointers) {
      if (!p.touching) continue;
      if (WG.dist(p.x, p.y, x, y) <= r + I.reach(p)) out.push(p);
      // fast swipes: also check the line from the previous position
      else if (p.speed > 600 && segDist(x, y, p.px, p.py, p.x, p.y) <= r + I.reach(p)) out.push(p);
    }
    return out;
  };

  // Pointers hovering/touching a rectangle (used by menu buttons)
  I.inRect = function (x, y, w, h, needTouch = false) {
    return I.pointers.filter((p) => (!needTouch || p.touching) && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h);
  };

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = WG.clamp(t, 0, 1);
    return WG.dist(px, py, ax + t * dx, ay + t * dy);
  }

  // Draw glowing circles for camera hands (mouse uses the normal cursor)
  I.drawCursors = function (ctx, t) {
    if (!WG.settings.showCursors) return;
    for (const p of I.pointers) if (p.src === 'cam') WG.art.handCursor(ctx, p.x, p.y, p.player, t, Math.max(30, WG.settings.reach * 0.6));
  };
})(window.WG);
