/* =============================================================================
   Studio Recorte de Revista — Aplicação (estado, interface, layout, exportação)
   ========================================================================== */
(function () {
  'use strict';
  const SR = window.SR;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const STORE_KEY = 'studio-recorte-revista:v2';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const A4 = { w: 21, h: 29.7, mx: 1.2, mt: 1.9, mb: 1.6, gap: 0.5 };
  const PRINT_PPC = 150 / 2.54;  // 150 DPI para impressão nativa
  const PDF_PPC = 200 / 2.54;    // 200 DPI para o PDF

  /* ------------------------------ Estado ------------------------------ */
  const PERSIST = Object.keys(SR.DEFAULTS).concat(['tokens']);
  const state = Object.assign({}, clone(SR.DEFAULTS), {
    tokens: [],
    view: 'poster',
    zoom: 1,
    refs: [],
    expanded: false
  });
  let rng = SR.rng32(state.seed);
  let hits = [];           // retângulos das letras na cartolina (para toque)
  let lastPosterPpc = 1;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        PERSIST.forEach((k) => { if (k in saved) state[k] = saved[k]; });
      }
    } catch (e) { /* armazenamento indisponível */ }
    rng = SR.rng32((state.seed + state.tokens.length * 7919) | 0);
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const out = {};
        PERSIST.forEach((k) => { out[k] = state[k]; });
        localStorage.setItem(STORE_KEY, JSON.stringify(out));
      } catch (e) { /* cheio ou bloqueado: ignora */ }
    }, 400);
  }

  function styleOpts() {
    return {
      torn: state.torn, tornAmt: state.tornAmt,
      crumple: state.crumple, crumpleAmt: state.crumpleAmt,
      halftone: state.halftone, frame: state.frame,
      tilt: state.tilt, tiltAmt: state.tiltAmt
    };
  }

  /* ------------------------------ Tokens ------------------------------ */
  function fontsForTheme() {
    const all = SR.FONTS.map((_, i) => i);
    if (state.theme === 'mixed') return all;
    const f = all.filter((i) => SR.FONTS[i].category === state.theme);
    return f.length ? f : all;
  }
  function activePalette() {
    if (state.useExtracted && state.extracted.length) return state.extracted;
    return SR.PALETTES[state.theme] || SR.PALETTES.mixed;
  }
  function pickFrame(R) {
    const total = SR.FRAME_WEIGHTS.reduce((a, b) => a + b, 0);
    let x = R() * total;
    for (let i = 0; i < SR.FRAME_KINDS.length; i++) {
      x -= SR.FRAME_WEIGHTS[i];
      if (x <= 0) return SR.FRAME_KINDS[i];
    }
    return 'none';
  }
  function makeToken(ch, R) {
    const fonts = fontsForTheme(), pal = activePalette();
    const p = pal[Math.floor(R() * pal.length)];
    return {
      char: ch, space: false,
      fontIdx: fonts[Math.floor(R() * fonts.length)],
      bg: p.bg, color: p.text, border: p.border,
      rot: +(R() * 7 - 3.5).toFixed(2),
      letterRot: R() * 2 - 1, offX: R() * 2 - 1, offY: R() * 2 - 1,
      frameRot: R() * 2 - 1, frameKind: pickFrame(R), tapeRot: R() * 8 - 4,
      seed: Math.floor(R() * 2147483646) + 1
    };
  }
  function upper(ch) { const u = ch.toUpperCase(); return u.length === 1 ? u : ch; }

  function syncTokens(force) {
    if (force) rng = SR.rng32(state.seed);
    const chars = Array.from(state.text);
    const old = force ? [] : state.tokens;
    state.tokens = chars.map((raw, i) => {
      if (/\s/.test(raw)) return { space: true, nl: raw === '\n' };
      const ch = upper(raw);
      const o = old[i];
      if (o && !o.space && o.seed) { o.char = ch; return o; }
      return makeToken(ch, rng);
    });
    $('char-count').textContent = `${state.tokens.filter((t) => !t.space).length} letras`;
  }

  /* ------------------------------ Layout ------------------------------ */
  function paragraphs() {
    const paras = [[]];
    let word = [];
    state.tokens.forEach((t, i) => {
      if (t.space) {
        if (word.length) { paras[paras.length - 1].push(word); word = []; }
        if (t.nl) paras.push([]);
      } else word.push(i);
    });
    if (word.length) paras[paras.length - 1].push(word);
    return paras.filter((p) => p.length);
  }

  function layoutPoster(W, H, paras) {
    const PW = state.posterW, PH = state.posterH;
    const uw = PW * 0.88, uh = PH * 0.88;
    const lg = W * 0.1, wg = W * 0.42, ng = H * 0.2;
    const lines = [];
    let ok = W <= uw && H <= uh;
    const maxN = Math.max(1, Math.floor((uw + lg) / (W + lg)));
    const ww = (n) => n * W + (n - 1) * lg;
    for (const p of paras) {
      let cur = [], cw = 0;
      for (const word of p) {
        const chunks = [];
        for (let i = 0; i < word.length; i += maxN) chunks.push(word.slice(i, i + maxN));
        if (chunks.length > 1) ok = false;
        for (const c of chunks) {
          const w = ww(c.length);
          if (cur.length && cw + wg + w > uw) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; }
          cw += (cur.length ? wg : 0) + w;
          cur.push(c);
        }
      }
      if (cur.length) lines.push({ words: cur, w: cw });
    }
    const totalH = lines.length ? lines.length * H + (lines.length - 1) * ng : 0;
    if (totalH > uh) ok = false;
    return { lines, totalH, lg, wg, ng, ok };
  }

  function letterSize(paras) {
    if (!state.isAuto) {
      return { w: clamp(+state.letterW || 7.2, 1.5, 18.6), h: clamp(+state.letterH || 9.5, 1.5, 26.4) };
    }
    if (!paras.length) return { w: 7.2, h: 9.5 };
    let lo = 1.5, hi = Math.min(18.4, 26.2 / 1.32), best = lo;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      if (layoutPoster(mid, mid * 1.32, paras).ok) { best = mid; lo = mid; } else hi = mid;
    }
    const w = Math.floor(best * 10) / 10;
    return { w, h: Math.floor(w * 1.32 * 10) / 10 };
  }

  function a4Layout(W, H) {
    const cols = Math.max(1, Math.floor((A4.w - 2 * A4.mx + A4.gap) / (W + A4.gap)));
    const rows = Math.max(1, Math.floor((A4.h - A4.mt - A4.mb + A4.gap) / (H + A4.gap)));
    const gridW = cols * W + (cols - 1) * A4.gap;
    return { cols, rows, per: cols * rows, ox: Math.max(A4.mx * 0.5, (A4.w - gridW) / 2), oy: A4.mt };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }

  /* ------------------------------ Canvas ------------------------------ */
  function sizeCanvas(cv, cssW, cssH) {
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    dpr = Math.min(dpr, 4096 / Math.max(cssW, cssH));
    const bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(bw / cssW, 0, 0, bh / cssH, 0, 0);
    return ctx;
  }

  /* --------------------------- Render central --------------------------- */
  let frameReq = 0;
  function scheduleRender() {
    if (frameReq) return;
    frameReq = requestAnimationFrame(() => { frameReq = 0; render(); });
  }

  let current = null; // último cálculo (tamanho, layout, folhas)
  function compute() {
    const paras = paragraphs();
    const sz = letterSize(paras);
    const lay = layoutPoster(sz.w, sz.h, paras);
    const letters = state.tokens.filter((t) => !t.space);
    const al = a4Layout(sz.w, sz.h);
    const pages = Math.max(1, Math.ceil(letters.length / al.per));
    return { paras, sz, lay, letters, al, pages };
  }

  function render() {
    current = compute();
    const { sz, lay, letters, pages } = current;
    const poster = `${state.posterW} × ${state.posterH} cm`;
    $('st-poster').textContent = poster;
    $('st-letter').textContent = `${fmt(sz.w)} × ${fmt(sz.h)} cm`;
    $('st-count').textContent = letters.length;
    $('st-pages').textContent = pages;
    $('tab-poster-dim').textContent = `(${state.posterW}×${state.posterH})`;
    $('tab-a4-count').textContent = `(${pages})`;
    $('auto-size').textContent = `${fmt(sz.w)} × ${fmt(sz.h)} cm`;
    $('fit-warning').classList.toggle('hidden', lay.ok || !letters.length);
    $('zoom-label').textContent = `${Math.round(state.zoom * 100)}%`;

    if (state.view === 'poster') renderPoster();
    else renderA4Preview();
  }

  function stageBox() {
    const st = $('stage');
    const cs = getComputedStyle(st);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    return { w: Math.max(120, st.clientWidth - padX - 12), h: Math.max(120, st.clientHeight - padY - 12) };
  }

  function renderPoster() {
    const { sz, lay } = current;
    const PW = state.posterW, PH = state.posterH;
    const box = stageBox();
    const fit = Math.min(box.w, box.h * PW / PH);
    const cssW = Math.round(Math.max(160, fit) * state.zoom);
    const cssH = Math.round(cssW * PH / PW);
    const cv = $('poster-canvas');
    const ctx = sizeCanvas(cv, cssW, cssH);
    const ppc = cssW / PW;
    lastPosterPpc = ppc;

    // fundo da cartolina + grade suave
    ctx.fillStyle = state.posterColor;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 5; x < PW; x += 5) { ctx.moveTo(x * ppc, 0); ctx.lineTo(x * ppc, cssH); }
    for (let y = 5; y < PH; y += 5) { ctx.moveTo(0, y * ppc); ctx.lineTo(cssW, y * ppc); }
    ctx.stroke();

    const opts = { style: styleOpts(), shadow: true, tape: state.tape, guides: state.guides && !state.torn };
    const W = sz.w, H = sz.h;
    hits = [];
    let y = (PH - lay.totalH) / 2;
    for (const line of lay.lines) {
      let x = (PW - line.w) / 2;
      for (const word of line.words) {
        word.forEach((ti, j) => {
          const t = state.tokens[ti];
          ctx.save();
          ctx.translate((x + W / 2) * ppc, (y + H / 2) * ppc);
          if (state.rotation) ctx.rotate(t.rot * Math.PI / 180);
          SR.drawCard(ctx, t, W, H, ppc, opts);
          ctx.restore();
          hits.push({ i: ti, x, y, w: W, h: H });
          x += W + (j < word.length - 1 ? lay.lg : 0);
        });
        x += lay.wg;
      }
      y += H + lay.ng;
    }

    if (!current.letters.length) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = `600 ${Math.max(12, ppc * 2.5)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Digite uma frase para começar ✂', cssW / 2, cssH / 2);
    }
  }

  /* Desenha uma folha A4 completa (usada na prévia, impressão e PDF) */
  function drawA4Page(ctx, ppc, p) {
    const { sz, letters, al, pages } = current;
    const W = sz.w, H = sz.h;
    const pw = A4.w * ppc, ph = A4.h * ppc;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pw, ph);

    // cabeçalho
    ctx.fillStyle = '#64748b';
    ctx.font = `600 ${0.27 * ppc}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(`STUDIO RECORTE DE REVISTA  •  Letra ${fmt(W)} × ${fmt(H)} cm  •  Cartolina ${state.posterW} × ${state.posterH} cm`, A4.mx * ppc, 1.05 * ppc);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Folha ${p + 1} de ${pages}`, (A4.w - A4.mx) * ppc, 1.05 * ppc);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(1, 0.02 * ppc);
    ctx.beginPath(); ctx.moveTo(A4.mx * ppc, 1.35 * ppc); ctx.lineTo((A4.w - A4.mx) * ppc, 1.35 * ppc); ctx.stroke();

    // recortes
    const opts = { style: styleOpts(), shadow: false, tape: false, guides: state.guides };
    const start = p * al.per, end = Math.min(letters.length, start + al.per);
    for (let i = start; i < end; i++) {
      const k = i - start, c = k % al.cols, r = Math.floor(k / al.cols);
      const x = al.ox + c * (W + A4.gap), y = al.oy + r * (H + A4.gap);
      ctx.save();
      ctx.translate((x + W / 2) * ppc, (y + H / 2) * ppc);
      SR.drawCard(ctx, letters[i], W, H, ppc, opts);
      ctx.restore();
    }

    // rodapé
    ctx.beginPath(); ctx.moveTo(A4.mx * ppc, (A4.h - 1.1) * ppc); ctx.lineTo((A4.w - A4.mx) * ppc, (A4.h - 1.1) * ppc); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${0.24 * ppc}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('✂ Recorte nas linhas tracejadas', A4.mx * ppc, (A4.h - 0.65) * ppc);
    ctx.textAlign = 'right';
    ctx.fillText('Imprima em escala 100% (tamanho real, sem "ajustar à página")', (A4.w - A4.mx) * ppc, (A4.h - 0.65) * ppc);
  }

  function renderA4Preview() {
    const host = $('a4-pages');
    const { pages } = current;
    while (host.children.length > pages) host.lastChild.remove();
    while (host.children.length < pages) host.appendChild(document.createElement('canvas'));
    const box = stageBox();
    const cssW = Math.round(Math.min(794, box.w) * state.zoom);
    const cssH = Math.round(cssW * A4.h / A4.w);
    const ppc = cssW / A4.w;
    Array.from(host.children).forEach((cv, p) => {
      const ctx = sizeCanvas(cv, cssW, cssH);
      drawA4Page(ctx, ppc, p);
    });
  }

  /* ------------------------- Impressão e PDF ------------------------- */
  function pageCanvas(ppc) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(A4.w * ppc);
    cv.height = Math.round(A4.h * ppc);
    return cv;
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  function toBlob(cv, type, q) { return new Promise((r) => cv.toBlob(r, type, q)); }

  async function doPrint() {
    const btn = $('btn-print');
    btn.disabled = true;
    try {
      await fontsReady;
      current = compute();
      const area = $('print-area');
      area.querySelectorAll('img').forEach((im) => URL.revokeObjectURL(im.src));
      area.innerHTML = '';
      const cv = pageCanvas(PRINT_PPC), ctx = cv.getContext('2d');
      const imgs = [];
      for (let p = 0; p < current.pages; p++) {
        toast(`Preparando folha ${p + 1} de ${current.pages}…`);
        drawA4Page(ctx, PRINT_PPC, p);
        const blob = await toBlob(cv, 'image/jpeg', 0.92);
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        area.appendChild(img);
        imgs.push(img);
        await tick();
      }
      await Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
      toast('Abrindo impressão… use escala 100%');
      window.print();
    } catch (e) {
      console.error(e);
      toast('Não foi possível preparar a impressão.');
    } finally {
      btn.disabled = false;
    }
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function exportPdf() {
    const btn = $('btn-pdf');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="lbl">Gerando…</span>';
    try {
      if (!window.jspdf) {
        try { await loadScript(JSPDF_URL); } catch (e) {
          toast('Sem internet para gerar o PDF. Use "Imprimir" → "Salvar como PDF".');
          return;
        }
      }
      await fontsReady;
      current = compute();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const cv = pageCanvas(PDF_PPC), ctx = cv.getContext('2d');
      for (let p = 0; p < current.pages; p++) {
        btn.innerHTML = `<span class="lbl">Folha ${p + 1}/${current.pages}</span>`;
        await tick();
        drawA4Page(ctx, PDF_PPC, p);
        if (p > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
      pdf.save(`Letras_Revista_${state.posterW}x${state.posterH}cm.pdf`);
      toast('PDF gerado! Imprima em escala 100%.');
    } catch (e) {
      console.error('Erro na geração do PDF:', e);
      toast('Erro ao gerar o PDF. Tente "Imprimir" → "Salvar como PDF".');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  /* ---------------------- Referências (cores) ---------------------- */
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  // reduz a foto para economizar memória (fotos de celular são enormes)
  async function shrinkFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImage(url);
      const k = Math.min(1, 200 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    } finally { URL.revokeObjectURL(url); }
  }

  async function onRefUpload(e) {
    const files = Array.from(e.target.files || []).slice(0, 10 - state.refs.length);
    e.target.value = '';
    if (!files.length) { if (state.refs.length >= 10) toast('Limite de 10 imagens.'); return; }
    for (const f of files) {
      try { state.refs.push(await shrinkFile(f)); } catch (err) { console.warn('Imagem ignorada', err); }
    }
    renderRefs();
    await extractPalette();
  }

  function renderRefs() {
    $('ref-count').textContent = `${state.refs.length}/10`;
    const grid = $('ref-grid');
    grid.innerHTML = '';
    state.refs.forEach((src, i) => {
      const d = document.createElement('div');
      d.className = 'ref-thumb';
      d.innerHTML = `<img src="${src}" alt="Referência ${i + 1}"><button data-i="${i}" title="Remover" aria-label="Remover">✕</button>`;
      grid.appendChild(d);
    });
  }

  async function extractPalette() {
    if (!state.refs.length) return;
    const buckets = new Map();
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d', { willReadFrequently: true });
    for (const src of state.refs) {
      const im = await loadImage(src);
      g.clearRect(0, 0, 48, 48);
      g.drawImage(im, 0, 0, 48, 48);
      const d = g.getImageData(0, 0, 48, 48).data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        const br = (r * 299 + gg * 587 + b * 114) / 1000;
        if (br < 26 || br > 240) continue; // ignora preto/branco absolutos
        const key = ((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4);
        const v = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        v.n++; v.r += r; v.g += gg; v.b += b;
        buckets.set(key, v);
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n)
      .map((v) => [Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)]);
    const picked = [];
    for (const col of sorted) {
      if (picked.every((p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 48)) picked.push(col);
      if (picked.length >= 10) break;
    }
    if (!picked.length) { toast('Não encontrei cores marcantes nessas imagens.'); return; }
    state.extracted = picked.map(([r, g2, b]) => {
      const hex = '#' + ((1 << 24) + (r << 16) + (g2 << 8) + b).toString(16).slice(1);
      const lum = 0.2126 * r + 0.7152 * g2 + 0.0722 * b;
      return { bg: hex, text: lum > 140 ? '#09090b' : '#ffffff', border: lum > 140 ? '#475569' : '#e2e8f0' };
    });
    renderPalette();
    save();
  }

  function renderPalette() {
    const box = $('palette-box');
    box.classList.toggle('hidden', !state.extracted.length);
    $('swatches').innerHTML = state.extracted.map((c) => `<i style="background:${c.bg}" title="${c.bg}"></i>`).join('');
    $('btn-apply-palette').textContent = state.useExtracted ? '✓ Aplicado nos recortes' : 'Aplicar nos recortes';
  }

  /* ------------------------------ Interface ------------------------------ */
  function setActive(sel, attr, value) {
    $$(sel).forEach((b) => b.classList.toggle('active', String(b.dataset[attr]) === String(value)));
  }

  function syncControls() {
    $('txt').value = state.text;
    setActive('.theme-btn', 'theme', state.theme);
    setActive('.frame-btn', 'frame', state.frame);
    $$('.poster-btn').forEach((b) => b.classList.toggle('active', +b.dataset.w === +state.posterW && +b.dataset.h === +state.posterH));
    $('in-poster-w').value = state.posterW;
    $('in-poster-h').value = state.posterH;
    $('in-poster-color').value = state.posterColor;
    $('in-letter-w').value = state.letterW;
    $('in-letter-h').value = state.letterH;
    $('mode-auto').classList.toggle('active', state.isAuto);
    $('mode-manual').classList.toggle('active', !state.isAuto);
    $('auto-box').classList.toggle('hidden', !state.isAuto);
    $('manual-box').classList.toggle('hidden', state.isAuto);
    [['opt-tilt', 'tilt'], ['opt-crumple', 'crumple'], ['opt-torn', 'torn'], ['opt-halftone', 'halftone'],
     ['opt-rotation', 'rotation'], ['opt-tape', 'tape'], ['opt-guides', 'guides']].forEach(([id, k]) => { $(id).checked = !!state[k]; });
    [['opt-tilt-amt', 'tiltAmt'], ['opt-crumple-amt', 'crumpleAmt'], ['opt-torn-amt', 'tornAmt']].forEach(([id, k]) => { $(id).value = Math.round(state[k] * 100); });
    $$('.range').forEach((r) => r.classList.toggle('hidden', !$(r.dataset.for).checked));
    $$('.look-btn').forEach((b) => b.classList.remove('active'));
    renderPalette();
  }

  function changed(opts = {}) {
    if (opts.restyle) syncTokens(true);
    save();
    scheduleRender();
  }

  function switchView(v) {
    state.view = v;
    $('tab-poster').classList.toggle('active', v === 'poster');
    $('tab-a4').classList.toggle('active', v === 'a4');
    $('poster-wrap').classList.toggle('hidden', v !== 'poster');
    $('a4-wrap').classList.toggle('hidden', v !== 'a4');
    $('stage').scrollTop = 0;
    scheduleRender();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function reroll() {
    state.seed = Math.floor(Math.random() * 2147483646) + 1;
    changed({ restyle: true });
  }

  function bind() {
    // Frase (com debounce para não travar ao digitar)
    let typeTimer = 0;
    $('txt').addEventListener('input', (e) => {
      state.text = e.target.value;
      clearTimeout(typeTimer);
      typeTimer = setTimeout(() => { syncTokens(false); changed(); }, 90);
    });
    const chips = $('phrase-chips');
    SR.PHRASES.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = p;
      b.addEventListener('click', () => { state.text = p; $('txt').value = p; syncTokens(false); changed(); });
      chips.appendChild(b);
    });

    // Tema
    $$('.theme-btn').forEach((b) => b.addEventListener('click', () => {
      state.theme = b.dataset.theme;
      setActive('.theme-btn', 'theme', state.theme);
      changed({ restyle: true });
    }));
    $('btn-reroll').addEventListener('click', reroll);
    $('btn-reroll-2').addEventListener('click', reroll);

    // Atalhos de visual
    $$('.look-btn').forEach((b) => b.addEventListener('click', () => {
      Object.assign(state, SR.LOOKS[b.dataset.look]);
      syncControls();
      b.classList.add('active');
      changed();
    }));

    // Moldura
    $$('.frame-btn').forEach((b) => b.addEventListener('click', () => {
      state.frame = b.dataset.frame;
      setActive('.frame-btn', 'frame', state.frame);
      changed();
    }));

    // Switches
    [['opt-tilt', 'tilt'], ['opt-crumple', 'crumple'], ['opt-torn', 'torn'], ['opt-halftone', 'halftone'],
     ['opt-rotation', 'rotation'], ['opt-tape', 'tape'], ['opt-guides', 'guides']].forEach(([id, k]) => {
      $(id).addEventListener('change', (e) => {
        state[k] = e.target.checked;
        $$(`.range[data-for="${id}"]`).forEach((r) => r.classList.toggle('hidden', !e.target.checked));
        changed();
      });
    });
    // Sliders
    [['opt-tilt-amt', 'tiltAmt'], ['opt-crumple-amt', 'crumpleAmt'], ['opt-torn-amt', 'tornAmt']].forEach(([id, k]) => {
      $(id).addEventListener('input', (e) => { state[k] = (+e.target.value) / 100; changed(); });
    });

    // Cartolina
    $$('.poster-btn').forEach((b) => b.addEventListener('click', () => {
      state.posterW = +b.dataset.w; state.posterH = +b.dataset.h;
      syncControls(); changed();
    }));
    const numInput = (id, k, min, max) => $(id).addEventListener('input', (e) => {
      const v = parseFloat(String(e.target.value).replace(',', '.'));
      if (!isFinite(v)) return;
      state[k] = clamp(v, min, max);
      if (k === 'posterW' || k === 'posterH') {
        $$('.poster-btn').forEach((b) => b.classList.toggle('active', +b.dataset.w === +state.posterW && +b.dataset.h === +state.posterH));
      }
      changed();
    });
    numInput('in-poster-w', 'posterW', 15, 600);
    numInput('in-poster-h', 'posterH', 15, 600);
    numInput('in-letter-w', 'letterW', 1.5, 18.6);
    numInput('in-letter-h', 'letterH', 1.5, 26.4);
    $('in-poster-color').addEventListener('input', (e) => { state.posterColor = e.target.value; changed(); });
    $('mode-auto').addEventListener('click', () => { state.isAuto = true; syncControls(); changed(); });
    $('mode-manual').addEventListener('click', () => {
      if (state.isAuto && current) { state.letterW = current.sz.w; state.letterH = current.sz.h; }
      state.isAuto = false; syncControls(); changed();
    });

    // Referências
    $('ref-input').addEventListener('change', onRefUpload);
    $('ref-grid').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      state.refs.splice(+b.dataset.i, 1);
      renderRefs();
      if (state.refs.length) await extractPalette();
    });
    $('btn-apply-palette').addEventListener('click', () => {
      if (!state.extracted.length) return;
      state.useExtracted = true; renderPalette(); changed({ restyle: true });
    });
    $('btn-clear-palette').addEventListener('click', () => {
      state.useExtracted = false; renderPalette(); changed({ restyle: true });
    });

    // Restaurar
    $('btn-reset').addEventListener('click', () => {
      if (!confirm('Restaurar todas as configurações para o padrão?')) return;
      Object.assign(state, clone(SR.DEFAULTS));
      state.refs = []; renderRefs();
      syncControls(); changed({ restyle: true });
      toast('Configurações restauradas.');
    });

    // Abas e zoom
    $('tab-poster').addEventListener('click', () => switchView('poster'));
    $('tab-a4').addEventListener('click', () => switchView('a4'));
    $('zoom-in').addEventListener('click', () => { state.zoom = clamp(+(state.zoom + 0.25).toFixed(2), 0.5, 4); scheduleRender(); });
    $('zoom-out').addEventListener('click', () => { state.zoom = clamp(+(state.zoom - 0.25).toFixed(2), 0.5, 4); scheduleRender(); });
    $('zoom-fit').addEventListener('click', () => { state.zoom = 1; scheduleRender(); });
    $('btn-expand').addEventListener('click', () => {
      state.expanded = !state.expanded;
      $('app').classList.toggle('expanded', state.expanded);
      $('btn-expand').textContent = state.expanded ? '⤡' : '⤢';
    });

    // Toque numa letra da cartolina = sorteia só ela
    $('poster-canvas').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ppc = rect.width / state.posterW;
      const x = (e.clientX - rect.left) / ppc, y = (e.clientY - rect.top) / ppc;
      const h = hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (!h) return;
      const t = state.tokens[h.i];
      state.tokens[h.i] = makeToken(t.char, SR.rng32((Math.random() * 2147483646) | 0));
      changed();
    });

    // Exportação
    $('btn-print').addEventListener('click', doPrint);
    $('btn-pdf').addEventListener('click', exportPdf);

    // Redimensionamento
    if (window.ResizeObserver) new ResizeObserver(() => scheduleRender()).observe($('stage'));
    else window.addEventListener('resize', scheduleRender);
  }

  /* ------------------------------ Fontes ------------------------------ */
  const fontsReady = (async () => {
    if (!document.fonts || !document.fonts.load) return;
    const sample = 'AÉÇÃ';
    await Promise.race([
      Promise.all(SR.FONTS.map((f) => document.fonts.load(`${f.style} ${f.weight} 40px ${f.name}`, sample).catch(() => null))),
      new Promise((r) => setTimeout(r, 5000))
    ]);
  })();

  /* ------------------------------ Início ------------------------------ */
  function init() {
    load();
    if (!state.tokens.length || state.tokens.length !== Array.from(state.text).length) syncTokens(!state.tokens.length);
    else $('char-count').textContent = `${state.tokens.filter((t) => !t.space).length} letras`;
    syncControls();
    bind();
    if (location.hash === '#a4') switchView('a4');
    render();
    fontsReady.then(() => scheduleRender());
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', () => scheduleRender());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
