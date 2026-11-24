import { chargerLivre } from '../donnees/charger.js';
import { el, entete, erreur } from '../ui/elements.js';

export async function vueColoriages(racine, { livreId }, estActuelle) {
  racine.append(entete('Pages', '#/'));
  try {
    const livre = await chargerLivre(livreId);
    if (!estActuelle()) return;
    racine.append(
      el('p', { class: 'sous-titre', texte: livre.titre }),
      el('nav', { 'aria-label': 'Choisir une page' },
        el('ul', { class: 'grille' },
          ...livre.coloriages.map((c) => el('li', {},
            el('a', { class: 'numero', href: `#/livre/${livreId}/${c.numero}`,
              'aria-label': `Page ${c.libelle}`, texte: c.libelle }))))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger ce livre.');
  }
}
