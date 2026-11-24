// Détection des cases colorées d'une image (pur : fonctionne dans le navigateur et sous Node).
const TOLERANCE = 12;
const COTE_MIN = 20;

// Composantes connexes des pixels différents du fond ; on garde celles dont la taille
// est proche de la médiane (écarte cadre extérieur, texte, bruit).
export function trouverCases(img, fond) {
  const { width, height, data } = img;
  const vu = new Uint8Array(width * height);
  const zones = [];
  const estFond = (p) => Math.abs(data[p * 4] - fond[0]) <= TOLERANCE
    && Math.abs(data[p * 4 + 1] - fond[1]) <= TOLERANCE
    && Math.abs(data[p * 4 + 2] - fond[2]) <= TOLERANCE;
  for (let start = 0; start < vu.length; start++) {
    if (vu[start] || estFond(start)) continue;
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    const pile = [start];
    vu[start] = 1;
    while (pile.length) {
      const p = pile.pop();
      const x = p % width, y = (p - x) / width;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (!vu[q] && !estFond(q)) { vu[q] = 1; pile.push(q); }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w >= COTE_MIN && h >= COTE_MIN) zones.push({ x: x0, y: y0, w, h });
  }
  if (!zones.length) return [];
  const mediane = (v) => v.slice().sort((a, b) => a - b)[v.length >> 1];
  const mw = mediane(zones.map((z) => z.w)), mh = mediane(zones.map((z) => z.h));
  const cases = zones.filter((z) => Math.abs(z.w - mw) <= mw * 0.25 && Math.abs(z.h - mh) <= mh * 0.25);
  // ordre de lecture : lignes (centres à moins d'une demi-hauteur), puis gauche → droite
  cases.sort((a, b) => a.y - b.y);
  const lignes = [];
  for (const c of cases) {
    const ligne = lignes.find((l) => Math.abs(l[0].y - c.y) < mh / 2);
    if (ligne) ligne.push(c); else lignes.push([c]);
  }
  return lignes.flatMap((l) => l.sort((a, b) => a.x - b.x));
}

// Médiane des pixels d'une bande verticale à 15 % du bord gauche (évite le texte et les coins arrondis).
export function couleurCase(img, cellule) {
  const x = cellule.x + Math.round(cellule.w * 0.15);
  const y0 = cellule.y + Math.round(cellule.h * 0.25), y1 = cellule.y + Math.round(cellule.h * 0.75);
  const canaux = [[], [], []];
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      const p = (yy * img.width + xx) * 4;
      for (let k = 0; k < 3; k++) canaux[k].push(img.data[p + k]);
    }
  }
  const med = (v) => v.sort((a, b) => a - b)[v.length >> 1];
  return '#' + canaux.map((v) => med(v).toString(16).padStart(2, '0')).join('');
}

// Groupes 1D : trie les valeurs et coupe aux (k-1) plus grands écarts ; renvoie le centre médian de chaque groupe.
function centresGroupes(valeurs, k) {
  const v = valeurs.slice().sort((a, b) => a - b);
  if (v.length < k) throw new Error(`${v.length} positions détectées pour ${k} groupes`);
  const coupes = v.slice(1).map((x, i) => [x - v[i], i + 1]).sort((a, b) => b[0] - a[0]).slice(0, k - 1).map((c) => c[1]).sort((a, b) => a - b);
  const bornes = [0, ...coupes, v.length];
  return bornes.slice(1).map((fin, i) => { const g = v.slice(bornes[i], fin); return g[g.length >> 1]; });
}

// Les nuanciers sont des grilles régulières : reconstruit exactement colonnes × lignes cases
// (y compris celles non détectées, ex. case blanche = fond), en ordre de lecture.
export function casesEnGrille(cases, colonnes, lignes) {
  const med = (v) => v.slice().sort((a, b) => a - b)[v.length >> 1];
  const w = med(cases.map((c) => c.w)), h = med(cases.map((c) => c.h));
  const cx = centresGroupes(cases.map((c) => c.x + c.w / 2), colonnes);
  const cy = centresGroupes(cases.map((c) => c.y + c.h / 2), lignes);
  return cy.flatMap((y) => cx.map((x) => ({ x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h })));
}
