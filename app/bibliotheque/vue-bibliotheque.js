import { chargerIndexLivres } from '../donnees/charger.js';
import { el, entete, erreur } from '../ui/elements.js';

export async function vueBibliotheque(racine, _, estActuelle) {
  racine.append(entete('Mes coloriages mystère'));
  try {
    const livres = await chargerIndexLivres();
    if (!estActuelle()) return;
    racine.append(el('ul', { class: 'liste' },
      ...livres.map((l) => el('li', {}, el('a', { class: 'carte', href: `#/livre/${l.id}`, texte: l.titre })))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger la liste des livres.');
  }
}
