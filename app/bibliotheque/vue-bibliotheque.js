import { chargerIndexLivres, chargerLivre } from '../donnees/charger.js';
import { el, entete, erreur } from '../ui/elements.js';
import { couleursMosaique } from './mosaique.js';

function carre(l, livre) {
  const mosaique = el('span', { class: 'mosaique', 'aria-hidden': 'true' },
    ...(livre ? couleursMosaique(livre, 16) : []).map((hex) => {
      const p = el('span');
      p.style.background = hex;
      return p;
    }));
  return el('a', { class: 'carre', href: `#/livre/${l.id}` }, mosaique,
    el('span', { class: 'carre-titre', texte: l.titre }),
    livre && el('small', { texte: `${livre.coloriages.length} coloriages` }));
}

export async function vueBibliotheque(racine, _, estActuelle) {
  racine.append(entete('Mes coloriages mystère'));
  try {
    const livres = await chargerIndexLivres();
    // un livre illisible reste affiché (titre seul)
    const details = await Promise.all(livres.map((l) => chargerLivre(l.id).catch(() => null)));
    if (!estActuelle()) return;
    racine.append(el('ul', { class: 'bibliotheque' },
      ...livres.map((l, i) => el('li', {}, carre(l, details[i])))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger la liste des livres.');
  }
}
