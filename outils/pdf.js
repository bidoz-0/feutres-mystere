// Lecture des formes remplies d'un flux de contenu PDF (pur, sans fichier).
const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
// Gris (1), RVB (3) ou CMJN (4, conversion simple sans profil) → #rrggbb ; autre nombre de composantes = erreur.
function hexDe(c, op) {
  if (c.length === 4) { const [C, M, J, K] = c; c = [(1 - C) * (1 - K), (1 - M) * (1 - K), (1 - J) * (1 - K)]; }
  else if (c.length === 1) c = [c[0], c[0], c[0]];
  else if (c.length !== 3) throw new Error(`Opérateur de couleur « ${op} » avec ${c.length} composantes (1, 3 ou 4 attendues)`);
  return '#' + c.map(hex2).join('');
}

// Matrices PDF [a b c d e f] : mult(A, B) = A puis B.
const mult = (A, B) => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3],
  A[4] * B[0] + A[5] * B[2] + B[4], A[4] * B[1] + A[5] * B[3] + B[5]];
const IDENTITE = [1, 0, 0, 1, 0, 0];
const ESPACES_OK = ['DeviceGray', 'DeviceRGB', 'DeviceCMYK', 'ICCBased', 'CalGray', 'CalRGB'];
const TOKEN = /\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s/[\]()<>]*|[^\s/[\]()<>]+/g;
const ECHAPPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
const chaine = (t) => t[0] === '('
  ? t.slice(1, -1).replace(/\\(\r?\n|[0-7]{1,3}|[\s\S])/g, (_, c) => /^[0-7]/.test(c) ? String.fromCharCode(parseInt(c, 8)) : c.includes('\n') ? '' : (ECHAPPES[c] ?? c))
  : Buffer.from(t.slice(1, -1).replace(/\s/g, '').padEnd(Math.ceil((t.length - 2) / 2) * 2, '0'), 'hex').toString('latin1');

