/* Art: all characters and backgrounds are drawn with code (no image files).
   Expensive drawings are rendered once into off-screen "sprites" and reused every frame. */
(function (WG) {
  const art = (WG.art = {});
  // art.font, label, buttons, tags and backgrounds live in ui-kit.js and scenery.js

  // ---------- canvas helpers ----------
  art.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  const cache = new Map();
  art.sprite = function (key, w, h, draw) {
    if (cache.has(key)) return cache.get(key);
    const c = art.canvas(w, h);
    draw(c.getContext('2d'), w, h);
    cache.set(key, c);
    return c;
  };

  art.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  art.star = function (ctx, x, y, R, r, n = 5, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  };

  art.heart = function (ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
    ctx.closePath();
  };

  // ---------- cute eyes ----------
  art.eye = function (ctx, x, y, r, lookX = 0, lookY = 0, blink = 0, iris = '#3a2512') {
    ctx.save();
    if (blink > 0.85) { // closed eye = happy arc
      ctx.strokeStyle = '#2b1a0e'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.restore(); return;
    }
    const sy = 1 - blink;
    ctx.translate(x, y); ctx.scale(1, Math.max(0.1, sy));
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e3e6ee');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.55)'; ctx.lineWidth = r * 0.09; ctx.stroke();
    const ix = lookX * r * 0.32, iy = lookY * r * 0.32;
    const ig = ctx.createRadialGradient(ix - r * 0.1, iy - r * 0.1, r * 0.05, ix, iy, r * 0.6);
    ig.addColorStop(0, '#a86a2c'); ig.addColorStop(0.55, iris); ig.addColorStop(1, '#120a04');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, r * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c0603'; ctx.beginPath(); ctx.arc(ix, iy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ix - r * 0.2, iy - r * 0.22, r * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + r * 0.18, iy + r * 0.16, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // ---------- fish ----------
  art.FISH_COLORS = {
    orange: { main: '#ff8a1f', light: '#ffd07a', dark: '#c2470a', fin: '#ff6a2a' },
    blue:   { main: '#2f9bff', light: '#a8dcff', dark: '#1550b0', fin: '#4bb3ff' },
    pink:   { main: '#ff6fae', light: '#ffc4df', dark: '#c02a6f', fin: '#ff8fc2' },
    green:  { main: '#3ccf7a', light: '#b5f5c8', dark: '#168447', fin: '#5be196' },
    purple: { main: '#a073ff', light: '#dcc9ff', dark: '#5b2fc0', fin: '#b894ff' },
    gold:   { main: '#ffcc1a', light: '#fff4a8', dark: '#c98a00', fin: '#ffe066' },
  };

  // Fish sprite faces right, 260x200 canvas, body centred at (130,100)
  // Returns the fish as a die-cut sticker (white border + soft shadow), 292x232, body centre at (156,116)
  art.fishSprite = function (colorKey) {
    const key = 'fishS-' + colorKey;
    if (!stickers.has(key)) stickers.set(key, art.sticker(art.fishBase(colorKey), 9, 16));
    return stickers.get(key);
  };
  const stickers = new Map();
  art.fishBase = function (colorKey) {
    return art.sprite('fish-' + colorKey, 260, 200, (c) => {
      const p = art.FISH_COLORS[colorKey];
      const cx = 140, cy = 100;
      c.lineJoin = 'round';
      const outline = 'rgba(60,25,10,0.55)';
      // tail
      c.fillStyle = p.fin; c.strokeStyle = outline; c.lineWidth = 5;
      c.beginPath(); c.moveTo(cx - 60, cy);
      c.quadraticCurveTo(cx - 105, cy - 70, cx - 128, cy - 52); c.quadraticCurveTo(cx - 108, cy, cx - 128, cy + 52);
      c.quadraticCurveTo(cx - 105, cy + 70, cx - 60, cy); c.fill(); c.stroke();
      // dorsal fin
      c.beginPath(); c.moveTo(cx - 30, cy - 52); c.quadraticCurveTo(cx - 5, cy - 100, cx + 35, cy - 58); c.closePath(); c.fill(); c.stroke();
      // body
      const g = c.createRadialGradient(cx + 5, cy - 35, 10, cx, cy, 95);
      g.addColorStop(0, p.light); g.addColorStop(0.5, p.main); g.addColorStop(1, p.dark);
      c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 88, 64, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      // belly
      c.save(); c.beginPath(); c.ellipse(cx, cy, 88, 64, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = 'rgba(255,250,230,0.45)'; c.beginPath(); c.ellipse(cx + 10, cy + 45, 70, 34, 0, 0, Math.PI * 2); c.fill();
      // stripe
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(cx - 32, cy, 10, 64, 0, 0, Math.PI * 2); c.fill();
      // shine
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(cx + 10, cy - 40, 40, 12, -0.2, 0, Math.PI * 2); c.fill();
      c.restore();
      // side fin
      c.fillStyle = p.fin; c.beginPath(); c.moveTo(cx - 5, cy + 12); c.quadraticCurveTo(cx - 40, cy + 40, cx - 8, cy + 42); c.closePath(); c.fill(); c.stroke();
      // cheek + smile
      c.fillStyle = 'rgba(255,90,90,0.45)'; c.beginPath(); c.ellipse(cx + 48, cy + 22, 13, 8, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#4a1d08'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.arc(cx + 66, cy + 14, 12, 0.3, 1.9); c.stroke();
      // eye
      art.eye(c, cx + 42, cy - 12, 24, 0.5, -0.1, 0, '#2a1608');
    });
  };

  // ---------- mosquito (cute) ----------
  // Sticker version, 252x252, body centre at (126,131)
  art.mosquitoBody = function () {
    if (!stickers.has('mosq')) stickers.set('mosq', art.sticker(art.mosquitoBase(), 8, 16));
    return stickers.get('mosq');
  };
  art.mosquitoBase = function () {
    return art.sprite('mosquito', 220, 220, (c) => {
      const cx = 110, cy = 115;
      c.lineCap = 'round'; c.lineJoin = 'round';
      // legs
      c.strokeStyle = '#3c3a52'; c.lineWidth = 5;
      [[-30, 1], [-10, 1], [10, 1]].forEach(([dx]) => {
        c.beginPath(); c.moveTo(cx + dx, cy + 30); c.quadraticCurveTo(cx + dx - 18, cy + 55, cx + dx - 30, cy + 82); c.stroke();
        c.beginPath(); c.moveTo(cx + dx + 8, cy + 30); c.quadraticCurveTo(cx + dx + 24, cy + 55, cx + dx + 34, cy + 84); c.stroke();
      });
      // abdomen
      const g = c.createRadialGradient(cx - 50, cy + 5, 5, cx - 40, cy + 15, 50);
      g.addColorStop(0, '#b8bfd6'); g.addColorStop(1, '#5b6080');
      c.fillStyle = g; c.strokeStyle = 'rgba(30,25,50,0.6)'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(cx - 45, cy + 18, 42, 26, 0.35, 0, Math.PI * 2); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.ellipse(cx - 45, cy + 18, 42, 26, 0.35, 0, Math.PI * 2); c.clip();
      c.fillStyle = 'rgba(40,38,70,0.55)';
      for (let i = 0; i < 3; i++) { c.save(); c.translate(cx - 70 + i * 22, cy + 8 + i * 8); c.rotate(0.35); c.fillRect(-5, -40, 9, 80); c.restore(); }
      c.restore();
      // head/body
      const hg = c.createRadialGradient(cx + 5, cy - 25, 8, cx + 10, cy, 55);
      hg.addColorStop(0, '#dfe3f5'); hg.addColorStop(0.6, '#8f96b8'); hg.addColorStop(1, '#4b5070');
      c.fillStyle = hg; c.beginPath(); c.arc(cx + 10, cy, 46, 0, Math.PI * 2); c.fill(); c.stroke();
      // nose (proboscis)
      c.strokeStyle = '#3c3a52'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(cx + 50, cy + 12); c.quadraticCurveTo(cx + 78, cy + 24, cx + 98, cy + 40); c.stroke();
      // antennae
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx + 20, cy - 40); c.quadraticCurveTo(cx + 25, cy - 75, cx + 45, cy - 82); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, cy - 42); c.quadraticCurveTo(cx - 5, cy - 75, cx - 22, cy - 85); c.stroke();
      c.fillStyle = '#ff7fae'; c.beginPath(); c.arc(cx + 45, cy - 82, 7, 0, 7); c.fill(); c.beginPath(); c.arc(cx - 22, cy - 85, 7, 0, 7); c.fill();
      // cheeks
      c.fillStyle = 'rgba(255,120,160,0.5)'; c.beginPath(); c.ellipse(cx + 38, cy + 20, 9, 6, 0, 0, 7); c.fill();
      // eyes
      art.eye(c, cx - 2, cy - 8, 19, 0.4, 0, 0, '#5a1f6e');
      art.eye(c, cx + 30, cy - 10, 17, 0.4, 0, 0, '#5a1f6e');
    });
  };

  art.drawWings = function (ctx, x, y, flap, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(220,240,255,0.55)'; ctx.strokeStyle = 'rgba(120,150,190,0.7)'; ctx.lineWidth = 3;
    const a = Math.sin(flap) * 0.55;
    [[-0.9 + a, 52], [-1.5 + a * 0.7, 44]].forEach(([rot, len]) => {
      ctx.save(); ctx.rotate(rot); ctx.beginPath(); ctx.ellipse(0, -len * 0.55, len * 0.35, len * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
  };

  // ---------- butterfly ----------
  art.drawButterfly = function (ctx, x, y, s, flap, hue = 300) {
    ctx.save(); ctx.translate(x, y);
    const k = Math.abs(Math.cos(flap)) * 0.85 + 0.15;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side * k, 1);
      const g = ctx.createRadialGradient(s * 0.5, -s * 0.3, 2, s * 0.5, -s * 0.2, s * 0.9);
      g.addColorStop(0, `hsl(${hue + 40},100%,85%)`); g.addColorStop(1, `hsl(${hue},85%,55%)`);
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(70,20,60,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.35, s * 0.55, s * 0.45, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.4, s * 0.3, s * 0.38, s * 0.32, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(s * 0.6, -s * 0.4, s * 0.13, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#4a2a40'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.1, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // ---------- bubble ----------
  art.bubbleSprite = function () {
    return art.sprite('bubble', 260, 260, (c) => {
      const cx = 130, cy = 130, r = 120;
      const g = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.85, 'rgba(200,235,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0.65)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      let rim;
      if (c.createConicGradient) {
        rim = c.createConicGradient(0, cx, cy);
        ['#ff9ad5', '#ffe08a', '#9bf5c4', '#8fd0ff', '#c9a8ff', '#ff9ad5'].forEach((col, i, a) => rim.addColorStop(i / (a.length - 1), col));
      } else rim = '#bfe8ff';
      c.strokeStyle = rim; c.lineWidth = 7; c.globalAlpha = 0.85; c.beginPath(); c.arc(cx, cy, r - 4, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.ellipse(cx - r * 0.42, cy - r * 0.42, r * 0.22, r * 0.11, -0.8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx - r * 0.18, cy - r * 0.62, r * 0.06, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, r * 0.78, 0.2, 0.9); c.stroke();
    });
  };

  // ---------- firefly glow ----------
  art.glowSprite = function (key, color, size = 200) {
    return art.sprite('glow-' + key, size, size, (c) => {
      const r = size / 2, g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color.replace('A', '1')); g.addColorStop(0.15, color.replace('A', '0.75'));
      g.addColorStop(0.45, color.replace('A', '0.18')); g.addColorStop(1, color.replace('A', '0'));
      c.fillStyle = g; c.fillRect(0, 0, size, size);
    });
  };

  // ---------- Momo the mascot: a fluffy dumpling with a leaf sprout ----------
  art.momoBody = function () {
    return art.sprite('momo-body', 520, 520, (c) => {
      const cx = 260, cy = 290, R = 190;
      // seeded random so the fur is the same every time
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      // feet
      c.fillStyle = '#f1b98a';
      [[-70, 1], [70, 1]].forEach(([dx]) => { c.beginPath(); c.ellipse(cx + dx, cy + R * 0.92, 52, 28, 0, 0, Math.PI * 2); c.fill(); });
      // base body
      const g = c.createRadialGradient(cx - 60, cy - 90, 20, cx, cy, R * 1.1);
      g.addColorStop(0, '#fff3e4'); g.addColorStop(0.55, '#ffd2ae'); g.addColorStop(1, '#e79a6c');
      c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, R, R * 0.93, 0, 0, Math.PI * 2); c.fill();
      // fur strands
      c.lineCap = 'round';
      for (let i = 0; i < 4200; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
        const x = cx + Math.cos(a) * R * d, y = cy + Math.sin(a) * R * 0.93 * d;
        const light = WG.clamp(0.55 - ((x - cx) * 0.6 + (y - cy)) / (R * 2.4), 0, 1);
        const len = 8 + rnd() * 14 + d * 14;
        const dir = a + (rnd() - 0.5) * 0.9 + (d < 0.5 ? rnd() * 3 : 0);
        const hue = 22 + rnd() * 10, lum = 62 + light * 30 + rnd() * 6;
        c.strokeStyle = `hsla(${hue},${80 - light * 30}%,${lum}%,${0.35 + rnd() * 0.4})`;
        c.lineWidth = 2 + rnd() * 2.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(dir) * len, y + Math.sin(dir) * len); c.stroke();
      }
      // cream belly
      const bg = c.createRadialGradient(cx, cy + 70, 10, cx, cy + 60, 120);
      bg.addColorStop(0, 'rgba(255,250,235,0.95)'); bg.addColorStop(1, 'rgba(255,240,220,0)');
      c.fillStyle = bg; c.beginPath(); c.ellipse(cx, cy + 70, 125, 105, 0, 0, Math.PI * 2); c.fill();
      // sprout
      c.strokeStyle = '#4f9a3a'; c.lineWidth = 9;
      c.beginPath(); c.moveTo(cx, cy - R * 0.9); c.quadraticCurveTo(cx - 5, cy - R - 40, cx + 8, cy - R - 60); c.stroke();
      const leaf = (rot, sx) => { c.save(); c.translate(cx + 6, cy - R - 52); c.rotate(rot); c.scale(sx, 1);
        const lg = c.createLinearGradient(0, -30, 60, 10); lg.addColorStop(0, '#9be36a'); lg.addColorStop(1, '#3f9a2f');
        c.fillStyle = lg; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(30, -40, 70, -10); c.quadraticCurveTo(35, 18, 0, 0); c.fill();
        c.strokeStyle = 'rgba(30,80,20,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(35, -12, 62, -10); c.stroke(); c.restore(); };
      leaf(-0.3, 1); leaf(0.3, -1);
      // cheeks
      c.fillStyle = 'rgba(255,110,110,0.45)';
      c.beginPath(); c.ellipse(cx - 112, cy + 18, 30, 18, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + 112, cy + 18, 30, 18, 0, 0, Math.PI * 2); c.fill();
    });
  };

  // Draws Momo with live eyes, mouth and arms. state: {t, lookX, lookY, wave, happy}
  art.drawMomo = function (ctx, x, y, scale, st) {
    const body = art.momoBody();
    const bob = Math.sin(st.t * 2.2) * 8, squash = 1 + Math.sin(st.t * 2.2) * 0.015;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(scale, scale * squash);
    // shadow
    ctx.fillStyle = 'rgba(20,40,20,0.25)'; ctx.beginPath(); ctx.ellipse(0, 270 - bob / scale, 190, 36, 0, 0, Math.PI * 2); ctx.fill();
    // arms
    ctx.strokeStyle = '#f0b07f'; ctx.lineWidth = 34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-170, 60); ctx.quadraticCurveTo(-225, 110, -215, 160); ctx.stroke();
    const w = st.wave ? Math.sin(st.t * 12) * 0.5 : 0;
    ctx.save(); ctx.translate(170, 50); ctx.rotate(st.wave ? -2.2 + w : 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, 40, 30, 100); ctx.stroke(); ctx.restore();
    ctx.drawImage(body, -260, -290);
    // face
    const blink = (st.t % 4.2) > 4.05 ? 1 : 0;
    art.eye(ctx, -62, -10, 46, st.lookX, st.lookY, st.happy ? 1 : blink);
    art.eye(ctx, 62, -10, 46, st.lookX, st.lookY, st.happy ? 1 : blink);
    ctx.fillStyle = '#7a2a16';
    ctx.beginPath(); ctx.moveTo(-38, 52); ctx.quadraticCurveTo(0, st.happy ? 120 : 98, 38, 52); ctx.quadraticCurveTo(0, 66, -38, 52); ctx.fill();
    ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.ellipse(0, st.happy ? 86 : 76, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // ---------- small icons ----------
  art.infinity = function (ctx, x, y, t, size = 30, color = '#fff') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.08);
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, d = 1 + Math.sin(a) ** 2; const px = (size * Math.cos(a)) / d, py = (size * Math.sin(a) * Math.cos(a)) / d; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.restore();
  };
  art.clock = function (ctx, x, y, r, color = '#fff', face = '#2f9bd8') {
    ctx.save();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = face; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.45, y + r * 0.1); ctx.stroke();
    ctx.restore();
  };

})(window.WG);
