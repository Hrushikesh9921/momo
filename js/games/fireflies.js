/* Firefly Catch — gentle night game. Touch a firefly and it flies into your glowing jar. */
(function (WG) {
  const CHIME = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

  class FireflyGame extends WG.RoundGame {
    setup() {
      this.flies = [];
      this.flying = [];
      this.jarDots = [[], []];
      for (let i = 0; i < this.countFor(this.twoP ? 14 : 10); i++) this.spawn(true);
      this.stars = Array.from({ length: 90 }, () => ({ x: WG.rand(0, WG.W), y: WG.rand(0, 560), r: WG.rand(1, 3), ph: Math.random() * 6 }));
    }

    jarPos(player) {
      if (!this.twoP) return [WG.W / 2, 930];
      const right = (player === 1) !== WG.settings.mirrorPlayers;
      return [right ? WG.W - 230 : 230, 930];
    }

    spawn(anywhere) {
      const f = { x: WG.rand(150, WG.W - 150), y: WG.rand(220, 800),
        vx: 0, vy: 0, ph: Math.random() * 6, s: WG.rand(0.9, 1.2) * WG.sizeMul(), wander: Math.random() * 6, fadeIn: anywhere ? 1 : 0 };
      f.r = 55 * f.s;
      this.flies.push(f);
    }

    updateWorld(dt, playing) {
      const sp = 70 * this.speedK;
      for (const f of this.flies) {
        f.fadeIn = Math.min(1, f.fadeIn + dt);
        f.wander += WG.rand(-2, 2) * dt;
        f.vx += (Math.cos(f.wander) * sp - f.vx) * dt; f.vy += (Math.sin(f.wander) * sp * 0.7 - f.vy) * dt;
        f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(this.t * 2 + f.ph) * 15 * dt;
        if (f.x < 120 || f.x > WG.W - 120) { f.wander = Math.PI - f.wander; f.x = WG.clamp(f.x, 120, WG.W - 120); }
        if (f.y < 200 || f.y > 820) { f.wander = -f.wander; f.y = WG.clamp(f.y, 200, 820); }
        if (!playing || f.fadeIn < 0.6) continue;
        const hits = WG.input.touchesCircle(f.x, f.y, f.r);
        if (hits.length) this.catchFly(f, hits[0].player);
      }
      this.flies = this.flies.filter((f) => !f.caught);
            this.spawnT = (this.spawnT || 0) - dt;
      if (this.flies.length < this.countFor(this.twoP ? 14 : 10) && this.spawnT <= 0) { this.spawn(false); this.spawnT = WG.rand(0.2, 0.6) / this.crowd; }

      for (const fl of this.flying) {
        fl.t += dt / 0.9;
        if (fl.t >= 1 && !fl.done) {
          fl.done = true;
          const dots = this.jarDots[fl.player];
          if (dots.length < 40) dots.push({ x: WG.rand(-55, 55), y: WG.rand(-60, 70), ph: Math.random() * 6 });
          const [jx, jy] = this.jarPos(fl.player);
          this.particles.burst(jx, jy - 40, 6, { colors: ['#eaff8a', '#fff'], shape: 'star', minSize: 10, maxSize: 18, minSpeed: 60, maxSpeed: 200 });
        }
      }
      this.flying = this.flying.filter((fl) => !fl.done);
    }

    catchFly(f, player) {
      f.caught = true;
      this.addScore(player, 1, f.x, f.y);
      const n = this.scores[player];
      WG.audio.sfx('chime', { note: CHIME[(n - 1) % CHIME.length] + (player ? -5 : 0) });
      this.flying.push({ x: f.x, y: f.y, player, t: 0 });
      this.particles.burst(f.x, f.y, 10, { colors: ['#eaff8a', '#ffffff', '#b5ff6a'], minSize: 4, maxSize: 10, minSpeed: 80, maxSpeed: 260 });
    }

    drawGlow(ctx, x, y, s, a) {
      const g = WG.art.glowSprite('firefly', 'rgba(220,255,120,A)', 220);
      ctx.globalAlpha = a; ctx.drawImage(g, x - 110 * s, y - 110 * s, 220 * s, 220 * s); ctx.globalAlpha = 1;
    }

    drawWorld(ctx) {
      const art = WG.art;
      ctx.drawImage(art.background('night'), 0, 0);
      for (const st of this.stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + st.ph)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;

      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const f of this.flies) {
        const pulse = 0.55 + 0.45 * Math.sin(this.t * 3 + f.ph);
        this.drawGlow(ctx, f.x, f.y, f.s * (0.9 + pulse * 0.5), f.fadeIn * (0.5 + pulse * 0.5));
      }
      for (const fl of this.flying) {
        const [jx, jy] = this.jarPos(fl.player), e = WG.easeInOut(fl.t);
        const x = WG.lerp(fl.x, jx, e), y = WG.lerp(fl.y, jy - 20, e) - Math.sin(fl.t * Math.PI) * 140;
        this.drawGlow(ctx, x, y, 1.1 - fl.t * 0.5, 1);
      }
      ctx.restore();
      // little bug bodies
      for (const f of this.flies) {
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.s, f.s); ctx.globalAlpha = f.fadeIn;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        const flap = Math.sin(this.t * 30 + f.ph) * 0.4;
        ctx.save(); ctx.rotate(-0.6 + flap); ctx.beginPath(); ctx.ellipse(-6, -14, 7, 14, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); ctx.rotate(0.6 - flap); ctx.beginPath(); ctx.ellipse(6, -14, 7, 14, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#3a2a40'; ctx.beginPath(); ctx.ellipse(0, -4, 8, 10, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f6ff9a'; ctx.beginPath(); ctx.ellipse(0, 10, 9, 11, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -7, 2.5, 0, 7); ctx.arc(3, -7, 2.5, 0, 7); ctx.fill();
        ctx.restore();
      }
      // jars
      for (let p = 0; p < (this.twoP ? 2 : 1); p++) this.drawJar(ctx, p);
    }

    drawJar(ctx, p) {
      const [x, y] = this.jarPos(p), col = this.twoP ? WG.PLAYER_COLORS[p] : { main: '#ffb347', dark: '#9c4c07' };
      ctx.save(); ctx.translate(x, y);
      // glow from inside
      const n = this.jarDots[p].length;
      if (n) { ctx.globalCompositeOperation = 'lighter'; this.drawGlow(ctx, 0, 0, 1 + Math.min(2, n * 0.12), Math.min(0.9, 0.25 + n * 0.05)); ctx.globalCompositeOperation = 'source-over'; }
      // glass
      ctx.fillStyle = 'rgba(200,240,255,0.16)'; ctx.strokeStyle = 'rgba(230,250,255,0.75)'; ctx.lineWidth = 6;
      WG.art.rr(ctx, -85, -95, 170, 190, 40); ctx.fill(); ctx.stroke();
      for (const d of this.jarDots[p]) { ctx.fillStyle = `rgba(240,255,150,${0.6 + 0.4 * Math.sin(this.t * 4 + d.ph)})`; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; WG.art.rr(ctx, -62, -70, 16, 120, 8); ctx.fill();
      // lid in player colour
      ctx.fillStyle = col.main; ctx.strokeStyle = col.dark; ctx.lineWidth = 5;
      WG.art.rr(ctx, -70, -125, 140, 38, 12); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    drawScoreIcon(ctx, x, y) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#FFE45C'; ctx.beginPath(); ctx.arc(x, y + 6, 16, 0, 7); ctx.fill(); ctx.restore();
      ctx.save(); ctx.fillStyle = '#2E2346'; ctx.beginPath(); ctx.ellipse(x, y - 8, 10, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#F0E030'; ctx.beginPath(); ctx.ellipse(x, y + 8, 12, 13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 4, y - 10, 3, 0, 7); ctx.arc(x + 4, y - 10, 3, 0, 7); ctx.fill(); ctx.restore();
    }
  }

  WG.registerGame({
    id: 'fireflies', name: 'Firefly Catch', music: 'night', partyText: 'Firefly party!',
    intro: 'Catch the glowing fireflies and put them in your jar!', help: 'Touch the fireflies!',
    tile: { top: '#1d4f7a', bottom: '#071a3d' },
    create(def) { return new FireflyGame(def); },
    drawIcon(ctx, x, y, s, t) {
      const g = WG.art.glowSprite('firefly', 'rgba(220,255,120,A)', 220);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[0, 0, 1], [-80, 50, 0.6], [85, 40, 0.7], [50, -70, 0.5], [-60, -60, 0.45]].forEach(([dx, dy, k], i) => {
        const p = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
        ctx.globalAlpha = p; const sz = 220 * s * k; ctx.drawImage(g, x + dx * s - sz / 2, y + dy * s - sz / 2, sz, sz);
      });
      ctx.restore(); ctx.globalAlpha = 1;
    },
  });
})(window.WG);
