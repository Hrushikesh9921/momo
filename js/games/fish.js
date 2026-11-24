/* Fish Frenzy — touch the fish to catch them. 2 players: orange fish for the left kid, blue fish for the right kid. */
(function (WG) {
  const PLAYER_FISH = ['orange', 'blue'];
  const SOLO_FISH = ['orange', 'blue', 'pink', 'green', 'purple'];

  class FishGame extends WG.RoundGame {
    setup() {
      this.fish = [];
      this.baseCount = Math.round((this.twoP ? 10 : 8) / Math.max(0.85, WG.sizeMul()));
      this.spawnT = 0;
      const n = this.countFor(this.baseCount);
      for (let i = 0; i < n; i++) this.spawn(this.nextColor(), true);
      this.goldTimer = WG.rand(8, 14);
      this.weeds = Array.from({ length: 14 }, (_, i) => ({ x: 60 + i * 140 + WG.rand(-40, 40), h: WG.rand(140, 300), ph: Math.random() * 6, c: WG.pick(['#3fbf6a', '#2fa35a', '#6ad46b', '#2f9e8a']) }));
      this.bgBubbles = Array.from({ length: 26 }, () => ({ x: WG.rand(0, WG.W), y: WG.rand(0, WG.H), r: WG.rand(4, 14), s: WG.rand(40, 110) }));
    }

    // Free play: a happy mix of all colours (any fish counts for anyone).
    // Game mode with 2 players: keep orange and blue balanced.
    nextColor() {
      if (this.free || !this.twoP) return WG.pick(SOLO_FISH);
      const o = this.fish.filter((f) => !f.caught && f.color === 'orange').length;
      const b = this.fish.filter((f) => !f.caught && f.color === 'blue').length;
      return o === b ? WG.pick(PLAYER_FISH) : o < b ? 'orange' : 'blue';
    }

    spawn(color, anywhere = false) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const s = WG.rand(0.95, 1.15) * WG.sizeMul() * (color === 'gold' ? 0.85 : 1);
      this.fish.push({
        color, dir, s, r: 82 * s,
        x: anywhere ? WG.rand(150, WG.W - 150) : dir > 0 ? -170 : WG.W + 170,
        y: WG.rand(260, 880), baseY: 0, ph: Math.random() * 6,
        speed: WG.rand(85, 150) * (color === 'gold' ? 1.5 : 1),
        caught: false, caughtT: 0, nope: 0, cool: 0, turnIn: WG.rand(4, 9),
      });
      const f = this.fish[this.fish.length - 1]; f.baseY = f.y;
    }

    scoreSpot(player) {
      const onRight = this.twoP && (player === 1) !== WG.settings.mirrorPlayers;
      return onRight ? [WG.W - 200, 84] : [330, 84];
    }

    updateWorld(dt, playing) {
      const S = WG.settings;
      for (const b of this.bgBubbles) { b.y -= b.s * dt; b.x += Math.sin(this.t * 2 + b.r) * 10 * dt; if (b.y < -20) { b.y = WG.H + 20; b.x = WG.rand(0, WG.W); } }

      if (playing) {
        this.goldTimer -= dt;
        if (this.goldTimer <= 0 && !this.fish.some((f) => f.color === 'gold' && !f.caught)) { this.spawn('gold'); this.goldTimer = WG.rand(10, 16); }
      }

      for (const f of this.fish) {
        if (f.caught) {
          f.caughtT += dt;
          continue;
        }
        f.cool = Math.max(0, f.cool - dt); f.nope = Math.max(0, f.nope - dt);
        f.turnIn -= dt;
        if (f.turnIn <= 0 && f.x > 200 && f.x < WG.W - 200) { f.dir *= -1; f.turnIn = WG.rand(5, 10); }
        f.x += f.dir * f.speed * this.speedK * dt;
        f.y = f.baseY + Math.sin(this.t * 1.3 + f.ph) * 45;
        f.baseY += Math.sin(this.t * 0.3 + f.ph * 3) * 12 * dt;
        f.baseY = WG.clamp(f.baseY, 260, 880);
        if ((f.dir > 0 && f.x > WG.W + 200) || (f.dir < 0 && f.x < -200)) { f.dead = true; continue; }

        if (!playing || f.cool > 0) continue;
        const hits = WG.input.touchesCircle(f.x, f.y, f.r);
        if (!hits.length) continue;
        const p = hits[0].player;
        if (this.twoP && !this.free && S.colourRule && f.color !== 'gold' && f.color !== PLAYER_FISH[p]) {
          f.nope = 0.5; f.cool = 0.7; f.dir = hits[0].x < f.x ? 1 : -1; f.speed *= 1.15;
          WG.audio.sfx('nope');
          continue;
        }
        this.catchFish(f, p);
      }
      // remove caught / gone fish, then top up towards the current crowd size
      this.fish = this.fish.filter((f) => !(f.dead || (f.caught && f.caughtT > 0.9)));
      this.spawnT -= dt;
      const swimming = this.fish.filter((f) => !f.caught && f.color !== 'gold').length;
      if (swimming < this.countFor(this.baseCount) && this.spawnT <= 0) {
        this.spawn(this.nextColor());
        this.spawnT = WG.rand(0.15, 0.7) / this.crowd;
      }
    }

    catchFish(f, player) {
      f.caught = true; f.caughtT = 0; f.player = player; f.fromX = f.x; f.fromY = f.y;
      const gold = f.color === 'gold';
      this.addScore(player, gold ? 3 : 1, f.x, f.y);
      WG.audio.sfx('splash'); WG.audio.sfx(gold ? 'gold' : 'coin');
      this.particles.burst(f.x, f.y, 14, { colors: ['rgba(255,255,255,0.9)', '#bdf0ff'], minSize: 6, maxSize: 16, minSpeed: 120, maxSpeed: 380 });
      this.particles.burst(f.x, f.y, gold ? 14 : 6, { colors: gold ? ['#ffe066', '#fff'] : ['#ffe066'], shape: 'star', minSize: 12, maxSize: 24 });
      this.particles.add({ x: f.x, y: f.y, shape: 'ring', size: 60, life: 0.6, color: '#ffffff' });
    }

    drawWorld(ctx) {
      const art = WG.art;
      ctx.drawImage(art.background('sea'), 0, 0);
      // light rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = 200 + i * 330 + Math.sin(this.t * 0.4 + i) * 60, a = 0.05 + 0.04 * Math.sin(this.t * 0.7 + i * 2);
        const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, `rgba(255,255,230,${a})`); g.addColorStop(1, 'rgba(255,255,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 60, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 260, 900); ctx.lineTo(x + 40, 900); ctx.fill();
      }
      ctx.restore();
      // background bubbles
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (const b of this.bgBubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke(); }
      // seaweed
      ctx.lineCap = 'round';
      for (const w of this.weeds) {
        ctx.strokeStyle = w.c; ctx.lineWidth = 22;
        const sway = Math.sin(this.t * 1.2 + w.ph) * 40;
        ctx.beginPath(); ctx.moveTo(w.x, 1000); ctx.bezierCurveTo(w.x + sway * 0.4, 1000 - w.h * 0.4, w.x - sway * 0.6, 1000 - w.h * 0.7, w.x + sway, 1000 - w.h); ctx.stroke();
      }
      // fish
      for (const f of this.fish) this.drawFish(ctx, f);
    }

    drawFish(ctx, f) {
      const spr = WG.art.fishSprite(f.color);
      ctx.save();
      if (f.caught) {
        const k = Math.min(1, f.caughtT / 0.8), e = WG.easeInOut(k);
        const [tx, ty] = this.scoreSpot(f.player);
        const x = WG.lerp(f.fromX, tx, e), y = WG.lerp(f.fromY, ty, e) - Math.sin(k * Math.PI) * 180;
        const s = f.s * (1 + Math.sin(k * Math.PI) * 0.3) * (1 - k * 0.7);
        ctx.translate(x, y); ctx.rotate(k * Math.PI * 4); ctx.scale(s, s);
        ctx.globalAlpha = 1 - Math.max(0, k - 0.85) / 0.15;
      } else {
        const wag = Math.sin(this.t * 9 + f.ph);
        const tilt = Math.cos(this.t * 1.3 + f.ph) * 0.15 * f.dir + (f.nope ? Math.sin(f.nope * 40) * 0.25 : 0);
        ctx.translate(f.x, f.y); ctx.rotate(tilt); ctx.scale(f.dir * f.s * (1 + wag * 0.025), f.s * (1 - wag * 0.02));
        if (f.color === 'gold') { // sparkle halo
          const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 150); g.addColorStop(0, 'rgba(255,240,150,0.6)'); g.addColorStop(1, 'rgba(255,240,150,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7); ctx.fill();
        }
      }
      ctx.drawImage(spr, -156, -116);
      ctx.restore();
    }

    drawScoreIcon(ctx, x, y, p) {
      const spr = WG.art.fishSprite(this.twoP ? PLAYER_FISH[p] : 'orange');
      ctx.save(); ctx.translate(x, y); ctx.scale(0.22, 0.22); ctx.drawImage(spr, -156, -116); ctx.restore();
    }
  }

  WG.registerGame({
    id: 'fish', name: 'Fish Frenzy', music: 'sea', partyText: 'Fish party!',
    intro: 'Catch the fish!', intro2: 'Catch the fish! Orange is for you, and blue is for you!',
    help: 'Touch the fish!', help2: 'Touch the fish!',
    tile: { top: '#7fe0f0', bottom: '#1b78c4' },
    create(def) { return new FishGame(def); },
    drawIcon(ctx, x, y, s, t) {
      ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 6); ctx.scale(s * 0.95, s * 0.95);
      ctx.drawImage(WG.art.fishSprite('orange'), -166, -126);
      ctx.save(); ctx.translate(70, 70); ctx.scale(-0.55, 0.55); ctx.drawImage(WG.art.fishSprite('blue'), -156, -116); ctx.restore();
      ctx.restore();
    },
  });
})(window.WG);
