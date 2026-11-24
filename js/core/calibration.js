/* Calibration: teaches the game where the projected picture is inside the camera picture.
   Auto:   the wall shows 4 white dots one by one on black; the camera finds each dot.
   Manual: the wall shows 4 numbered dots; you click each one in the camera preview on the laptop.
   Result: a homography (perspective map) from camera pixels to game coordinates. */
(function (WG) {
  const IN = 0.1;
  const TARGETS = [[WG.W * IN, WG.H * IN], [WG.W * (1 - IN), WG.H * IN], [WG.W * (1 - IN), WG.H * (1 - IN)], [WG.W * IN, WG.H * (1 - IN)]];
  const NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const PROC_W = 320;

  WG.startCalibration = function (mode) {
    if (WG.settings.inputMode !== 'camera') { WG.toast('Switch Input to Camera in Settings first.'); return; }
    WG.setScene(new CalibrationScene(mode));
  };

  class CalibrationScene {
    constructor(mode) { this.mode = mode; }
    enter() {
      this.t = 0; this.phase = 'wait'; this.phaseT = 0; this.found = []; this.msg = ''; this.idx = 0;
      this.proc = WG.art.canvas(PROC_W, 180);
      this.pctx = this.proc.getContext('2d', { willReadFrequently: true });
      WG.audio.music(null);
    }
    exit() {}

    video() { const v = WG.tracker.video; return v && v.readyState >= 2 && v.videoWidth ? v : null; }

    grab() {
      const v = this.video();
      const h = Math.round((PROC_W * v.videoHeight) / v.videoWidth);
      if (this.proc.height !== h) this.proc.height = h;
      this.pctx.drawImage(v, 0, 0, PROC_W, h);
      const d = this.pctx.getImageData(0, 0, PROC_W, h).data;
      const lum = new Float32Array(PROC_W * h);
      for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11;
      return lum;
    }

    findDot(base, cur) {
      const w = PROC_W, h = this.proc.height;
      let max = 0, mi = -1;
      const diff = new Float32Array(cur.length);
      for (let i = 0; i < cur.length; i++) { const v = cur[i] - base[i]; diff[i] = v; if (v > max) { max = v; mi = i; } }
      if (max < 30) return null;
      const mx = mi % w, my = (mi / w) | 0, R = 28, th = max * 0.5;
      let sx = 0, sy = 0, sw = 0;
      for (let y = Math.max(0, my - R); y < Math.min(h, my + R); y++) {
        for (let x = Math.max(0, mx - R); x < Math.min(w, mx + R); x++) {
          const v = diff[y * w + x];
          if (v > th) { sx += x * v; sy += y * v; sw += v; }
        }
      }
      const k = this.video().videoWidth / w;
      return [(sx / sw) * k, (sy / sw) * k];
    }

    update(dt) {
      this.t += dt; this.phaseT += dt;
      const v = this.video();
      if (this.phase === 'wait') {
        if (v) { this.phase = this.mode === 'manual' ? 'manual' : 'black'; this.phaseT = 0; if (this.mode === 'manual') WG.audio.voice('calib_manual'); }
        else if (this.phaseT > 12) this.fail('The camera is not ready. Check Settings → Input is Camera, and allow camera access.');
        return;
      }
      if (this.phase === 'black' && this.phaseT > 1.2) {
        this.base = this.grab(); this.phase = 'dot'; this.idx = 0; this.phaseT = 0;
      }
      if (this.phase === 'dot' && this.phaseT > 1.0) {
        const p = this.findDot(this.base, this.grab());
        if (!p) return this.fail(`The camera could not see the ${NAMES[this.idx]} dot. Make the room darker, check the camera sees the whole picture, or press M for manual calibration.`);
        this.found.push(p); WG.audio.sfx('pop', { note: 72 + this.idx * 2 });
        this.idx++; this.phaseT = 0;
        if (this.idx >= 4) this.solve();
        else { this.phase = 'blackdot'; } // short black gap so the old dot fades out of the camera
      }
      if (this.phase === 'blackdot' && this.phaseT > 0.35) { this.phase = 'dot'; this.phaseT = 0; }
      if (this.phase === 'manual') {
        const r = this.previewRect();
        for (const p of WG.input.pointers) {
          if (p.src !== 'mouse' || !p.justDown) continue;
          if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) continue;
          this.found.push([((p.x - r.x) / r.w) * v.videoWidth, ((p.y - r.y) / r.h) * v.videoHeight]);
          WG.audio.sfx('pop', { note: 72 + this.found.length * 2 });
          if (this.found.length >= 4) this.solve();
        }
      }
      if (this.phase === 'done' && this.phaseT > 2.5) WG.setScene(new WG.TesterScene());
    }

    solve() {
      const v = this.video();
      const H = WG.computeHomography(this.found, TARGETS);
      // sanity check: the four points must form a reasonably sized shape
      const area = Math.abs(this.found.reduce((s, [x, y], i, a) => { const [x2, y2] = a[(i + 1) % 4]; return s + x * y2 - x2 * y; }, 0)) / 2;
      if (!H || area < v.videoWidth * v.videoHeight * 0.02) return this.fail('The dots were found in strange places. Try again in a darker room, or use manual calibration (M).');
      // extend the 4 found points to the full projected rectangle for the debug view
      const inv = WG.computeHomography(TARGETS, this.found);
      const corners = [[0, 0], [WG.W, 0], [WG.W, WG.H], [0, WG.H]].map(([x, y]) => WG.applyHomography(inv, x, y));
      WG.calib = { H, camPts: corners, camW: v.videoWidth, camH: v.videoHeight };
      WG.saveCalib();
      this.phase = 'done'; this.phaseT = 0;
      WG.audio.sfx('fanfare'); WG.audio.voice('calib_done');
      WG.updateTrackStatus();
    }

    fail(msg) { this.phase = 'fail'; this.msg = msg; this.phaseT = 0; WG.audio.sfx('nope'); }

    previewRect() {
      const v = this.video(), w = 960, h = v ? (w * v.videoHeight) / v.videoWidth : 540;
      return { x: WG.W / 2 - w / 2, y: WG.H / 2 - h / 2 + 20, w, h };
    }

    key(k) {
      if (k === 'r') { WG.startCalibration(this.mode); return true; }
      if (k === 'a') { WG.startCalibration('auto'); return true; }
      return false;
    }

    draw(ctx) {
      const art = WG.art;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, WG.W, WG.H);
      if (this.phase === 'dot') {
        const [x, y] = TARGETS[this.idx];
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
      }
      if (this.phase === 'black' || this.phase === 'dot' || this.phase === 'blackdot') {
        ctx.fillStyle = '#555'; ctx.font = art.font(30, 600); ctx.textAlign = 'center';
        ctx.fillText('Calibrating… please keep out of the picture', WG.W / 2, WG.H / 2);
      }
      if (this.phase === 'wait') art.label(ctx, 'Waiting for the camera…', WG.W / 2, WG.H / 2, 60, '#fff');
      if (this.phase === 'manual') {
        TARGETS.forEach(([x, y], i) => {
          const done = i < this.found.length, cur = i === this.found.length;
          ctx.fillStyle = done ? '#5be196' : cur ? '#ffd34d' : '#ff8a1f';
          ctx.beginPath(); ctx.arc(x, y, cur ? 58 + Math.sin(this.t * 6) * 6 : 50, 0, Math.PI * 2); ctx.fill();
          art.label(ctx, String(i + 1), x, y + 4, 60, '#2a1608', { stroke: false, shadow: false });
        });
        const r = this.previewRect(), v = this.video();
        if (v) {
          ctx.drawImage(v, r.x, r.y, r.w, r.h);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(r.x, r.y, r.w, r.h);
          this.found.forEach(([fx, fy], i) => {
            const px = r.x + (fx / v.videoWidth) * r.w, py = r.y + (fy / v.videoHeight) * r.h;
            ctx.fillStyle = '#5be196'; ctx.beginPath(); ctx.arc(px, py, 12, 0, 7); ctx.fill();
            art.label(ctx, String(i + 1), px, py - 30, 34, '#fff');
          });
        }
        const n = this.found.length;
        art.label(ctx, n < 4 ? `Click dot ${n + 1} (${NAMES[n]}) in the camera picture` : 'Done!', WG.W / 2, r.y - 50, 46, '#fff');
      }
      if (this.phase === 'done') {
        ctx.fillStyle = '#0f3a24'; ctx.fillRect(0, 0, WG.W, WG.H);
        TARGETS.forEach(([x, y]) => { ctx.fillStyle = '#5be196'; ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.fill(); });
        art.label(ctx, 'Calibrated!', WG.W / 2, WG.H / 2 - 30, 150, '#5be196');
        art.label(ctx, 'Opening the touch tester…', WG.W / 2, WG.H / 2 + 100, 50, '#fff');
      }
      if (this.phase === 'fail') {
        ctx.fillStyle = '#3a1010'; ctx.fillRect(0, 0, WG.W, WG.H);
        art.label(ctx, 'Hmm, that did not work', WG.W / 2, 330, 90, '#ffb3a8');
        wrapText(ctx, this.msg, WG.W / 2, 480, 1400, 46);
        art.label(ctx, 'R = try again   ·   M = manual   ·   H = home', WG.W / 2, 820, 44, '#ffd34d');
      }
    }
  }

  function wrapText(ctx, text, x, y, maxW, size) {
    ctx.font = WG.art.font(size, 600);
    const words = text.split(' '); let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { WG.art.label(ctx, line, x, yy, size, '#fff', { weight: 600, strokeW: 0.08 }); line = w; yy += size * 1.35; }
      else line = test;
    }
    if (line) WG.art.label(ctx, line, x, yy, size, '#fff', { weight: 600, strokeW: 0.08 });
  }
  WG.wrapText = wrapText;
})(window.WG);
