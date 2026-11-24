/* Settings: defaults, persistence, and the grown-up settings panel. */
(function (WG) {
  WG.DEFAULT_SETTINGS = {
    players: 2,
    mode: 'timed',          // 'timed' rounds or 'free' play (never ends)
    roundSeconds: 60,
    difficulty: 'easy',
    targetSize: 'big',
    colourRule: false,      // toddlers: any fish counts
    butterflies: false,
    everyoneWins: true,     // both kids get a celebration
    inputMode: 'camera',
    cameraId: '',
    reach: 70,              // extra hit radius around each hand (game pixels)
    dwellMs: 1200,          // hold time to choose a menu tile
    ignoreLowHands: true,
    showCursors: true,
    mirrorPlayers: false,
    musicVol: 0.35,
    sfxVol: 0.8,
    voice: true,
    voiceVol: 1,
    title: 'Momo Play Wall',
  };

  WG.settings = Object.assign({}, WG.DEFAULT_SETTINGS, WG.store.get('settings', {}));
  WG.saveSettings = () => WG.store.set('settings', WG.settings);

  const NUMERIC = ['players', 'roundSeconds', 'reach', 'dwellMs', 'musicVol', 'sfxVol', 'voiceVol'];
  const fmt = {
    roundSeconds: (v) => v + ' s',
    reach: (v) => v + ' px',
    dwellMs: (v) => (v / 1000).toFixed(1) + ' s',
    musicVol: (v) => Math.round(v * 100) + '%',
    sfxVol: (v) => Math.round(v * 100) + '%',
    voiceVol: (v) => Math.round(v * 100) + '%',
  };

  const panel = () => document.getElementById('settings');
  WG.settingsOpen = () => !panel().classList.contains('hidden');

  function refreshOutputs() {
    panel().querySelectorAll('[data-out]').forEach((o) => {
      const k = o.dataset.out;
      o.textContent = fmt[k] ? fmt[k](WG.settings[k]) : WG.settings[k];
    });
  }

  function fillForm() {
    panel().querySelectorAll('[data-key]').forEach((el) => {
      const v = WG.settings[el.dataset.key];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = String(v) === el.value;
      else el.value = String(v);
    });
    refreshOutputs();
    const dbg = document.getElementById('debugBtn');
    if (dbg) dbg.classList.toggle('on', !!WG.debugView);
  }

  async function fillCameras() {
    const sel = panel().querySelector('[data-key=cameraId]');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      sel.innerHTML = '<option value="">Default camera</option>' +
        cams.map((c, i) => `<option value="${c.deviceId}">${(c.label || 'Camera ' + (i + 1)).replace(/</g, '')}</option>`).join('');
      sel.value = WG.settings.cameraId || '';
    } catch (e) { /* no camera list available */ }
  }

  WG.openSettings = function () {
    fillForm();
    fillCameras();
    WG.updateTrackStatus();
    panel().classList.remove('hidden');
  };
  WG.closeSettings = function () { panel().classList.add('hidden'); };

  WG.updateTrackStatus = function () {
    const el = document.getElementById('trackStatus');
    if (!el) return;
    const t = WG.tracker;
    const parts = [];
    if (WG.settings.inputMode === 'mouse') parts.push('Mouse mode: camera is off.');
    else {
      parts.push(t && t.statusText ? t.statusText : 'Camera not started.');
      parts.push(WG.calib && WG.calib.H ? 'Calibrated ✔' : 'Not calibrated yet — press Auto calibrate.');
    }
    el.textContent = parts.join(' ');
  };

  WG.initSettingsPanel = function () {
    const p = panel();
    p.addEventListener('input', (e) => {
      const el = e.target, k = el.dataset.key;
      if (!k || (el.type === 'radio' && !el.checked)) return;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (NUMERIC.includes(k)) v = parseFloat(v);
      const prev = WG.settings[k];
      WG.settings[k] = v;
      WG.saveSettings();
      refreshOutputs();
      if (k === 'musicVol' || k === 'sfxVol') WG.audio.applyVolumes();
      if ((k === 'inputMode' || k === 'cameraId') && prev !== v) WG.tracker.restart();
    });
    p.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (e.target === p) { WG.closeSettings(); return; }
      if (!a) return;
      const act = a.dataset.action;
      if (act === 'close') WG.closeSettings();
      if (act === 'calibrate') { WG.closeSettings(); WG.startCalibration('auto'); }
      if (act === 'calibrateManual') { WG.closeSettings(); WG.startCalibration('manual'); }
      if (act === 'tester') { WG.closeSettings(); WG.setScene(new WG.TesterScene()); }
      if (act === 'debug') { WG.debugView = !WG.debugView; a.classList.toggle('on', WG.debugView); WG.toast(WG.debugView ? 'Camera view on (D to toggle)' : 'Camera view off'); }
      if (act === 'home') { WG.closeSettings(); WG.goHome(); }
      if (act === 'testVoice') { WG.audio.unlock(); WG.audio.voice('voice_test'); }
      if (act === 'fullscreen') WG.toggleFullscreen();
      if (act === 'reset') {
        if (!confirm('Reset all settings to defaults? (Calibration is kept.)')) return;
        WG.settings = Object.assign({}, WG.DEFAULT_SETTINGS);
        WG.saveSettings(); fillForm(); WG.audio.applyVolumes(); WG.tracker.restart();
      }
    });
  };
})(window.WG);
