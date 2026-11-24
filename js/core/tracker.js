/* Camera + body tracking.
   Uses Google MediaPipe Pose (runs locally in the browser, nothing is uploaded) to find up to two kids,
   takes the position of each hand, and maps it from camera pixels to the wall using the calibration.

   Output: WG.tracker.hands = [{ id, x, y, player, justAppeared }] in game coordinates. */
(function (WG) {
  const MP_VERSION = '1.2.3';
  const CDN_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const TRACK_FPS = 24;      // detections per second (keeps the laptop cool)
  const HAND_HOLD_MS = 140;  // keep a hand alive briefly if tracking blinks

  // Calibration: homography from camera pixels -> game coordinates
  WG.calib = Object.assign({ H: null, camPts: null, camW: 0, camH: 0 }, WG.store.get('calib', {}));
  WG.saveCalib = () => WG.store.set('calib', WG.calib);

  const T = (WG.tracker = {
    hands: [], poses: [], statusText: 'Camera not started.', ready: false, fps: 0,
    video: null, stream: null, landmarker: null,
  });

  let lastVideoTime = -1, lastDetect = 0, frames = 0, fpsT0 = performance.now();
  const smooth = new Map(); // key -> {x, y, seen, born}
  let loadingModel = null;

  function setStatus(s) { T.statusText = s; WG.updateTrackStatus && WG.updateTrackStatus(); }

  T.start = async function () {
    if (WG.settings.inputMode !== 'camera') { T.stop(); setStatus('Mouse mode.'); return; }
    T.video = document.getElementById('cam');
    try {
      setStatus('Starting camera…');
      const video = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
      if (WG.settings.cameraId) video.deviceId = { exact: WG.settings.cameraId };
      T.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      T.video.srcObject = T.stream;
      await T.video.play();
      // If the camera resolution changed since calibration, the old calibration is wrong
      if (WG.calib.H && (WG.calib.camW !== T.video.videoWidth || WG.calib.camH !== T.video.videoHeight)) {
        WG.calib.H = null; WG.saveCalib();
        WG.toast('Camera changed — please calibrate again (press C).', 5000);
      }
    } catch (e) {
      console.warn('Camera failed', e);
      setStatus('Camera could not start (' + (e.name || 'error') + '). Check the camera permission. Mouse still works.');
      WG.toast('Camera could not start — mouse/touch still works.', 4000);
      return;
    }
    setStatus('Camera on. Loading body tracker…');
    try {
      await loadModel();
      T.ready = true;
      setStatus('Body tracker ready.');
    } catch (e) {
      console.error('Pose model failed', e);
      setStatus('Body tracker failed to load. The first run needs internet (or run start script — see README).');
      WG.toast('Body tracker failed to load — see README (needs internet the first time).', 6000);
    }
  };

  T.stop = function () {
    T.ready = false;
    if (T.stream) T.stream.getTracks().forEach((t) => t.stop());
    T.stream = null; T.hands = []; T.poses = [];
  };

  T.restart = function () { T.stop(); T.start(); };

  async function loadModel() {
    if (T.landmarker) return T.landmarker;
    if (loadingModel) return loadingModel;
    if (!window.Vision) throw new Error('MediaPipe library missing');
    const { FilesetResolver, PoseLandmarker } = window.Vision;
    const isHttp = location.protocol.startsWith('http');
    const wasmBases = isHttp ? ['lib/mediapipe/wasm', CDN_WASM] : [CDN_WASM];
    const models = [];
    if (isHttp) {
      try { const r = await fetch('models/pose_landmarker_lite.task', { method: 'HEAD' }); if (r.ok) models.push('models/pose_landmarker_lite.task'); } catch (e) { /* no local model */ }
    }
    models.push(MODEL_URL);

    loadingModel = (async () => {
      let lastErr;
      for (const base of wasmBases) {
        for (const model of models) {
          for (const delegate of ['GPU', 'CPU']) {
            try {
              const fs = await FilesetResolver.forVisionTasks(base);
              const lm = await PoseLandmarker.createFromOptions(fs, {
                baseOptions: { modelAssetPath: model, delegate },
                runningMode: 'VIDEO', numPoses: 2,
                minPoseDetectionConfidence: 0.45, minPosePresenceConfidence: 0.45, minTrackingConfidence: 0.45,
              });
              console.info('Pose tracker loaded:', base, model, delegate);
              T.landmarker = lm;
              return lm;
            } catch (e) { lastErr = e; console.warn('Tracker attempt failed', base, model, delegate, e); }
          }
        }
      }
      loadingModel = null;
      throw lastErr;
    })();
    return loadingModel;
  }

  // Called every animation frame by main.js
  T.tick = function (now) {
    const v = T.video;
    if (!T.ready || !v || v.readyState < 2) { T.hands = []; return; }
    if (now - lastDetect < 1000 / TRACK_FPS || v.currentTime === lastVideoTime) { ageHands(now); return; }
    lastDetect = now; lastVideoTime = v.currentTime;
    let res;
    try { res = T.landmarker.detectForVideo(v, now); } catch (e) { console.warn(e); return; }
    frames++;
    if (now - fpsT0 > 1000) { T.fps = Math.round((frames * 1000) / (now - fpsT0)); frames = 0; fpsT0 = now; }
    process(res, now);
  };

  function mapPt(x, y) { return WG.applyHomography(WG.calib.H, x, y); }

  function process(res, now) {
    const vw = T.video.videoWidth, vh = T.video.videoHeight;
    T.poses = (res && res.landmarks) || [];
    if (!WG.calib.H) { T.hands = []; return; }
    const S = WG.settings;

    // where is each kid standing? (shoulder centre mapped onto the wall)
    const people = T.poses.map((lm) => {
      const sx = (lm[11].x + lm[12].x) / 2 * vw, sy = (lm[11].y + lm[12].y) / 2 * vh;
      return { lm, cx: mapPt(sx, sy)[0] };
    }).sort((a, b) => a.cx - b.cx);

    people.forEach((p, i) => {
      if (S.players < 2) p.player = 0;
      else if (people.length >= 2) p.player = S.mirrorPlayers ? 1 - i : i;
      else p.player = WG.playerFromX(p.cx);
    });

    const seenKeys = new Set();
    for (const p of people) {
      const lm = p.lm;
      const hipVis = Math.min(vis(lm[23]), vis(lm[24]));
      const hipY = (lm[23].y + lm[24].y) / 2;
      for (const side of [['L', 15, 17, 19], ['R', 16, 18, 20]]) {
        const [name, wi, pi, ii] = side;
        const w = lm[wi], pk = lm[pi], ix = lm[ii];
        if (vis(w) < 0.35) continue;
        if (S.ignoreLowHands && hipVis > 0.4 && w.y > hipY + 0.01) continue; // arm hanging down
        // hand centre, pushed a little past the knuckles towards the fingertips
        const mx = (pk.x + ix.x) / 2, my = (pk.y + ix.y) / 2;
        const tx = mx + (mx - w.x) * 0.4, ty = my + (my - w.y) * 0.4;
        const [gx, gy] = mapPt(tx * vw, ty * vh);
        if (gx < -150 || gx > WG.W + 150 || gy < -150 || gy > WG.H + 150) continue;
        const key = p.player + name;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const s = smooth.get(key);
        if (!s) smooth.set(key, { x: gx, y: gy, seen: now, born: now, player: p.player });
        else {
          const d = WG.dist(gx, gy, s.x, s.y);
          const a = WG.clamp(0.35 + d / 220, 0.35, 0.95); // follow fast moves quickly, smooth small jitter
          s.x += (gx - s.x) * a; s.y += (gy - s.y) * a; s.seen = now; s.player = p.player;
        }
      }
    }
    ageHands(now);
  }

  function ageHands(now) {
    const out = [];
    for (const [key, s] of smooth) {
      if (now - s.seen > HAND_HOLD_MS) { smooth.delete(key); continue; }
      out.push({ id: 'c' + key, x: s.x, y: s.y, player: s.player, justAppeared: now - s.born < 60 && !s.reported });
      s.reported = true;
    }
    T.hands = out;
  }

  function vis(l) { return l && l.visibility != null ? l.visibility : 1; }

  // ---------- debug picture-in-picture (press D) ----------
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]];
  T.drawDebug = function (ctx) {
    const v = T.video;
    const w = 560, h = v && v.videoWidth ? (w * v.videoHeight) / v.videoWidth : 315, x = WG.W - w - 30, y = WG.H - h - 30;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; WG.art.rr(ctx, x - 10, y - 50, w + 20, h + 60, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = WG.art.font(26, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`Camera · ${T.ready ? T.fps + ' fps' : 'not ready'} · ${T.poses.length} kid(s) · ${T.hands.length} hand(s)`, x, y - 25);
    if (v && v.readyState >= 2) {
      ctx.drawImage(v, x, y, w, h);
      const sx = w / v.videoWidth, sy = h / v.videoHeight;
      if (WG.calib.camPts) {
        ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.beginPath();
        WG.calib.camPts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * sx, y + py * sy) : ctx.moveTo(x + px * sx, y + py * sy)));
        ctx.closePath(); ctx.stroke();
      }
      T.poses.forEach((lm, pi) => {
        ctx.strokeStyle = pi ? '#5fb8ff' : '#ff9a3a'; ctx.lineWidth = 3;
        for (const [a, b] of BONES) { ctx.beginPath(); ctx.moveTo(x + lm[a].x * w, y + lm[a].y * h); ctx.lineTo(x + lm[b].x * w, y + lm[b].y * h); ctx.stroke(); }
        ctx.fillStyle = '#fff';
        for (const i of [15, 16, 19, 20]) { ctx.beginPath(); ctx.arc(x + lm[i].x * w, y + lm[i].y * h, 5, 0, 7); ctx.fill(); }
      });
    } else {
      ctx.fillStyle = '#aaa'; ctx.fillText(WG.settings.inputMode === 'camera' ? 'No camera picture yet' : 'Mouse mode', x + 20, y + h / 2);
    }
    ctx.restore();
  };
})(window.WG);
