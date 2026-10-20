// Scanner un document : logique pure (aucun DOM), partagée par le Worker, l'interface et les tests.
// Image = pixels RGBA (Uint8ClampedArray, 4 octets par pixel), comme ImageData.
//
// Chaîne : réduction -> détection des bords -> redressement (perspective) -> fond blanchi -> PDF.
// Détection sans OpenCV (voir la décision du coffre) : plusieurs masques candidats (clair, sombre, écart à la
// couleur du bord, zone fermée par les contours) -> plus grand bloc -> enveloppe convexe -> quadrilatère
// circonscrit minimal -> note par le soutien en contours des quatre côtés -> les côtés sont ré-ajustés
// par droites robustes (intersections = coins).

export interface Point { x: number; y: number }
export type Quad = [Point, Point, Point, Point]; // haut-gauche, haut-droit, bas-droit, bas-gauche
export interface Image { data: Uint8ClampedArray; width: number; height: number }

export interface Detection {
  coins: Quad;           // en pixels de l'image d'origine
  fiable: boolean;       // false : la détection a échoué, les coins sont une proposition à ajuster
  note: number;          // 0..1, soutien en contours des quatre côtés
  methode: string;
}

// --------------------------------------------------------------------------------------------------
// Géométrie

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const aire = (p: Point[]) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; }
  return Math.abs(s) / 2;
};

/** Ordonne 4 points : haut-gauche, haut-droit, bas-droit, bas-gauche (sans supposer une page droite). */
export function ordonnerCoins(p: Point[]): Quad {
  const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length;
  const tri = [...p].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)); // sens horaire à l'écran
  // le haut-gauche est le point de plus petite somme x+y ; on tourne la liste pour qu'il soit en tête
  let i0 = 0;
  for (let i = 1; i < 4; i++) if (tri[i].x + tri[i].y < tri[i0].x + tri[i0].y) i0 = i;
  return [tri[i0], tri[(i0 + 1) % 4], tri[(i0 + 2) % 4], tri[(i0 + 3) % 4]];
}

