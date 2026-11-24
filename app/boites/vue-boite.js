// Vue d'une boîte en paysage plein écran : grille des capuchons ou liste écrite.
import { chargerFeutres } from '../donnees/charger.js';
import { creerMemoire } from '../memoire/memoire.js';
import { el, entete, erreur } from '../ui/elements.js';
import { GRILLES, disposition } from './disposition.js';
import { NOMS, grilleEcran, nbHorsUsage, texteHorsUsage } from './presentation.js';
import { grilleBoite } from './grille-boite.js';
import { listeBoite } from './liste-boite.js';
import { sortirPaysage } from './plein-ecran.js';
import { transition, versRoute, vueAffichee } from './transition.js';

const SVG = 'http://www.w3.org/2000/svg';
const ICONES = {
  fermer: ['M6 6l12 12M18 6L6 18', 2.4],
  liste: ['M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', 2.4],
  grille: ['M7 7h.01M17 7h.01M7 17h.01M17 17h.01', 6.5],
};
function icone(nom) {
  const [d, epaisseur] = ICONES[nom];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.strokeWidth = epaisseur;
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

// Vrai quand la boîte vient d'être ouverte depuis « Mes boîtes » : fermer revient alors en arrière dans l'historique.
let depuisMesBoites = false;
export const ouvertureDepuisMesBoites = () => { depuisMesBoites = true; };

function echec(racine, titre, message) {
  racine.append(entete(titre, '#/boites'));
  erreur(racine, message);
  vueAffichee();
}

export async function vueBoite(racine, { marque }, estActuelle) {
  const revenirEnArriere = depuisMesBoites;
  depuisMesBoites = false;
  if (!Object.hasOwn(GRILLES, marque)) return echec(racine, 'Boîte inconnue', 'Cette boîte n’existe pas.');
  let feutres;
  try { feutres = await chargerFeutres(); } catch {
    if (estActuelle()) echec(racine, NOMS[marque], 'Impossible de charger les feutres.');
    return;
  }
  if (!estActuelle()) return;

  const memoire = creerMemoire();
  const boite = feutres.filter((f) => f.marque === marque);
  const emplacements = disposition(marque, feutres);
  const ecran = grilleEcran(GRILLES[marque]);

  const fermer = el('button', { type: 'button', class: 'rail-bouton', 'aria-label': 'Fermer la boîte' }, icone('fermer'));
  const bascule = el('button', { type: 'button', class: 'rail-bouton' });
  const compte = el('p', { class: 'compte', 'aria-live': 'polite' });
  const zone = el('div', { class: 'zone' });
  const scene = el('section', { class: 'scene', 'aria-label': NOMS[marque] },
    // texte vertical lu de bas en haut (comme une tranche de livre) : le compte, au-dessus, se lit après le nom
    el('div', { class: 'rail' }, fermer, compte, el('h1', { class: 'tranche', texte: NOMS[marque] }), bascule),
    zone);
  scene.style.viewTransitionName = `boite-${marque}`;

  const majCompte = () => {
    const n = nbHorsUsage(boite, memoire.lireIndisponibles());
    compte.textContent = texteHorsUsage(n);
    compte.classList.toggle('alerte', n > 0);
  };
  let mode = 'grille';
  const afficher = (cascade) => {
    const contenu = mode === 'grille'
      ? grilleBoite({ emplacements, ecran, memoire, cascade, surChangement: majCompte })
      : listeBoite({ feutres: boite, memoire, surChangement: majCompte });
    // la mini-grille de la carte devient cette grille (transition d'ouverture et de fermeture)
    if (mode === 'grille') contenu.style.viewTransitionName = `grille-${marque}`;
    zone.replaceChildren(contenu);
    zone.scrollTop = 0;
    bascule.replaceChildren(icone(mode === 'grille' ? 'liste' : 'grille'));
    bascule.setAttribute('aria-label', mode === 'grille' ? 'Voir la liste' : 'Voir la grille');
  };
  bascule.addEventListener('click', () => {
    mode = mode === 'grille' ? 'liste' : 'grille';
    scene.classList.add('bascule'); // nomme rail et zone pour cette transition seulement
    const vt = transition(() => afficher(false));
    if (vt) vt.finished.finally(() => scene.classList.remove('bascule'));
    else scene.classList.remove('bascule');
  });

  // Sortie : croix, bouton retour Android (il quitte d'abord le plein écran) ou changement d'adresse.
  let partie = false;
  const surPleinEcran = () => { if (!document.fullscreenElement) quitter(); };
  const surAdresse = () => {
    if (partie || estActuelle()) return;
    partie = true;
    nettoyer();
    sortirPaysage();
  };
  const nettoyer = () => {
    document.removeEventListener('fullscreenchange', surPleinEcran);
    removeEventListener('hashchange', surAdresse);
  };
  async function quitter() {
    if (partie) return;
    partie = true;
    nettoyer();
    await sortirPaysage();
    if (!estActuelle()) return;
    transition(() => versRoute(() => (revenirEnArriere ? history.back() : location.replace('#/boites'))));
  }
  fermer.addEventListener('click', quitter);
  document.addEventListener('fullscreenchange', surPleinEcran);
  addEventListener('hashchange', surAdresse);

  majCompte();
  afficher(true);
  racine.append(scene);
  vueAffichee();
}
