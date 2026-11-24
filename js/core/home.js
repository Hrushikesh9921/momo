/* Home menu on the wall. Kids hold a hand on a game card until the ribbon fills up. */
(function (WG) {
  let lastGreeting = 0;
  const CARD_W = 300, CARD_H = 390, PAD = 40;

  // A game card is cached as one picture (paper card, window, ribbon); only the icon animates on top.
  function cardSprite(g) {
    const U = WG.ui, art = WG.art;
    return art.sprite('card-' + g.id, CARD_W + PAD * 2, CARD_H + PAD * 2, (c) => {
      c.translate(PAD, PAD);
      art.paper(c, (cx) => art.rr(cx, 0, 0, CARD_W, CARD_H, 34), U.paper, { lift: 14 });
      // recessed window with the game's colours
      const win = (cx) => art.rr(cx, 18, 18, CARD_W - 36, CARD_H - 126, 24);
      c.save(); win(c); c.clip();
      const grd = c.createLinearGradient(0, 18, 0, CARD_H - 108);
      grd.addColorStop(0, g.tile.top); grd.addColorStop(1, g.tile.bottom);
      c.fillStyle = grd; c.fillRect(0, 0, CARD_W, CARD_H);
      art.grain(c, 0.08);
      // inner shadow = the window looks cut into the card
      c.shadowColor = 'rgba(46,35,70,0.45)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      c.lineWidth = 20; c.strokeStyle = 'rgba(46,35,70,0.6)'; art.rr(c, 8, 8, CARD_W - 16, CARD_H - 106, 30); c.stroke();
      c.restore();
      // ribbon for the name
      art.ribbon(c, CARD_W / 2, CARD_H - 54, CARD_W - 40, 66, U.sun, '#D48A12');
    });
  }

  WG.HomeScene = class {
    enter() {
      this.t = 0;
      const n = WG.games.length, gap = 46;
      const x0 = WG.W / 2 - (n * CARD_W + (n - 1) * gap) / 2, y = 300;
      this.tiles = WG.games.map((g, i) => {
        const b = new WG.DwellButton({ x: x0 + i * (CARD_W + gap), y, w: CARD_W, h: CARD_H, onSelect: () => WG.startGame(g.id) });
        b.game = g; b.phase = i * 0.9; b.lift = 0;
        return b;
      });
      const ty = 952;
      this.modeBtns = ['timed', 'free'].map((m, i) => new WG.DwellButton({ x: 1222 + i * 142, y: ty, r: 58,
        onSelect: () => { WG.settings.mode = m; WG.saveSettings(); WG.audio.voice(m === 'free' ? 'mode_free' : 'mode_timed'); } }));
      this.playerBtns = [1, 2].map((n, i) => new WG.DwellButton({ x: 1572 + i * 142, y: ty, r: 58,
        onSelect: () => { WG.settings.players = n; WG.saveSettings(); WG.audio.voice(n === 1 ? 'one_player' : 'two_players'); } }));
      // settings gear: grown-ups only (mouse click / tap / S key) so kids can't open it from the wall
      this.gear = new WG.StoneButton({ x: WG.W - 90, y: 90, r: 50, icon: 'gear', mouseOnly: true, onSelect: () => WG.openSettings() });
      this.mascot = { lookX: 0, lookY: 0 };
      WG.audio.music('home');
      if (WG.started && performance.now() - lastGreeting > 30000) { lastGreeting = performance.now(); setTimeout(() => WG.audio.voice('hello'), 400); }
    }

    update(dt) {
      this.t += dt;
      this.tiles.forEach((b) => { b.update(dt); b.lift += ((b.hot ? 1 : 0) - b.lift) * Math.min(1, dt * 10); });
      this.playerBtns.forEach((b) => b.update(dt));
      this.modeBtns.forEach((b) => b.update(dt));
      this.gear.update(dt);
      const ps = WG.input.pointers;
      let tx = 0, ty = 0.1;
      if (ps.length) {
        const p = ps.reduce((a, b) => (WG.dist(a.x, a.y, 260, 860) < WG.dist(b.x, b.y, 260, 860) ? a : b));
        const dx = p.x - 260, dy = p.y - 860, d = Math.hypot(dx, dy) || 1;
        tx = dx / d; ty = dy / d;
      }
      this.mascot.lookX += (tx - this.mascot.lookX) * Math.min(1, dt * 6);
      this.mascot.lookY += (ty - this.mascot.lookY) * Math.min(1, dt * 6);
    }

    draw(ctx) {
      const art = WG.art, U = WG.ui;
      ctx.drawImage(art.background('home'), 0, 0);

      this.drawTitle(ctx);
      for (const b of this.tiles) this.drawTile(ctx, b);

      // Momo on the hill, with a paper speech bubble
      art.drawMomo(ctx, 250, 900, 0.5, { t: this.t, lookX: this.mascot.lookX, lookY: this.mascot.lookY, wave: WG.input.pointers.length > 0 || (this.t % 6) < 1.5, happy: this.tiles.some((b) => b.progress > 0.3) });
      ctx.save();
      const bob = Math.sin(this.t * 2.2) * 4;
      ctx.translate(430, 830 + bob);
      art.paper(ctx, (c) => { art.rr(c, 0, -52, 400, 104, 52); c.moveTo(26, 30); c.lineTo(-34, 70); c.lineTo(80, 44); c.closePath(); }, U.paper, { lift: 10 });
      art.label(ctx, 'Touch a game!', 200, 2, 52, U.coral, { stroke: false, shadow: false });
      ctx.restore();

      // control tray: Game / Free play and 1 / 2 players
      art.paper(ctx, (c) => art.rr(c, 1130, 880, 724, 148, 74), 'rgba(255,253,246,0.92)', { lift: 12 });
      this.modeBtns.forEach((b, i) => this.drawToggle(ctx, b, (WG.settings.mode || 'timed') === (i ? 'free' : 'timed'), i ? 'free' : 'timed'));
      this.playerBtns.forEach((b, i) => this.drawToggle(ctx, b, WG.settings.players === i + 1, i ? 'two' : 'one'));
      ctx.fillStyle = 'rgba(46,35,70,0.15)'; ctx.fillRect(1491, 905, 3, 96);
      art.label(ctx, WG.settings.mode === 'free' ? 'Free play' : 'Game', 1293, 862, 32, U.plum, { stroke: U.paper, strokeW: 0.22, shadow: false });
      art.label(ctx, WG.settings.players > 1 ? '2 players' : '1 player', 1643, 862, 32, U.plum, { stroke: U.paper, strokeW: 0.22, shadow: false });

      this.gear.draw(ctx);

      if (WG.settings.inputMode === 'camera' && !WG.calib.H) {
        art.paper(ctx, (c) => art.rr(c, WG.W / 2 - 420, 22, 840, 50, 25), U.plum, { lift: 6, grain: false, edge: false });
        art.label(ctx, 'Grown-ups: press C on the laptop to calibrate the camera', WG.W / 2, 48, 28, U.sun, { stroke: false, shadow: false, weight: 600 });
      }
    }

    drawTitle(ctx) {
      const art = WG.art, U = WG.ui;
      const title = WG.settings.title || 'Momo Play Wall';
      ctx.save();
      ctx.font = art.font(96, 900);
      const w = Math.max(620, ctx.measureText(title).width + 180), h = 132, cy = 166;
      const swing = Math.sin(this.t * 1.1) * 0.018;
      ctx.translate(WG.W / 2, 0); ctx.rotate(swing);
      art.strings(ctx, -w / 2 + 70, -10, -w / 2 + 70, cy - h / 2 + 8);
      art.strings(ctx, w / 2 - 70, -10, w / 2 - 70, cy - h / 2 + 8);
      art.ribbon(ctx, 0, cy, w, h, U.coral, '#C8433A');
      art.label(ctx, title, 0, cy + 4, 96, U.paper, { weight: 900, stroke: '#9E2F28', strokeW: 0.1 });
      ctx.restore();
    }

    drawToggle(ctx, b, on, icon) {
      const art = WG.art, U = WG.ui;
      const s = b.hot ? 1.07 : 1;
      ctx.save(); ctx.translate(b.x, b.y - (on ? 4 : 0)); ctx.scale(s, s);
      const fill = on ? (icon === 'free' ? '#9B7BFF' : U.sun) : U.paper;
      art.paper(ctx, (c) => { c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI * 2); }, fill, { lift: on ? 10 : 3, stitch: on ? 'rgba(255,255,255,0.6)' : 'rgba(46,35,70,0.15)', stitchPath: (c) => { c.beginPath(); c.arc(0, 0, b.r - 9, 0, Math.PI * 2); } });
      const ink = on ? '#fff' : 'rgba(46,35,70,0.55)';
      if (icon === 'free') art.infinity(ctx, 0, 0, this.t, 30, ink);
      if (icon === 'timed') art.clock(ctx, 0, 0, 28, on ? '#fff' : 'rgba(46,35,70,0.12)', on ? '#C9800A' : 'rgba(46,35,70,0.55)');
      if (icon === 'one' || icon === 'two') {
        const n = icon === 'two' ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const kx = (k - (n - 1) / 2) * 36;
          ctx.fillStyle = on ? '#fff' : ink;
          ctx.beginPath(); ctx.arc(kx, -13, 12, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(kx, 20, 17, 20, 0, Math.PI, 0); ctx.fill();
        }
      }
      ctx.restore();
      if (b.progress > 0) art.ring(ctx, b.x, b.y, b.r + 14, b.progress);
    }

    drawTile(ctx, b) {
      const art = WG.art, U = WG.ui, g = b.game;
      const bob = Math.sin(this.t * 1.4 + b.phase) * 5;
      const s = 1 + b.lift * 0.04 + b.progress * 0.03;
      const cx = b.x + CARD_W / 2, cy = b.y + CARD_H / 2 + bob - b.lift * 14;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(Math.sin(this.t * 0.9 + b.phase) * 0.012); ctx.scale(s, s);
      ctx.translate(-CARD_W / 2, -CARD_H / 2);
      ctx.drawImage(cardSprite(g), -PAD, -PAD);
      // animated icon inside the window
      ctx.save(); art.rr(ctx, 18, 18, CARD_W - 36, CARD_H - 126, 24); ctx.clip();
      g.drawIcon(ctx, CARD_W / 2, 148, 0.9, this.t);
      ctx.restore();
      // the ribbon fills with coral while a hand holds the card
      const rx = 20, ry = CARD_H - 87, rw = CARD_W - 40, rh = 66;
      if (b.progress > 0) {
        ctx.save(); art.rr(ctx, rx, ry, rw, rh, 14); ctx.clip();
        ctx.fillStyle = U.coral; ctx.fillRect(rx, ry, rw * b.progress, rh);
        ctx.restore();
      }
      ctx.font = art.font(40); const fit = Math.min(40, (40 * (rw - 36)) / ctx.measureText(g.name).width);
      art.label(ctx, g.name, CARD_W / 2, ry + rh / 2 + 3, fit, U.paper, { stroke: b.progress > 0 ? '#9E2F28' : '#B06D06', strokeW: 0.14, shadow: false });
      ctx.restore();
    }
  };
})(window.WG);