/** Enveloppe convexe (chaîne monotone), sens horaire à l'écran. */
export function enveloppeConvexe(pts: Point[]): Point[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const bas: Point[] = [];
  for (const q of p) { while (bas.length >= 2 && cross(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  const haut: Point[] = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (haut.length >= 2 && cross(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  bas.pop(); haut.pop();
  return bas.concat(haut);
}

function intersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
  return { x: a1.x + t * (a2.x - a1.x), y: a1.y + t * (a2.y - a1.y) };
}

/**
 * Quadrilatère circonscrit d'aire minimale à un polygone convexe : tant qu'il a plus de 4 sommets, on supprime
 * le côté dont le retrait ajoute le moins de surface (ses deux voisins sont prolongés jusqu'à se couper).
 */
export function quadrilatereCirconscrit(hull: Point[]): Point[] | null {
  let p = hull.map((q) => ({ ...q }));
  if (p.length < 4) return null;
  while (p.length > 4) {
    let meilleur = -1, aireMin = Infinity, pt: Point | null = null;
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n];
      const x = intersection(a, b, c, d);
      if (!x) continue;
      // le point doit être du côté extérieur de l'arête b-c (sinon les voisins divergent)
      const cr = (c.x - b.x) * (x.y - b.y) - (c.y - b.y) * (x.x - b.x);
      const cr0 = (c.x - b.x) * (a.y - b.y) - (c.y - b.y) * (a.x - b.x);
      if (cr * cr0 > 0) continue;
      const ajout = aire([b, x, c]);
      if (ajout < aireMin) { aireMin = ajout; meilleur = i; pt = x; }
    }
    if (meilleur < 0 || !pt) return null;
    const n2: Point[] = [];
    for (let k = 0; k < n; k++) {
      if (k === meilleur) n2.push(pt);
      else if (k === (meilleur + 1) % n) continue;
      else n2.push(p[k]);
    }
    p = n2;
  }
  return p;
}

/** Les coins d'une feuille vue en entier restent dans la photo (à 2 % près). */
const dansLeCadre = (q: Quad, w: number, h: number) => q.every((p) => p.x > -0.02 * w && p.x < 1.02 * w && p.y > -0.02 * h && p.y < 1.02 * h);

const angleInterieur = (a: Point, b: Point, c: Point) => {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};

/** Un quadrilatère de page plausible : convexe, angles entre 50° et 130°, côtés d'au moins 8 px. */
export function quadPlausible(q: Quad): boolean {
  for (let i = 0; i < 4; i++) {
    if (dist(q[i], q[(i + 1) % 4]) < 8) return false;
    const a = angleInterieur(q[(i + 3) % 4], q[i], q[(i + 1) % 4]);
    if (a < 50 || a > 130) return false;
  }
  return aire(q) > 64;
}

// --------------------------------------------------------------------------------------------------
// Image : niveaux de gris, réduction, flou

export function reduire(img: Image, cote: number): { image: Image; echelle: number } {
  const echelle = Math.min(1, cote / Math.max(img.width, img.height));
  if (echelle >= 1) return { image: img, echelle: 1 };
  const w = Math.max(1, Math.round(img.width * echelle)), h = Math.max(1, Math.round(img.height * echelle));
  const out = new Uint8ClampedArray(w * h * 4);
  const fx = img.width / w, fy = img.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.min(img.height, Math.floor((y + 1) * fy)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.min(img.width, Math.floor((x + 1) * fx)));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.width + xx) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++; }
      const o = (y * w + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { image: { data: out, width: w, height: h }, echelle: 1 / Math.max(fx, fy) };
}

function gris(img: Image): Float32Array {
  const n = img.width * img.height, g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
  return g;
}

/** Flou rectangulaire séparable, rayon r (bords répliqués). */
function flouBoite(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / k;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / k;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Filtre maximum (dilatation) carré de rayon r, séparable. */
function maxiBoite(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = -Infinity;
    for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.max(m, src[y * w + k]);
    tmp[y * w + x] = m;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = -Infinity;
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.max(m, tmp[k * w + x]);
    out[y * w + x] = m;
  }
  return out;
}

// --------------------------------------------------------------------------------------------------
// Masques et composantes

function otsu(g: Float32Array): number {
  const h = new Float64Array(256);
  for (let i = 0; i < g.length; i++) h[Math.max(0, Math.min(255, g[i] | 0))]++;
  const total = g.length;
  let somme = 0; for (let i = 0; i < 256; i++) somme += i * h[i];
  let sB = 0, wB = 0, max = -1, seuil = 128;
  for (let t = 0; t < 256; t++) {
    wB += h[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sB += t * h[t];
    const mB = sB / wB, mF = (somme - sB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > max) { max = v; seuil = t; }
  }
  return seuil;
}

/** Érosion puis dilatation carrées (ouverture) : coupe les ponts fins (ombres, doigts) qui collent au bloc. */
function ouverture(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const f = new Float32Array(w * h); for (let i = 0; i < f.length; i++) f[i] = m[i] ? 0 : 1; // 1 = fond
  const dil = maxiBoite(f, w, h, r);               // érosion du premier plan
  const ero = new Float32Array(w * h); for (let i = 0; i < ero.length; i++) ero[i] = dil[i] ? 0 : 1; // 1 = premier plan érodé
  const dil2 = maxiBoite(ero, w, h, r);
  const out = new Uint8Array(w * h); for (let i = 0; i < out.length; i++) out[i] = dil2[i] ? 1 : 0;
  return out;
}

interface Bloc { aire: number; pixels: number[]; touche: number }

/** Composantes connexes (4 voisins) d'un masque ; rend les trois plus grandes. */
function composantes(m: Uint8Array, w: number, h: number): Bloc[] {
  const vu = new Uint8Array(w * h), blocs: Bloc[] = [], pile: number[] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || vu[s]) continue;
    const pixels: number[] = []; let touche = 0;
    pile.push(s); vu[s] = 1;
    while (pile.length) {
      const i = pile.pop()!; pixels.push(i);
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touche++;
      if (x > 0 && m[i - 1] && !vu[i - 1]) { vu[i - 1] = 1; pile.push(i - 1); }
      if (x < w - 1 && m[i + 1] && !vu[i + 1]) { vu[i + 1] = 1; pile.push(i + 1); }
      if (y > 0 && m[i - w] && !vu[i - w]) { vu[i - w] = 1; pile.push(i - w); }
      if (y < h - 1 && m[i + w] && !vu[i + w]) { vu[i + w] = 1; pile.push(i + w); }
    }
    blocs.push({ aire: pixels.length, pixels, touche });
  }
  return blocs.sort((a, b) => b.aire - a.aire).slice(0, 3);
}

