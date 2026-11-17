/* =============================================================================
   Studio Recorte de Revista — Dados estáticos (fontes, paletas, presets)
   Edite este arquivo para adicionar novas fontes, cores ou frases prontas.
   ========================================================================== */
window.SR = window.SR || {};

/* Fontes do Google Fonts (carregadas no <head> do index.html).
   category: usada para filtrar as fontes de cada tema. */
SR.FONTS = [
  { name: "'Anton', sans-serif",            weight: '400', style: 'normal', category: 'headline' },
  { name: "'Playfair Display', serif",      weight: '900', style: 'normal', category: 'vintage' },
  { name: "'Special Elite', cursive",       weight: '400', style: 'normal', category: 'typewriter' },
  { name: "'Bebas Neue', sans-serif",       weight: '400', style: 'normal', category: 'headline' },
  { name: "'Alfa Slab One', serif",         weight: '400', style: 'normal', category: 'vintage' },
  { name: "'Courier Prime', monospace",     weight: '700', style: 'normal', category: 'typewriter' },
  { name: "'Cinzel', serif",                weight: '900', style: 'normal', category: 'vintage' },
  { name: "'Oswald', sans-serif",           weight: '700', style: 'normal', category: 'headline' },
  { name: "'Montserrat', sans-serif",       weight: '900', style: 'italic', category: 'headline' },
  { name: "'DM Serif Display', serif",      weight: '400', style: 'italic', category: 'vintage' },
  { name: "'Syne', sans-serif",             weight: '800', style: 'normal', category: 'headline' },
  { name: "'Ultra', serif",                 weight: '400', style: 'normal', category: 'vintage' },
  { name: "'Staatliches', sans-serif",      weight: '400', style: 'normal', category: 'headline' },
  { name: "'Rye', serif",                   weight: '400', style: 'normal', category: 'vintage' },
  { name: "'Rubik Mono One', sans-serif",   weight: '400', style: 'normal', category: 'typewriter' },
  { name: "'Courier Prime', monospace",     weight: '700', style: 'italic', category: 'typewriter' }
];

/* Paletas de recorte: bg = papel, text = tinta da letra, border = linha de corte */
SR.PALETTES = {
  mixed: [
    { bg: '#fef08a', text: '#09090b', border: '#ca8a04' },
    { bg: '#18181b', text: '#ffffff', border: '#52525b' },
    { bg: '#dc2626', text: '#ffffff', border: '#991b1b' },
    { bg: '#ffffff', text: '#09090b', border: '#cbd5e1' },
    { bg: '#e2d5c3', text: '#1c1917', border: '#a89f91' },
    { bg: '#2563eb', text: '#ffffff', border: '#1d4ed8' },
    { bg: '#f43f5e', text: '#ffffff', border: '#be123c' },
    { bg: '#16a34a', text: '#ffffff', border: '#15803d' },
    { bg: '#ea580c', text: '#ffffff', border: '#c2410c' },
    { bg: '#fef3c7', text: '#451a03', border: '#d97706' }
  ],
  newspaper: [
    { bg: '#fcf8ee', text: '#1c1917', border: '#d6c7b2' },
    { bg: '#f5edd6', text: '#0f172a', border: '#cbbba0' },
    { bg: '#292524', text: '#fcf8ee', border: '#44403c' },
    { bg: '#e7dec8', text: '#1c1917', border: '#b8a88d' },
    { bg: '#78350f', text: '#fef3c7', border: '#451a03' }
  ],
  headline: [
    { bg: '#e11d48', text: '#ffffff', border: '#9f1239' },
    { bg: '#09090b', text: '#ffffff', border: '#27272a' },
    { bg: '#facc15', text: '#09090b', border: '#ca8a04' },
    { bg: '#ffffff', text: '#e11d48', border: '#fda4af' },
    { bg: '#1e1b4b', text: '#38bdf8', border: '#312e81' }
  ],
  typewriter: [
    { bg: '#e2d5c3', text: '#1c1917', border: '#968875' },
    { bg: '#f1f5f9', text: '#0f172a', border: '#94a3b8' },
    { bg: '#ede0d4', text: '#382b22', border: '#a89382' },
    { bg: '#e6ccb2', text: '#241a15', border: '#7f5539' }
  ]
};

/* Frases prontas (botões de atalho) */
SR.PHRASES = [
  'DEUS É TUDO QUE EU PRECISO',
  'OS SONHOS NÃO MORREM',
  'BEM-VINDOS',
  'MUITO AMOR',
  'FELIZ ANIVERSÁRIO'
];

/* Tipos de moldura interna ("caixinha") sorteáveis no modo "Sortida" */
SR.FRAME_KINDS = ['none', 'dotted', 'dashed', 'solid', 'double', 'label'];
SR.FRAME_WEIGHTS = [2, 3, 2, 2, 2, 2];

/* Atalhos de visual (combinações prontas de efeitos) */
SR.LOOKS = {
  clean:   { frame: 'none',   tilt: false, crumple: false, torn: false, halftone: true,  rotation: true },
  organic: { frame: 'mix',    tilt: true,  tiltAmt: 0.45, crumple: true, crumpleAmt: 0.5, torn: true, tornAmt: 0.5, halftone: true, rotation: true },
  chaos:   { frame: 'mix',    tilt: true,  tiltAmt: 0.9,  crumple: true, crumpleAmt: 0.85, torn: true, tornAmt: 0.9, halftone: true, rotation: true, tape: true }
};

/* Configuração padrão (também usada pelo botão "Restaurar padrão") */
SR.DEFAULTS = {
  text: 'DEUS É TUDO QUE EU PRECISO',
  posterW: 100,
  posterH: 70,
  posterColor: '#f4ebd0',
  isAuto: true,
  letterW: 7.2,
  letterH: 9.5,
  theme: 'mixed',
  rotation: true,
  guides: true,
  tape: false,
  halftone: true,
  frame: 'none',
  tilt: false,
  tiltAmt: 0.5,
  crumple: false,
  crumpleAmt: 0.5,
  torn: false,
  tornAmt: 0.5,
  extracted: [],
  useExtracted: false,
  seed: 12345
};
