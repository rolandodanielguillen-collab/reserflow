/**
 * palettes.ts — Paletas de color predefinidas para los slides de PadelPost AI.
 *
 * Cada paleta define los 4 tokens de color que los componentes usan:
 *   background  → color de fondo del slide
 *   primary     → color dominante: glow blobs, nombre del club, títulos destacados
 *   accent      → color de acento: fechas, categorías, íconos, detalles
 *   text        → color de texto principal (#ffffff para fondos oscuros, #111827 para fondos claros)
 */

export interface Palette {
  id: string;
  name: string;
  background: string;   // fondo del slide
  primary: string;      // color dominante (glow, títulos grandes)
  accent: string;       // color de acento (detalles, íconos, precios)
  text: string;         // texto principal
}

export const PALETTES: Palette[] = [
  {
    id: 'neon_green',
    name: 'Verde Neon',
    background: '#0f1923',  // azul-negro deportivo (default actual)
    primary:    '#39ff14',  // verde neon
    accent:     '#00c8ff',  // celeste eléctrico
    text:       '#ffffff',
  },
  {
    id: 'electric_blue',
    name: 'Azul Eléctrico',
    background: '#0a0e1a',  // negro azulado
    primary:    '#1b6fff',  // azul royal eléctrico
    accent:     '#39ff14',  // verde neon como contraste
    text:       '#ffffff',
  },
  {
    id: 'solar_orange',
    name: 'Naranja Solar',
    background: '#110d08',  // negro cálido
    primary:    '#ff6a00',  // naranja encendido
    accent:     '#ffe033',  // amarillo dorado
    text:       '#ffffff',
  },
  {
    id: 'hot_pink',
    name: 'Rosa Fuerte',
    background: '#120810',  // negro con tono magenta
    primary:    '#ff2d78',  // rosa chicle intenso
    accent:     '#ff9b00',  // ámbar como contraste cálido
    text:       '#ffffff',
  },
  {
    id: 'crimson_red',
    name: 'Rojo Carmesí',
    background: '#120608',  // negro rojizo
    primary:    '#e8001c',  // rojo puro
    accent:     '#ff8c00',  // naranja ámbar
    text:       '#ffffff',
  },
  {
    id: 'golden_yellow',
    name: 'Amarillo Dorado',
    background: '#0f0e08',  // negro cálido oscuro
    primary:    '#f5c800',  // amarillo dorado
    accent:     '#ff4d00',  // naranja rojizo para contraste
    text:       '#ffffff',
  },
  {
    id: 'deep_purple',
    name: 'Púrpura Profundo',
    background: '#0d0812',  // negro violeta
    primary:    '#9b30ff',  // púrpura eléctrico
    accent:     '#ff2d78',  // rosa intenso como contraste
    text:       '#ffffff',
  },
  {
    id: 'sky_cyan',
    name: 'Celeste Cielo',
    background: '#060e14',  // negro azul marino
    primary:    '#00d4ff',  // celeste puro
    accent:     '#39ff14',  // verde neon
    text:       '#ffffff',
  },
  // ── Paletas con fondo NEGRO ─────────────────────────────────────────────────
  {
    id: 'negro_oro',
    name: 'Negro Oro',
    background: '#000000',
    primary:    '#F5C518',  // dorado intenso
    accent:     '#FFFFFF',  // blanco como contraste elegante
    text:       '#ffffff',
  },
  {
    id: 'negro_neon',
    name: 'Negro Neón',
    background: '#000000',
    primary:    '#39ff14',  // verde neon sobre negro puro
    accent:     '#00c8ff',
    text:       '#ffffff',
  },
  {
    id: 'negro_rojo',
    name: 'Negro Rojo',
    background: '#050505',
    primary:    '#FF2E2E',  // rojo vivo
    accent:     '#FF8C00',
    text:       '#ffffff',
  },
  {
    id: 'negro_celeste',
    name: 'Negro Celeste',
    background: '#000000',
    primary:    '#00D4FF',  // celeste eléctrico
    accent:     '#7DF9FF',
    text:       '#ffffff',
  },
  {
    id: 'negro_violeta',
    name: 'Negro Violeta',
    background: '#0a0a0a',
    primary:    '#A855F7',  // violeta vibrante
    accent:     '#F0ABFC',
    text:       '#ffffff',
  },
  {
    id: 'negro_rosa',
    name: 'Negro Rosa',
    background: '#000000',
    primary:    '#FF2D78',  // rosa intenso
    accent:     '#00E5FF',
    text:       '#ffffff',
  },
  {
    id: 'negro_amarillo',
    name: 'Negro Amarillo',
    background: '#050505',
    primary:    '#FFE600',  // amarillo eléctrico
    accent:     '#FF9500',
    text:       '#ffffff',
  },
  {
    id: 'negro_blanco',
    name: 'Negro & Blanco',
    background: '#000000',
    primary:    '#FFFFFF',  // monocromo elegante
    accent:     '#B0B0B0',
    text:       '#ffffff',
  },
  // ── Paletas con fondo claro ─────────────────────────────────────────────────
  {
    id: 'blanco_verde',
    name: 'Blanco Verde',
    background: '#ffffff',
    primary:    '#16a34a',  // verde intenso
    accent:     '#facc15',  // amarillo vivo
    text:       '#111827',
  },
  {
    id: 'amarillo_vivo',
    name: 'Amarillo Vivo',
    background: '#fef08a',  // amarillo pastel
    primary:    '#ca8a04',  // dorado oscuro
    accent:     '#dc2626',  // rojo fuerte
    text:       '#111827',
  },
  {
    id: 'celeste_claro',
    name: 'Celeste Claro',
    background: '#e0f2fe',  // celeste muy suave
    primary:    '#0284c7',  // azul intenso
    accent:     '#f97316',  // naranja fuego
    text:       '#0c4a6e',  // azul muy oscuro — legible sobre fondo celeste claro
  },
  {
    id: 'rosa_claro',
    name: 'Rosa Claro',
    background: '#fce7f3',  // rosa pastel
    primary:    '#db2777',  // fucsia intenso
    accent:     '#7c3aed',  // violeta
    text:       '#111827',
  },
];