/** Points de la frontière d'un bloc (pixel dont un voisin n'est pas dans le bloc). */
function frontiere(b: Bloc, w: number, h: number): Point[] {
  const dans = new Uint8Array(w * h); for (const i of b.pixels) dans[i] = 1;
  const pts: Point[] = [];
  for (const i of b.pixels) {
    const x = i % w, y = (i / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !dans[i - 1] || !dans[i + 1] || !dans[i - w] || !dans[i + w]) pts.push({ x: x + 0.5, y: y + 0.5 });
  }
  return pts;
}

// --------------------------------------------------------------------------------------------------
// Contours

interface Contours { mag: Float32Array; gx: Float32Array; gy: Float32Array; p90: number }

function contours(g: Float32Array, w: number, h: number): Contours {
  const mag = new Float32Array(w * h), gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const sx = (g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1]);
    const sy = (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]);
    gx[i] = sx; gy[i] = sy; mag[i] = Math.hypot(sx, sy);
  }
  const tri = Float32Array.from(mag).sort();
  return { mag, gx, gy, p90: Math.max(8, tri[Math.floor(tri.length * 0.93)]) };
}

/**
 * Échantillons d'un côté : position du plus fort contour le long de la normale (±portee px), avec sa force.
 * La force compare ce contour au bruit voisin (mêmes mesures 5 à 10 px de part et d'autre) : sur une image sans feuille,
 * où tout est bruit, elle reste faible ; sur un vrai bord, même pâle, elle ressort.
 */
function pointsDeContour(a: Point, b: Point, c: Contours, w: number, h: number, portee: number) {
  const L = dist(a, b), n = Math.max(8, Math.min(80, Math.floor(L / 3)));
  const nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
  const pts: { p: Point; force: number }[] = [];
  const proj = (bx: number, by: number, d: number) => {
    const x = Math.round(bx + nx * d - 0.5), y = Math.round(by + ny * d - 0.5);
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return -1;
    const i = y * w + x;
    return Math.abs(c.gx[i] * nx + c.gy[i] * ny); // seul compte un contour orienté comme le côté
  };
  for (let k = 0; k < n; k++) {
    const t = 0.08 + (0.84 * k) / (n - 1);
    const bx = a.x + (b.x - a.x) * t, by = a.y + (b.y - a.y) * t;
    let best = -1, bd = 0;
    for (let d = -portee; d <= portee; d += 0.5) { const v = proj(bx, by, d); if (v > best) { best = v; bd = d; } }
    if (best <= 0) continue;
    let ref = 0, nref = 0;
    for (let d = 5; d <= 10; d++) for (const sg of [-1, 1]) { const v = proj(bx, by, bd + sg * d); if (v >= 0) { ref += v; nref++; } }
    ref = nref ? ref / nref : 0;
    pts.push({ p: { x: bx + nx * bd, y: by + ny * bd }, force: Math.max(0, best - 2 * ref) / (0.5 * c.p90) });
  }
  return pts;
}

/** Soutien en contours d'un côté : part des échantillons qui portent un vrai contour. */
function soutien(a: Point, b: Point, c: Contours, w: number, h: number): number {
  const pts = pointsDeContour(a, b, c, w, h, 3);
  if (!pts.length) return 0;
  return pts.reduce((s, q) => s + Math.min(1, q.force), 0) / pts.length;
}

