// Lecture des formes remplies d'un flux de contenu PDF (pur, sans fichier).
const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
const hexDe = (c) => '#' + (c.length === 1 ? [c[0], c[0], c[0]] : c).map(hex2).join('');

export function lireFormes(contenu) {
  const formes = [];
  let nombres = [], pts = [], trace = [], hex = '#000000';
  for (const t of contenu.split(/\s+/)) {
    if (t !== '' && !isNaN(t)) { nombres.push(+t); continue; }
    const n = nombres;
    if (t === 'cm') throw new Error('Opérateur cm non géré (changement de repère)');
    else if (t === 'sc' || t === 'scn' || t === 'rg') hex = hexDe(n.slice(-3));
    else if (t === 'g') hex = hexDe(n.slice(-1));
    else if (t === 'h') trace.push(['h']);
    else if (t === 'm' || t === 'l') { pts.push(n.slice(-2)); trace.push([t, ...n.slice(-2)]); }
    else if (t === 'c') { pts.push(n.slice(-6, -4), n.slice(-4, -2), n.slice(-2)); trace.push(['c', ...n.slice(-6)]); }
    else if (t === 'v' || t === 'y') { pts.push(n.slice(-4, -2), n.slice(-2)); trace.push([t, ...n.slice(-4)]); }
    else if (t === 're') {
      const [x, y, w, h] = n.slice(-4);
      pts.push([x, y], [x + w, y + h]);
      trace.push(['m', x, y], ['l', x + w, y], ['l', x + w, y + h], ['l', x, y + h], ['h']);
    }
    else if (t === 'f' || t === 'F' || t === 'f*') {
      if (pts.length) {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        formes.push({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, hex, trace });
      }
      pts = []; trace = [];
    } else if (t === 'n' || t === 'S' || t === 's' || t === 'B' || t === 'b' || t === 'B*') { pts = []; trace = []; }
    nombres = [];
  }
  return formes;
}

// Cases d'un nuancier : formes de 20 pt de haut, groupées par ligne (haut en bas), triées par x.
// surFusion(y, hex, x) est appelé quand deux formes collées de même couleur sont fusionnées.
export function grouperEnLignes(formes, surFusion = () => {}) {
  const parY = new Map();
  for (const f of formes.filter((f) => Math.abs(f.h - 20) < 1)) {
    const y = Math.round(f.y);
    parY.set(y, [...(parY.get(y) || []), f]);
  }
  return [...parY].sort((a, b) => b[0] - a[0]).map(([y, fs]) => {
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
