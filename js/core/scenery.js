/* Scenery: every background is a layered paper diorama, rendered once and cached.
   WG.art.background(kind) -> 1920x1080 canvas.  kinds: home, sea, dusk, bubbles, night, paper */
(function (WG) {
  const art = WG.art, U = WG.ui;

  function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

  // A ridge of paper from the left edge to the right edge, filled down to the bottom.
  function ridge(c, y0, waves, fill, o = {}) {
    const W = WG.W, H = WG.H;
    const path = (cx) => {
      cx.beginPath(); cx.moveTo(-20, H + 20);
      for (let x = -20; x <= W + 20; x += 12) {
        let y = y0;
        for (const [amp, freq, ph] of waves) y -= Math.sin(x * freq + ph) * amp;
        cx.lineTo(x, y);
      }
      cx.lineTo(W + 20, H + 20); cx.closePath();
    };
    c.save();
    c.shadowColor = o.shadow || 'rgba(46,35,70,0.28)'; c.shadowBlur = o.blur || 28; c.shadowOffsetY = o.offset == null ? -6 : o.offset;
    path(c); c.fillStyle = fill; c.fill();
    c.restore();
    c.save(); path(c); c.clip(); art.grain(c, 0.07);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 4; c.translate(0, 3); path(c); c.stroke();
    c.restore();
  }

  function vgrad(c, stops) { const g = c.createLinearGradient(0, 0, 0, WG.H); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }

  function cloud(c, x, y, s, col = '#FFFFFF') {
    const path = (cx) => {
      cx.beginPath();
      [[0, 0, 1], [-0.95, 0.25, 0.68], [0.95, 0.28, 0.72], [-0.45, -0.4, 0.72], [0.45, -0.32, 0.62]].forEach(([dx, dy, k]) => {
        cx.moveTo(x + dx * s + k * s, y + dy * s); cx.arc(x + dx * s, y + dy * s, k * s, 0, Math.PI * 2);
      });
      cx.rect(x - 1.5 * s, y + 0.1 * s, 3 * s, 0.75 * s);
    };
    art.paper(c, path, col, { lift: 10, edge: false, grainAlpha: 0.05 });
  }

  function sun(c, x, y, r) {
    c.save();
    const rays = (cx) => { cx.beginPath(); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; cx.moveTo(x + Math.cos(a - 0.12) * r * 1.05, y + Math.sin(a - 0.12) * r * 1.05); cx.lineTo(x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55); cx.lineTo(x + Math.cos(a + 0.12) * r * 1.05, y + Math.sin(a + 0.12) * r * 1.05); } cx.closePath(); };
    art.paper(c, rays, '#FFD866', { lift: 6, edge: false });
    art.paper(c, (cx) => { cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); }, '#FFC43D', { lift: 10 });
    art.paper(c, (cx) => { cx.beginPath(); cx.arc(x - r * 0.12, y - r * 0.12, r * 0.72, 0, Math.PI * 2); }, '#FFD866', { lift: 3, edge: false });
    c.restore();
  }

  function lollipopTree(c, x, y, s, crown, crown2) {
    art.paper(c, (cx) => art.rr(cx, x - s * 0.08, y - s * 0.9, s * 0.16, s * 0.95, s * 0.05), '#8A5A44', { lift: 4, edge: false });
    art.paper(c, (cx) => { cx.beginPath(); cx.arc(x, y - s, s * 0.52, 0, Math.PI * 2); }, crown, { lift: 8 });
    art.paper(c, (cx) => { cx.beginPath(); cx.arc(x - s * 0.12, y - s * 1.1, s * 0.3, 0, Math.PI * 2); }, crown2, { lift: 3, edge: false });
  }

  function flower(c, x, y, s, col) {
    c.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, 0, 7); c.fill(); }
    c.fillStyle = U.sun; c.beginPath(); c.arc(x, y, s * 0.6, 0, 7); c.fill();
  }

  function pine(c, x, base, h, col) {
    const path = (cx) => {
      cx.beginPath();
      for (let k = 0; k < 3; k++) {
        const top = base - h + k * h * 0.22, w = h * (0.28 + k * 0.08);
        cx.moveTo(x, top); cx.lineTo(x + w, top + h * 0.38); cx.lineTo(x - w, top + h * 0.38); cx.closePath();
      }
      cx.rect(x - h * 0.04, base - h * 0.25, h * 0.08, h * 0.25);
    };
    art.paper(c, path, col, { lift: 8, edge: false, grainAlpha: 0.05 });
  }

  function finish(c, vignette = 0.22) {
    const W = WG.W, H = WG.H;
    art.grain(c, 0.05);
    const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.45, W / 2, H * 0.5, H * 1.05);
    g.addColorStop(0, 'rgba(46,35,70,0)'); g.addColorStop(1, `rgba(46,35,70,${vignette})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  const SCENES = {
    home(c, rnd) {
      c.fillStyle = vgrad(c, [[0, '#8FD5EE'], [0.55, '#D2F0F2'], [1, '#F2FAE6']]); c.fillRect(0, 0, WG.W, WG.H);
      sun(c, 1590, 250, 78);
      cloud(c, 230, 250, 62); cloud(c, 1330, 330, 48); cloud(c, 1780, 470, 40, '#F4FBFF');
      ridge(c, 760, [[70, 0.0032, 0.4], [26, 0.011, 2]], '#BDE6C2', { blur: 20 });
      ridge(c, 840, [[48, 0.0041, 1.7], [18, 0.013, 0.5]], '#8BD094');
      for (const [x, s] of [[120, 95], [610, 80], [1010, 105], [1450, 88], [1840, 100]]) lollipopTree(c, x, 830 + rnd() * 30, s, '#4DB37A', '#7FD18E');
      ridge(c, 935, [[30, 0.005, 3.1], [12, 0.017, 1]], '#5DBA78');
      ridge(c, 1010, [[22, 0.006, 0.9], [9, 0.021, 2.2]], '#47A867');
      for (let i = 0; i < 40; i++) flower(c, rnd() * WG.W, 1000 + rnd() * 70, 5 + rnd() * 3, ['#FFFDF6', '#FF8FB1', '#FFD866'][i % 3]);
      finish(c, 0.18);
    },
    bubbles(c, rnd) {
      c.fillStyle = vgrad(c, [[0, '#FFD3E8'], [0.5, '#FFF2F7'], [1, '#D3F0FF']]); c.fillRect(0, 0, WG.W, WG.H);
      cloud(c, 300, 220, 55, '#FFFFFF'); cloud(c, 1560, 180, 66, '#FFF8FC'); cloud(c, 980, 300, 40, '#FFFFFF');
      ridge(c, 860, [[50, 0.003, 1.2], [16, 0.012, 0.3]], '#CDEFD7', { blur: 20 });
      ridge(c, 940, [[34, 0.0045, 2.6], [12, 0.016, 1.1]], '#A6E2BC');
      ridge(c, 1015, [[20, 0.006, 0.3], [8, 0.02, 2]], '#86D5A4');
      for (let i = 0; i < 46; i++) flower(c, rnd() * WG.W, 990 + rnd() * 80, 6 + rnd() * 3, ['#FF8FB1', '#FFFDF6', '#B9A2FF', '#FFD866'][i % 4]);
      finish(c, 0.14);
    },
    sea(c, rnd) {
      c.fillStyle = vgrad(c, [[0, '#86E0EC'], [0.35, '#35A8D2'], [1, '#155C93']]); c.fillRect(0, 0, WG.W, WG.H);
      ridge(c, 820, [[90, 0.003, 0.7], [30, 0.009, 2]], '#2A80B5', { blur: 30, shadow: 'rgba(10,30,60,0.35)' });
      ridge(c, 900, [[60, 0.0045, 2.2], [20, 0.012, 0.4]], '#1F6FA4', { shadow: 'rgba(10,30,60,0.35)' });
      // paper coral
      const corals = [[160, '#FF8FB1'], [520, '#FFB05C'], [880, '#FF6B5B'], [1240, '#B99CFF'], [1620, '#FF8FB1'], [1830, '#FFB05C']];
      for (const [x, col] of corals) {
        const h = 120 + rnd() * 90;
        const path = (cx) => {
          cx.beginPath(); cx.lineCap = 'round';
          const branch = (bx, by, len, ang, depth) => {
            const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
            cx.moveTo(bx, by); cx.lineTo(ex, ey);
            if (depth > 0) { branch(ex, ey, len * 0.7, ang - 0.5, depth - 1); branch(ex, ey, len * 0.7, ang + 0.45, depth - 1); }
          };
          branch(x, 1000, h * 0.45, -Math.PI / 2, 3);
        };
        c.save(); c.shadowColor = 'rgba(10,30,60,0.35)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
        c.strokeStyle = col; c.lineWidth = 22; c.lineJoin = 'round'; path(c); c.stroke(); c.restore();
      }
      ridge(c, 975, [[16, 0.006, 1.4], [8, 0.02, 0.3]], '#F7D9A0', { shadow: 'rgba(10,30,60,0.3)' });
      for (let i = 0; i < 8; i++) {
        const x = 120 + rnd() * (WG.W - 240), y = 1020 + rnd() * 40;
        if (i % 2) { art.paper(c, (cx) => art.star(cx, x, y, 26, 12, 5, rnd()), '#FF8A6B', { lift: 5 }); }
        else { art.paper(c, (cx) => { cx.beginPath(); cx.arc(x, y, 20, Math.PI, 0); cx.closePath(); }, '#FFD6E2', { lift: 5 }); }
      }
      finish(c, 0.26);
    },
    dusk(c, rnd) {
      c.fillStyle = vgrad(c, [[0, '#5E54AE'], [0.42, '#C47DB9'], [0.72, '#FFB08A'], [1, '#FFDDA6']]); c.fillRect(0, 0, WG.W, WG.H);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`; art.star(c, rnd() * WG.W, rnd() * 400, 2 + rnd() * 3, 1, 4, rnd()); c.fill(); }
      art.paper(c, (cx) => { cx.beginPath(); cx.arc(1540, 240, 92, 0, Math.PI * 2); }, '#FFF4D6', { lift: 12, shadowColor: 'rgba(255,240,200,0.6)' });
      cloud(c, 320, 330, 52, 'rgba(255,230,240,0.9)'); cloud(c, 1000, 260, 60, 'rgba(255,230,240,0.85)');
      ridge(c, 830, [[70, 0.0035, 0.3], [24, 0.012, 1]], '#9A6CB2');
      ridge(c, 920, [[46, 0.0045, 2], [16, 0.015, 0.2]], '#6D4E95');
      for (let i = 0; i < 6; i++) {
        const x = 140 + i * 320 + rnd() * 80, y = 930 - rnd() * 16;
        const house = (cx) => { cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y - 60); cx.lineTo(x + 45, y - 104); cx.lineTo(x + 90, y - 60); cx.lineTo(x + 90, y); cx.closePath(); };
        art.paper(c, house, '#4A3570', { lift: 6, edge: false });
        c.fillStyle = '#FFD36B'; art.rr(c, x + 16, y - 46, 22, 22, 4); c.fill(); art.rr(c, x + 52, y - 46, 22, 22, 4); c.fill();
      }
      ridge(c, 1005, [[22, 0.006, 4], [8, 0.02, 1]], '#3E2C5E');
      finish(c, 0.24);
    },
    night(c, rnd) {
      c.fillStyle = vgrad(c, [[0, '#0E2150'], [0.6, '#1A4670'], [1, '#23615E']]); c.fillRect(0, 0, WG.W, WG.H);
      const glow = c.createRadialGradient(300, 210, 20, 300, 210, 280); glow.addColorStop(0, 'rgba(255,245,210,0.35)'); glow.addColorStop(1, 'rgba(255,245,210,0)');
      c.fillStyle = glow; c.fillRect(0, 0, 800, 600);
      const moon = art.canvas(220, 220), mc = moon.getContext('2d');
      mc.fillStyle = '#FFF4D6'; mc.beginPath(); mc.arc(110, 110, 84, 0, 7); mc.fill();
      mc.globalCompositeOperation = 'destination-out'; mc.beginPath(); mc.arc(148, 88, 74, 0, 7); mc.fill();
      c.save(); c.shadowColor = 'rgba(255,240,200,0.6)'; c.shadowBlur = 30; c.drawImage(moon, 190, 100); c.restore();
      ridge(c, 830, [[60, 0.003, 1], [20, 0.01, 0.4]], '#173C5C', { shadow: 'rgba(0,0,0,0.35)' });
      for (let i = 0; i < 10; i++) pine(c, 80 + i * 200 + rnd() * 60, 900, 260 + rnd() * 160, '#0F2F40');
      ridge(c, 930, [[30, 0.0045, 2.5], [12, 0.016, 1]], '#123A35', { shadow: 'rgba(0,0,0,0.4)' });
      ridge(c, 1005, [[16, 0.007, 0.4], [8, 0.02, 1.5]], '#0C2A26', { shadow: 'rgba(0,0,0,0.4)' });
      finish(c, 0.3);
    },
    paper(c, rnd) {
      c.fillStyle = '#FFFBF1'; c.fillRect(0, 0, WG.W, WG.H);
      art.grain(c, 0.14);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(150,120,90,${rnd() * 0.06})`; c.fillRect(rnd() * WG.W, rnd() * WG.H, 2 + rnd() * 6, 1 + rnd() * 2); }
      finish(c, 0.12);
    },
  };

  const cache = new Map();
  art.background = function (kind) {
    if (cache.has(kind)) return cache.get(kind);
    const c = art.canvas(WG.W, WG.H);
    (SCENES[kind] || SCENES.paper)(c.getContext('2d'), seeded(kind.length * 977 + 11));
    cache.set(kind, c);
    return c;
  };
})(window.WG);
