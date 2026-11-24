/* Momo design system — "paper diorama".
   Every scene is a layered, hand-cut paper world; UI pieces are paper tags, medallions and stickers
   laid on top of it. Soft paper shadows + a little grain give depth without looking like flat clip-art.

   Tokens live in WG.ui. Components: label, stoneButton, ring, pill (tag), badge (medallion),
   panel (paper sheet with washi tape), ribbon, sticker(), handCursor. */
(function (WG) {
  const art = WG.art;

  WG.ui = {
    sky: '#8ED1E6',
    leaf: '#4DB37A',
    sun: '#FFB627',
    coral: '#FF6B5B',
    plum: '#2E2346',
    paper: '#FFFDF6',
    paperShade: '#EDE3D1',
    shadow: 'rgba(46,35,70,0.30)',
  };
  const U = WG.ui;

  const DISPLAY = '"Grandstander", "Baloo 2", "Trebuchet MS", sans-serif';
  art.font = (size, weight = 800) => `${weight} ${Math.round(size)}px ${DISPLAY}`;

  // ---------- paper grain ----------
  const grainCanvas = (() => {
    const c = art.canvas(220, 220), x = c.getContext('2d'), d = x.createImageData(220, 220);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return c;
  })();
  const grainPatterns = new WeakMap();
  art.grain = function (ctx, alpha = 0.07) {
    let p = grainPatterns.get(ctx);
    if (!p) { p = ctx.createPattern(grainCanvas, 'repeat'); grainPatterns.set(ctx, p); }
    ctx.save();
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = p; ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.restore();
  };

  // A paper shape: soft drop shadow, fill, grain, light top edge.
  // path(ctx) must build the path (beginPath ... closePath).
  art.paper = function (ctx, path, fill, o = {}) {
    const lift = o.lift == null ? 8 : o.lift;
    ctx.save();
    if (lift > 0) {
      ctx.shadowColor = o.shadowColor || U.shadow; ctx.shadowBlur = lift * 2.2; ctx.shadowOffsetY = lift * 0.75;
    }
    path(ctx); ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    if (o.grain !== false) { ctx.save(); path(ctx); ctx.clip(); art.grain(ctx, o.grainAlpha || 0.08); ctx.restore(); }
    if (o.edge !== false) {
      ctx.save(); path(ctx); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 4; ctx.translate(0, 2); path(ctx); ctx.stroke();
      ctx.restore();
    }
    if (o.stitch) {
      ctx.save(); ctx.strokeStyle = o.stitch; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineCap = 'round';
      o.stitchPath ? o.stitchPath(ctx) : path(ctx); ctx.stroke(); ctx.restore();
    }
  };

  const rrPath = (x, y, w, h, r) => (c) => art.rr(c, x, y, w, h, r);
  const circlePath = (x, y, r) => (c) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); };

  // ---------- type: chunky "sticker" text ----------
  art.label = function (ctx, text, x, y, size, fill = '#fff', opts = {}) {
    ctx.save();
    ctx.font = art.font(size, opts.weight || 800);
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const stroke = opts.stroke === undefined ? U.plum : opts.stroke;
    if (opts.shadow !== false) {
      ctx.fillStyle = 'rgba(46,35,70,0.28)';
      if (stroke) { ctx.strokeStyle = 'rgba(46,35,70,0.28)'; ctx.lineWidth = size * (opts.strokeW || 0.14); ctx.strokeText(text, x, y + size * 0.07); }
      ctx.fillText(text, x, y + size * 0.07);
    }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = size * (opts.strokeW || 0.14); ctx.strokeText(text, x, y); }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  // ---------- sticker: white die-cut border + soft shadow around any sprite ----------
  art.sticker = function (src, border = 8, pad = 16) {
    const w = src.width + pad * 2, h = src.height + pad * 2;
    const sil = art.canvas(w, h), s = sil.getContext('2d');
    s.drawImage(src, pad, pad); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, w, h);
    const dil = art.canvas(w, h), d = dil.getContext('2d');
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; d.drawImage(sil, Math.cos(a) * border, Math.sin(a) * border); }
    const out = art.canvas(w, h), o = out.getContext('2d');
    o.save(); o.shadowColor = 'rgba(46,35,70,0.35)'; o.shadowBlur = 14; o.shadowOffsetY = 7; o.drawImage(dil, 0, 0); o.restore();
    o.drawImage(src, pad, pad);
    return out;
  };

  // ---------- round paper button (home / again / gear / clear) ----------
  art.stoneButton = function (ctx, x, y, r, icon, progress = 0) {
    ctx.save();
    art.paper(ctx, circlePath(x, y, r), U.paper, { lift: 10, stitch: 'rgba(46,35,70,0.18)', stitchPath: circlePath(x, y, r - 9) });
    ctx.strokeStyle = U.plum; ctx.fillStyle = U.plum; ctx.lineWidth = r * 0.15; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (icon === 'back') { ctx.beginPath(); ctx.moveTo(x + r * 0.12, y - r * 0.36); ctx.lineTo(x - r * 0.22, y); ctx.lineTo(x + r * 0.12, y + r * 0.36); ctx.stroke(); }
    if (icon === 'home') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.02); ctx.lineTo(x, y - r * 0.4); ctx.lineTo(x + r * 0.4, y - r * 0.02); ctx.stroke();
      ctx.fillStyle = U.coral; art.rr(ctx, x - r * 0.27, y - r * 0.08, r * 0.54, r * 0.44, r * 0.08); ctx.fill();
      ctx.fillStyle = U.paper; art.rr(ctx, x - r * 0.08, y + r * 0.1, r * 0.16, r * 0.26, r * 0.05); ctx.fill();
    }
    if (icon === 'gear') {
      ctx.fillStyle = U.plum;
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate((i / 8) * Math.PI * 2); art.rr(ctx, -r * 0.1, -r * 0.52, r * 0.2, r * 0.24, r * 0.05); ctx.fill(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = U.sun; ctx.beginPath(); ctx.arc(x, y, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    if (icon === 'trash') {
      ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.moveTo(x - r * 0.38, y - r * 0.28); ctx.lineTo(x + r * 0.38, y - r * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.12, y - r * 0.4); ctx.lineTo(x + r * 0.12, y - r * 0.4); ctx.stroke();
      ctx.fillStyle = U.coral; ctx.beginPath(); ctx.moveTo(x - r * 0.28, y - r * 0.16); ctx.lineTo(x - r * 0.2, y + r * 0.42); ctx.lineTo(x + r * 0.2, y + r * 0.42); ctx.lineTo(x + r * 0.28, y - r * 0.16); ctx.closePath(); ctx.fill();
    }
    if (icon === 'again') {
      ctx.lineWidth = r * 0.15; ctx.strokeStyle = U.plum;
      ctx.beginPath(); ctx.arc(x, y, r * 0.36, -Math.PI * 0.3, Math.PI * 1.45); ctx.stroke();
      const ax = x + Math.cos(-Math.PI * 0.3) * r * 0.36, ay = y + Math.sin(-Math.PI * 0.3) * r * 0.36;
      ctx.fillStyle = U.plum; ctx.beginPath(); ctx.moveTo(ax + r * 0.22, ay - r * 0.1); ctx.lineTo(ax - r * 0.02, ay + r * 0.26); ctx.lineTo(ax - r * 0.24, ay - r * 0.06); ctx.closePath(); ctx.fill();
    }
    if (progress > 0) art.ring(ctx, x, y, r + 16, progress);
    ctx.restore();
  };

  // "Hold to choose" progress: a coral ribbon running round a paper track
  art.ring = function (ctx, x, y, r, t, color = U.coral, width = 14) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,253,246,0.85)'; ctx.lineWidth = width + 8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * WG.clamp(t, 0, 1)); ctx.stroke();
    ctx.restore();
  };

  // ---------- paper tag (score counter etc.) ----------
  // Two sheets: a darker one underneath gives the tag its thickness; a stitched line runs inside.
  art.pill = function (ctx, x, y, w, h, colors) {
    const c = colors || { light: '#FFD27A', main: U.sun, dark: '#C9800A' };
    ctx.save();
    art.paper(ctx, rrPath(x, y + 7, w, h, h / 2), c.dark, { lift: 9, edge: false });
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c.light); g.addColorStop(0.6, c.main);
    art.paper(ctx, rrPath(x, y, w, h, h / 2), g, { lift: 0, stitch: 'rgba(255,255,255,0.55)', stitchPath: rrPath(x + 8, y + 8, w - 16, h - 16, (h - 16) / 2) });
    ctx.restore();
  };

  // ---------- medallion: scalloped paper rosette with a number ----------
  art.badge = function (ctx, x, y, r, text, colors) {
    const c = colors || { light: '#FFE08A', main: U.sun, dark: '#C9800A' };
    ctx.save();
    const scallop = (cx) => { cx.beginPath(); const n = 18; for (let i = 0; i <= n * 8; i++) { const a = (i / (n * 8)) * Math.PI * 2, rr = r * (1 + 0.06 * Math.cos(a * n)); i ? cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : cx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); };
    art.paper(ctx, scallop, c.dark, { lift: 10, edge: false });
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, c.light); g.addColorStop(0.75, c.main);
    art.paper(ctx, circlePath(x, y, r * 0.86), g, { lift: 4, stitch: 'rgba(255,255,255,0.6)', stitchPath: circlePath(x, y, r * 0.74) });
    if (text != null) art.label(ctx, String(text), x, y + r * 0.04, r * 0.95, '#fff', { stroke: c.dark, strokeW: 0.12 });
    ctx.restore();
  };

  // ---------- paper sheet with two strips of washi tape ----------
  art.panel = function (ctx, x, y, w, h, r = 36) {
    ctx.save();
    art.paper(ctx, rrPath(x, y, w, h, r), U.paper, { lift: 18, grainAlpha: 0.1 });
    const tape = (tx, ty, rot, col) => {
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot);
      ctx.fillStyle = col; ctx.globalAlpha = 0.82;
      ctx.beginPath(); ctx.moveTo(-90, -24); for (let i = 0; i <= 6; i++) ctx.lineTo(-90 + i * 30, -24 + (i % 2 ? 4 : 0));
      ctx.lineTo(90, 24); for (let i = 6; i >= 0; i--) ctx.lineTo(-90 + i * 30, 24 - (i % 2 ? 4 : 0)); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([2, 14]);
      ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(80, 0); ctx.stroke();
      ctx.restore();
    };
    tape(x + 70, y + 8, -0.5, U.coral);
    tape(x + w - 70, y + 8, 0.5, U.sky);
    ctx.restore();
  };

  // ---------- paper ribbon banner with folded tails ----------
  art.ribbon = function (ctx, cx, cy, w, h, color = U.coral, dark = '#C8433A') {
    const x = cx - w / 2, y = cy - h / 2, tail = h * 0.9;
    ctx.save();
    const tailPath = (side) => (c) => {
      c.beginPath();
      const ex = side < 0 ? x + 30 : x + w - 30, ox = side * (tail + 20);
      c.moveTo(ex, y + h * 0.35); c.lineTo(ex + ox, y + h * 0.35); c.lineTo(ex + ox - side * 26, y + h * 0.85); c.lineTo(ex + ox, y + h * 1.35); c.lineTo(ex, y + h * 1.35); c.closePath();
    };
    art.paper(ctx, tailPath(-1), dark, { lift: 6, edge: false });
    art.paper(ctx, tailPath(1), dark, { lift: 6, edge: false });
    art.paper(ctx, rrPath(x, y, w, h, 14), color, { lift: 10, stitch: 'rgba(255,255,255,0.5)', stitchPath: rrPath(x + 10, y + 10, w - 20, h - 20, 8) });
    ctx.restore();
  };

  // ---------- hand on the wall: a glowing paper ring in the player's colour ----------
  art.handCursor = function (ctx, x, y, player, t, r = 46) {
    const col = WG.PLAYER_COLORS[player] || WG.PLAYER_COLORS[0];
    const pulse = 1 + Math.sin(t * 7) * 0.05;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7);
    g.addColorStop(0, col.glow + '0.45)'); g.addColorStop(1, col.glow + '0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = U.paper; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = col.main; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) { const a = t * 2 + (i * Math.PI * 2) / 3; ctx.fillStyle = U.paper; art.star(ctx, x + Math.cos(a) * r * pulse, y + Math.sin(a) * r * pulse, 11, 5, 4, a); ctx.fill(); }
    ctx.restore();
  };

  // Hanging strings (for the title and results sheet)
  art.strings = function (ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = 'rgba(46,35,70,0.45)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = U.coral; ctx.beginPath(); ctx.arc(x2, y2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
})(window.WG);
