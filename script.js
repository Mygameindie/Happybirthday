(() => {
  'use strict';

  // ---------- settings from the URL: ?name=Mia&candles=7 ----------
  const params = new URLSearchParams(location.search);
  const name = (params.get('name') || '').trim().slice(0, 30);
  const candleCount = Math.min(12, Math.max(1, parseInt(params.get('candles') || params.get('age'), 10) || 5));

  const $ = id => document.getElementById(id);
  const titleEl = $('title'), statusEl = $('status');
  const meterFill = $('meterFill'), meterMark = $('meterMark');
  if (name) {
    titleEl.textContent = `Happy Birthday, ${name}!`;
    $('startTitle').textContent = `A cake for ${name}!`;
    document.title = `Happy Birthday, ${name}!`;
  }

  // Only touch the DOM when text actually changes (stops the status line flickering every frame).
  let lastStatus = '';
  function setStatus(text) {
    if (text === lastStatus) return;
    lastStatus = text;
    statusEl.textContent = text;
  }

  // ---------- device-specific hint ----------
  const UA = navigator.userAgent;
  const isIPad = /iPad/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isPhone = !isIPad && /iPhone|iPod|Android|Mobile/.test(UA);
  const isPC = !isIPad && !isPhone && !matchMedia('(pointer: coarse)').matches;
  const hintIcon = $('hintIcon'), hintText = $('hintText');
  const tapWord = isPC ? 'click the candles or hold Space' : 'tap each candle';

  function drawHint() {
    const puff = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="0" fill="#7ff0d8"><animate attributeName="r" values="0;5;0" dur="1.2s" repeatCount="indefinite"/></circle>`;
    if (isPC) {
      hintIcon.setAttribute('viewBox', '0 0 56 40');
      hintIcon.classList.add('laptop');
      hintIcon.innerHTML =
        '<rect x="8" y="3" width="40" height="26" rx="3" fill="none" stroke="#d9c8ff" stroke-width="2"/>' +
        '<circle cx="28" cy="6.5" r="1.6" fill="#ffcf5a"/>' +
        '<path d="M2 33 H54 L50 37 H6 Z" fill="none" stroke="#d9c8ff" stroke-width="2" stroke-linejoin="round"/>' + puff(28, 6.5);
      hintText.textContent = 'Blow toward your computer\'s microphone (on a laptop it\'s usually by the webcam). No mic? Hold the Space bar 🌬️';
    } else if (isIPad) {
      hintIcon.innerHTML =
        '<rect x="3" y="2" width="28" height="52" rx="6" fill="none" stroke="#d9c8ff" stroke-width="2"/>' +
        '<circle cx="17" cy="6" r="1.6" fill="#ffcf5a"/>' + puff(17, 6);
      hintText.textContent = 'Blow at the top edge of your iPad, near the camera. That\'s where iPad microphones are 🌬️';
    } else {
      hintIcon.innerHTML =
        '<rect x="3" y="2" width="28" height="52" rx="6" fill="none" stroke="#d9c8ff" stroke-width="2"/>' +
        '<rect x="13" y="49" width="8" height="2.4" rx="1.2" fill="#ffcf5a"/>' + puff(17, 56);
      hintText.textContent = 'Blow at the bottom of your phone, right at the charger port 🔌🌬️';
    }
  }
  if (isPC) {
    $('startBtn').textContent = '🎤 Click to start';
    $('startText').innerHTML = 'Allow the microphone, make a wish, and <b>blow toward your computer\'s mic</b> to blow out the candles.';
    $('noMicBtn').textContent = 'No mic? Click the candles or hold Space';
  }
  drawHint();

  // ---------- candles ----------
  const colors = ['#6fc3ff', '#ff8fb8', '#7ff0d8', '#ffcf5a', '#b48cff', '#ff9f6b'];
  const candlesEl = $('candles');
  let candles = [];

  function buildCandles() {
    const frag = document.createDocumentFragment();
    candles = [];
    for (let i = 0; i < candleCount; i++) {
      const el = document.createElement('div');
      el.className = 'candle';
      el.style.setProperty('--c', colors[i % colors.length]);
      el.style.height = (52 + Math.random() * 18) + '%';
      el.innerHTML = '<div class="flame"><b></b><i></i></div><div class="smoke"></div><div class="smoke"></div><div class="smoke"></div>';
      el.querySelectorAll('.smoke').forEach(s => s.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px'));
      const c = { el, flame: el.querySelector('.flame'), health: 0.35 + Math.random() * 0.4, lit: true, phase: Math.random() * 6.28, lean: '', size: '', stretch: '' };
      frag.appendChild(el);
      candles.push(c);
    }
    candlesEl.replaceChildren(frag);
  }
  buildCandles();

  // One delegated listener: works for rebuilt candles, and pointerdown reacts faster than click on touch screens.
  candlesEl.addEventListener('pointerdown', e => {
    const el = e.target.closest('.candle');
    if (!el || celebrating) return;
    const c = candles.find(x => x.el === el);
    if (c && c.lit) { c.health = 0; extinguish(c); }
  });

  // ---------- audio ----------
  let audioCtx = null, analyser = null, source = null, stream = null, freq = null, waveF = null, waveB = null;
  let baseline = null, calibUntil = 0, listening = false, celebrating = false, starting = false, micWanted = false;
  let blowFrames = 0;

  const sens = $('sens');
  try {
    const saved = parseInt(localStorage.getItem('cake-sens-v2'), 10);
    if (saved >= 1 && saved <= 10) sens.value = saved;
  } catch (e) {}
  sens.addEventListener('input', () => { try { localStorage.setItem('cake-sens-v2', sens.value); } catch (e) {} });

  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    // iOS can leave the context 'suspended' or 'interrupted' (after a call, a lock, Siri…)
    if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  // Any touch or click wakes the audio up again if the browser paused it.
  addEventListener('pointerdown', () => { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {}); }, { passive: true });

  async function startMic() {
    if (starting) return;             // ignore double taps while the permission prompt is open
    starting = true;
    try {
      stopMic();
      const ctx = getCtx();
      if (!ctx) throw new Error('Web Audio unavailable');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia unavailable');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      freq = new Uint8Array(analyser.frequencyBinCount);
      waveF = new Float32Array(analyser.fftSize);
      waveB = new Uint8Array(analyser.fftSize);
      // If the mic is cut off (phone call, screen lock, unplugged headset), ask to turn it back on.
      stream.getAudioTracks().forEach(t => t.addEventListener('ended', onMicLost));
      baseline = null;
      blowFrames = 0;
      calibUntil = performance.now() + 900;
      listening = true;
      showMicUI(true);
      setStatus('Listening… make a wish, then blow!');
    } finally {
      starting = false;
    }
  }

  function stopMic() {
    listening = false;
    blowFrames = 0;
    if (source) { try { source.disconnect(); } catch (e) {} source = null; }
    analyser = null;
    if (stream) { stream.getTracks().forEach(t => { t.removeEventListener('ended', onMicLost); t.stop(); }); stream = null; }
  }

  function micIsDead() {
    return !stream || stream.getAudioTracks().every(t => t.readyState === 'ended');
  }

  function onMicLost() {
    if (!micWanted || celebrating) return;
    stopMic();
    showResume();
  }

  // Coming back to the tab: wake the audio, and re-open the mic if the system closed it.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { spaceHeld = false; return; }
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
    if (micWanted && !celebrating && micIsDead()) showResume();
    else if (listening) { calibUntil = performance.now() + 600; baseline = null; } // re-learn room noise
  });

  // Blowing on a mic = loud, broadband, mostly low-frequency rumble.
  function readBlow() {
    if (!listening || !analyser || !audioCtx || audioCtx.state !== 'running') return 0;
    analyser.getByteFrequencyData(freq);

    let rms = 0;
    if (analyser.getFloatTimeDomainData) {
      analyser.getFloatTimeDomainData(waveF);
      for (let i = 0; i < waveF.length; i++) rms += waveF[i] * waveF[i];
    } else { // older Safari
      analyser.getByteTimeDomainData(waveB);
      for (let i = 0; i < waveB.length; i++) { const v = (waveB[i] - 128) / 128; rms += v * v; }
    }
    rms = Math.sqrt(rms / analyser.fftSize);

    const hzPerBin = audioCtx.sampleRate / analyser.fftSize;
    const lowEnd = Math.max(4, Math.round(1500 / hzPerBin));
    const midEnd = Math.min(freq.length, Math.round(5000 / hzPerBin));
    let low = 0, mid = 0, nz = 0;
    for (let i = 1; i < lowEnd; i++) low += freq[i];
    for (let i = lowEnd; i < midEnd; i++) { mid += freq[i]; if (freq[i] > 60) nz++; }
    low /= (lowEnd - 1);
    mid /= Math.max(1, midEnd - lowEnd);
    const spread = nz / Math.max(1, midEnd - lowEnd);
    const level = low * 0.75 + mid * 0.25;

    const now = performance.now();
    if (baseline === null) baseline = level;
    if (now < calibUntil) {
      // lean toward the quieter readings, so blowing early doesn't spoil calibration
      baseline = level < baseline ? baseline * 0.6 + level * 0.4 : baseline * 0.95 + level * 0.05;
      return 0;
    }
    baseline = Math.min(baseline, 110);

    const s = +sens.value;               // 1..10
    const margin = 48 - s * 4.2;         // 43.8 .. 6
    const threshold = Math.max(baseline + margin, 32 + (10 - s) * 5);
    const meterMax = threshold + 70;
    setMeter(level / meterMax, threshold / meterMax);

    if (level > threshold && rms > 0.006 + (10 - s) * 0.004 && spread > 0.04) {
      blowFrames++;
      // need ~3 frames in a row, so a tap on the phone or a click doesn't count as a blow
      if (blowFrames >= 3) return Math.min(1, (level - threshold) / 35 + 0.45);
      return 0;
    }
    blowFrames = 0;
    baseline = baseline * 0.995 + Math.min(level, baseline + 10) * 0.005; // follow the room slowly
    return 0;
  }

  let meterShown = -1, markShown = -1;
  function setMeter(v, mark) {
    v = Math.max(0, Math.min(1, v)); mark = Math.max(0, Math.min(1, mark));
    if (Math.abs(v - meterShown) > 0.005) { meterFill.style.transform = `scaleX(${v.toFixed(3)})`; meterShown = v; }
    if (Math.abs(mark - markShown) > 0.005) { meterMark.style.left = (mark * 100).toFixed(1) + '%'; markShown = mark; }
  }

  // ---------- keyboard (PC) ----------
  let spaceHeld = false;
  addEventListener('keydown', e => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (e.target && e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();             // also stops Space from "pressing" a focused button
    if (e.repeat && spaceHeld) return;
    if (!$('start').classList.contains('hidden')) return;
    spaceHeld = true;
  });
  addEventListener('keyup', e => { if (e.code === 'Space' || e.key === ' ') spaceHeld = false; });
  addEventListener('blur', () => { spaceHeld = false; });

  // ---------- animation loop ----------
  let last = performance.now(), blowSmooth = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    let blow = 0;
    try { blow = readBlow(); } catch (e) { console.warn(e); }
    if (spaceHeld && !celebrating) blow = Math.max(blow, 0.9);
    blowSmooth += (blow - blowSmooth) * Math.min(1, dt * 14);
    if (blowSmooth < 0.001) blowSmooth = 0;

    let litCount = 0;
    for (const c of candles) {
      if (!c.lit) continue;
      c.phase += dt * (3 + blowSmooth * 25);
      const wobble = Math.sin(c.phase) * (2 + blowSmooth * 14);
      const lean = (blowSmooth * (28 + Math.sin(c.phase * 1.7) * 10) + wobble).toFixed(1) + 'deg';
      const size = (1 - blowSmooth * 0.45 + Math.sin(c.phase * 2.3) * 0.03).toFixed(2);
      const stretch = (1 + blowSmooth * 0.35).toFixed(2);
      if (lean !== c.lean) { c.flame.style.setProperty('--lean', lean); c.lean = lean; }
      if (size !== c.size) { c.flame.style.setProperty('--size', size); c.size = size; }
      if (stretch !== c.stretch) { c.flame.style.setProperty('--stretch', stretch); c.stretch = stretch; }
      if (blow > 0) {
        c.health -= blow * dt * (2.5 + Math.random() * 2.5);
        if (c.health <= 0) { extinguish(c); continue; }
      } else if (c.health < 0.75) {
        c.health += dt * 0.08;
      }
      litCount++;
    }
    if (blowSmooth > 0.15 && litCount && !celebrating) setStatus('Keep blowing! 🌬️');
  }
  requestAnimationFrame(loop);

  function extinguish(c) {
    if (!c.lit) return;
    c.lit = false;
    c.el.classList.add('out');
    try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) {}
    const left = candles.filter(x => x.lit).length;
    if (left === 0) celebrate();
    else setStatus(`${left} candle${left > 1 ? 's' : ''} left. Blow again!`);
  }

  // ---------- celebration ----------
  let songTimer = 0;
  function celebrate() {
    if (celebrating) return;
    celebrating = true;
    spaceHeld = false;
    stopMic();
    document.body.classList.add('dark-room');
    setStatus(name ? `Yay! Your wish will come true, ${name}! 🎉` : 'Yay! Your wish will come true! 🎉');
    setMeter(0, markShown < 0 ? 0 : markShown);
    $('again').classList.remove('hidden');
    $('hint').classList.add('hidden');
    burstConfetti();
    clearTimeout(songTimer);
    songTimer = setTimeout(playSong, 500);
  }

  $('again').addEventListener('click', async () => {
    if (!celebrating) return;
    clearTimeout(songTimer);
    stopSong();
    celebrating = false;
    document.body.classList.remove('dark-room');
    $('again').classList.add('hidden');
    $('hint').classList.remove('hidden');
    buildCandles();
    setStatus('Make a wish… then blow!');
    if (micWanted) { try { await startMic(); } catch (e) { micFailed(e); } }
    else setStatus(isPC ? 'Make a wish… then click the candles or hold Space!' : 'Make a wish… then tap the candles!');
  });

  // ---------- Happy Birthday melody (public domain) ----------
  let songNodes = [], songGain = null;
  function playSong() {
    if (!celebrating) return;
    const ctx = getCtx();
    if (!ctx) return;
    stopSong();
    const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
    const tune = [
      ['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],
      ['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2],
      ['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],
      ['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',3]
    ];
    const beat = 0.42;
    let t = ctx.currentTime + 0.08;
    songGain = ctx.createGain(); songGain.gain.value = 0.22; songGain.connect(ctx.destination);
    for (const [n, d] of tune) {
      const dur = d * beat;
      for (const [type, mult, vol] of [['triangle', 1, 1], ['sine', 2, 0.25]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = N[n] * mult;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
        o.connect(g); g.connect(songGain);
        o.start(t); o.stop(t + dur);
        songNodes.push(o);
      }
      t += dur;
    }
  }
  function stopSong() {
    if (songGain && audioCtx) {
      // quick fade instead of a hard cut (avoids a click/pop)
      try { songGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02); } catch (e) {}
      const g = songGain, nodes = songNodes;
      setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, 120);
    }
    songNodes = []; songGain = null;
  }

  // ---------- confetti ----------
  const cv = $('confetti'), cx = cv.getContext('2d');
  let parts = [], confettiRunning = false, vw = innerWidth, vh = innerHeight;
  function sizeCanvas() {
    vw = innerWidth; vh = innerHeight;
    const r = Math.min(2, devicePixelRatio || 1); // cap: 3x screens make a huge canvas and stutter
    cv.width = Math.round(vw * r); cv.height = Math.round(vh * r);
    cx.setTransform(r, 0, 0, r, 0, 0);
  }
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(sizeCanvas, 100); };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  sizeCanvas();

  function burstConfetti() {
    const cols = ['#ffcf5a', '#ff8fb8', '#7ff0d8', '#b48cff', '#6fc3ff', '#ffffff'];
    const count = matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 200;
    for (let i = 0; i < count; i++) {
      parts.push({
        x: vw / 2 + (Math.random() - .5) * 80, y: vh * 0.45,
        vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
        r: Math.random() * 6.28, vr: (Math.random() - .5) * 0.4,
        c: cols[i % cols.length]
      });
    }
    if (parts.length > 600) parts.splice(0, parts.length - 600);
    if (!confettiRunning) { confettiRunning = true; lastConfetti = performance.now(); requestAnimationFrame(drawConfetti); }
  }
  let lastConfetti = 0;
  function drawConfetti(now) {
    // frame-rate independent: same speed on 60Hz and 120Hz screens
    const k = Math.min(3, Math.max(0.2, (now - lastConfetti) / 16.67)); lastConfetti = now;
    cx.clearRect(0, 0, vw, vh);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.35 * k; p.vx *= Math.pow(0.99, k); p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
      if (p.y > vh + 20) continue;
      parts[alive++] = p;
      const cos = Math.cos(p.r), sin = Math.sin(p.r);
      cx.setTransform(cos * (cv.width / vw), sin * (cv.width / vw), -sin * (cv.height / vh), cos * (cv.height / vh), p.x * (cv.width / vw), p.y * (cv.height / vh));
      cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
    }
    parts.length = alive;
    const r = cv.width / vw; cx.setTransform(r, 0, 0, r, 0, 0);
    if (alive) requestAnimationFrame(drawConfetti);
    else { confettiRunning = false; cx.clearRect(0, 0, vw, vh); }
  }

  // ---------- start / resume ----------
  function showMicUI(on) {
    $('meter').classList.toggle('hidden', !on);
    $('sensRow').classList.toggle('hidden', !on);
  }

  function micFailed(e) {
    console.warn(e);
    micWanted = false;
    stopMic();
    showMicUI(false);
    hintText.textContent = !window.isSecureContext
      ? `The microphone needs an https:// link. For now, ${tapWord} to blow them out 👆`
      : `Couldn't use the microphone. ${tapWord[0].toUpperCase() + tapWord.slice(1)} to blow them out 👆`;
    setStatus(isPC ? 'Make a wish… then click the candles or hold Space!' : 'Make a wish… then tap the candles!');
  }

  function showResume() {
    $('startTitle').textContent = 'Welcome back!';
    $('startText').textContent = 'The microphone was paused. Turn it back on to keep blowing.';
    $('startBtn').textContent = '🎤 Turn the mic back on';
    $('start').classList.remove('hidden');
    setStatus('Microphone paused');
  }

  const startBtn = $('startBtn');
  startBtn.addEventListener('click', async () => {
    if (startBtn.disabled) return;
    startBtn.disabled = true;
    micWanted = true;
    getCtx(); // must be created inside the tap on iOS
    try {
      await startMic();
      $('start').classList.add('hidden');
      drawHint();
    } catch (e) {
      $('start').classList.add('hidden');
      micFailed(e);
    } finally {
      startBtn.disabled = false;
    }
  });
  $('noMicBtn').addEventListener('click', () => {
    getCtx();
    $('start').classList.add('hidden');
    micFailed(new Error('user chose no mic'));
    hintText.textContent = isPC ? 'Click each candle, or hold the Space bar to blow 🌬️' : 'Tap each candle to blow it out 👆';
  });

  // ---------- stop iOS zoom / bounce glitches ----------
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.target.type !== 'range') e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => { if (e.target.closest('.cake-wrap')) e.preventDefault(); });
})();