/** Droite ajustée par moindres carrés avec rejet itératif des points aberrants. Rend deux points de la droite. */
function droiteRobuste(pts: Point[]): [Point, Point] | null {
  if (pts.length < 4) return null;
  let sel = pts;
  let res: [Point, Point] | null = null;
  for (let tour = 0; tour < 4; tour++) {
    const mx = sel.reduce((s, p) => s + p.x, 0) / sel.length, my = sel.reduce((s, p) => s + p.y, 0) / sel.length;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of sel) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const dx = Math.cos(th), dy = Math.sin(th);
    res = [{ x: mx - dx * 100, y: my - dy * 100 }, { x: mx + dx * 100, y: my + dy * 100 }];
    const e = pts.map((p) => Math.abs(-(p.x - mx) * dy + (p.y - my) * dx));
    const tri = [...e].sort((a, b) => a - b);
    const seuil = Math.max(1.2, tri[Math.floor(tri.length * 0.6)] * 2.5);
    const ns = pts.filter((_, i) => e[i] <= seuil);
    if (ns.length < 4 || ns.length === sel.length) break;
    sel = ns;
  }
  return res;
}

/** Ré-ajuste chaque côté sur les contours de l'image puis recoupe les droites : coins précis au pixel. */
function affiner(q: Quad, c: Contours, w: number, h: number): Quad {
  const L = Math.max(w, h);
  const droites: ([Point, Point] | null)[] = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const pts = pointsDeContour(a, b, c, w, h, Math.max(3, L * 0.012)).filter((p) => p.force > 0.35).map((p) => p.p);
    droites.push(droiteRobuste(pts));
  }
  const out: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const d1 = droites[(i + 3) % 4], d2 = droites[i];
    const x = d1 && d2 ? intersection(d1[0], d1[1], d2[0], d2[1]) : null;
    out.push(x && dist(x, q[i]) < L * 0.05 ? x : q[i]);
  }
  return out as Quad;
}

// --------------------------------------------------------------------------------------------------
// Détection

interface Candidat { quad: Quad; note: number; fill: number; surface: number; methode: string }

function candidatsDepuisMasque(m: Uint8Array, w: number, h: number, c: Contours, methode: string): Candidat[] {
  const r = Math.max(1, Math.round(Math.max(w, h) / 160));
  const ouvert = ouverture(m, w, h, r);
  const sortie: Candidat[] = [];
  for (const bloc of composantes(ouvert, w, h)) {
    if (bloc.aire < w * h * 0.1) continue;
    const hull = enveloppeConvexe(frontiere(bloc, w, h));
    const q4 = quadrilatereCirconscrit(hull);
    if (!q4) continue;
    // le masque a été rogné par l'ouverture et bordé à ±1 px : le ré-ajustement par les contours corrige la dérive
    let quad = ordonnerCoins(q4);
    const brut = quad;
    quad = affiner(quad, c, w, h);
    if (!quadPlausible(quad)) quad = brut;
    if (!quadPlausible(quad) || !dansLeCadre(quad, w, h)) continue;
    const surface = aire(quad) / (w * h);
    if (surface < 0.1 || surface > 1.15) continue;
    let s = 0;
    for (let i = 0; i < 4; i++) s += soutien(quad[i], quad[(i + 1) % 4], c, w, h);
    sortie.push({ quad, note: s / 4, fill: Math.min(1, bloc.aire / aire(quad)), surface, methode });
  }
  return sortie;
}

