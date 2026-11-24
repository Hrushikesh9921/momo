/* Wall buttons. Kids choose by holding a hand on a button until the ring fills up.
   A mouse click (or tap on a touchscreen) selects instantly. */
(function (WG) {
  WG.DwellButton = class {
    // opts: { x, y, r }  (circle)  or { x, y, w, h } (rect, x/y = top-left), onSelect(player), dwellMs, hold }
    constructor(opts) {
      Object.assign(this, { progress: 0, hot: false, cool: 0, enabled: true }, opts);
    }
    contains(p) {
      if (this.r) return WG.dist(p.x, p.y, this.x, this.y) <= this.r + (p.src === 'cam' ? 20 : 0);
      return p.x >= this.x && p.x <= this.x + this.w && p.y >= this.y && p.y <= this.y + this.h;
    }
    update(dt) {
      this.cool = Math.max(0, this.cool - dt);
      if (!this.enabled) { this.progress = 0; this.hot = false; return; }
      let camIn = null, mouseIn = null;
      for (const p of WG.input.pointers) {
        if (!this.contains(p)) continue;
        if (p.src === 'cam') { if (!this.mouseOnly) camIn = camIn || p; }
        else { mouseIn = mouseIn || p; if (p.justDown && this.cool <= 0) { this.fire(p.player); return; } }
      }
      this.hot = !!(camIn || mouseIn);
      const need = (this.dwellMs || WG.settings.dwellMs) / 1000;
      if (camIn && this.cool <= 0) {
        const before = this.progress;
        this.progress += dt / need;
        if (Math.floor(before * 4) !== Math.floor(this.progress * 4) && this.progress < 1) WG.audio.sfx('tick');
        if (this.progress >= 1) this.fire(camIn.player);
      } else this.progress = Math.max(0, this.progress - dt * 1.5);
    }
    fire(player) {
      this.progress = 0; this.cool = 1;
      WG.audio.sfx('select');
      this.onSelect && this.onSelect(player);
    }
  };

  // A stone round button with a hold ring, used for back/home/again etc.
  WG.StoneButton = class extends WG.DwellButton {
    draw(ctx) {
      const s = this.hot ? 1.08 : 1;
      WG.art.stoneButton(ctx, this.x, this.y, this.r * s, this.icon, this.progress);
      if (this.label) WG.art.label(ctx, this.label, this.x, this.y + this.r + 34, 34, '#fff');
    }
  };
})(window.WG);
