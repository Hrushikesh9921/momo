/* Touch tester: big circles that light up when the wall "feels" a hand. Use it after calibrating. */
(function (WG) {
  WG.TesterScene = class {
    enter() {
      this.t = 0;
      this.targets = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) this.targets.push({ x: 360 + c * 400, y: 400 + r * 380, lit: 0, player: 0 });
      this.home = new WG.StoneButton({ x: 92, y: 92, r: 54, icon: 'home', onSelect: () => WG.goHome() });
      WG.audio.music(null);
    }
    update(dt) {
      this.t += dt;
      this.home.update(dt);
      for (const tg of this.targets) {
        const hits = WG.input.touchesCircle(tg.x, tg.y, 110);
        if (hits.length) { if (tg.lit < 0.5) WG.audio.sfx('pop', { note: 60 + this.targets.indexOf(tg) * 2 }); tg.lit = 1; tg.player = hits[0].player; }
        else tg.lit = Math.max(0, tg.lit - dt * 1.5);
      }
    }
    draw(ctx) {
      const art = WG.art;
      ctx.drawImage(art.background('home'), 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, WG.W, WG.H);
      art.label(ctx, 'Touch test', WG.W / 2, 90, 90, '#fff');
      art.label(ctx, 'Touch the circles — they light up when the wall feels your hand', WG.W / 2, 180, 40, '#fff', { strokeW: 0.12 });
      for (const tg of this.targets) {
        const col = WG.PLAYER_COLORS[tg.player];
        ctx.save();
        ctx.fillStyle = tg.lit > 0 ? col.main : 'rgba(255,255,255,0.65)';
        ctx.globalAlpha = 0.5 + tg.lit * 0.5;
        ctx.beginPath(); ctx.arc(tg.x, tg.y, 110 + tg.lit * 12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.stroke();
        ctx.restore();
        if (tg.lit > 0.2) { ctx.fillStyle = '#fff'; art.star(ctx, tg.x, tg.y, 60, 26, 5, this.t); ctx.fill(); }
      }
      const tr = WG.tracker;
      const info = WG.settings.inputMode !== 'camera' ? 'Mouse mode (camera off)'
        : !WG.calib.H ? 'Not calibrated — press C'
        : `Camera ${tr.ready ? tr.fps + ' fps' : 'loading…'} · kids seen: ${tr.poses.length} · hands: ${tr.hands.length}`;
      art.label(ctx, info, WG.W / 2, WG.H - 50, 36, '#fff', { strokeW: 0.14 });
      this.home.draw(ctx);
      // always show hands here, even if hand circles are switched off for games
      for (const p of WG.input.pointers) if (p.src === 'cam') art.handCursor(ctx, p.x, p.y, p.player, this.t, Math.max(30, WG.settings.reach * 0.6));
    }
  };
})(window.WG);
