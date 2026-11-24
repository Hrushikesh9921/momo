/* Momo Play Wall — shared namespace and small helpers.
   Every file adds to the global WG object (classic scripts, so index.html also works when double-clicked). */
window.WG = window.WG || {};

(function (WG) {
  // Logical game size. Everything is drawn in this space and scaled to the screen.
  WG.W = 1920;
  WG.H = 1080;

  WG.PLAYER_COLORS = [
    { name: 'Orange', main: '#ff8a1f', light: '#ffc061', dark: '#c4540a', glow: 'rgba(255,150,40,' },
    { name: 'Blue',   main: '#2f9bff', light: '#8fd0ff', dark: '#1659b8', glow: 'rgba(60,160,255,' },
  ];

  // ---------- math ----------
  WG.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  WG.lerp = (a, b, t) => a + (b - a) * t;
  WG.rand = (a, b) => a + Math.random() * (b - a);
  WG.randInt = (a, b) => Math.floor(WG.rand(a, b + 1));
  WG.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  WG.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  WG.easeOutBack = (t) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  WG.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  WG.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Speed/size multipliers from settings
  // Difficulty: easy = fewer, slower things; hard = many, fast things
  WG.speedMul = () => ({ easy: 0.65, medium: 1, hard: 1.5 }[WG.settings.difficulty] || 1);
  WG.densityMul = () => ({ easy: 0.7, medium: 1, hard: 1.5 }[WG.settings.difficulty] || 1);
  WG.sizeMul = () => ({ big: 1.25, medium: 1, small: 0.8 }[WG.settings.targetSize] || 1);

  // ---------- storage (never throws) ----------
  WG.store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('momo.' + key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem('momo.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ } },
    del(key) { try { localStorage.removeItem('momo.' + key); } catch (e) { /* ignore */ } },
  };

  // ---------- homography (camera pixels -> game coordinates) ----------
  // Solves the 3x3 perspective transform from >= 4 point pairs (least squares, h33 = 1).
  WG.computeHomography = function (src, dst) {
    const n = src.length;
    if (n < 4) return null;
    const A = [], b = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    // Normal equations: (A^T A) h = A^T b
    const M = Array.from({ length: 8 }, () => new Array(9).fill(0));
    for (let r = 0; r < A.length; r++) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) M[i][j] += A[r][i] * A[r][j];
        M[i][8] += A[r][i] * b[r];
      }
    }
    // Gaussian elimination with partial pivoting
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k < 9; k++) M[r][k] -= f * M[c][k];
      }
    }
    const h = M.map((row, i) => row[8] / row[i]);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  };

  WG.applyHomography = function (H, x, y) {
    const w = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  };

  // ---------- toast (laptop-side messages) ----------
  let toastTimer = null;
  WG.toast = function (msg, ms = 2600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  };

  // ---------- game registry ----------
  WG.games = [];
  WG.registerGame = function (def) { WG.games.push(def); };

  // ---------- scene manager ----------
  // A scene is any object with optional enter(), exit(), update(dt), draw(ctx).
  WG.scene = null;
  WG.setScene = function (scene) {
    if (WG.scene && WG.scene.exit) WG.scene.exit();
    WG.scene = scene;
    if (scene && scene.enter) scene.enter();
  };

  // Simple particle helper used by every game
  WG.Particles = class {
    constructor() { this.list = []; }
    add(p) { this.list.push(Object.assign({ life: 1, age: 0, vx: 0, vy: 0, g: 0, drag: 0.98, size: 10, rot: 0, vr: 0 }, p)); }
    burst(x, y, n, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = WG.rand(opts.minSpeed || 150, opts.maxSpeed || 520);
        this.add(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: WG.rand(0.5, 1.1),
          size: WG.rand(opts.minSize || 8, opts.maxSize || 18), color: WG.pick(opts.colors || ['#fff']),
          shape: opts.shape || 'circle', g: opts.g || 0, rot: Math.random() * 6, vr: WG.rand(-8, 8) }, opts.extra || {}));
      }
    }
    update(dt) {
      for (const p of this.list) {
        p.age += dt; p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      this.list = this.list.filter((p) => p.age < p.life);
    }
    draw(ctx) {
      for (const p of this.list) {
        const t = p.age / p.life, a = 1 - t * t;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        const s = p.size * (p.shrink === false ? 1 : 1 - t * 0.6);
        if (p.shape === 'star') { WG.art.star(ctx, p.x, p.y, s, s * 0.45, 5, p.rot); ctx.fill(); }
        else if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore(); }
        else if (p.shape === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 6 * a; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + t * 1.6), 0, 7); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
  };

  // Floating "+1" texts
  WG.FloatTexts = class {
    constructor() { this.list = []; }
    add(x, y, text, color = '#fff', size = 64) { this.list.push({ x, y, text, color, size, age: 0 }); }
    update(dt) { for (const f of this.list) { f.age += dt; f.y -= 90 * dt; } this.list = this.list.filter((f) => f.age < 1.1); }
    draw(ctx) {
      for (const f of this.list) {
        const pop = WG.easeOutBack(Math.min(1, f.age * 4));
        ctx.globalAlpha = 1 - Math.max(0, f.age - 0.6) / 0.5;
        WG.art.label(ctx, f.text, f.x, f.y, f.size * pop, f.color);
      }
      ctx.globalAlpha = 1;
    }
  };
})(window.WG);
