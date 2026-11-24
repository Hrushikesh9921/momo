/* RoundGame: the shared flow for every game.

   Game mode:  intro line -> Ready? Set... Go! -> play for N seconds -> results (stars / crowns) -> again / home
   Free play:  intro line -> Go! -> plays forever. Speed and crowd drift up and down on their own so it feels
               natural, with a surprise "party" every minute or so. Leave with the home button.

   A game extends RoundGame and implements:
     setup()                       create the world
     updateWorld(dt, playing)      move things; check hits only when playing is true
     drawWorld(ctx)                draw background + world
     drawScoreIcon(ctx, x, y, p)   (optional) little icon in the score pill
   Helpers for games:
     this.speedK                   live speed multiplier (difficulty × free-play pace) — multiply movement by it
     this.countFor(n)              how many objects to keep on screen right now (difficulty × free-play crowd)
     this.free                     true in free play
     this.addScore(player, points, x, y)   call when someone scores (handles combos + cheering) */
(function (WG) {
  const STEP = 0.85; // seconds per Ready / Set / Go

  WG.RoundGame = class {
    constructor(def) { this.def = def; this.showScores = true; }

    enter() {
      this.t = 0;
      this.free = WG.settings.mode === 'free';
      this.scores = [0, 0];
      this.pops = [0, 0];
      this.combo = [0, 0];
      this.lastHit = [-9, -9];
      this.time = WG.settings.roundSeconds;
      this.state = 'intro';
      this.introPhase = 'talk';
      this.stateT = 0;
      this.particles = new WG.Particles();
      this.floats = new WG.FloatTexts();
      this.twoP = WG.settings.players > 1;
      if (WG.tracker.resetPlayers) WG.tracker.resetPlayers(); // left kid starts orange, right kid blue
      // free-play flow
      this.pace = 1; this.crowd = 1; this.paceTarget = 1; this.crowdTarget = 1;
      this.flowT = WG.rand(6, 10); this.partyT = 0; this.nextParty = WG.rand(35, 60);
      this.homeBtn = new WG.StoneButton({ x: 92, y: 92, r: 54, icon: 'home', dwellMs: Math.max(1800, WG.settings.dwellMs * 1.6), onSelect: () => WG.goHome() });
      this.endButtons = [
        new WG.StoneButton({ x: WG.W / 2 - 150, y: 880, r: 78, icon: 'again', label: 'Again', onSelect: () => WG.startGame(this.def.id) }),
        new WG.StoneButton({ x: WG.W / 2 + 150, y: 880, r: 78, icon: 'home', label: 'Home', onSelect: () => WG.goHome() }),
      ];
      this.setup();
      this.totalTime = this.time;
      this.saidHurry = false;
      WG.audio.music(this.def.music);
      const key = 'intro_' + this.def.id;
      WG.audio.voice(this.twoP && !this.free && WG.VOICE_LINES && WG.VOICE_LINES[key + '2'] ? key + '2' : key);
      this.lastBeep = -1;
    }

    exit() { WG.audio.stopBuzz(); }

    get speedK() { return WG.speedMul() * this.pace; }
    countFor(base) { return Math.max(1, Math.round(base * WG.densityMul() * this.crowd)); }

    updateFlow(dt) {
      if (!this.free || this.state !== 'play') { this.pace = 1; this.crowd = 1; return; }
      this.flowT -= dt;
      if (this.flowT <= 0) { this.paceTarget = WG.rand(0.6, 1.35); this.crowdTarget = WG.rand(0.55, 1.4); this.flowT = WG.rand(5, 10); }
      this.nextParty -= dt;
      if (this.nextParty <= 0 && this.def.partyText) {
        this.partyT = 8; this.nextParty = WG.rand(50, 90);
        WG.audio.voice('party_' + this.def.id);
        WG.audio.sfx('fanfare');
      }
      let pt = this.paceTarget, ct = this.crowdTarget;
      if (this.partyT > 0) { this.partyT -= dt; pt = 1.15; ct = 1.9; }
      this.pace += (pt - this.pace) * Math.min(1, dt * 0.4);
      this.crowd += (ct - this.crowd) * Math.min(1, dt * 0.6);
    }

    update(dt) {
      this.t += dt; this.stateT += dt;
      this.homeBtn.update(dt);
      this.pops = this.pops.map((p) => Math.max(0, p - dt * 3));
      this.updateFlow(dt);
      if (this.state === 'intro') {
        if (this.introPhase === 'talk') {
          // let Momo finish the intro line (max ~4.5 s), then count in
          if ((this.stateT > 1.2 && !WG.audio.speaking()) || this.stateT > 4.5) {
            this.introPhase = 'count'; this.stateT = 0; this.lastBeep = -1;
            if (this.free) { WG.audio.voice('go'); WG.audio.sfx('beep', { high: true }); this.introPhase = 'go'; }
          }
        } else {
          const steps = this.free ? 1 : 3;
          const step = this.free ? 2 : Math.floor(this.stateT / STEP);
          if (!this.free && step !== this.lastBeep && step < 3) {
            this.lastBeep = step;
            WG.audio.sfx('beep', { high: step === 2 });
            WG.audio.voice(['ready', 'set', 'go'][step]);
          }
          if (this.stateT >= STEP * steps) { this.state = 'play'; this.stateT = 0; }
        }
        this.updateWorld(dt, false);
      } else if (this.state === 'play') {
        if (!this.free) {
          this.time -= dt;
          if (this.time <= 5 && Math.ceil(this.time) !== Math.ceil(this.time + dt)) WG.audio.sfx('tick');
          if (!this.saidHurry && this.totalTime >= 25 && this.time <= 10.5) { this.saidHurry = true; WG.audio.voice('hurry', { interrupt: false }); }
          if (this.time <= 0) { this.updateWorld(dt, true); this.finish(); }
        }
        if (this.state === 'play') this.updateWorld(dt, true);
      } else if (this.state === 'end') {
        this.updateWorld(dt, false);
        this.endButtons.forEach((b) => b.update(dt));
        if (this.stateT < 3 && Math.random() < dt * 25) this.confetti();
        // star "ding"s pop in one by one
        if (this.starsEarned) for (let i = 0; i < 3; i++) {
          const at = 0.7 + i * 0.45;
          if (!this.starShown[i] && this.stateT >= at) { this.starShown[i] = true; if (i < this.starsEarned) { WG.audio.sfx('gold'); this.starBurst(i); } }
        }
        if (this.stateT > 40) WG.goHome();
      }
      this.particles.update(dt);
      this.floats.update(dt);
    }

    finish() {
      this.state = 'end'; this.stateT = 0; this.time = 0;
      WG.audio.sfx('fanfare');
      WG.audio.music(null);
      setTimeout(() => this.state === 'end' && WG.audio.music('home'), 2200);
      for (let i = 0; i < 30; i++) this.confetti();
      const [a, b] = this.scores;
      // Angry-Birds style stars for one player: 1 for playing, 2-3 for a good catch rate
      this.starShown = [false, false, false];
      if (!this.twoP && !this.def.noScore) {
        const rate = (a * 60) / this.totalTime, k = WG.densityMul();
        this.starsEarned = 1 + (rate >= 10 * k ? 1 : 0) + (rate >= 18 * k ? 1 : 0);
      } else this.starsEarned = 0;
      let key;
      if (this.def.noScore) key = 'paint_end';
      else if (!this.twoP) key = 'end_one';
      else if (a === b) key = 'tie';
      else if (WG.settings.everyoneWins) key = 'end_both';
      else key = a > b ? 'win_orange' : 'win_blue';
      setTimeout(() => this.state === 'end' && WG.audio.voice(key), 500);
    }

    confetti() {
      this.particles.add({ x: WG.rand(0, WG.W), y: -20, vx: WG.rand(-80, 80), vy: WG.rand(150, 380), g: 120, drag: 0.995, life: 4,
        size: WG.rand(14, 26), shape: WG.pick(['rect', 'star', 'circle']), color: WG.pick(['#ff8a1f', '#2f9bff', '#ffd34d', '#ff6fae', '#5be196', '#a073ff']),
        rot: Math.random() * 6, vr: WG.rand(-6, 6), shrink: false });
    }

    starBurst(i) {
      const x = WG.W / 2 + (i - 1) * 190, y = 690;
      this.particles.burst(x, y, 14, { colors: ['#ffe066', '#fff4b0', '#ffffff'], shape: 'star', minSize: 10, maxSize: 22 });
    }

    // Candy-Crush style: quick catches in a row build a combo and Momo cheers
    addScore(player, n, x, y) {
      this.scores[player] += n;
      this.pops[player] = 1;
      const col = this.twoP ? WG.PLAYER_COLORS[player].light : '#fff2a8';
      this.floats.add(x, y - 40, (n > 0 ? '+' : '') + n, col, 70);
      this.combo[player] = this.t - this.lastHit[player] < 1.4 ? this.combo[player] + 1 : 1;
      this.lastHit[player] = this.t;
      const c = this.combo[player];
      if (c === 3 || c === 6 || c === 10 || (c > 10 && c % 5 === 0)) {
        const a = WG.audio.voice('praise');
        const word = (a && a.lineText) || WG.pick(['Sweet!', 'Awesome!', 'Amazing!', 'Super!']);
        this.floats.add(WG.clamp(x, 520, WG.W - 520), WG.clamp(y - 150, 260, WG.H - 120), word, '#ffd34d', 110);
        this.particles.burst(x, y, 16, { colors: ['#ffe066', '#ff8fbf', '#8fd0ff', '#ffffff'], shape: 'star', minSize: 14, maxSize: 30, minSpeed: 200, maxSpeed: 600 });
        WG.audio.sfx('sparkle');
      } else if (Math.random() < 0.18) WG.audio.voice('yay', { casual: true });
    }

    draw(ctx) {
      this.drawWorld(ctx);
      this.particles.draw(ctx);
      this.floats.draw(ctx);
      if (this.state !== 'end') this.drawHud(ctx);
      if (this.partyT > 0) this.drawParty(ctx);
      if (this.state === 'intro') this.drawCountdown(ctx);
      if (this.state === 'end') this.drawResults(ctx);
      else this.homeBtn.draw(ctx);
    }

    // ---------- HUD ----------
    drawHud(ctx) {
      const art = WG.art, U = WG.ui, cx = WG.W / 2, cy = 92, r = 62;
      // timer: a paper medallion with a coral slice that shrinks as time runs out
      const disc = (c) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); };
      if (this.free) {
        art.paper(ctx, disc, '#9B7BFF', { lift: 10, stitch: 'rgba(255,255,255,0.55)', stitchPath: (c) => { c.beginPath(); c.arc(cx, cy, r - 10, 0, Math.PI * 2); } });
        art.infinity(ctx, cx, cy, this.t, 30, '#fff');
      } else {
        const warn = this.state === 'play' && this.time <= 5, frac = WG.clamp(this.time / this.totalTime, 0, 1);
        art.paper(ctx, disc, U.paper, { lift: 10 });
        ctx.save();
        ctx.fillStyle = warn ? U.coral : U.sky;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.closePath(); ctx.fill();
        ctx.restore();
        const pulse = warn ? 1 + Math.abs(Math.sin(this.t * 6)) * 0.12 : 1;
        art.label(ctx, String(Math.max(0, Math.ceil(this.time))), cx, cy + 3, 58 * pulse, '#fff', { stroke: U.plum, strokeW: 0.16 });
      }

      if (!this.showScores) return;
      const n = this.twoP ? 2 : 1;
      for (let p = 0; p < n; p++) {
        const w = 290, h = 92, onRight = this.twoP && (p === 1) !== WG.settings.mirrorPlayers;
        const x = onRight ? WG.W - w - 50 : 176, y = 44;
        const col = this.twoP ? WG.PLAYER_COLORS[p] : { light: '#FFD27A', main: U.sun, dark: '#C9800A' };
        const s = 1 + this.pops[p] * 0.18;
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.rotate(this.pops[p] * 0.05 * (p ? -1 : 1)); ctx.translate(-(x + w / 2), -(y + h / 2));
        art.pill(ctx, x, y, w, h, col);
        art.paper(ctx, (c) => { c.beginPath(); c.arc(x + 52, y + h / 2, 34, 0, Math.PI * 2); }, U.paper, { lift: 3 });
        if (this.drawScoreIcon) this.drawScoreIcon(ctx, x + 52, y + h / 2, p);
        art.label(ctx, String(this.scores[p]), x + w - 82, y + h / 2 + 3, 64, '#fff', { stroke: col.dark, strokeW: 0.14 });
        ctx.restore();
      }
    }

    drawParty(ctx) {
      const k = Math.min(1, (8 - this.partyT) * 3), fade = Math.min(1, this.partyT);
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(WG.W / 2, 230); ctx.rotate(Math.sin(this.t * 5) * 0.035); ctx.scale(WG.easeOutBack(k), WG.easeOutBack(k));
      WG.art.ribbon(ctx, 0, 0, 560, 100, WG.ui.coral, '#C8433A');
      WG.art.label(ctx, this.def.partyText, 0, 4, 66, WG.ui.paper, { stroke: '#9E2F28', strokeW: 0.12 });
      ctx.restore();
    }

    drawCountdown(ctx) {
      const art = WG.art, U = WG.ui;
      ctx.save();
      if (this.introPhase === 'talk') {
        ctx.fillStyle = 'rgba(46,35,70,0.28)'; ctx.fillRect(0, 0, WG.W, WG.H);
        const s = WG.easeOutBack(Math.min(1, this.stateT * 2.5));
        ctx.save(); ctx.translate(WG.W / 2, WG.H / 2 - 60); ctx.scale(s, s); ctx.rotate(-0.02);
        ctx.font = art.font(110, 900); const w = ctx.measureText(this.def.name).width + 200;
        art.ribbon(ctx, 0, 0, w, 150, U.sun, '#D48A12');
        art.label(ctx, this.def.name, 0, 6, 110, U.paper, { weight: 900, stroke: '#B06D06', strokeW: 0.1 });
        ctx.restore();
        if (this.free) art.label(ctx, 'Free play, no timer', WG.W / 2, WG.H / 2 + 90, 54 * s, '#fff', { strokeW: 0.16 });
      } else {
        const step = this.free ? 2 : Math.min(2, Math.floor(this.stateT / STEP));
        const local = this.free ? this.stateT / STEP : (this.stateT % STEP) / STEP;
        const s = WG.easeOutBack(Math.min(1, local * 3));
        ctx.fillStyle = `rgba(46,35,70,${0.22 * (1 - local)})`; ctx.fillRect(0, 0, WG.W, WG.H);
        ctx.save(); ctx.translate(WG.W / 2, WG.H / 2); ctx.scale(s, s); ctx.rotate((step - 1) * 0.05);
        if (step === 2) art.paper(ctx, (c) => art.star(c, 0, 0, 340, 220, 14, this.t), U.coral, { lift: 14 });
        art.label(ctx, ['Ready?', 'Set…', 'GO!'][step], 0, 8, 210, step === 2 ? U.sun : '#fff', { weight: 900, strokeW: 0.1 });
        ctx.restore();
      }
      const help = (this.twoP && !this.free && this.def.help2) || this.def.help;
      if (help && this.introPhase === 'talk') art.label(ctx, help, WG.W / 2, WG.H / 2 + 200, 56, '#fff', { strokeW: 0.16 });
      ctx.restore();
    }

    drawResults(ctx) {
      const art = WG.art, U = WG.ui, cx = WG.W / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(46,35,70,0.35)'; ctx.fillRect(0, 0, WG.W, WG.H);
      // the sheet drops in on two strings and settles with a little swing
      const drop = WG.easeOutBack(Math.min(1, this.stateT * 1.8));
      const swing = Math.sin(this.stateT * 3) * 0.03 * Math.max(0, 1 - this.stateT / 3) + Math.sin(this.t) * 0.006;
      ctx.translate(cx, -700 + drop * 700); ctx.rotate(swing); ctx.translate(-cx, 0);
      art.strings(ctx, cx - 420, -20, cx - 420, 168);
      art.strings(ctx, cx + 420, -20, cx + 420, 168);
      art.panel(ctx, cx - 540, 150, 1080, 600, 40);
      const [a, b] = this.scores;
      if (this.def.noScore) {
        art.label(ctx, 'Beautiful!', cx, 290, 130, U.coral, { stroke: U.plum, strokeW: 0.08 });
        art.drawMomo(ctx, cx, 560, 0.52, { t: this.t, lookX: 0, lookY: 0.2, happy: true, wave: true });
      } else if (!this.twoP) {
        art.label(ctx, 'Wow!', cx, 255, 120, U.coral, { stroke: U.plum, strokeW: 0.08 });
        art.badge(ctx, cx, 455, 118, a);
        for (let i = 0; i < 3; i++) {
          const sx = cx + (i - 1) * 180, at = 0.7 + i * 0.45, earned = i < this.starsEarned;
          const k = earned ? WG.easeOutBack(WG.clamp((this.stateT - at) * 4, 0, 1)) : 1;
          ctx.save(); ctx.translate(sx, 660 - (i === 1 ? 14 : 0)); ctx.scale(k, k); ctx.rotate((i - 1) * 0.18);
          if (earned) art.paper(ctx, (c) => art.star(c, 0, 0, 64, 30, 5), U.sun, { lift: 8, stitch: 'rgba(255,255,255,0.6)', stitchPath: (c) => art.star(c, 0, 0, 46, 22, 5) });
          else { art.star(ctx, 0, 0, 64, 30, 5); ctx.fillStyle = 'rgba(46,35,70,0.1)'; ctx.fill(); }
          ctx.restore();
        }
      } else {
        const tie = a === b, celebrateAll = WG.settings.everyoneWins || tie;
        art.label(ctx, celebrateAll ? 'Great job!' : (a > b ? 'Orange wins!' : 'Blue wins!'), cx, 250, 104, U.coral, { stroke: U.plum, strokeW: 0.08 });
        for (let p = 0; p < 2; p++) {
          const side = (p === 1) !== WG.settings.mirrorPlayers ? 1 : -1;
          const x = cx + side * 240, col = WG.PLAYER_COLORS[p];
          art.badge(ctx, x, 505, 115, this.scores[p], { light: col.light, main: col.main, dark: col.dark });
          const winner = celebrateAll || this.scores[p] === Math.max(a, b);
          if (winner) drawCrown(ctx, x, 365 + Math.sin(this.t * 3 + p) * 6, celebrateAll ? 0.75 : 0.95);
          art.label(ctx, col.name, x, 675, 48, col.main, { stroke: U.paper, strokeW: 0.2, shadow: false });
        }
      }
      ctx.restore();
      if (this.stateT > 0.8) this.endButtons.forEach((b) => b.draw(ctx));
    }
  };

  function drawCrown(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, -60, 0, 30); g.addColorStop(0, '#fff1a0'); g.addColorStop(1, '#f2a516');
    const crown = (c) => { c.beginPath(); c.moveTo(-80, 30); c.lineTo(-90, -40); c.lineTo(-40, 0); c.lineTo(0, -60); c.lineTo(40, 0); c.lineTo(90, -40); c.lineTo(80, 30); c.closePath(); };
    WG.art.paper(ctx, crown, g, { lift: 8 });
    ['#ff5c8a', '#4fc3ff', '#5be196'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-45 + i * 45, 12, 11, 0, 7); ctx.fill(); });
    ctx.restore();
  }
})(window.WG);