/** Cherche la feuille dans une photo. Les coins rendus sont dans le repère de l'image d'origine. */
export function detecterCoins(img: Image): Detection {
  const { image: p, echelle } = reduire(img, 640);
  const w = p.width, h = p.height;
  const g0 = gris(p);
  const g = flouBoite(flouBoite(g0, w, h, 1), w, h, 1);
  const c = contours(g, w, h);
  const cands: Candidat[] = [];

  // A et B : plus clair / plus sombre que le seuil d'Otsu
  const t = otsu(g);
  const clair = new Uint8Array(w * h), sombre = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { clair[i] = g[i] > t ? 1 : 0; sombre[i] = g[i] <= t ? 1 : 0; }
  cands.push(...candidatsDepuisMasque(clair, w, h, c, 'clair'), ...candidatsDepuisMasque(sombre, w, h, c, 'sombre'));

  // D : écart à la couleur du bord de l'image (le fond est supposé occuper la périphérie)
  {
    const bord: number[][] = [[], [], []];
    const m = Math.max(2, Math.round(Math.min(w, h) * 0.03));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x < m || y < m || x >= w - m || y >= h - m) { const i = (y * w + x) * 4; bord[0].push(p.data[i]); bord[1].push(p.data[i + 1]); bord[2].push(p.data[i + 2]); }
    }
    const med = bord.map((a) => a.sort((u, v) => u - v)[a.length >> 1]);
    const dd = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) dd[i] = Math.hypot(p.data[i * 4] - med[0], p.data[i * 4 + 1] - med[1], p.data[i * 4 + 2] - med[2]) / 1.732;
    const ds = flouBoite(dd, w, h, 1);
    const td = Math.max(10, otsu(ds));
    const mk = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mk[i] = ds[i] > td ? 1 : 0;
    cands.push(...candidatsDepuisMasque(mk, w, h, c, 'couleur'));
  }

  // C : zone fermée par les contours (remplissage du fond depuis les bords) — page claire sur table claire.
  // Plusieurs seuils : un contour faible laisse des trous par où le remplissage entrerait, un seuil bas les ferme.
  for (const fr of [0.5, 0.3, 0.18]) {
    const seuil = Math.max(6, c.p90 * fr);
    let ar: Float32Array = new Float32Array(w * h); for (let i = 0; i < w * h; i++) ar[i] = c.mag[i] > seuil ? 1 : 0;
    ar = maxiBoite(ar, w, h, 1);
    const libre = new Uint8Array(w * h), pile: number[] = [];
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = y * w + x; if (!ar[i] && !libre[i]) { libre[i] = 1; pile.push(i); } }
    for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = y * w + x; if (!ar[i] && !libre[i]) { libre[i] = 1; pile.push(i); } }
    while (pile.length) {
      const i = pile.pop()!, x = i % w, y = (i / w) | 0;
      if (x > 0 && !ar[i - 1] && !libre[i - 1]) { libre[i - 1] = 1; pile.push(i - 1); }
      if (x < w - 1 && !ar[i + 1] && !libre[i + 1]) { libre[i + 1] = 1; pile.push(i + 1); }
      if (y > 0 && !ar[i - w] && !libre[i - w]) { libre[i - w] = 1; pile.push(i - w); }
      if (y < h - 1 && !ar[i + w] && !libre[i + w]) { libre[i + w] = 1; pile.push(i + w); }
    }
    const mk = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mk[i] = libre[i] ? 0 : 1;
    cands.push(...candidatsDepuisMasque(mk, w, h, c, `contours ${fr}`));
  }

  const rendre = (q: Quad, fiable: boolean, note: number, methode: string): Detection => ({
    coins: q.map((pt) => ({ x: pt.x / echelle, y: pt.y / echelle })) as Quad, fiable, note, methode,
  });
  // Note : le soutien en contours domine, la surface départage (une feuille occupe en général une bonne part de l'image),
  // un bloc qui épouse mal son quadrilatère (fill bas) est pénalisé.
  const noter = (k: Candidat) => k.note * (0.55 + 0.45 * Math.min(1, k.surface / 0.5)) * (0.4 + 0.6 * k.fill) * (k.surface > 0.985 ? 0.5 : 1);
  cands.sort((a, b) => noter(b) - noter(a));
  const best = cands[0];
  if (!best) {
    const m = Math.round(Math.min(w, h) * 0.05);
    return rendre([{ x: m, y: m }, { x: w - m, y: m }, { x: w - m, y: h - m }, { x: m, y: h - m }], false, 0, 'aucune');
  }
  const fiable = best.note >= 0.4 && best.fill >= 0.8 && best.surface <= 0.985;
  return rendre(best.quad, fiable, best.note, best.methode);
}

// --------------------------------------------------------------------------------------------------
// Redressement

/** Homographie qui envoie le rectangle (0,0)-(W,H) sur le quadrilatère q (8 inconnues, élimination de Gauss). */
export function homographie(q: Quad, W: number, H: number): number[] {
  const src = [[0, 0], [W, 0], [W, H], [0, H]];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], { x, y } = q[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  return [...A.map((l, i) => l[n] / l[i]), 1];
}

