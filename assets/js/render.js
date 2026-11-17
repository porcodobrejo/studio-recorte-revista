/* =============================================================================
   Studio Recorte de Revista — Motor de desenho (Canvas 2D)
   Um único desenhador de recortes é usado na prévia da cartolina, nas folhas
   A4, na impressão e no PDF. Assim o que você vê é exatamente o que imprime.
   Todas as medidas internas estão em CENTÍMETROS e são convertidas para pixels
   pelo fator `ppc` (pixels por centímetro).
   ========================================================================== */
(function () {
  'use strict';
  const SR = window.SR;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const PAPER_CORE = '#fbf8f0'; // cor da "alma" branca do papel rasgado

  /* Gerador pseudoaleatório determinístico (mesma semente = mesmo resultado) */
  function rng32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------------------------------------------------------------------
     Textura de papel amassado (gerada uma única vez e reaproveitada).
     Técnica: malha de triângulos com alturas aleatórias -> cada faceta recebe
     uma luz diferente (como o papel amassado), + dobras longas + ruído.
     Cinza 128 = neutro (aplicado com o modo de mesclagem "hard-light").
     ------------------------------------------------------------------------ */
  let crumpleBig = null, crumpleSmall = null;
  function buildCrumple() {
    const S = 1024, N = 15, cell = S / (N - 1);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const r = rng32(91373);
    g.fillStyle = 'rgb(128,128,128)';
    g.fillRect(0, 0, S, S);

    // vértices com jitter e altura
    const V = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
        V.push({
          x: x * cell + (edge ? 0 : (r() - 0.5) * cell * 0.8),
          y: y * cell + (edge ? 0 : (r() - 0.5) * cell * 0.8),
          z: r() * cell * 0.85
        });
      }
    }
    const L = (() => { const l = [-0.55, -0.65, 0.75]; const m = Math.hypot(...l); return l.map(v => v / m); })();
    const baseLight = L[2];
    function tri(a, b, d) {
      const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
      const vx = d.x - a.x, vy = d.y - a.y, vz = d.z - a.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const m = Math.hypot(nx, ny, nz) || 1;
      const s = (nx * L[0] + ny * L[1] + nz * L[2]) / m;
      const v = Math.max(55, Math.min(205, Math.round(128 + (s - baseLight) * 230)));
      const col = `rgb(${v},${v},${v})`;
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(d.x, d.y); g.closePath();
      g.fill(); g.stroke();
    }
    for (let y = 0; y < N - 1; y++) {
      for (let x = 0; x < N - 1; x++) {
        const a = V[y * N + x], b = V[y * N + x + 1], d = V[(y + 1) * N + x], e = V[(y + 1) * N + x + 1];
        if (r() < 0.5) { tri(a, b, e); tri(a, e, d); } else { tri(a, b, d); tri(b, e, d); }
      }
    }
    // dobras longas (vincos)
    for (let k = 0; k < 7; k++) {
      let x = r() * S, y = r() * S, ang = r() * TAU;
      const pts = [[x, y]];
      for (let s = 0; s < 6; s++) {
        ang += (r() - 0.5) * 0.6;
        x += Math.cos(ang) * (60 + r() * 120); y += Math.sin(ang) * (60 + r() * 120);
        pts.push([x, y]);
      }
      const stroke = (dx, dy, color, w) => {
        g.strokeStyle = color; g.lineWidth = w; g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy)));
        g.stroke();
      };
      stroke(0, 0, 'rgba(0,0,0,0.30)', 1.6);
      stroke(1.4, 1.4, 'rgba(255,255,255,0.28)', 1.4);
    }
    // suaviza as facetas (se o navegador suportar ctx.filter)
    try {
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = S;
      const tg = tmp.getContext('2d');
      tg.filter = 'blur(1.6px)';
      tg.drawImage(c, 0, 0);
      if (tg.filter && tg.filter !== 'none') { g.clearRect(0, 0, S, S); g.drawImage(tmp, 0, 0); }
    } catch (e) { /* ok */ }
    // grão / fibras
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);

    crumpleBig = c;
    crumpleSmall = document.createElement('canvas');
    crumpleSmall.width = crumpleSmall.height = 256;
    crumpleSmall.getContext('2d').drawImage(c, 0, 0, 256, 256);
  }
  function getCrumple(sizePx) {
    if (!crumpleBig) buildCrumple();
    return sizePx < 420 ? crumpleSmall : crumpleBig;
  }

  /* Retícula de revista (pontinhos de meio-tom) */
  const htCache = new Map();
  function halftoneTile(s) {
    s = Math.max(3, Math.round(s));
    let c = htCache.get(s);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d');
      g.fillStyle = '#1e1e1e';
      g.beginPath(); g.arc(s / 2, s / 2, Math.max(0.55, s * 0.14), 0, TAU); g.fill();
      htCache.set(s, c);
    }
    return c;
  }

  /* ---------------------------------------------------------------------------
     Borda de papel rasgado: gera dois contornos irregulares (em cm).
     - outer: borda externa (onde aparece a "alma" branca do papel)
     - inner: borda da parte colorida (impressa), um pouco mais para dentro
     ------------------------------------------------------------------------ */
  function makeTear(r, W, H, base, amp, rough) {
    const x0 = -W / 2 + base, y0 = -H / 2 + base, x1 = W / 2 - base, y1 = H / 2 - base;
    const C = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const N = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // normais apontando para dentro
    const step = 0.12 + 0.08 * (1 - rough);
    const outer = [], inner = [];
    let maxD = 0;
    for (let s = 0; s < 4; s++) {
      const a = C[s], b = C[(s + 1) % 4], n = N[s], pn = N[(s + 3) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const cnt = Math.max(5, Math.round(len / step));
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const ph1 = r() * TAU, f1 = 0.6 + r() * 2.2, ph2 = r() * TAU, f2 = 3 + r() * 6;
      for (let i = 0; i < cnt; i++) {
        const t = i / cnt;
        const wave = 0.5 + 0.3 * Math.sin(t * f1 * TAU + ph1) + 0.2 * Math.sin(t * f2 * TAU + ph2);
        let d = amp * (0.2 + 0.45 * wave + 0.35 * r());
        if (r() < 0.05) d += amp * 0.5 * r(); // "mordidinhas" do rasgo
        const j = i === 0 ? 0 : (r() - 0.5) * step * 0.6;
        const px = a[0] + tx * (len * t + j), py = a[1] + ty * (len * t + j);
        const fr = (0.025 + r() * 0.085) * (0.5 + rough);
        let ox = px + n[0] * d, oy = py + n[1] * d;
        let ix = px + n[0] * (d + fr), iy = py + n[1] * (d + fr);
        if (i === 0) {
          const d2 = amp * (0.3 + 0.5 * r());
          ox += pn[0] * d2; oy += pn[1] * d2;
          ix += pn[0] * (d2 + fr); iy += pn[1] * (d2 + fr);
        }
        outer.push([ox, oy]); inner.push([ix, iy]);
        if (d + fr > maxD) maxD = d + fr;
      }
    }
    return { outer, inner, depth: base + maxD };
  }

  function tracePath(ctx, pts, ppc) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * ppc, pts[0][1] * ppc);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * ppc, pts[i][1] * ppc);
    ctx.closePath();
  }

  function roundRectPath(ctx, x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /* Moldura interna ("caixinha") */
  function drawFrame(ctx, kind, fw, fh, lw, color, ppc) {
    const x = -fw / 2 * ppc, y = -fh / 2 * ppc, w = fw * ppc, h = fh * ppc;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.globalAlpha = 0.9;
    switch (kind) {
      case 'dotted':
        ctx.lineCap = 'round'; ctx.lineWidth = lw * 1.3;
        ctx.setLineDash([0.001, lw * 2.5]);
        ctx.strokeRect(x, y, w, h);
        break;
      case 'dashed':
        ctx.setLineDash([lw * 3.6, lw * 2.2]);
        ctx.strokeRect(x, y, w, h);
        break;
      case 'solid':
        ctx.strokeRect(x, y, w, h);
        break;
      case 'double': {
        ctx.lineWidth = lw * 0.7;
        ctx.strokeRect(x, y, w, h);
        const dd = lw * 2.1;
        ctx.strokeRect(x + dd, y + dd, w - dd * 2, h - dd * 2);
        break;
      }
      case 'label':
        ctx.globalAlpha = 1;
        roundRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.09);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  /* Desenha a letra com GARANTIA ANTI-VAZAMENTO: mede a caixa real do glifo
     (já considerando a inclinação) e escala para caber na área disponível. */
  function drawLetter(ctx, ch, font, aw, ah, ang, offX, offY, color, ppc) {
    const awp = aw * ppc, ahp = ah * ppc;
    if (awp <= 1 || ahp <= 1) return;
    ctx.font = `${font.style} ${font.weight} 100px ${font.name}`;
    const m = ctx.measureText(ch);
    const L = m.actualBoundingBoxLeft || 0;
    const R = m.actualBoundingBoxRight || m.width || 60;
    const A = m.actualBoundingBoxAscent || 72;
    const D = m.actualBoundingBoxDescent || 0;
    const bw = Math.max(1, L + R), bh = Math.max(1, A + D);
    const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
    const RW = bw * c + bh * s, RH = bw * s + bh * c;
    const k = Math.min(awp * 0.9 / RW, ahp * 0.86 / RH, ahp * 1.2 / 100);
    const slackX = Math.max(0, (awp - RW * k) / 2), slackY = Math.max(0, (ahp - RH * k) / 2);
    ctx.save();
    ctx.translate(offX * slackX * 0.75, offY * slackY * 0.75);
    ctx.rotate(ang);
    ctx.font = `${font.style} ${font.weight} ${(100 * k).toFixed(2)}px ${font.name}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, -(R - L) / 2 * k, (A - D) / 2 * k);
    ctx.restore();
  }

  /* ---------------------------------------------------------------------------
     drawCard: desenha UM recorte centralizado na origem atual do contexto.
       tk   -> token (letra + estilo sorteado)
       W,H  -> tamanho do recorte em cm
       ppc  -> pixels por centímetro
       o    -> { style, shadow, tape, guides }
     ------------------------------------------------------------------------ */
  function drawCard(ctx, tk, W, H, ppc, o) {
    const st = o.style;
    const font = SR.FONTS[tk.fontIdx] || SR.FONTS[0];
    const r = rng32(tk.seed || 1);
    const mn0 = Math.min(W, H);

    let outer, inner, inset;
    if (st.torn) {
      const scale = Math.min(1, mn0 / 6);
      const amp = (0.07 + 0.2 * st.tornAmt) * Math.max(0.45, scale);
      const t = makeTear(r, W, H, 0.08 * Math.max(0.5, scale), amp, st.tornAmt);
      outer = t.outer; inner = t.inner; inset = t.depth + 0.04;
    } else {
      outer = inner = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
      inset = 0;
    }

    // 1) papel (com sombra na prévia)
    ctx.save();
    if (o.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.32)';
      ctx.shadowBlur = Math.max(2, 0.22 * ppc);
      ctx.shadowOffsetX = 0.05 * ppc;
      ctx.shadowOffsetY = 0.1 * ppc;
    }
    tracePath(ctx, outer, ppc);
    ctx.fillStyle = st.torn ? PAPER_CORE : tk.bg;
    ctx.fill();
    ctx.restore();

    if (st.torn) {
      tracePath(ctx, inner, ppc);
      ctx.fillStyle = tk.bg;
      ctx.fill();
    }

    // 2) conteúdo recortado na área impressa
    ctx.save();
    tracePath(ctx, inner, ppc);
    ctx.clip();

    if (st.halftone) {
      const tile = halftoneTile(0.14 * ppc);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(-W / 2 * ppc, -H / 2 * ppc, W * ppc, H * ppc);
      ctx.globalAlpha = 1;
    }

    const cw = W - 2 * inset, ch = H - 2 * inset;
    const mn = Math.min(cw, ch);
    const frameKind = st.frame === 'mix' ? (tk.frameKind || 'none') : st.frame;
    const maxDeg = 3 + 11 * st.tiltAmt;
    const frameAng = (st.tilt && frameKind !== 'none') ? tk.frameRot * maxDeg * 0.3 * DEG : 0;
    const letterAng = st.tilt ? tk.letterRot * maxDeg * DEG : 0;
    let textColor = tk.color;
    let aw, ah;

    ctx.save();
    if (frameKind === 'none') {
      aw = cw * 0.92; ah = ch * 0.92;
    } else {
      const fi = mn * 0.075;
      let fw = cw - 2 * fi, fh = ch - 2 * fi;
      if (frameAng) {
        const c = Math.abs(Math.cos(frameAng)), s = Math.abs(Math.sin(frameAng));
        const k = Math.min(fw / (fw * c + fh * s), fh / (fw * s + fh * c));
        fw *= k; fh *= k;
      }
      ctx.rotate(frameAng);
      const lw = Math.max(1, mn * 0.026 * ppc);
      drawFrame(ctx, frameKind, fw, fh, lw, tk.color, ppc);
      if (frameKind === 'label') textColor = tk.bg;
      const pad = (frameKind === 'label' ? mn * 0.05 : (lw / ppc) * (frameKind === 'double' ? 4 : 2.2) + mn * 0.045);
      aw = fw - 2 * pad; ah = fh - 2 * pad;
    }
    drawLetter(ctx, tk.char, font, aw, ah, letterAng, st.tilt ? tk.offX : 0, st.tilt ? tk.offY : 0, textColor, ppc);
    ctx.restore();
    ctx.restore();

    // 3) textura de papel amassado (sobre tudo, inclusive a borda branca)
    if (st.crumple) {
      const rc = rng32((tk.seed || 1) ^ 0x5bd1e995);
      const diag = Math.hypot(W, H);
      const size = Math.max(14, diag * 1.5) * ppc;
      const maxOff = (size - diag * ppc) / 2 * 0.8;
      ctx.save();
      tracePath(ctx, outer, ppc);
      ctx.clip();
      ctx.globalCompositeOperation = 'hard-light';
      ctx.globalAlpha = 0.2 + 0.7 * st.crumpleAmt;
      ctx.translate((rc() * 2 - 1) * maxOff, (rc() * 2 - 1) * maxOff);
      ctx.rotate(rc() * TAU);
      ctx.drawImage(getCrumple(size), -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    // 4) contorno sutil da borda rasgada (dá definição sobre fundo branco)
    if (st.torn) {
      ctx.save();
      tracePath(ctx, outer, ppc);
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = Math.max(0.5, 0.012 * ppc);
      ctx.stroke();
      ctx.restore();
    }

    // 5) linha tracejada de corte
    if (o.guides) {
      const lw = Math.max(1, 0.03 * ppc);
      ctx.save();
      ctx.setLineDash([0.22 * ppc, 0.15 * ppc]);
      ctx.lineWidth = lw;
      ctx.strokeStyle = st.torn ? '#94a3b8' : (tk.border || '#94a3b8');
      ctx.strokeRect(-W / 2 * ppc + lw / 2, -H / 2 * ppc + lw / 2, W * ppc - lw, H * ppc - lw);
      ctx.restore();
    }

    // 6) fita adesiva (apenas na prévia da cartolina)
    if (o.tape) {
      ctx.save();
      ctx.rotate((tk.tapeRot || 0) * DEG);
      const tw = W * 0.55 * ppc, th = Math.min(1.1, H * 0.14) * ppc;
      const ty = -H / 2 * ppc - th * 0.45;
      ctx.fillStyle = 'rgba(254,240,138,0.62)';
      ctx.fillRect(-tw / 2, ty, tw, th);
      ctx.strokeStyle = 'rgba(202,138,4,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(-tw / 2, ty, tw, th);
      ctx.restore();
    }
  }

  SR.rng32 = rng32;
  SR.drawCard = drawCard;
  SR.warmCrumple = function () { if (!crumpleBig) buildCrumple(); };
})();
