// Calculs purs pour afficher une boîte : grille à l'écran, délais de cascade, liste, textes.
import { hexVersLab } from '../couleurs/couleur.js';

export const NOMS = { languo: 'Languo 240', guangna: 'GuangNa 168' };

// Une boîte plus haute que large (Languo) est couchée en paysage, le haut de la boîte à gauche.
// `ordre[k]` = indice dans la disposition (rangée par rangée) de la k-ième case de l'écran (sens de lecture).
export function grilleEcran({ rangees, colonnes }) {
  const couchee = rangees > colonnes;
  const largeur = couchee ? rangees : colonnes;
  const ordre = Array.from({ length: rangees * colonnes }, (_, k) => {
    const ligne = Math.floor(k / largeur), col = k % largeur;
    return couchee ? col * colonnes + (colonnes - 1 - ligne) : k;
  });
  return { lignes: couchee ? colonnes : rangees, colonnes: largeur, ordre };
}

// Délai (ms) de la case k : balayage en diagonale depuis le coin haut-gauche, `total` ms au plus.
export function delaiCascade(k, { lignes, colonnes }, total = 260) {
  const diagonales = lignes + colonnes - 2;
  if (diagonales <= 0) return 0;
  return Math.round(((Math.floor(k / colonnes) + (k % colonnes)) / diagonales) * total);
}

const ordreCode = (a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true });
// Liste écrite : triée par code, éventuellement réduite aux feutres qui ne marchent plus.
export const listeTriee = (feutres, indisponibles, seulementHorsUsage = false) =>
  feutres.filter((f) => !seulementHorsUsage || indisponibles.has(f.code)).sort(ordreCode);

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const codeNormalise = (s) => sansAccent(s).replace(/[\s-]/g, '');

// Recherche par code (sans espace ni tiret, préfixe accepté) ou par nom ; code exact, puis préfixe, puis le reste.
export function chercherFeutres(feutres, saisie, max = 20) {
  const q = codeNormalise(saisie), nom = sansAccent(saisie).trim();
  if (!q) return [];
  const rang = (f) => {
    const c = codeNormalise(f.code);
    if (c === q) return 0;
    if (c.startsWith(q)) return 1;
    if (c.includes(q)) return 2;
    return sansAccent(f.nom).includes(nom) ? 3 : -1;
  };
  return feutres.map((f) => [rang(f), f]).filter(([r]) => r >= 0)
    .sort((a, b) => a[0] - b[0] || ordreCode(a[1], b[1])).slice(0, max).map(([, f]) => f);
}

// Feutres hors d'usage, rangés par boîte puis par code.
export const horsUsageTries = (feutres, indisponibles) =>
  feutres.filter((f) => indisponibles.has(f.code))
    .sort((a, b) => a.marque.localeCompare(b.marque) || ordreCode(a, b));

export const nbHorsUsage = (feutres, indisponibles) => feutres.filter((f) => indisponibles.has(f.code)).length;

export const texteHorsUsage = (n) => (n === 0 ? 'Tous marchent' : `${n} ne marche${n > 1 ? 'nt' : ''} plus`);

// Code écrit en foncé sur un capuchon clair, en blanc sur un foncé.
export const encreSur = (hex) => (hexVersLab(hex)[0] > 62 ? 'sur-clair' : 'sur-fonce');