const A4 = Math.SQRT2; // 297 / 210

/**
 * Rapport hauteur / largeur réel d'une feuille vue en perspective (Zhang & He, 2007) : les deux côtés
 * « parallèles » de la photo donnent la focale de l'appareil (point principal au centre de la photo), puis le rapport.
 * Rend null si la photo est quasi de face (côtés parallèles : le rapport mesuré est alors le bon) ou incohérente.
 */
export function rapportReel(q: Quad, w: number, h: number): number | null {
  const u0 = w / 2, v0 = h / 2;
  const m1 = [q[0].x - u0, q[0].y - v0, 1], m2 = [q[1].x - u0, q[1].y - v0, 1], m3 = [q[3].x - u0, q[3].y - v0, 1], m4 = [q[2].x - u0, q[2].y - v0, 1];
  const cr = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const k2 = dot(cr(m1, m4), m3) / dot(cr(m2, m4), m3), k3 = dot(cr(m1, m4), m2) / dot(cr(m3, m4), m2);
  if (!isFinite(k2) || !isFinite(k3)) return null;
  const n2 = m2.map((v, i) => k2 * v - m1[i]), n3 = m3.map((v, i) => k3 * v - m1[i]);
  if (Math.abs(n2[2]) < 1e-3 || Math.abs(n3[2]) < 1e-3) return null; // de face
  const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]);
  if (!(f2 > 0) || !isFinite(f2)) return null;
  const f = Math.sqrt(f2);
  const nrm = (n: number[]) => (n[0] / f) ** 2 + (n[1] / f) ** 2 + n[2] ** 2;
  const r = Math.sqrt(nrm(n2) / nrm(n3)); // largeur / hauteur
  return r > 0.2 && r < 5 ? 1 / r : null;
}

/**
 * Dimensions de la page redressée. Le rapport mesuré sur la photo est faussé par la perspective : on le corrige
 * (rapportReel), puis s'il est proche d'un rapport A4 (portrait ou paysage, à 8 % près) on prend A4 ; sinon on
 * garde le rapport corrigé. `maxi` : plus grand côté en pixels (A4 à ~200 dpi = 2339).
 */
export function dimensionsSortie(q: Quad, maxi = 2339, photo?: { w: number; h: number }): { largeur: number; hauteur: number; format: 'A4' | 'mesure' } {
  const l = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  let r = h / Math.max(1, l);
  const corrige = photo ? rapportReel(q, photo.w, photo.h) : null;
  if (corrige && corrige > 0.4 && corrige < 2.5 && Math.abs(Math.log(corrige / r)) < 0.6) r = corrige;
  let format: 'A4' | 'mesure' = 'mesure';
  if (Math.abs(r / A4 - 1) < 0.08) { r = A4; format = 'A4'; }
  else if (Math.abs(r * A4 - 1) < 0.08) { r = 1 / A4; format = 'A4'; }
  // pas plus de pixels que la photo n'en porte
  const cote = Math.min(maxi, Math.max(l, h) * 1.05);
  const largeur = r >= 1 ? Math.round(cote / r) : Math.round(cote), hauteur = r >= 1 ? Math.round(cote) : Math.round(cote * r);
  return { largeur: Math.max(16, largeur), hauteur: Math.max(16, hauteur), format };
}

/** Redresse le quadrilatère q en un rectangle largeur x hauteur (échantillonnage bilinéaire). */
export function redresser(img: Image, q: Quad, largeur: number, hauteur: number): Image {
  const H = homographie(q, largeur, hauteur);
  // un liseré de 0,5 % est rogné sur chaque bord : les coins sont au pixel près, le bord de la table ne doit pas passer dans la page
  const ex = largeur * 0.005, ey = hauteur * 0.005, kx = (largeur - 2 * ex) / largeur, ky = (hauteur - 2 * ey) / hauteur;
  const out = new Uint8ClampedArray(largeur * hauteur * 4);
  const { data, width: sw, height: sh } = img;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const u = ex + (x + 0.5) * kx, v = ey + (y + 0.5) * ky;
      const d = H[6] * u + H[7] * v + 1;
      let sx = (H[0] * u + H[1] * v + H[2]) / d - 0.5, sy = (H[3] * u + H[4] * v + H[5]) / d - 0.5;
      sx = Math.min(sw - 1.001, Math.max(0, sx)); sy = Math.min(sh - 1.001, Math.max(0, sy));
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const o = (y * largeur + x) * 4;
      for (let k = 0; k < 3; k++) {
        out[o + k] = (data[i00 + k] * (1 - fx) + data[i10 + k] * fx) * (1 - fy) + (data[i01 + k] * (1 - fx) + data[i11 + k] * fx) * fy;
      }
      out[o + 3] = 255;
    }
  }
  return { data: out, width: largeur, height: hauteur };
}

