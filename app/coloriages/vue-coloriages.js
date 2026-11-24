import { chargerFeutres, chargerLivre } from '../donnees/charger.js';
import { creerMemoire, versChoix } from '../memoire/memoire.js';
import { choixFiges } from '../nuancier/proposer.js';
import { el, entete, erreur } from '../ui/elements.js';

export async function vueColoriages(racine, { livreId }, estActuelle) {
  racine.append(entete('Pages', '#/'));
  try {
    const livre = await chargerLivre(livreId);
    if (!estActuelle()) return;
    const memoire = creerMemoire();
    const bouton = el('button', { type: 'button', class: 'secondaire action-livre' });
    const majBouton = () => { bouton.textContent = memoire.estLivreFini(livreId) ? 'Reprendre le livre' : 'Valider le livre (fini)'; };
    const message = el('p', { class: 'bandeau', role: 'status', hidden: '' });
    bouton.addEventListener('click', async () => {
      const finir = !memoire.estLivreFini(livreId);
      message.hidden = true;
      if (finir) {
        try {
          const feutres = await chargerFeutres();
          const preference = versChoix(memoire.lirePreference());
          for (const c of livre.coloriages) {
            memoire.completerChoix(livreId, c.numero, choixFiges(c, feutres, preference, memoire.lireChoix(livreId, c.numero)));
          }
        } catch {
          message.textContent = "Impossible de charger les feutres : le livre n'est pas marqué fini.";
          message.hidden = false;
          return;
        }
      }
      memoire.marquerLivreFini(livreId, finir);
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
      bouton, message);
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger ce livre.');
  }
}
