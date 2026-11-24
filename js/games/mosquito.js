/* Mosquito Smash — slap the buzzing (cute) mosquitoes. Optional butterflies must NOT be hit. */
(function (WG) {
  const WORDS = ['POW!', 'BOP!', 'SMACK!', 'ZAP!', 'BAM!'];

  class MosquitoGame extends WG.RoundGame {
    setup() {
      this.bugs = [];
      this.bursts = [];
      this.baseCount = this.twoP ? 7 : 5;
      this.spawnT = 0;
      for (let i = 0; i < this.countFor(this.baseCount); i++) this.spawnBug(true);
      this.butterflies = [];
      if (WG.settings.butterflies) for (let i = 0; i < 2; i++) this.butterflies.push(this.makeButterfly());
      this.clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 520, y: WG.rand(120, 380), s: WG.rand(0.7, 1.2), v: WG.rand(8, 20) }));
    }

    spawnBug(anywhere) {
      const s = WG.rand(0.75, 0.95) * WG.sizeMul();
      const side = Math.random() < 0.5;
      const b = {
        x: anywhere ? WG.rand(250, WG.W - 250) : side ? -100 : WG.W + 100,
        y: anywhere ? WG.rand(250, 850) : WG.rand(250, 800),
        vx: 0, vy: 0, s, r: 85 * s, ph: Math.random() * 6, flap: 0, deadT: -1, retarget: 0,
        speed: WG.rand(120, 190),
      };
      this.pickTarget(b);
      this.bugs.push(b);
    }

    pickTarget(b) { b.tx = WG.rand(200, WG.W - 200); b.ty = WG.rand(230, 900); b.retarget = WG.rand(1.2, 3); }

    makeButterfly() {
      return { x: WG.rand(300, WG.W - 300), y: WG.rand(300, 800), tx: 0, ty: 0, hue: WG.pick([290, 320, 40, 180]), ph: Math.random() * 6, cool: 0, flee: 0, retarget: 0 };
    }

    updateWorld(dt, playing) {
      for (const c of this.clouds) { c.x += c.v * dt; if (c.x > WG.W + 300) c.x = -300; }
      let alive = 0;
      for (const b of this.bugs) {
        b.flap += dt * 55;
        if (b.deadT >= 0) { b.deadT += dt; continue; }
        alive++;
        b.retarget -= dt;
        if (b.leaving) { if (b.x < -150 || b.x > WG.W + 150) b.deadT = 1; }
        else if (b.retarget <= 0 || WG.dist(b.x, b.y, b.tx, b.ty) < 60) this.pickTarget(b);
        // steer with a wobble so they look like real bugs
        const ang = Math.atan2(b.ty - b.y, b.tx - b.x) + Math.sin(this.t * 6 + b.ph) * 0.8;
        const sp = b.speed * this.speedK;
        b.vx += (Math.cos(ang) * sp - b.vx) * Math.min(1, dt * 2.5);
        b.vy += (Math.sin(ang) * sp - b.vy) * Math.min(1, dt * 2.5);
        b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(this.t * 10 + b.ph) * 30 * dt;

        if (!playing) continue;
        const hits = WG.input.touchesCircle(b.x, b.y, b.r);
        if (hits.length) this.smash(b, hits[0]);
      }
      WG.audio.setBuzz(this.state === 'end' ? 0 : alive);
      // keep the swarm at the current size: new bugs fly in, extra bugs fly away
      this.bugs = this.bugs.filter((b) => b.deadT <= 0.7);
      const target = this.countFor(this.baseCount);
      const flying = this.bugs.filter((b) => b.deadT < 0 && !b.leaving);
      this.spawnT -= dt;
      if (flying.length < target && this.spawnT <= 0) { this.spawnBug(false); this.spawnT = WG.rand(0.2, 0.9) / this.crowd; }
      if (flying.length > target + 1) { const b = flying[0]; b.leaving = true; b.tx = b.x < WG.W / 2 ? -400 : WG.W + 400; b.ty = b.y; b.retarget = 99; }

      for (const f of this.butterflies) {
        f.ph += dt * (f.flee > 0 ? 18 : 9); f.cool = Math.max(0, f.cool - dt); f.flee = Math.max(0, f.flee - dt);
        f.retarget -= dt;
        if (f.retarget <= 0) { f.tx = WG.rand(250, WG.W - 250); f.ty = WG.rand(280, 850); f.retarget = WG.rand(3, 6); }
        const sp = f.flee > 0 ? 3 : 0.6;
        f.x += (f.tx - f.x) * Math.min(1, dt * sp * 0.5); f.y += (f.ty - f.y) * Math.min(1, dt * sp * 0.5) + Math.sin(f.ph * 0.5) * 40 * dt;
        if (playing && f.cool <= 0 && WG.input.touchesCircle(f.x, f.y, 70 * WG.sizeMul()).length) {
          f.cool = 1.5; f.flee = 1.2; f.retarget = 0;
          WG.audio.sfx('nope'); WG.audio.voice('butterfly');
          this.floats.add(f.x, f.y - 60, 'Gentle!', '#ffc4f0', 60);
        }
      }
      this.bursts = this.bursts.filter((z) => (z.t += dt) < 0.55);
    }

    smash(b, p) {
      b.deadT = 0;
      this.addScore(p.player, 1, b.x, b.y);
      WG.audio.sfx('slap');
      this.bursts.push({ x: b.x, y: b.y, t: 0, word: WG.pick(WORDS), rot: WG.rand(-0.3, 0.3) });
      this.particles.burst(b.x, b.y, 10, { colors: ['#ffe066', '#ffffff', '#ff9ad5'], shape: 'star', minSize: 12, maxSize: 26 });
      this.particles.burst(b.x, b.y, 10, { colors: ['rgba(255,255,255,0.85)'], minSize: 16, maxSize: 30, minSpeed: 60, maxSpeed: 200 });
    }

    drawWorld(ctx) {
      const art = WG.art;
      ctx.drawImage(art.background('dusk'), 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (const c of this.clouds) {
        [[0, 0, 60], [-60, 15, 45], [60, 18, 48], [0, -25, 40]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 7); ctx.fill(); });
      }
      for (const f of this.butterflies) art.drawButterfly(ctx, f.x, f.y, 62 * WG.sizeMul(), f.ph, f.hue);
      const body = art.mosquitoBody();
      for (const b of this.bugs) {
        ctx.save();
        ctx.translate(b.x, b.y);
        const face = b.vx < 0 ? -1 : 1;
        if (b.deadT >= 0) {
          const k = b.deadT / 0.7;
          ctx.rotate(k * 8); ctx.scale(b.s * (1 - k), b.s * (1 - k)); ctx.globalAlpha = 1 - k;
        } else {
          ctx.rotate(Math.sin(this.t * 8 + b.ph) * 0.1); ctx.scale(face * b.s, b.s);
        }
        art.drawWings(ctx, -10, -30, b.flap);
        ctx.drawImage(body, -126, -131);
        ctx.restore();
      }
      // comic "POW!" bursts
      for (const z of this.bursts) {
        const k = z.t / 0.55, s = WG.easeOutBack(Math.min(1, k * 3)) * (1 - Math.max(0, k - 0.7) / 0.3);
        ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.rot); ctx.scale(s, s);
        ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#e8412e'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
        art.star(ctx, 0, 0, 150, 90, 12); ctx.fill(); ctx.stroke();
        art.label(ctx, z.word, 0, 6, 76, '#e8412e', { stroke: '#fff', strokeW: 0.14 });
        ctx.restore();
      }
    }

    drawScoreIcon(ctx, x, y) {
      ctx.save(); ctx.translate(x, y + 2); ctx.scale(0.25, 0.25); ctx.drawImage(WG.art.mosquitoBody(), -126, -131); ctx.restore();
    }
  }

  WG.registerGame({
    id: 'mosquito', name: 'Mosquito Smash', music: 'dusk', partyText: 'Big swarm!',
    intro: 'Smash the buzzing mosquitoes!', help: 'Slap the mosquitoes!',
    tile: { top: '#c77bb5', bottom: '#5b4aa8' },
    create(def) { return new MosquitoGame(def); },
    drawIcon(ctx, x, y, s, t) {
      ctx.save(); ctx.translate(x + Math.sin(t * 5) * 8, y + Math.cos(t * 7) * 6); ctx.scale(s * 1.1, s * 1.1);
      WG.art.drawWings(ctx, -10, -30, t * 50);
      ctx.drawImage(WG.art.mosquitoBody(), -126, -131);
      ctx.restore();
    },
  });
})(window.WG);