/** Tourne de 90°, 180° ou 270° (sens horaire). */
export function pivoter(img: Image, quarts: number): Image {
  const q = ((quarts % 4) + 4) % 4;
  if (!q) return img;
  const { width: w, height: h, data } = img;
  const W = q === 2 ? w : h, Hh = q === 2 ? h : w;
  const out = new Uint8ClampedArray(W * Hh * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [nx, ny] = q === 1 ? [h - 1 - y, x] : q === 2 ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x];
    const s = (y * w + x) * 4, d = (ny * W + nx) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = 255;
  }
  return { data: out, width: W, height: Hh };
}

// --------------------------------------------------------------------------------------------------
// Fond blanchi

export type Rendu = 'net' | 'couleur' | 'nb';

/** Fond de la page (papier sans texte) : fermeture (max puis flou) sur une version réduite, ré-agrandie. */
function fondPapier(canal: Float32Array, w: number, h: number): Float32Array {
  const f = Math.max(2, Math.round(Math.max(w, h) / 250));        // facteur de réduction
  const lw = Math.max(2, Math.floor(w / f)), lh = Math.max(2, Math.floor(h / f));
  const pet = new Float32Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    let s = 0, n = 0;
    for (let yy = y * f; yy < Math.min(h, (y + 1) * f); yy++) for (let xx = x * f; xx < Math.min(w, (x + 1) * f); xx++) { s += canal[yy * w + xx]; n++; }
    pet[y * lw + x] = s / n;
  }
  const r = Math.max(2, Math.round(lw / 50));                      // les lettres jusqu'à ~ r*2*f px disparaissent
  const bg = flouBoite(flouBoite(maxiBoite(pet, lw, lh, r), lw, lh, r), lw, lh, r);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(lh - 1.001, Math.max(0, (y + 0.5) / f - 0.5)), y0 = fy | 0, ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(lw - 1.001, Math.max(0, (x + 0.5) / f - 0.5)), x0 = fx | 0, tx = fx - x0;
      const a = bg[y0 * lw + x0], b = bg[y0 * lw + x0 + 1], c2 = bg[(y0 + 1) * lw + x0], d = bg[(y0 + 1) * lw + x0 + 1];
      out[y * w + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c2 * (1 - tx) + d * tx) * ty;
    }
  }
  return out;
}

/**
 * Blanchit le fond et rend le texte net : chaque pixel est divisé par le fond estimé autour de lui (l'éclairage
 * inégal et les ombres disparaissent), puis les niveaux sont étirés entre le noir mesuré et le blanc du papier.
 * 'net' : niveaux de gris ; 'couleur' : couleurs gardées ; 'nb' : noir et blanc pur.
 */
