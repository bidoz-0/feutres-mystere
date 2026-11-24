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

export const nbHorsUsage = (feutres, indisponibles) => feutres.filter((f) => indisponibles.has(f.code)).length;

export const texteHorsUsage = (n) => (n === 0 ? 'Tous marchent' : `${n} ne marche${n > 1 ? 'nt' : ''} plus`);

// Code écrit en foncé sur un capuchon clair, en blanc sur un foncé.
export const encreSur = (hex) => (hexVersLab(hex)[0] > 62 ? 'sur-clair' : 'sur-fonce');
