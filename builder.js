// The baker's side: pick who you are, design the cake, send the link.
(() => {
  'use strict';
  const C = window.Cake, App = window.App;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const isTouch = matchMedia('(pointer: coarse)').matches;

  // ---------- the baker's draft (kept on this device only) ----------
  const DRAFT_KEY = 'cake-draft-v1';
  function loadDraft() {
    try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (d) return C.normalize(d); } catch (e) {}
    return C.defaults();
  }
  let cfg = loadDraft();
  let saveTimer = 0;
  function update() {
    App.setCake(cfg);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(cfg)); } catch (e) {} }, 250);
  }

  // ---------- what can be chosen, tab by tab ----------
  const opts = (table, extra) => Object.keys(table).map(v => Object.assign({ v, label: table[v].label, emoji: table[v].emoji }, extra ? extra(table[v], v) : null));
  const flavorSw = f => ({ sw: `linear-gradient(90deg, ${f.dark}, ${f.light} 45%, ${f.base})` });
  const TABS = [
    { id: 'cake', label: '🎂 Cake', groups: [
      { key: 'tiers', title: 'Tiers', options: [1, 2, 3].map(n => ({ v: n, label: n === 1 ? '1 tier' : n + ' tiers' })) },
      { key: 'shape', title: 'Shape', options: opts(C.SHAPES) },
      { key: 'flavor', title: 'Flavor', options: opts(C.FLAVORS, flavorSw) },
      { key: 'plate', title: 'Plate', options: opts(C.PLATES, p => ({ sw: `linear-gradient(${p.a}, ${p.b})` })) }
    ] },
    { id: 'cream', label: '🍦 Cream', groups: [
      { key: 'cream', title: 'Cream color', options: opts(C.CREAMS, c => ({ sw: c.c })) },
      { key: 'style', title: 'Cream style', options: opts(C.STYLES) }
    ] },
    { id: 'top', label: '🍓 Toppings', groups: [
      { key: 'top', title: 'Pick as many as you like', multi: true, options: opts(C.TOPPINGS) }
    ] },
    { id: 'candles', label: '🕯️ Candles', groups: [
      { key: 'kind', title: 'Kind', options: [{ v: 'count', label: 'Candles', emoji: '🕯️' }, { v: 'number', label: 'Number candles', emoji: '🔢' }] },
      { special: 'amount' },
      { key: 'cstyle', title: 'Style', options: opts(C.CANDLE_STYLES) },
      { key: 'ccolor', title: 'Color', options: opts(C.CANDLE_COLORS, (c) => ({ sw: c.c || `conic-gradient(${C.RAINBOW.concat(C.RAINBOW[0]).join(',')})` })) }
    ] },
    { id: 'words', label: '✍️ Words', groups: [{ special: 'msg' }] }
  ];
  let tab = 'cake';

  const tabsEl = $('bTabs'), bodyEl = $('bBody');
  function renderTabs() {
    tabsEl.replaceChildren(...TABS.map(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab');
      b.dataset.tab = t.id;
      const [em, ...words] = t.label.split(' ');
      b.innerHTML = `<span class="em">${em}</span>${words.join(' ')}`;
      b.setAttribute('aria-selected', t.id === tab);
      return b;
    }));
  }
  tabsEl.addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (!b) return;
    tab = b.dataset.tab;
    renderTabs(); renderBody();
    bodyEl.scrollTop = 0;
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function isOn(key, v) { return key === 'top' ? cfg.top.includes(v) : String(cfg[key]) === String(v); }
  function chipHTML(key, o) {
    return `<button type="button" class="chip${o.sw ? ' has-sw' : ''}" data-key="${key}" data-val="${esc(o.v)}" aria-pressed="${isOn(key, o.v)}">` +
      (o.sw ? `<span class="sw" style="background:${o.sw}"></span>` : o.emoji ? `<span class="em">${o.emoji}</span>` : '') +
      `${esc(o.label)}</button>`;
  }

  function renderBody() {
    const t = TABS.find(x => x.id === tab);
    bodyEl.innerHTML = t.groups.map(g => {
      if (g.special === 'amount') {
        return cfg.kind === 'number'
          ? `<div class="group"><h3>Age</h3><input class="text-in num-in" id="bNum" type="text" inputmode="numeric" maxlength="3" placeholder="e.g. 25" value="${esc(cfg.num)}" autocomplete="off" enterkeyhint="done"><p class="note">One number candle per digit.</p></div>`
          : `<div class="group"><h3>How many</h3><div class="stepper"><button type="button" class="step" data-step="-1" aria-label="Fewer candles">−</button>` +
            `<output id="bCount">${cfg.candles}</output><button type="button" class="step" data-step="1" aria-label="More candles">+</button></div></div>`;
      }
      if (g.special === 'msg') {
        return `<div class="group"><h3>Message on the cake</h3><input class="text-in" id="bMsg" type="text" maxlength="${C.MAX_MSG}" placeholder="e.g. Love you! 💕" value="${esc(cfg.msg)}" autocomplete="off" enterkeyhint="done">` +
          `<p class="note"><span id="bMsgCount">${cfg.msg.length}</span>/${C.MAX_MSG} · piped onto the front of the cake</p>` +
          `<div class="chips">${['Love you!', 'Make a wish', 'Best day ever', 'Cheers! 🥂'].map(m => `<button type="button" class="chip" data-msg="${esc(m)}">${esc(m)}</button>`).join('')}</div></div>`;
      }
      return `<div class="group"><h3>${g.title}</h3><div class="chips">${g.options.map(o => chipHTML(g.key, o)).join('')}</div></div>`;
    }).join('');
  }

  bodyEl.addEventListener('click', e => {
    const chip = e.target.closest('[data-key]'), step = e.target.closest('[data-step]'), sample = e.target.closest('[data-msg]');
    if (chip) {
      const key = chip.dataset.key, v = chip.dataset.val;
      if (key === 'top') cfg.top = cfg.top.includes(v) ? cfg.top.filter(x => x !== v) : cfg.top.concat(v);
      else cfg[key] = key === 'tiers' ? +v : v;
      if (key === 'kind' && v === 'number' && !cfg.num) cfg.num = String(cfg.candles);
      update();
      renderBody();
    } else if (step) {
      cfg.candles = Math.min(12, Math.max(1, cfg.candles + +step.dataset.step));
      $('bCount').textContent = cfg.candles;
      update();
    } else if (sample) {
      cfg.msg = sample.dataset.msg;
      $('bMsg').value = cfg.msg; $('bMsgCount').textContent = cfg.msg.length;
      update();
    }
  });
  bodyEl.addEventListener('input', e => {
    if (e.target.id === 'bNum') {
      const v = e.target.value.replace(/\D/g, '').slice(0, 3);
      if (v !== e.target.value) e.target.value = v;
      cfg.num = v;
      update();
    } else if (e.target.id === 'bMsg') {
      cfg.msg = e.target.value.slice(0, C.MAX_MSG);
      $('bMsgCount').textContent = cfg.msg.length;
      update();
    }
  });
  // "Done" / Enter closes the phone keyboard
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('#builder input')) e.target.blur(); });

  const nameIn = $('bName');
  nameIn.addEventListener('input', () => { cfg.name = nameIn.value; update(); cfg.name = App.cake.name; });

  // ---------- switching between baker and birthday person ----------
  function enterBuild() {
    $('roles').classList.add('hidden');
    $('shareBox').classList.add('hidden');
    nameIn.value = cfg.name;
    App.setCake(cfg);
    App.enterBuild();
    renderTabs(); renderBody();
  }
  function blowNow(c, fromBuilder) {
    $('roles').classList.add('hidden');
    App.setCake(c);
    App.enterBlow({ fromBuilder });
  }
  $('roleBaker').addEventListener('click', enterBuild);
  $('roleBirthday').addEventListener('click', () => blowNow(C.normalize(Object.assign(C.defaults(), { name: '' })), false));
  $('blowNowBtn').addEventListener('click', () => blowNow(cfg, true));
  $('editBtn').addEventListener('click', enterBuild);
  $('backBtn').addEventListener('click', enterBuild);

  // ---------- sending ----------
  function shareUrl() { return location.href.split(/[?#]/)[0] + '?' + C.toParams(App.cake); }
  function shareText() {
    const n = App.cake.name;
    return n ? `🎂 I baked you a birthday cake, ${n}! Open it, make a wish and blow out the candles:` : '🎂 I baked you a birthday cake! Open it, make a wish and blow out the candles:';
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try {
      const inp = $('shareLink'); inp.focus(); inp.select(); inp.setSelectionRange(0, 99999);
      return document.execCommand('copy');
    } catch (e) { return false; }
  }
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  const canShare = () => !!navigator.share && isTouch;

  $('sendBtn').addEventListener('click', async () => {
    const url = shareUrl(), n = App.cake.name;
    $('shareLink').value = url;
    $('openLink').href = url;
    $('shareWarn').classList.toggle('hidden', /^https:/.test(location.protocol) || /^(localhost|127\.)/.test(location.hostname));
    $('nativeShareBtn').classList.toggle('hidden', !canShare());
    $('shareTitle').textContent = n ? `${n}'s cake is ready! 🎁` : 'Your cake is ready! 🎁';
    $('shareText').textContent = n ? `Send this link to ${n}:` : 'Send this link to the birthday person:';
    $('shareBox').classList.remove('hidden');
    if (canShare()) return;   // phones: let them choose "Share…" (opens the share sheet)
    if (await copy(url)) { $('shareText').textContent = (n ? `Link copied! Paste it in a message to ${n}.` : 'Link copied! Paste it in a message to the birthday person.'); }
  });
  $('copyBtn').addEventListener('click', async () => { toast(await copy($('shareLink').value) ? '📋 Link copied!' : 'Press and hold the link to copy it'); });
  $('nativeShareBtn').addEventListener('click', async () => {
    try { await navigator.share({ title: 'A birthday cake for you!', text: shareText(), url: $('shareLink').value }); }
    catch (e) { if (e && e.name !== 'AbortError') toast('Couldn\'t open sharing. Copy the link instead.'); }
  });
  $('shareLink').addEventListener('focus', e => e.target.select());
  $('shareClose').addEventListener('click', () => $('shareBox').classList.add('hidden'));
  addEventListener('keydown', e => { if (e.key === 'Escape') $('shareBox').classList.add('hidden'); });

  // ---------- first screen ----------
  if (C.hasCake(params)) {
    blowNow(C.fromParams(params), false);       // opened a cake someone sent: straight to blowing
  } else {
    App.setCake(cfg);
    $('roles').classList.remove('hidden');
  }
})();
