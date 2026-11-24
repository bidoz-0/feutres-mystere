// Écran « Mes boîtes » : une grande carte par boîte, avec ses couleurs rangées comme dans la boîte.
import { chargerFeutres } from '../donnees/charger.js';
import { creerMemoire } from '../memoire/memoire.js';
import { el, entete, erreur } from '../ui/elements.js';
import { GRILLES, disposition } from './disposition.js';
import { NOMS, grilleEcran, nbHorsUsage, texteHorsUsage } from './presentation.js';
import { entrerPaysage } from './plein-ecran.js';
import { transition, versRoute, vueAffichee } from './transition.js';
import { ouvertureDepuisMesBoites } from './vue-boite.js';

function miniGrille(marque, feutres, indisponibles) {
  const emplacements = disposition(marque, feutres);
  const ecran = grilleEcran(GRILLES[marque]);
  const mini = el('span', { class: 'mini-grille', 'aria-hidden': 'true' }, ...ecran.ordre.map((i) => {
    const f = emplacements[i];
    const point = el('span', { class: f && indisponibles.has(f.code) ? 'hs' : null });
    if (f) point.style.background = f.hex;
    return point;
  }));
  mini.style.setProperty('--colonnes', ecran.colonnes);
  mini.style.setProperty('--lignes', ecran.lignes);
  mini.style.viewTransitionName = `grille-${marque}`;
  return mini;
}

let ouverture = false; // un double toucher n'ouvre la boîte qu'une fois
function carte(marque, feutres, indisponibles) {
  const n = nbHorsUsage(feutres.filter((f) => f.marque === marque), indisponibles);
  const lien = el('a', { class: 'carte-boite', href: `#/boites/${marque}` },
    miniGrille(marque, feutres, indisponibles),
    el('span', { class: 'carte-titre', texte: NOMS[marque] }),
    el('small', { class: n ? 'alerte' : null, texte: texteHorsUsage(n) }));
  lien.style.viewTransitionName = `boite-${marque}`;
  lien.addEventListener('click', async (e) => {
    e.preventDefault();
    if (ouverture) return;
    ouverture = true;
    try {
      await entrerPaysage(); // dans le geste de l'utilisatrice, sinon le plein écran est refusé
      ouvertureDepuisMesBoites();
      await transition(() => versRoute(() => { location.hash = lien.hash; }))?.updateCallbackDone;
    } finally { ouverture = false; }
  });
  return lien;
}

export async function vueBoites(racine, _, estActuelle) {
  racine.append(entete('Mes boîtes', '#/'),
    el('p', { class: 'sous-titre', texte: 'Touche un feutre pour le barrer en rouge quand il ne marche plus.' }));
  try {
    const feutres = await chargerFeutres();
    if (!estActuelle()) return;
    const indisponibles = creerMemoire().lireIndisponibles();
    racine.append(el('ul', { class: 'boites' },
      ...Object.keys(GRILLES).map((m) => el('li', {}, carte(m, feutres, indisponibles)))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger les feutres.');
  }
  vueAffichee();
}
