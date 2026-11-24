/* Bubble Pop — calm, no-lose game. Every pop plays a musical note (low on the left, high on the right). */
(function (WG) {
  const NOTES = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
  const INSIDE = ['star', 'heart', 'fish', 'none', 'none'];

  class BubbleGame extends WG.RoundGame {
    setup() {
      this.bubbles = [];
      this.baseCount = this.twoP ? 14 : 11;
      for (let i = 0; i < this.countFor(this.baseCount); i++) this.spawn(true);
      this.spawnT = 0;
    }

    spawn(anywhere) {
      const r = WG.rand(75, 115) * WG.sizeMul();
      this.bubbles.push({
        x: WG.rand(r + 40, WG.W - r - 40), y: anywhere ? WG.rand(300, WG.H + 100) : WG.H + r + 20,
        r, ph: Math.random() * 6, speed: WG.rand(55, 105), inside: WG.pick(INSIDE),
        fishColor: WG.pick(['pink', 'green', 'purple']), born: this.t,
      });
    }

    updateWorld(dt, playing) {
      for (const b of this.bubbles) {
        b.y -= b.speed * this.speedK * dt;
        b.x += Math.sin(this.t * 1.1 + b.ph) * 30 * dt;
        if (b.y < -b.r - 20) b.gone = true;
        if (!playing || b.gone) continue;
        const hits = WG.input.touchesCircle(b.x, b.y, b.r);
        if (hits.length) this.pop(b, hits[0].player);
      }
      this.bubbles = this.bubbles.filter((b) => !b.gone);
      this.spawnT -= dt;
      if (this.bubbles.length < this.countFor(this.baseCount) && this.spawnT <= 0) { this.spawn(false); this.spawnT = WG.rand(0.15, 0.5) / this.crowd; }
    }

    pop(b, player) {
      b.gone = true;
      const note = NOTES[WG.clamp(Math.floor((b.x / WG.W) * NOTES.length), 0, NOTES.length - 1)];
      WG.audio.sfx('pop', { note });
      this.addScore(player, 1, b.x, b.y);
      this.particles.add({ x: b.x, y: b.y, shape: 'ring', size: b.r * 0.8, life: 0.45, color: 'rgba(255,255,255,0.9)' });
      this.particles.burst(b.x, b.y, 16, { colors: ['#ffffff', '#bfe8ff', '#ffd6ec', '#fff3b0'], minSize: 5, maxSize: 12, minSpeed: 200, maxSpeed: 520 });
      if (b.inside !== 'none') this.particles.burst(b.x, b.y, 5, { colors: ['#ffd34d', '#ff8fbf'], shape: 'star', minSize: 14, maxSize: 24, g: 300 });
    }

    drawWorld(ctx) {
      const art = WG.art;
      ctx.drawImage(art.background('bubbles'), 0, 0);
      const spr = art.bubbleSprite();
      for (const b of this.bubbles) {
        const wob = 1 + Math.sin(this.t * 3 + b.ph) * 0.04;
        ctx.save(); ctx.translate(b.x, b.y);
        // friend inside the bubble
        ctx.save(); ctx.rotate(Math.sin(this.t + b.ph) * 0.2);
        const k = b.r / 100;
        if (b.inside === 'star') { ctx.fillStyle = '#ffd34d'; art.star(ctx, 0, 0, 48 * k, 22 * k, 5); ctx.fill(); ctx.strokeStyle = '#e09a10'; ctx.lineWidth = 4; ctx.stroke(); art.eye(ctx, -12 * k, -4 * k, 7 * k); art.eye(ctx, 12 * k, -4 * k, 7 * k); }
        if (b.inside === 'heart') { ctx.fillStyle = '#ff6f9f'; art.heart(ctx, 0, 6 * k, 60 * k); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-16 * k, -14 * k, 8 * k, 0, 7); ctx.fill(); }
        if (b.inside === 'fish') { ctx.scale(0.42 * k, 0.42 * k); ctx.drawImage(art.fishSprite(b.fishColor), -156, -116); }
        ctx.restore();
        ctx.scale(wob * b.r / 120, b.r / 120 / wob);
        ctx.drawImage(spr, -130, -130);
        ctx.restore();
      }
    }

    drawScoreIcon(ctx, x, y) {
      ctx.save(); ctx.fillStyle = '#8FD0FF'; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(x - 8, y - 8, 7, 4, -0.7, 0, 7); ctx.fill(); ctx.restore();
    }
  }

  WG.registerGame({
    id: 'bubbles', name: 'Bubble Pop', music: 'bubbles', partyText: 'Bubble storm!',
    intro: 'Pop the bubbles!', help: 'Pop the bubbles!',
    tile: { top: '#ffd6ec', bottom: '#8fc9ff' },
    create(def) { return new BubbleGame(def); },
    drawIcon(ctx, x, y, s, t) {
      const spr = WG.art.bubbleSprite();
      [[0, 0, 1], [-85, 55, 0.5], [80, 60, 0.6], [70, -70, 0.38]].forEach(([dx, dy, k], i) => {
        ctx.save(); ctx.translate(x + dx * s, y + dy * s + Math.sin(t * 2 + i) * 8); ctx.scale(s * k * 0.85, s * k * 0.85); ctx.drawImage(spr, -130, -130); ctx.restore();
      });
    },
  });
})(window.WG);
