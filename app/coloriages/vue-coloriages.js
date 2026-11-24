import { chargerLivre } from '../donnees/charger.js';
import { el, entete, erreur } from '../ui/elements.js';

export async function vueColoriages(racine, { livreId }, estActuelle) {
  racine.append(entete('Coloriages', '#/'));
  try {
    const livre = await chargerLivre(livreId);
    if (!estActuelle()) return;
    racine.append(
      el('p', { class: 'sous-titre', texte: livre.titre }),
      el('nav', { 'aria-label': 'Choisir un coloriage' },
        el('ul', { class: 'grille' },
          ...livre.coloriages.map((c) => el('li', {},
            el('a', { class: 'numero', href: `#/livre/${livreId}/${c.numero}`,
              'aria-label': `Coloriage ${c.numero}`, texte: c.numero }))))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger ce livre.');
  }
}