export function blanchir(img: Image, rendu: Rendu = 'net'): Image {
  const { width: w, height: h, data } = img, n = w * h;
  const out = new Uint8ClampedArray(n * 4);
  const lum = gris(img);
  const bgL = fondPapier(lum, w, h);
  const ratio = new Float32Array(n);
  for (let i = 0; i < n; i++) ratio[i] = Math.min(1.2, lum[i] / Math.max(20, bgL[i]));
  // noir du texte : 0,4 % des pixels les plus sombres (borné) ; blanc : le papier
  const ech = new Float32Array(Math.min(n, 100000));
  for (let i = 0; i < ech.length; i++) ech[i] = ratio[Math.floor((i * n) / ech.length)];
  ech.sort();
  const bas = ech[Math.floor(ech.length * 0.004)];
  const lo = Math.min(0.72, Math.max(0.08, bas + 0.1)), hi = 0.93;
  const lvl = (r: number) => Math.min(1, Math.max(0, (r - lo) / (hi - lo)));
  if (rendu === 'couleur') {
    const bgC = [0, 1, 2].map((k) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = data[i * 4 + k]; return fondPapier(c, w, h); });
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) out[i * 4 + k] = 255 * lvl(Math.min(1.2, data[i * 4 + k] / Math.max(20, bgC[k][i])));
      out[i * 4 + 3] = 255;
    }
  } else if (rendu === 'nb') {
    for (let i = 0; i < n; i++) { const v = ratio[i] < Math.min(0.82, lo + (hi - lo) * 0.55) ? 0 : 255; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
  } else {
    for (let i = 0; i < n; i++) { const v = 255 * lvl(ratio[i]); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
  }
  return { data: out, width: w, height: h };
}

// --------------------------------------------------------------------------------------------------
// Chaîne complète sur une image (ce que fait le Worker, et ce que mesurent les tests)

export interface Reglages { rendu: Rendu; quarts: number; maxi: number }
export interface Page { image: Image; coins: Quad; format: 'A4' | 'mesure'; detection: Detection | null }

/** Redresse puis blanchit. `coins` : ceux de l'utilisateur ; sinon détection automatique. */
export function traiter(img: Image, reglages: Reglages, coins?: Quad): Page {
  const detection = coins ? null : detecterCoins(img);
  const q = coins ?? detection!.coins;
  const d = dimensionsSortie(q, reglages.maxi, { w: img.width, h: img.height });
  const plat = redresser(img, q, d.largeur, d.hauteur);
  return { image: pivoter(blanchir(plat, reglages.rendu), reglages.quarts), coins: q, format: d.format, detection };
}

// --------------------------------------------------------------------------------------------------
// Mesures et textes

/** Plus grand écart (px) entre les coins trouvés et les coins réels, en les associant dans l'ordre. */
export function erreurCoins(trouves: Quad, reels: Quad): number {
  return Math.max(...trouves.map((p, i) => dist(p, reels[i])));
}

export function taille(octets: number, lang: 'fr' | 'en' = 'fr'): string {
  const mo = lang === 'fr' ? 'Mo' : 'MB', ko = lang === 'fr' ? 'Ko' : 'KB';
  const nb = (v: number) => (lang === 'fr' ? v.toFixed(1).replace('.', ',') : v.toFixed(1));
  if (octets >= 1e6) return `${nb(octets / 1e6)} ${mo}`;
  if (octets >= 1e3) return `${Math.round(octets / 1e3)} ${ko}`;
  return `${octets} ${lang === 'fr' ? 'o' : 'B'}`;
}

/** Nom des fichiers produits : « scan.pdf » ; « scan-1.jpg »… */
export function nomPage(i: number, total: number): string {
  return total > 1 ? `scan-${String(i + 1).padStart(2, '0')}.jpg` : 'scan.jpg';
}

/** Déplace un élément d'une liste (réordonnancement des pages). */
export function deplacer<T>(liste: T[], de: number, vers: number): T[] {
  if (de < 0 || de >= liste.length || vers < 0 || vers >= liste.length) return liste;
  const c = [...liste]; const [x] = c.splice(de, 1); c.splice(vers, 0, x); return c;
}

/** Assemble un PDF multipage : une image JPEG par page, à la taille A4 si le rapport s'en approche. */
export async function fabriquerPdf(pages: { jpeg: Uint8Array; largeur: number; hauteur: number }[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setProducer('Lucas App Store'); pdf.setCreator('Lucas App Store');
  for (const p of pages) {
    const img = await pdf.embedJpg(p.jpeg);
    // taille de la page en points (1 pt = 1/72 po) : le plus grand côté fait 842 pt (A4) ; le rapport de l'image est gardé
    const k = 842 / Math.max(p.largeur, p.hauteur);
    const page = pdf.addPage([p.largeur * k, p.hauteur * k]);
    page.drawImage(img, { x: 0, y: 0, width: p.largeur * k, height: p.hauteur * k });
  }
  return pdf.save();
}
