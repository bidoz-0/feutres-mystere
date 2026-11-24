import { chargerLivre } from '../donnees/charger.js';
import { creerMemoire } from '../memoire/memoire.js';
import { el, entete, erreur } from '../ui/elements.js';

export async function vueColoriages(racine, { livreId }, estActuelle) {
  racine.append(entete('Pages', '#/'));
  try {
    const livre = await chargerLivre(livreId);
    if (!estActuelle()) return;
    const memoire = creerMemoire();
    const bouton = el('button', { type: 'button', class: 'secondaire action-livre' });
    const majBouton = () => { bouton.textContent = memoire.estLivreFini(livreId) ? 'Reprendre le livre' : 'Valider le livre (fini)'; };
    bouton.addEventListener('click', () => {
      memoire.marquerLivreFini(livreId, !memoire.estLivreFini(livreId));
      majBouton();
    });
    majBouton();
    racine.append(
      el('p', { class: 'sous-titre', texte: livre.titre }),
      el('nav', { 'aria-label': 'Choisir une page' },
        el('ul', { class: 'grille' },
          ...livre.coloriages.map((c) => {
            const finie = memoire.estPageFinie(livreId, c.numero);
            return el('li', {},
              el('a', { class: finie ? 'numero finie' : 'numero', href: `#/livre/${livreId}/${c.numero}`,
                'aria-label': `Page ${c.libelle}${finie ? ' (finie)' : ''}` },
                c.libelle, finie ? el('span', { class: 'coche', 'aria-hidden': 'true', texte: '✓' }) : null));
          }))),
      bouton);
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger ce livre.');
  }
}