/** Paleta que se usa cuando no hay match ni palette_id explícito */
export const DEFAULT_PALETTE: Palette = PALETTES[0]; // neon_green

/**
 * Busca una paleta por su id.
 * Si no existe, devuelve la paleta por defecto.
 */
export function getPaletteById(id: string | null | undefined): Palette {
  if (!id) return DEFAULT_PALETTE;
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE;
}

/**
 * Convierte un color HEX a componentes RGB (0-255).
 * Soporta tanto #rrggbb como #rgb.
 */
function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean[0]+clean[0] + clean[1]+clean[1] + clean[2]+clean[2];
  }
  if (clean.length !== 6) return [0, 0, 0];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Convierte RGB a HSL.
 * h: 0-360, s: 0-100, l: 0-100
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    case bn: h = ((rn - gn) / d + 4) / 6; break;
  }
  return [h * 360, s * 100, l * 100];
}

/**
 * Convierte HSL a HEX.
 * h: 0-360, s: 0-100, l: 0-100
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a  = sn * Math.min(ln, 1 - ln);
  const f  = (n: number) => {
    const k     = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Rota un tono en el círculo cromático; resultado siempre en 0-360. */
export function rotateHue(h: number, degrees: number): number {
  return ((h + degrees) % 360 + 360) % 360;
}

/**
 * Genera 6 paletas automáticas a partir de un color semilla HEX usando teoría de color HSL.
 * Devuelve array vacío si el color es acromático (baja saturación).
 */
export function generateVariations(seedHex: string): Palette[] {
  if (!seedHex || seedHex.length < 4) return [];

  const [r, g, b] = hexToRgb(seedHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  if (s < 10) return [];

  // Normalizar el primary: saturación mínima 80%, brillo entre 52% y 62%
  const prim = hslToHex(h, Math.max(s, 80), Math.min(Math.max(l, 52), 62));

  return [
    {
      id:         'var_complementario',
      name:       'Complementario',
      background: '#0f1923',
      primary:    prim,
      accent:     hslToHex(rotateHue(h, 180), 85, 55),
      text:       '#ffffff',
    },
    {
      id:         'var_analogo',
      name:       'Análogo Cálido',
      background: hslToHex(h, 15, 8),
      primary:    prim,
      accent:     hslToHex(rotateHue(h, 30), 80, 55),
      text:       '#ffffff',
    },
    {
      id:         'var_triadico',
      name:       'Triádico',
      background: '#0f1923',
      primary:    prim,
      accent:     hslToHex(rotateHue(h, 120), 85, 55),
      text:       '#ffffff',
    },
    {
      id:         'var_oscuro',
      name:       'Oscuro Acento',
      background: hslToHex(h, 20, 6),
      primary:    hslToHex(h, 90, 60),
      accent:     hslToHex(rotateHue(h, 60), 80, 55),
      text:       '#ffffff',
    },
    {
      id:         'var_claro',
      name:       'Claro Elegante',
      background: hslToHex(h, 40, 92),
      primary:    hslToHex(h, Math.max(s, 65), 28),
      accent:     hslToHex(rotateHue(h, 45), Math.max(s, 70), 38),
      text:       hslToHex(h, 30, 15),
    },
    {
      id:         'var_neon',
      name:       'Neón Intenso',
      background: '#0a0a0a',
      primary:    hslToHex(h, 100, 55),
      accent:     hslToHex(rotateHue(h, 90), 100, 55),
      text:       '#ffffff',
    },
  ];
}

/**
 * Encuentra la paleta cuyo primary color tiene el tono (hue) más cercano
 * al color HEX recibido. Usa distancia circular en el círculo cromático.
 *
 * Si el color de entrada es muy oscuro o muy desaturado (acromático),
 * devuelve la paleta por defecto en lugar de forzar un match sin sentido.
 */
export function getPaletteByColor(hex: string): Palette {
  if (!hex || hex.length < 4) return DEFAULT_PALETTE;

  const [r, g, b] = hexToRgb(hex);
  const [hInput, sInput, lInput] = rgbToHsl(r, g, b);

  // Si el color es casi gris/negro/blanco (baja saturación o luminosidad extrema)
  // no tiene sentido buscar match por tono → usar default
  if (sInput < 15 || lInput < 8 || lInput > 92) return DEFAULT_PALETTE;

  let bestPalette = DEFAULT_PALETTE;
  let bestDistance = Infinity;

  for (const palette of PALETTES) {
    const [pr, pg, pb] = hexToRgb(palette.primary);
    const [hPalette] = rgbToHsl(pr, pg, pb);

    // Distancia circular en el círculo de 360°
    const diff = Math.abs(hInput - hPalette);
    const distance = Math.min(diff, 360 - diff);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestPalette = palette;
    }
  }

  // Si el mejor match está a más de 45° de distancia, usar default
  return bestDistance <= 45 ? bestPalette : DEFAULT_PALETTE;
}
