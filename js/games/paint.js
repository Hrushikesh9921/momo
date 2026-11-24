/* Paint the Wall — free play. Wherever a hand touches, rainbow paint appears. Press P on the laptop to save the picture. */
(function (WG) {
  class PaintGame extends WG.RoundGame {
    setup() {
      this.showScores = false;
      this.time = Math.round(WG.settings.roundSeconds * 1.5);
      this.layer = WG.art.canvas(WG.W, WG.H);
      this.lctx = this.layer.getContext('2d');
      this.strokes = new Map();
      this.hues = [20, 200];
      this.swishCool = 0;
      this.clearFade = 0;
      this.clearBtn = new WG.StoneButton({ x: WG.W - 92, y: 92, r: 54, icon: 'trash', dwellMs: Math.max(1500, WG.settings.dwellMs * 1.3), onSelect: () => this.clear() });
    }

    clear() { this.clearFade = 1; WG.audio.sfx('paintClear'); }

    color(player, hue, light = 58) {
      if (!this.twoP) return `hsl(${hue % 360},90%,${light}%)`;
      // left kid: warm rainbow (red-orange-yellow-pink), right kid: cool rainbow (green-blue-purple)
      const h = player === 0 ? (330 + (hue % 120)) % 360 : 140 + (hue % 140);
      return `hsl(${h},90%,${light}%)`;
    }

    splat(x, y, player, size) {
      const c = this.lctx, hue = this.hues[player];
      c.fillStyle = this.color(player, hue);
      c.beginPath();
      const n = 14, r0 = size;
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = r0 * WG.rand(0.75, 1.25); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.fill();
      for (let i = 0; i < 7; i++) { const a = Math.random() * 6.28, d = r0 * WG.rand(1.2, 2.1); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, WG.rand(6, 16), 0, 7); c.fill(); }
      // drip
      if (Math.random() < 0.6) { const dx = x + WG.rand(-r0 * 0.5, r0 * 0.5); c.fillRect(dx - 7, y, 14, r0 * WG.rand(1.2, 2.2)); c.beginPath(); c.arc(dx, y + r0 * 1.9, 10, 0, 7); c.fill(); }
      WG.audio.sfx('pop', { note: 60 + Math.floor(Math.random() * 5) * 2 });
    }

    updateWorld(dt, playing) {
      this.clearBtn.update(dt);
      this.swishCool -= dt;
      if (this.clearFade > 0) {
        this.clearFade -= dt * 1.6;
        this.lctx.save(); this.lctx.globalCompositeOperation = 'destination-out'; this.lctx.globalAlpha = Math.min(1, dt * 5); this.lctx.fillRect(0, 0, WG.W, WG.H); this.lctx.restore();
        if (this.clearFade <= 0) this.lctx.clearRect(0, 0, WG.W, WG.H);
      }
      if (!playing) { this.strokes.clear(); return; }
      const seen = new Set();
      const width = 56 * WG.sizeMul() * (WG.settings.reach / 70) ** 0.5;
      for (const p of WG.input.pointers) {
        if (!p.touching) continue;
        if (p.y < 170 && (p.x < 180 || p.x > WG.W - 180)) continue; // don't paint over the corner buttons
        seen.add(p.id);
        const prev = this.strokes.get(p.id);
        if (!prev) { this.splat(p.x, p.y, p.player, width * 0.9); this.strokes.set(p.id, { x: p.x, y: p.y }); continue; }
        const d = WG.dist(prev.x, prev.y, p.x, p.y);
        if (d < 2) continue;
        this.hues[p.player] += d * 0.12;
        const c = this.lctx;
        c.strokeStyle = this.color(p.player, this.hues[p.player]);
        c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke();
        prev.x = p.x; prev.y = p.y;
        if (Math.random() < d / 300) this.particles.burst(p.x, p.y, 2, { colors: ['#fff', this.color(p.player, this.hues[p.player], 75)], shape: 'star', minSize: 8, maxSize: 16, minSpeed: 50, maxSpeed: 150 });
        if (this.swishCool <= 0 && d > 15) { WG.audio.sfx('swish', { vol: Math.min(1.5, d / 40) }); this.swishCool = 0.18; }
      }
      for (const id of [...this.strokes.keys()]) if (!seen.has(id)) this.strokes.delete(id);
    }

    drawWorld(ctx) {
      ctx.drawImage(WG.art.background('paper'), 0, 0);
      ctx.drawImage(this.layer, 0, 0);
      if (this.state === 'play') this.clearBtn.draw(ctx);
      if (this.state === 'end') { // wooden frame around the masterpiece
        ctx.save(); ctx.strokeStyle = '#b5773a'; ctx.lineWidth = 40; ctx.strokeRect(20, 20, WG.W - 40, WG.H - 40);
        ctx.strokeStyle = '#e8b26a'; ctx.lineWidth = 12; ctx.strokeRect(46, 46, WG.W - 92, WG.H - 92); ctx.restore();
      }
    }

    // Laptop key: P saves the painting as a picture
    key(k) {
      if (k !== 'p') return false;
      const c = WG.art.canvas(WG.W, WG.H), x = c.getContext('2d');
      x.drawImage(WG.art.background('paper'), 0, 0); x.drawImage(this.layer, 0, 0);
      const a = document.createElement('a');
      a.download = 'momo-painting-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png';
      a.href = c.toDataURL('image/png'); a.click();
      WG.toast('Painting saved to your Downloads folder');
      return true;
    }
  }

  WG.registerGame({
    id: 'paint', name: 'Paint the Wall', music: 'paint', noScore: true,
    intro: 'Paint the wall with your hands!', help: 'Touch the wall to paint!',
    tile: { top: '#fff3c4', bottom: '#ffb36b' },
    create(def) { return new PaintGame(def); },
    drawIcon(ctx, x, y, s, t) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
      ['#ff5c8a', '#ffb02e', '#ffe14d', '#5be196', '#2f9bff', '#a073ff'].forEach((c, i) => {
        ctx.strokeStyle = c; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 70, 150 - i * 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      });
      // brush
      ctx.rotate(0.6 + Math.sin(t * 3) * 0.15);
      ctx.fillStyle = '#c98a4a'; WG.art.rr(ctx, -12, -10, 24, 120, 10); ctx.fill();
      ctx.fillStyle = '#cfd6dd'; ctx.fillRect(-16, -30, 32, 26);
      ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(0, -95, 16, -30); ctx.fill();
      ctx.restore();
    },
  });
})(window.WG);
