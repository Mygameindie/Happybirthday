// Cake model + SVG drawing. Shared by the blow page (script.js) and the builder (builder.js).
(() => {
  'use strict';

  // ---------- options ----------
  const FLAVORS = {
    vanilla:    { label: 'Vanilla',    emoji: '🍦', base: '#f5d998', light: '#fff0c9', dark: '#d2a85c' },
    chocolate:  { label: 'Chocolate',  emoji: '🍫', base: '#7b4a2c', light: '#a06a45', dark: '#4e2b17' },
    strawberry: { label: 'Strawberry', emoji: '🍓', base: '#ff9cc1', light: '#ffc6db', dark: '#e2729c' },
    redvelvet:  { label: 'Red velvet', emoji: '❤️', base: '#c8364d', light: '#e65b70', dark: '#8f1f33' },
    matcha:     { label: 'Matcha',     emoji: '🍵', base: '#9fcf7f', light: '#c6e8ab', dark: '#6ea353' },
    ube:        { label: 'Ube',        emoji: '💜', base: '#a383e6', light: '#c6b0f6', dark: '#7656c2' }
  };
  const CREAMS = {
    white:     { label: 'White',     c: '#fff6fb' },
    pink:      { label: 'Pink',      c: '#ffc6dc' },
    chocolate: { label: 'Chocolate', c: '#6b3d22' },
    mint:      { label: 'Mint',      c: '#c4f3e2' },
    lilac:     { label: 'Lilac',     c: '#e0d0ff' },
    lemon:     { label: 'Lemon',     c: '#fff2a3' },
    blue:      { label: 'Blue',      c: '#c5e4ff' }
  };
  const STYLES = {
    drips:    { label: 'Drips',    emoji: '💧' },
    layered:  { label: 'Layered',  emoji: '🥞' },
    swirls:   { label: 'Swirls',   emoji: '🍦' },
    rosettes: { label: 'Rosettes', emoji: '🌹' }
  };
  const SHAPES = {
    round:  { label: 'Round',  emoji: '⚪' },
    square: { label: 'Square', emoji: '🟪' },
    heart:  { label: 'Heart',  emoji: '❤️' }
  };
  const TOPPINGS = {
    sprinkles:    { label: 'Sprinkles',    emoji: '🌈' },
    stars:        { label: 'Stars',        emoji: '⭐' },
    strawberries: { label: 'Strawberries', emoji: '🍓' },
    cherries:     { label: 'Cherries',     emoji: '🍒' },
    macarons:     { label: 'Macarons',     emoji: '🍬' },
    chocolate:    { label: 'Chocolate',    emoji: '🍫' }
  };
  const RIM_TOPPINGS = ['strawberries', 'cherries', 'macarons', 'chocolate'];
  const CANDLE_STYLES = {
    striped: { label: 'Striped' },
    solid:   { label: 'Plain' },
    sparkle: { label: 'Sparkle' }
  };
  const RAINBOW = ['#6fc3ff', '#ff8fb8', '#7ff0d8', '#ffcf5a', '#b48cff', '#ff9f6b'];
  const CANDLE_COLORS = {
    rainbow: { label: 'Rainbow', c: null },
    pink:    { label: 'Pink',    c: '#ff8fb8' },
    blue:    { label: 'Blue',    c: '#6fc3ff' },
    gold:    { label: 'Gold',    c: '#ffcf5a' },
    mint:    { label: 'Mint',    c: '#7ff0d8' },
    purple:  { label: 'Purple',  c: '#b48cff' },
    red:     { label: 'Red',     c: '#ff5d6c' }
  };
  const PLATES = {
    white: { label: 'White', a: '#f7f3ff', b: '#b9b0d6' },
    gold:  { label: 'Gold',  a: '#ffe7a0', b: '#c48f2a' },
    pink:  { label: 'Pink',  a: '#ffd9e8', b: '#e08aae' },
    blue:  { label: 'Blue',  a: '#d8edff', b: '#7fa6d6' }
  };

  const PIC_PLACES = {
    front: { label: 'Printed on the front', emoji: '🖼️' },
    top:   { label: 'Topper on a stick',    emoji: '🪧' }
  };
  const PIC_SHAPES = {
    circle: { label: 'Circle', emoji: '⚪' },
    heart:  { label: 'Heart',  emoji: '❤️' },
    square: { label: 'Square', emoji: '⬜' }
  };
  // Photos: the baker's device keeps a sharp copy (photo); when the cake is sent it is uploaded
  // to Supabase Storage and the link only carries its id (?pid=...).
  // If the upload fails, a tiny copy rides inside the link instead (#p=..., kept short for chat apps).
  const CLOUD = {
    url: 'https://dcluindkvsbualyexaoh.supabase.co',
    key: 'sb_publishable_x6wP17obaB3WaduaB4gDhA_HzFpE1dY',   // public key: can only add new photos
    bucket: 'cake-photos'
  };
  const PHOTO_MAX = 4200;          // tiny in-link copy (base64 characters)
  const PHOTO_LOCAL_MAX = 400000;  // sharp copy kept on the baker's device
  const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
  const PID_RE = /^[A-Za-z0-9_-]{20,40}\.jpg$/;
  const photoUrl = id => `${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/${id}`;
  const photoSrc = c => c.photo || (c.photoId ? photoUrl(c.photoId) : '');

  const DEFAULTS = {
    name: '', tiers: 2, shape: 'round', flavor: 'strawberry', cream: 'white', style: 'drips',
    top: ['sprinkles'], kind: 'count', candles: 5, num: '', cstyle: 'striped', ccolor: 'rainbow',
    msg: '', plate: 'white', photo: '', photoId: '', pic: 'front', picshape: 'circle'
  };
  const MAX_NAME = 30, MAX_MSG = 24;

  const has = (table, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(table, k);
  const pick = (v, table, d) => has(table, v) ? v : d;

  // Turn anything (a draft from storage, values from a link) into a valid cake.
  function normalize(o) {
    o = o && typeof o === 'object' ? o : {};
    const d = DEFAULTS;
    const tiers = parseInt(o.tiers, 10), candles = parseInt(o.candles, 10);
    const top = Array.isArray(o.top) ? o.top.filter(t => has(TOPPINGS, t)) : d.top;
    return {
      name: String(o.name == null ? '' : o.name).trim().slice(0, MAX_NAME),
      tiers: tiers >= 1 && tiers <= 3 ? tiers : d.tiers,
      shape: pick(o.shape, SHAPES, d.shape),
      flavor: pick(o.flavor, FLAVORS, d.flavor),
      cream: pick(o.cream, CREAMS, d.cream),
      style: pick(o.style, STYLES, d.style),
      top: [...new Set(top)],
      kind: o.kind === 'number' ? 'number' : 'count',
      candles: candles >= 1 && candles <= 12 ? candles : d.candles,
      num: String(o.num == null ? '' : o.num).replace(/\D/g, '').slice(0, 3),
      cstyle: pick(o.cstyle, CANDLE_STYLES, d.cstyle),
      ccolor: pick(o.ccolor, CANDLE_COLORS, d.ccolor),
      msg: String(o.msg == null ? '' : o.msg).replace(/\s+/g, ' ').slice(0, MAX_MSG),
      plate: pick(o.plate, PLATES, d.plate),
      photo: typeof o.photo === 'string' && o.photo.length <= PHOTO_LOCAL_MAX && PHOTO_RE.test(o.photo) ? o.photo : '',
      photoId: typeof o.photoId === 'string' && PID_RE.test(o.photoId) ? o.photoId : '',
      pic: pick(o.pic, PIC_PLACES, d.pic),
      picshape: pick(o.picshape, PIC_SHAPES, d.picshape)
    };
  }

  // ---------- links: ?name=Mia&tiers=3&flavor=chocolate... ----------
  // The photo goes after the # (#p=...), written base64url so chat apps don't mangle it.
  const LINK_KEYS = ['pid', 'name', 'tiers', 'shape', 'flavor', 'cream', 'style', 'top', 'candles', 'age', 'num', 'cstyle', 'ccolor', 'msg', 'plate', 'pic', 'picshape'];
  const hashPhoto = hash => {
    const m = /(?:^#|&)p=([A-Za-z0-9_-]+)/.exec(hash || '');
    if (!m) return '';
    const b = m[1].replace(/-/g, '+').replace(/_/g, '/');
    return 'data:image/jpeg;base64,' + b + '='.repeat((4 - b.length % 4) % 4);
  };
  function hasCake(p, hash) { return LINK_KEYS.some(k => p.has(k)) || !!hashPhoto(hash); }
  function fromLocation(loc) {
    const c = fromParams(new URLSearchParams(loc.search));
    if (!c.photoId) c.photo = normalize({ photo: hashPhoto(loc.hash) }).photo;
    return c;
  }
  // Only for the fallback: a tiny photo (data URL) carried after the #.
  function photoHash(tiny) {
    return tiny ? '#p=' + tiny.split(',')[1].replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
  }
  // Upload a JPEG blob; resolves to its new id.
  async function uploadPhoto(blob) {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_') + '.jpg';
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 20000);
    try {
      const res = await fetch(`${CLOUD.url}/storage/v1/object/${CLOUD.bucket}/${id}`, {
        method: 'POST',
        headers: { apikey: CLOUD.key, Authorization: 'Bearer ' + CLOUD.key, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': '31536000' },
        body: blob,
        signal: ctrl ? ctrl.signal : undefined
      });
      if (!res.ok) throw new Error('upload failed: ' + res.status);
      return id;
    } finally { clearTimeout(timer); }
  }
  function fromParams(p) {
    const o = {};
    for (const k of ['name', 'tiers', 'shape', 'flavor', 'cream', 'style', 'cstyle', 'ccolor', 'msg', 'plate', 'pic', 'picshape']) if (p.has(k)) o[k] = p.get(k);
    if (p.has('top')) o.top = p.get('top') === 'none' ? [] : p.get('top').split(',');
    const n = p.get('candles') || p.get('age');      // old links used ?candles= or ?age=
    if (n) o.candles = n;
    if (p.get('num')) { o.num = p.get('num'); o.kind = 'number'; }
    if (p.get('pid')) o.photoId = p.get('pid');
    return normalize(o);
  }
  function toParams(c) {
    const p = new URLSearchParams();
    if (c.name) p.set('name', c.name);
    p.set('tiers', c.tiers); p.set('shape', c.shape); p.set('flavor', c.flavor);
    p.set('cream', c.cream); p.set('style', c.style);
    p.set('top', c.top.length ? c.top.join(',') : 'none');
    if (c.kind === 'number' && c.num) p.set('num', c.num); else p.set('candles', c.candles);
    p.set('cstyle', c.cstyle); p.set('ccolor', c.ccolor); p.set('plate', c.plate);
    if (c.msg.trim()) p.set('msg', c.msg.trim());
    if (c.photoId) p.set('pid', c.photoId);
    if (c.photo || c.photoId) { p.set('pic', c.pic); p.set('picshape', c.picshape); }
    return p.toString().replace(/%2C/g, ',');
  }

  // Which candles stand on the cake: plain candles, or one per digit ("2", "5").
  function candleList(c) {
    const digits = c.kind === 'number' && c.num ? c.num.replace(/^0+(?=\d)/, '').split('') : null;
    const n = digits ? digits.length : c.candles;
    const col = CANDLE_COLORS[c.ccolor].c;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ digit: digits ? digits[i] : null, color: col || RAINBOW[i % RAINBOW.length] });
    return out;
  }

  // ---------- color helpers ----------
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  function mix(a, b, t) {
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const INK = '#2a1530';

  // Same "random" every time, so the preview doesn't jump around while you design.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- geometry (viewBox 0 0 400 420) ----------
  const LAYOUTS = {
    1: [{ w: 300, h: 150 }],
    2: [{ w: 340, h: 112 }, { w: 248, h: 92 }],
    3: [{ w: 356, h: 88 }, { w: 270, h: 74 }, { w: 188, h: 64 }]
  };
  const CX = 200, FRONT_BOTTOM = 394;

  // The top surface of a tier, seen a little from above.
  function outline(shape, cx, cy, w) {
    const pts = [];
    if (shape === 'heart') {
      const raw = [];
      for (let i = 0; i < 96; i++) {
        const t = i / 96 * Math.PI * 2;
        raw.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
      }
      let y0 = Infinity, y1 = -Infinity;
      for (const p of raw) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const depth = w * 0.36;
      for (const [x, y] of raw) pts.push([cx + x / 16 * (w / 2), cy + ((y - y0) / (y1 - y0) - 0.5) * depth]);
    } else if (shape === 'square') {
      const ry = w * 0.11, r = 0.22;
      const corners = [[1 - r, 1 - r, 0], [-1 + r, 1 - r, 90], [-1 + r, -1 + r, 180], [1 - r, -1 + r, 270]];
      for (const [ux, uy, a0] of corners) {
        for (let k = 0; k <= 9; k++) {
          const a = (a0 + k * 10) * Math.PI / 180;
          const u = ux + r * Math.cos(a), v = uy + r * Math.sin(a);
          pts.push([cx + u * (w / 2) * (0.86 + 0.14 * (v + 1) / 2), cy + v * ry]);
        }
      }
    } else {
      const ry = w * 0.11;
      for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; pts.push([cx + Math.cos(a) * w / 2, cy + Math.sin(a) * ry]); }
    }
    return pts;
  }

  // Lowest (nearest to you) point of the outline at a given x: where the side of the cake starts.
  function frontY(pts, x) {
    let best = -Infinity;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
      if (x < lo || x > hi || lo === hi) continue;
      const y = a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
      if (y > best) best = y;
    }
    return best === -Infinity ? null : best;
  }
  function bounds(pts) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, x1, y0, y1 };
  }
  // Points spread evenly around the outline (for piping and fruit on the edge).
  function along(pts, spacing) {
    const n = pts.length, segs = [];
    let total = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push(d); total += d; }
    const count = Math.max(5, Math.round(total / spacing)), step = total / count, out = [];
    let acc = 0, i = 0;
    for (let k = 0; k < count; k++) {
      const target = (k + 0.5) * step;
      while (i < n - 1 && acc + segs[i] < target) { acc += segs[i]; i++; }
      const t = segs[i] ? (target - acc) / segs[i] : 0, a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  }
  const f1 = v => (Math.round(v * 10) / 10).toString();
  const pathOf = (pts, close = true) => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') + (close ? 'Z' : '');
  const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // ---------- little drawings ----------
  function swirl(x, y, s, fill, line) {
    return `<g fill="${fill}" stroke="${line}" stroke-width="1.5">` +
      `<ellipse cx="${f1(x)}" cy="${f1(y - s * 0.25)}" rx="${f1(s)}" ry="${f1(s * 0.5)}"/>` +
      `<ellipse cx="${f1(x)}" cy="${f1(y - s * 0.7)}" rx="${f1(s * 0.72)}" ry="${f1(s * 0.42)}"/>` +
      `<ellipse cx="${f1(x)}" cy="${f1(y - s * 1.08)}" rx="${f1(s * 0.45)}" ry="${f1(s * 0.32)}"/>` +
      `<path d="M${f1(x - s * 0.22)} ${f1(y - s * 1.28)}Q${f1(x)} ${f1(y - s * 1.8)} ${f1(x + s * 0.14)} ${f1(y - s * 1.36)}"/></g>`;
  }
  function rosette(x, y, s, fill, line) {
    const cy = y - s * 0.6;
    return `<g fill="${fill}" stroke="${line}" stroke-width="1.5"><circle cx="${f1(x)}" cy="${f1(cy)}" r="${f1(s * 0.95)}"/>` +
      `<path fill="none" d="M${f1(x - s * 0.12)} ${f1(cy)}a${f1(s * 0.14)} ${f1(s * 0.14)} 0 1 1 ${f1(s * 0.28)} 0` +
      `a${f1(s * 0.35)} ${f1(s * 0.35)} 0 1 1 ${f1(-s * 0.66)} 0a${f1(s * 0.58)} ${f1(s * 0.58)} 0 1 1 ${f1(s * 1.12)} ${f1(-s * 0.06)}"/></g>`;
  }
  function strawberry(x, y, s) {
    const h = s * 1.3, w = s * 0.95, top = y - h;
    return `<path d="M${f1(x)} ${f1(y)}C${f1(x - w * 1.15)} ${f1(y - h * 0.35)} ${f1(x - w * 0.95)} ${f1(top)} ${f1(x)} ${f1(top + h * 0.08)}` +
      `C${f1(x + w * 0.95)} ${f1(top)} ${f1(x + w * 1.15)} ${f1(y - h * 0.35)} ${f1(x)} ${f1(y)}Z" fill="#ff4d6a" stroke="#a81a37" stroke-width="1.4"/>` +
      [[-0.3, 0.45], [0.28, 0.42], [0, 0.65], [-0.15, 0.28], [0.18, 0.25]].map(([dx, dy]) =>
        `<ellipse cx="${f1(x + dx * w)}" cy="${f1(y - dy * h)}" rx="${f1(s * 0.06)}" ry="${f1(s * 0.1)}" fill="#ffe9a8"/>`).join('') +
      `<path d="M${f1(x - s * 0.55)} ${f1(top + h * 0.06)}L${f1(x - s * 0.15)} ${f1(top - h * 0.04)}L${f1(x)} ${f1(top - h * 0.25)}L${f1(x + s * 0.15)} ${f1(top - h * 0.04)}` +
      `L${f1(x + s * 0.55)} ${f1(top + h * 0.06)}L${f1(x)} ${f1(top + h * 0.16)}Z" fill="#4fbf5a" stroke="#2c7d36" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  function cherry(x, y, s) {
    const cy = y - s * 0.62;
    return `<path d="M${f1(x)} ${f1(cy - s * 0.5)}Q${f1(x + s * 0.2)} ${f1(cy - s * 1.5)} ${f1(x + s * 0.8)} ${f1(cy - s * 1.65)}" fill="none" stroke="#4f8a2a" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="${f1(x)}" cy="${f1(cy)}" r="${f1(s * 0.66)}" fill="#e8213f" stroke="#8f0c22" stroke-width="1.4"/>` +
      `<ellipse cx="${f1(x - s * 0.22)}" cy="${f1(cy - s * 0.22)}" rx="${f1(s * 0.16)}" ry="${f1(s * 0.11)}" fill="#fff" opacity=".75"/>`;
  }
  const MACARON = ['#ffb3cf', '#bfe8ff', '#c9f5c1', '#e3d0ff', '#fff0a0'];
  function macaron(x, y, s, k) {
    const c = MACARON[k % MACARON.length], line = mix(c, INK, 0.35);
    return `<g stroke="${line}" stroke-width="1.3"><ellipse cx="${f1(x)}" cy="${f1(y - s * 0.36)}" rx="${f1(s * 0.78)}" ry="${f1(s * 0.33)}" fill="${c}"/>` +
      `<ellipse cx="${f1(x)}" cy="${f1(y - s * 0.62)}" rx="${f1(s * 0.7)}" ry="${f1(s * 0.15)}" fill="#fffaf2"/>` +
      `<ellipse cx="${f1(x)}" cy="${f1(y - s * 0.9)}" rx="${f1(s * 0.78)}" ry="${f1(s * 0.36)}" fill="${c}"/></g>`;
  }
  function chocolate(x, y, s, k) {
    const a = (k * 47) % 50 - 25;
    return `<g transform="translate(${f1(x)} ${f1(y - s * 0.7)}) rotate(${a})"><path d="M${f1(-s * 0.7)} ${f1(s * 0.45)}L${f1(-s * 0.2)} ${f1(-s * 0.75)}L${f1(s * 0.7)} ${f1(s * 0.45)}Z" fill="#5a3019" stroke="#2a1309" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M${f1(-s * 0.25)} ${f1(-s * 0.4)}L${f1(-s * 0.45)} ${f1(s * 0.15)}" stroke="#a0694a" stroke-width="1.6" stroke-linecap="round"/></g>`;
  }
  function star(x, y, r, fill, line) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr);
    }
    return `<path d="${d}Z" fill="${fill}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  function topping(kind, x, y, s, k) {
    if (kind === 'strawberries') return strawberry(x, y, s);
    if (kind === 'cherries') return cherry(x, y, s);
    if (kind === 'macarons') return macaron(x, y, s, k);
    return chocolate(x, y, s, k);
  }

  const SPRINKLES = ['#ff6fa3', '#ffd34d', '#6fd3ff', '#8ef0c4', '#b48cff', '#ffffff'];

  // ---------- draw the whole cake into an <svg viewBox="0 0 400 420"> ----------
  function render(svg, c) {
    const fl = FLAVORS[c.flavor], cream = CREAMS[c.cream].c, plate = PLATES[c.plate];
    const creamLine = mix(cream, INK, 0.3), sideLine = mix(fl.dark, INK, 0.35);
    const L = LAYOUTS[c.tiers];
    const rimTops = c.top.filter(t => RIM_TOPPINGS.includes(t));
    const dollops = c.style === 'swirls' || c.style === 'rosettes';

    // stack the tiers
    const off0 = bounds(outline(c.shape, 0, 0, L[0].w)).y1;
    let by = FRONT_BOTTOM - off0;
    const tiers = L.map(t => { const cy = by - t.h; const T = { w: t.w, h: t.h, by, cy, top: outline(c.shape, CX, cy, t.w) }; by = cy; return T; });

    const out = [];
    out.push('<defs>' +
      `<linearGradient id="ckSide" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${fl.dark}"/><stop offset=".2" stop-color="${fl.base}"/>` +
      `<stop offset=".42" stop-color="${fl.light}"/><stop offset=".65" stop-color="${fl.base}"/><stop offset="1" stop-color="${fl.dark}"/></linearGradient>` +
      `<radialGradient id="ckTop" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="${mix(cream, '#ffffff', 0.45)}"/><stop offset="1" stop-color="${cream}"/></radialGradient>` +
      `<linearGradient id="ckPlate" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${plate.a}"/><stop offset="1" stop-color="${plate.b}"/></linearGradient>` +
      '<radialGradient id="ckShadow"><stop offset=".55" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
      '</defs>');

    // plate
    out.push(`<ellipse cx="200" cy="404" rx="240" ry="30" fill="url(#ckShadow)"/>` +
      `<ellipse cx="200" cy="394" rx="226" ry="22" fill="url(#ckPlate)" stroke="${mix(plate.b, INK, 0.3)}" stroke-width="2"/>` +
      `<ellipse cx="200" cy="391" rx="204" ry="15" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>`);

    // the message goes on the front of the bottom tier
    const msg = c.msg.trim();
    let msgBox = null;
    if (msg) {
      const T = tiers[0];
      const fs = Math.min(T.h * 0.36, (T.w * 0.8) / (Math.max(4, msg.length) * 0.5));
      const half = Math.min(T.w * 0.45, msg.length * fs * 0.27 + 8);
      // follow the front edge across the whole word (a heart dips in the middle)
      const edge = (frontY(T.top, CX - half * 0.7) + frontY(T.top, CX) + frontY(T.top, CX + half * 0.7)) / 3;
      const ty = edge + T.h * (c.style === 'drips' ? 0.62 : 0.55);
      msgBox = { y: ty, fs, half, edge };
    }

    // photo: printed on the front of a tier, or a topper on a stick
    let pic = null;
    const hasPhoto = !!photoSrc(c);
    if (hasPhoto && c.pic === 'front') {
      const ti = msg && c.tiers >= 2 ? 1 : 0, T = tiers[ti];
      let r = Math.min(T.h * 0.4, T.w * 0.16, 50);
      const edge = frontY(T.top, CX);
      let y = edge + T.h * (c.style === 'drips' ? 0.58 : 0.54);
      if (msg && ti === 0) {                     // one tier: photo above, message below
        r = Math.min(r, T.h * 0.27);
        y = edge + T.h * (c.style === 'drips' ? 0.4 : 0.35);
        msgBox.fs = Math.min(msgBox.fs, T.h * 0.19);
        msgBox.half = Math.min(T.w * 0.45, msg.length * msgBox.fs * 0.27 + 8);
        msgBox.y = msgBox.edge + T.h * 0.8;
      }
      pic = { tier: ti, x: CX, y, r };
    }

    const fronts = [];
    tiers.forEach((T, i) => {
      const r = rng(1000 + i * 97 + c.tiers * 13 + c.shape.length);
      const { w, h, cy, top } = T;
      const bb = bounds(top);
      const x0 = bb.x0 + 0.3, x1 = bb.x1 - 0.3;
      const s = Math.max(8, Math.min(15, w * 0.045));

      // shadow of this tier on the one below
      if (i > 0) out.push(`<path d="${pathOf(outline(c.shape, CX, T.by + 4, w * 1.05))}" fill="${INK}" fill-opacity=".16"/>`);

      // side of the cake
      const N = 120, xs = [], fy = [];
      for (let k = 0; k <= N; k++) { const x = x0 + (x1 - x0) * k / N; xs.push(x); fy.push(frontY(top, x)); }
      const chain = (d) => xs.map((x, k) => [x, fy[k] + (typeof d === 'function' ? d(x, k) : d)]);
      out.push(`<path d="${pathOf(chain(0).concat(chain(h).reverse()))}" fill="url(#ckSide)" stroke="${sideLine}" stroke-width="2.5" stroke-linejoin="round"/>`);

      // cream on the side
      let creamTop = 6;
      if (c.style === 'layered') {
        const sw = Math.max(5, h * 0.075);
        for (const d of [h * 0.36, h * 0.69]) {
          out.push(`<path d="${pathOf(chain(d), false)}" fill="none" stroke="${creamLine}" stroke-width="${f1(sw + 2.5)}" stroke-linecap="round"/>` +
            `<path d="${pathOf(chain(d), false)}" fill="none" stroke="${cream}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`);
        }
        out.push(`<path d="${pathOf(chain(0).concat(chain(sw * 0.9).reverse()))}" fill="${cream}" stroke="${creamLine}" stroke-width="1.5"/>`);
        creamTop = sw + 4;
      } else if (c.style === 'drips') {
        const band = h * 0.12, n = Math.max(4, Math.round((x1 - x0) / 30)), drips = [];
        for (let k = 0; k < n; k++) {
          drips.push({ x: x0 + (x1 - x0) * (k + 0.5) / n + (r() - 0.5) * (x1 - x0) / n * 0.5, L: h * (0.24 + r() * 0.3), wd: (x1 - x0) * (0.017 + r() * 0.011) });
        }
        const len = x => {
          let m = band;
          for (const d of drips) { const dx = Math.abs(x - d.x); if (dx < d.wd) m = Math.max(m, d.L - d.wd + Math.sqrt(d.wd * d.wd - dx * dx)); }
          return m;
        };
        out.push(`<path d="${pathOf(chain(-1).concat(chain(x => len(x)).reverse()))}" fill="${cream}" stroke="${creamLine}" stroke-width="2" stroke-linejoin="round"/>`);
        creamTop = band + 4;
      }

      // sprinkles and stars on the side
      const scatter = [];
      if (c.top.includes('sprinkles')) for (let k = Math.round((x1 - x0) * h / 1000); k > 0; k--) scatter.push('s');
      if (c.top.includes('stars')) for (let k = Math.round((x1 - x0) * h / 3800) + 2; k > 0; k--) scatter.push('*');
      const bottomGap = dollops ? s * 0.9 : 6;
      for (const kind of scatter) {
        const x = x0 + 12 + r() * (x1 - x0 - 24), fx = frontY(top, x);
        const y = fx + creamTop + r() * Math.max(1, h - creamTop - bottomGap - 4);
        const a = Math.round(r() * 180), col = SPRINKLES[Math.floor(r() * SPRINKLES.length)];
        if (i === 0 && msgBox && Math.abs(y - msgBox.y) < msgBox.fs * 0.62 && Math.abs(x - CX) < msgBox.half) continue;
        if (pic && pic.tier === i && Math.hypot(x - pic.x, y - pic.y) < pic.r + 6) continue;
        out.push(kind === 's'
          ? `<rect x="-3.6" y="-1.3" width="7.2" height="2.6" rx="1.3" fill="${col}" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})"/>`
          : star(x, y, 4.5 + r() * 2.5, '#ffd75e', '#c98a12'));
      }

      // piped border along the bottom
      if (dollops) {
        const br = s * (c.style === 'rosettes' ? 0.42 : 0.5);
        for (let x = x0 + br; x <= x1 - br + 0.1; x += br * 2.05) {
          out.push(`<circle cx="${f1(x)}" cy="${f1(frontY(top, x) + h - br * 0.35)}" r="${f1(br)}" fill="${cream}" stroke="${creamLine}" stroke-width="1.3"/>`);
        }
      }

      // message
      if (i === 0 && msgBox) {
        const fill = Math.abs(lum(cream) - lum(fl.base)) > 0.28 ? cream : (lum(fl.base) > 0.55 ? '#7a3550' : '#fff6fb');
        const line = lum(fill) > 0.55 ? mix(fl.dark, INK, 0.45) : '#fff4ea';
        out.push(`<text x="${CX}" y="${f1(msgBox.y)}" font-family="Pacifico, cursive" font-size="${f1(msgBox.fs)}" text-anchor="middle" dominant-baseline="middle" ` +
          `fill="${fill}" stroke="${line}" stroke-width="${f1(msgBox.fs * 0.1)}" stroke-linejoin="round" paint-order="stroke">${esc(msg)}</text>`);
      }

      if (pic && pic.tier === i) out.push(photo(pic.x, pic.y, pic.r, c, cream, creamLine));

      // top of the cake
      out.push(`<path d="${pathOf(top)}" fill="url(#ckTop)" stroke="${creamLine}" stroke-width="2" stroke-linejoin="round"/>`);

      // piping and fruit around the edge: the back half now, the front half after the tiers above
      const spots = along(top, dollops ? s * 1.85 : s * 3.1);
      const back = [], front = [];
      spots.forEach((p, k) => {
        const depth = 0.8 + 0.2 * (p[1] - bb.y0) / Math.max(1, bb.y1 - bb.y0);
        const ss = s * depth;
        let svg = '', y = p[1] + ss * 0.15;
        if (c.style === 'swirls') { svg += swirl(p[0], y, ss, cream, creamLine); y -= ss * 1.3; }
        else if (c.style === 'rosettes') { svg += rosette(p[0], y, ss, cream, creamLine); y -= ss * 1.2; }
        if (rimTops.length && (!dollops || k % 2 === 0)) {
          const n = dollops ? k / 2 : k;
          svg += topping(rimTops[n % rimTops.length], p[0], y, ss * 0.95, n);
        }
        if (svg) (p[1] < cy ? back : front).push({ y: p[1], svg });
      });
      back.sort((a, b) => a.y - b.y).forEach(d => out.push(d.svg));
      fronts.push(front.sort((a, b) => a.y - b.y).map(d => d.svg).join(''));
    });
    for (let i = fronts.length - 1; i >= 0; i--) out.push(fronts[i]);

    // topper on a stick, standing at the back of the top tier (the candles stand in front of it)
    let pad = 0;
    if (hasPhoto && c.pic === 'top') {
      const T = tiers[tiers.length - 1], r = 46, py = T.cy - 150;
      pad = Math.max(0, 10 - (py - r));          // zoom out so a tall cake + topper still fits
      out.push(`<path d="M${CX} ${f1(T.cy - 6)}V${f1(py + r)}" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M${CX} ${f1(T.cy - 6)}V${f1(py + r)}" stroke="#f1dcb4" stroke-width="2.5" stroke-linecap="round"/>` +
        photo(CX, py, r, c, '#ffffff', mix(cream, INK, 0.45)));
    }

    svg.innerHTML = out.join('');
    const vh = 420 + pad, vw = vh / 1.05, vx = CX - vw / 2;
    svg.setAttribute('viewBox', `${f1(vx)} ${f1(-pad)} ${f1(vw)} ${f1(vh)}`);

    // where the candles stand: on the middle of the top tier
    const T = tiers[tiers.length - 1];
    const bw = Math.min(T.w * 0.88, Math.max(T.w * 0.68, candleList(c).length * 19));
    return {
      left: f1((CX - bw / 2 - vx) / vw * 100) + '%',
      width: f1(bw / vw * 100) + '%',
      bottom: f1((420 - T.cy) / vh * 100) + '%',
      height: f1(120 / vh * 100) + '%'
    };
  }

  // A picture in a frame of piped cream.
  function framePath(shape, x, y, r) {
    if (shape === 'square') {
      const k = r * 0.9, rr = r * 0.22;
      return `M${f1(x - k + rr)} ${f1(y - k)}H${f1(x + k - rr)}Q${f1(x + k)} ${f1(y - k)} ${f1(x + k)} ${f1(y - k + rr)}V${f1(y + k - rr)}` +
        `Q${f1(x + k)} ${f1(y + k)} ${f1(x + k - rr)} ${f1(y + k)}H${f1(x - k + rr)}Q${f1(x - k)} ${f1(y + k)} ${f1(x - k)} ${f1(y + k - rr)}` +
        `V${f1(y - k + rr)}Q${f1(x - k)} ${f1(y - k)} ${f1(x - k + rr)} ${f1(y - k)}Z`;
    }
    if (shape === 'heart') {
      const pts = [];
      for (let i = 0; i < 60; i++) {
        const t = i / 60 * Math.PI * 2;
        pts.push([x + 16 * Math.sin(t) ** 3 / 16 * r * 1.08, y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * r * 1.08 - r * 0.12]);
      }
      return pathOf(pts);
    }
    return `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
  }
  let picId = 0;
  function photo(x, y, r, c, ring, line) {
    const d = framePath(c.picshape, x, y, r), id = 'ckPic' + (++picId);
    const bw = Math.max(4, r * 0.16);
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
      `<path d="${d}" fill="${line}" stroke="${line}" stroke-width="${f1(bw + 3)}" stroke-linejoin="round"/>` +
      `<image href="${esc(photoSrc(c))}" x="${f1(x - r * 1.1)}" y="${f1(y - r * 1.1)}" width="${f1(r * 2.2)}" height="${f1(r * 2.2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
      `<path d="${d}" fill="none" stroke="${ring}" stroke-width="${f1(bw)}" stroke-linejoin="round" stroke-dasharray="0.1 ${f1(bw * 1.15)}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${ring}" stroke-width="${f1(bw * 0.6)}" stroke-linejoin="round"/>`;
  }

  window.Cake = {
    FLAVORS, CREAMS, STYLES, SHAPES, TOPPINGS, CANDLE_STYLES, CANDLE_COLORS, PLATES, RAINBOW,
    PIC_PLACES, PIC_SHAPES, MAX_NAME, MAX_MSG, PHOTO_MAX, photoSrc, uploadPhoto,
    defaults: () => normalize(DEFAULTS),
    normalize, hasCake, fromParams, fromLocation, toParams, photoHash, candleList, render
  };
})();