// ctx.polices : nom → () => police ({ octets, glyphe(code), texte(codes) }) ; ctx.espaces : nom → type d'espace de couleur.
// Renvoie les formes remplies ; les glyphes de texte sont des formes `police: true`, et le tableau porte `textes` [{ x, y, texte }].
export function lireFormes(contenu, ctx = {}) {
  const formes = [], textes = [];
  let nombres = [], pts = [], trace = [], hex = '#000000', espace = 'DeviceGray', nom = '', tableau = null, chaines = [];
  let rendu = 0, nomPolice = '', ctm = IDENTITE, tm = IDENTITE, tlm = IDENTITE, police = null, taille = 0, tc = 0, tw = 0, th = 1, tl = 0, rise = 0;
  const pile = []; // état sauvegardé par q, restauré par Q
  const P = (x, y) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
  const paires = (v) => v.flatMap((x, i) => (i % 2 ? [] : P(x, v[i + 1])));
  const ajoute = (op, v) => { for (let i = 0; i < v.length; i += 2) pts.push(P(v[i], v[i + 1])); trace.push([op, ...paires(v)]); };

  const montre = (s) => { // affiche la chaîne s (octets) avec la police courante : un glyphe = une forme
    if (!police) throw new Error('Texte sans police (Tf)');
    const codes = [];
    for (let i = 0; i < s.length; i += police.octets) codes.push(police.octets === 2 ? s.charCodeAt(i) * 256 + s.charCodeAt(i + 1) : s.charCodeAt(i));
    const [x, y] = mult(tm, ctm).slice(4);
    textes.push({ x, y, texte: police.texte(codes), police: nomPolice });
    for (const code of codes) {
      const g = police.glyphe?.(code), car = police.caractere?.(code) ?? null;
      if (g?.trace.length && rendu % 4 !== 3) {
        const M = mult([taille * th, 0, 0, taille, 0, rise], mult(tm, ctm));
        const pose = (m) => g.trace.map(([op, ...v]) => [op, ...v.flatMap((a, i) => (i % 2 ? [] : [m[0] * a + m[2] * v[i + 1] + m[4], m[1] * a + m[3] * v[i + 1] + m[5]]))]);
        const bornes = (tr) => { const c = tr.flatMap(([, ...v]) => v); return [c.filter((_, i) => !(i % 2)), c.filter((_, i) => i % 2)]; };
        const [xs, ys] = bornes(pose(M));
        const x0 = Math.min(...xs), y0 = Math.min(...ys);
        // Tracé ramené à un corps de 10 pt (coin bas-gauche inchangé) : un même symbole garde la même signature quelle que soit la taille du texte.
        const k = 10 / Math.hypot(M[0], M[1]);
        const [xn, yn] = bornes(pose([M[0] * k, M[1] * k, M[2] * k, M[3] * k, M[4], M[5]]));
        const dxn = x0 - Math.min(...xn), dyn = y0 - Math.min(...yn);
        const trace = pose([M[0] * k, M[1] * k, M[2] * k, M[3] * k, M[4] + dxn, M[5] + dyn]);
        formes.push({ x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, hex, trace, police: true, car });
      }
      const dx = ((g?.avance ?? 0) * taille + tc + (code === 32 && police.octets === 1 ? tw : 0)) * th;
      tm = mult([1, 0, 0, 1, dx, 0], tm);
    }
  };

  for (const t of contenu.match(TOKEN) ?? []) {
    if (t === '[') { tableau = []; continue; }
    if (t === ']') { chaines.push(tableau); tableau = null; continue; }
    if (!isNaN(t)) { (tableau ?? nombres).push(+t); continue; }
    if (t[0] === '(' || t[0] === '<') { (tableau ?? chaines).push(chaine(t)); continue; }
    if (t[0] === '/') { nom = t.slice(1); continue; }
    const n = nombres;
    if (t === 'q') pile.push({ hex, espace, ctm });
    else if (t === 'Q') ({ hex, espace, ctm } = pile.pop() ?? { hex, espace, ctm });
    else if (t === 'cm' && n.length === 6) ctm = mult(n, ctm);
    else if (t === 'cs') espace = nom in (ctx.espaces ?? {}) ? ctx.espaces[nom] : nom;
    else if (t === 'sc' || t === 'scn' || t === 'rg' || t === 'g' || t === 'k') {
      if (t === 'rg' || t === 'g' || t === 'k') espace = 'DeviceGray';
      if (espace.c0 && n.length === 1) { // Separation à fonction de type 2 : C0 + t^N (C1 − C0), dans l'espace de remplacement
        hex = hexDe(espace.c0.map((c, i) => c + n[0] ** espace.n * (espace.c1[i] - c)), t);
      } else {
        if (!ESPACES_OK.includes(espace)) throw new Error(`Espace de couleur « ${espace.type ?? espace} » non géré`);
        hex = hexDe(n, t);
      }
    }
    else if (t === 'BT') { tm = tlm = IDENTITE; }
    else if (t === 'Tf') { police = ctx.polices?.[nom]?.() ?? null; nomPolice = nom; taille = n.at(-1); }
    else if (t === 'Tc') tc = n[0];
    else if (t === 'Tw') tw = n[0];
    else if (t === 'Tz') th = n[0] / 100;
    else if (t === 'TL') tl = n[0];
    else if (t === 'Ts') rise = n[0];
    else if (t === 'Tm') tm = tlm = n.slice(-6);
    else if (t === 'Td' || t === 'TD') { if (t === 'TD') tl = -n[1]; tm = tlm = mult([1, 0, 0, 1, n[0], n[1]], tlm); }
    else if (t === 'T*') tm = tlm = mult([1, 0, 0, 1, 0, -tl], tlm);
    else if (t === 'Tj') montre(chaines[0] ?? '');
    else if (t === 'Tr') rendu = n[0]; // 0-2 et 4-6 : texte visible (contour compris) ; 3 et 7 : invisible
    else if (t === "'" || t === '"') { // saut de ligne puis texte (" fixe aussi Tw et Tc)
      if (t === '"') [tw, tc] = n.slice(-2);
      tm = tlm = mult([1, 0, 0, 1, 0, -tl], tlm);
      montre(chaines[0] ?? '');
    }
    else if (t === 'TJ') for (const e of chaines[0] ?? []) {
      if (typeof e === 'number') tm = mult([1, 0, 0, 1, -e / 1000 * taille * th, 0], tm); else montre(e);
    }
    else if (t === 'h') trace.push(['h']);
    else if (t === 'm' || t === 'l') ajoute(t, n.slice(-2));
    else if (t === 'c') ajoute('c', n.slice(-6));
    else if (t === 'v' || t === 'y') ajoute(t, n.slice(-4));
    else if (t === 're') {
      const [x, y, w, h] = n.slice(-4);
      ajoute('m', [x, y]); ajoute('l', [x + w, y]); ajoute('l', [x + w, y + h]); ajoute('l', [x, y + h]); trace.push(['h']);
    }
    else if (t === 'f' || t === 'F' || t === 'f*' || t === 'B' || t === 'B*' || t === 'b' || t === 'b*') {
      if (pts.length) {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        formes.push({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, hex, trace });
      }
      pts = []; trace = [];
    } else if (t === 'n' || t === 'S' || t === 's') { pts = []; trace = []; }
    nombres = []; chaines = [];
  }
  return Object.assign(formes, { textes });
}

// Cases d'un nuancier : formes de la hauteur la plus fréquente (14 à 24 pt selon le livre), groupées par ligne (haut en bas), triées par x.
// surFusion(y, hex, x) est appelé quand deux formes collées de même couleur sont fusionnées.
export function grouperEnLignes(formes, surFusion = () => {}) {
  // même ligne = y qui diffèrent de moins de 2 pt d'une case à la suivante (tri par y, regroupement glissant)
  const hauteurs = new Map();
  for (const f of formes) if (!f.police && f.h >= 14 && f.h <= 24 && f.w <= 40) hauteurs.set(Math.round(f.h * 2) / 2, (hauteurs.get(Math.round(f.h * 2) / 2) || 0) + 1);
  const hCase = [...hauteurs].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
  const groupes = [];
  for (const f of formes.filter((f) => !f.police && Math.abs(f.h - hCase) < 1).sort((a, b) => a.y - b.y)) {
    const g = groupes.at(-1);
    if (g && f.y - g.at(-1).y < 2) g.push(f); else groupes.push([f]);
  }
  return groupes.map((g) => [Math.round(g[0].y), g]).sort((a, b) => b[0] - a[0]).map(([y, fs]) => {
    const ligne = [];
    let dernier = null;
    for (const f of fs.sort((a, b) => a.x - b.x)) {
      if (dernier && dernier.hex === f.hex && f.x <= dernier.x + dernier.w + 0.5) {
        dernier.w = Math.max(dernier.w, f.x + f.w - dernier.x);
        surFusion(y, f.hex, f.x);
      } else {
        dernier = { ...f };
        ligne.push(dernier);
      }
    }
    return Object.assign(ligne.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h, hex: f.hex })), { y }); // y gardé pour regrouper les lignes de suite
  });
}
