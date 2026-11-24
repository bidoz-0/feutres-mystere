// Correspondance couleur -> feutre. Pur calcul : ni DOM, ni localStorage.
import { hexVersLab, deltaE } from '../couleurs/couleur.js';

export const MALUS = 15;

// Lab calculé une seule fois par tableau de feutres.
const caches = new WeakMap();
function labs(feutres) {
  if (!caches.has(feutres)) caches.set(feutres, feutres.map((f) => hexVersLab(f.hex)));
  return caches.get(feutres);
}

const norm = (s) => String(s).toUpperCase().replace(/[\s-]/g, '');

export function plusProches(hex, feutres, preference, n = 5) {
  const lab = hexVersLab(hex);
  const l = labs(feutres);
  return feutres
    .map((feutre, i) => {
      const malus = MALUS * Math.max(0, feutre.marque === 'languo' ? preference : -preference);
      return { feutre, distance: deltaE(lab, l[i]) + malus };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}

export function trouverFeutre(saisie, feutres) {
  const s = norm(saisie ?? '');
  return s ? feutres.find((f) => norm(f.code) === s) ?? null : null;
}

export function proposerNuancier(coloriage, feutres, preference, choix) {
  return coloriage.cases.map(({ symbole, hex }) => {
    const propose = plusProches(hex, feutres, preference, 1)[0]?.feutre ?? null;
    const c = choix?.[symbole];
    if (!c) return { symbole, hex, feutre: propose, texte: null, modifie: false };
    const feutre = c.code !== undefined ? feutres.find((f) => f.code === c.code) : null;
    if (feutre) return { symbole, hex, feutre, texte: null, modifie: feutre !== propose };
    // code disparu des feutres : on garde le code comme texte libre
    return { symbole, hex, feutre: null, texte: c.texte ?? c.code, modifie: true };
  });
}

export function doublons(lignes) {
  const out = {};
  for (const a of lignes) {
    if (!a.feutre) continue;
    const autres = lignes.filter((b) => b !== a && b.feutre?.code === a.feutre.code);
    if (autres.length) out[a.symbole] = autres.map((b) => b.symbole);
  }
  return out;
}
