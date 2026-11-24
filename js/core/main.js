/* Boot, main loop, keyboard shortcuts. */
(function (WG) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  WG.goHome = () => WG.setScene(new WG.HomeScene());
  WG.startGame = function (id) {
    const def = WG.games.find((g) => g.id === id);
    if (def) WG.setScene(def.create(def));
  };

  // Grown-up fix if the camera guessed the kids' colours the wrong way round
  WG.swapColours = function () {
    if (WG.settings.players < 2) { WG.toast('Swap colours needs 2 players'); return; }
    if (WG.settings.keepColours) WG.tracker.swapPlayers();
    else { WG.settings.mirrorPlayers = !WG.settings.mirrorPlayers; WG.saveSettings(); }
    WG.toast('Kids\u2019 colours swapped');
  };

  WG.toggleFullscreen = function () {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) { /* not allowed */ }
  };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h; // 1:1 pixels keeps it fast on laptops without a graphics card
    const s = Math.min(w / WG.W, h / WG.H);
    WG.view = { scale: s, ox: (w - WG.W * s) / 2, oy: (h - WG.H * s) / 2 };
  }
  window.addEventListener('resize', resize);
  resize();

  // hide the mouse arrow when it hasn't moved for a while
  let idle;
  window.addEventListener('pointermove', () => {
    canvas.classList.remove('hide-cursor');
    clearTimeout(idle);
    idle = setTimeout(() => canvas.classList.add('hide-cursor'), 2500);
  });

  WG.input.attach(canvas);
  WG.initSettingsPanel();

  // ---------- keyboard (for grown-ups) ----------
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (WG.settingsOpen()) { if (k === 'escape' || k === 's') WG.closeSettings(); return; }
    if (!started) return;
    if (WG.scene && WG.scene.key && WG.scene.key(k)) return;
    if (k === 's') WG.openSettings();
    else if (k === 'c') WG.startCalibration('auto');
    else if (k === 'm') WG.startCalibration('manual');
    else if (k === 't') WG.setScene(new WG.TesterScene());
    else if (k === 'd') { WG.debugView = !WG.debugView; }
    else if (k === 'h' || k === 'escape') WG.goHome();
    else if (k === 'f') WG.toggleFullscreen();
    else if (k === 'x') WG.swapColours();
    else if (k === '1' || k === '2') { WG.settings.players = +k; WG.saveSettings(); WG.toast(k === '1' ? '1 player' : '2 players'); }
  });

  // ---------- main loop ----------
  let last = performance.now(), started = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      WG.tracker.tick(now);
      WG.input.update(dt);
      if (WG.scene && WG.scene.update) WG.scene.update(dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const v = WG.view;
      ctx.setTransform(v.scale, 0, 0, v.scale, v.ox, v.oy);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, WG.W, WG.H); ctx.clip();
      if (WG.scene && WG.scene.draw) WG.scene.draw(ctx);
      if (!(WG.scene instanceof WG.TesterScene) && WG.scene && !WG.scene.noCursors) WG.input.drawCursors(ctx, now / 1000);
      if (WG.debugView) WG.tracker.drawDebug(ctx);
      ctx.restore();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  // ---------- start ----------
  async function start() {
    if (started) return;
    started = true;
    WG.started = true;
    WG.audio.unlock();
    WG.audio.preloadVoice();
    try { await document.documentElement.requestFullscreen(); } catch (e) { /* fine without */ }
    document.getElementById('start').classList.add('hidden');
    WG.goHome();
    WG.tracker.start();
    if (WG.settings.inputMode === 'camera' && !WG.calib.H) WG.toast('First time? Press C to calibrate the camera.', 5000);
  }
  document.getElementById('startBtn').addEventListener('click', start);

  // Warm up sprites + font while the start screen shows
  (document.fonts ? Promise.all([document.fonts.load('900 40px "Grandstander"'), document.fonts.load('800 40px "Grandstander"')]) : Promise.resolve()).catch(() => {}).then(() => {
    WG.art.momoBody(); WG.art.background('home');
  });

  WG.goHome();
  requestAnimationFrame(frame);
})(window.WG);
