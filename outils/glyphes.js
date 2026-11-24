// Identité d'un symbole du nuancier : ses tracés vectoriels, indépendants de la position et de la couleur.
const r = (v) => v.toFixed(1);

// Formes de petite taille (symbole : ≤ 12 pt, ou 85 % de la case si elle est plus grande) dont le centre est dans la boîte d'une case.
export const glyphesDeCase = (c, formes) =>
  formes.filter((f) => f.h <= Math.max(12, c.h * 0.85) && f.x + f.w / 2 >= c.x && f.x + f.w / 2 <= c.x + c.w && f.y + f.h / 2 >= c.y && f.y + f.h / 2 <= c.y + c.h);

// Coordonnées translatées par rapport au coin bas-gauche du glyphe, arrondies à 0.1 pt.
export function signatureGlyphe(formes) {
  const x0 = Math.min(...formes.map((f) => f.x)), y0 = Math.min(...formes.map((f) => f.y));
  return formes.map((f) => f.trace.map(([op, ...n]) => op + n.map((v, i) => r(v - (i % 2 ? y0 : x0))).join(',')).join(';')).join('|');
}

// Id court stable : g01, g02… dans l'ordre de première apparition.
export function attribuerIds(signatures) {
  const ids = new Map();
  for (const s of signatures) if (!ids.has(s)) ids.set(s, 'g' + String(ids.size + 1).padStart(2, '0'));
  return ids;
}

// Le même symbole tombe à des positions différentes : l'arrondi à 0.1 fait varier un chiffre de 0.1.
// On regroupe donc les signatures de même structure dont tous les nombres diffèrent de ≤ 0.15 :
// renvoie Map(signature → signature représentante, la première rencontrée).
export function regrouper(signatures) {
  const parStructure = new Map(), rep = new Map();
  const nombres = (s) => s.match(/-?\d+\.\d/g).map(Number);
  for (const s of signatures) {
    if (rep.has(s)) continue;
    const cle = s.replace(/-?\d+\.\d/g, '#'), v = nombres(s);
    const liste = parStructure.get(cle) || [];
    const proche = liste.find((r) => nombres(r).every((x, i) => Math.abs(x - v[i]) <= 0.15));
    rep.set(s, proche || s);
    if (!proche) parStructure.set(cle, [...liste, s]);
  }
  return rep;
}

// Tracé SVG du glyphe, ramené au coin haut-gauche (y inversé), à 0.1 pt : { d, l, h }.
// Les points isolés « m h » (avance du texte) ne comptent pas dans la boîte.
export function cheminGlyphe(formes) {
  const garde = formes.flatMap((f) => f.trace.filter((o, i, a) => !(o[0] === 'm' && a[i + 1]?.[0] === 'h') && !(o[0] === 'h' && a[i - 1]?.[0] === 'm')));
  const pts = garde.flatMap(([, ...n]) => n.map((v, i) => [i % 2, v]));
  const xs = pts.filter((p) => !p[0]).map((p) => p[1]), ys = pts.filter((p) => p[0]).map((p) => p[1]);
  const x0 = Math.min(...xs), y1 = Math.max(...ys);
  const d = garde.map(([op, ...n]) => {
    if (op === 'v' || op === 'y') throw new Error('Opérateur de courbe v/y non géré dans un glyphe');
    return op === 'h' ? 'Z' : op.toUpperCase() + n.map((v, i) => r(i % 2 ? y1 - v : v - x0)).join(' ');
  }).join('');
  return { d, l: +r(Math.max(...xs) - x0), h: +r(y1 - Math.min(...ys)) };
}

// Libellé imprimé à gauche d'un coloriage : une seule forme où chaque glyphe est précédé d'un point isolé « m h »
// (sa ligne de base). Renvoie [{ y, signature }] dans l'ordre du flux, y servant à regrouper les glyphes par ligne.
const marqueur = (a, i) => a[i]?.[0] === 'm' && a[i + 1]?.[0] === 'h';
export function glyphesDeLibelle(forme) {
  const out = [];
  let cur = [], y = null;
  const fin = () => {
    if (!cur.length) return;
    const pts = cur.flatMap(([, ...n]) => n);
    const x0 = Math.min(...pts.filter((_, j) => j % 2 === 0)), y0 = Math.min(...pts.filter((_, j) => j % 2));
    const glyphe = [{ x: x0, y: y0, w: Math.max(...pts.filter((_, j) => j % 2 === 0)) - x0, h: Math.max(...pts.filter((_, j) => j % 2)) - y0, trace: cur }];
    out.push({ y, signature: signatureGlyphe(glyphe), glyphe }); // glyphe : pour l'aperçu des libellés inconnus
    cur = [];
  };
  forme.trace.forEach((o, i, a) => {
    if (marqueur(a, i)) { fin(); y = o[2]; } else if (!(o[0] === 'h' && marqueur(a, i - 1))) cur.push(o);
  });
  fin();
  return out;
}
