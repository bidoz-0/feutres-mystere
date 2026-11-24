// Lecture des formes remplies d'un flux de contenu PDF (pur, sans fichier).
const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
// Gris (1), RVB (3) ou CMJN (4, conversion simple sans profil) → #rrggbb ; autre nombre de composantes = erreur.
function hexDe(c, op) {
  if (c.length === 4) { const [C, M, J, K] = c; c = [(1 - C) * (1 - K), (1 - M) * (1 - K), (1 - J) * (1 - K)]; }
  else if (c.length === 1) c = [c[0], c[0], c[0]];
  else if (c.length !== 3) throw new Error(`Opérateur de couleur « ${op} » avec ${c.length} composantes (1, 3 ou 4 attendues)`);
  return '#' + c.map(hex2).join('');
}

export function lireFormes(contenu) {
  const formes = [];
  let nombres = [], pts = [], trace = [], hex = '#000000';
  const pile = []; // couleurs sauvegardées par q, restaurées par Q
  let repere = null, repereMsg = ''; // repere = profondeur de pile où un cm non identité est actif
  for (const t of contenu.split(/\s+/)) {
    if (t !== '' && !isNaN(t)) { nombres.push(+t); continue; }
    const n = nombres;
    if (t === 'q') pile.push(hex);
    else if (t === 'Q') {
      hex = pile.pop() ?? hex;
      if (repere !== null && pile.length < repere) repere = null;
    }
    else if (t === 'cm') {
      // Un changement de repère ne gêne pas tant qu'aucune forme n'est remplie dedans (ex. image de couverture) :
      // erreur seulement au remplissage. shortcut: pas de calcul de la transformation, à ajouter si un livre en a besoin.
      if (n.join() !== '1,0,0,1,0,0') repere ??= pile.length;
      if (repere !== null) repereMsg = n.join(' ');
    }
    else if (t === 'sc' || t === 'scn' || t === 'rg' || t === 'g' || t === 'k') hex = hexDe(n, t);
    else if (t === 'h') trace.push(['h']);
    else if (t === 'm' || t === 'l') { pts.push(n.slice(-2)); trace.push([t, ...n.slice(-2)]); }
    else if (t === 'c') { pts.push(n.slice(-6, -4), n.slice(-4, -2), n.slice(-2)); trace.push(['c', ...n.slice(-6)]); }
    else if (t === 'v' || t === 'y') { pts.push(n.slice(-4, -2), n.slice(-2)); trace.push([t, ...n.slice(-4)]); }
    else if (t === 're') {
      const [x, y, w, h] = n.slice(-4);
      pts.push([x, y], [x + w, y + h]);
      trace.push(['m', x, y], ['l', x + w, y], ['l', x + w, y + h], ['l', x, y + h], ['h']);
    }
    else if (t === 'f' || t === 'F' || t === 'f*' || t === 'B' || t === 'B*' || t === 'b' || t === 'b*') {
      if (pts.length) {
        if (repere !== null) throw new Error(`Forme remplie dans un repère modifié par cm (${repereMsg}) : non géré`);
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        formes.push({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, hex, trace });
      }
      pts = []; trace = [];
    } else if (t === 'n' || t === 'S' || t === 's') { pts = []; trace = []; }
    nombres = [];
  }
  return formes;
}

// Cases d'un nuancier : formes de 20 pt de haut, groupées par ligne (haut en bas), triées par x.
// surFusion(y, hex, x) est appelé quand deux formes collées de même couleur sont fusionnées.
export function grouperEnLignes(formes, surFusion = () => {}) {
  // même ligne = y qui diffèrent de moins de 2 pt d'une case à la suivante (tri par y, regroupement glissant)
  const groupes = [];
  for (const f of formes.filter((f) => Math.abs(f.h - 20) < 1).sort((a, b) => a.y - b.y)) {
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
