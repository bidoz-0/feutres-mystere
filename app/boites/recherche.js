// Champ « Chercher un feutre » : les résultats restent affichés quand on coche, pour ne pas bouger sous le doigt.
import { el } from '../ui/elements.js';
import { chercherFeutres } from './presentation.js';
import { ligneFeutre } from './ligne-feutre.js';

export function champRecherche({ feutres, memoire, surChangement, avecBoite = false }) {
  const champ = el('input', { type: 'search', id: `recherche-${avecBoite ? 'toutes' : 'boite'}`, class: 'champ-recherche',
    placeholder: 'ex. RY-07, 611, pink…', inputmode: 'search', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
  const resultats = el('ul', { class: 'liste-boite resultats' });
  champ.addEventListener('input', () => {
    const indisponibles = memoire.lireIndisponibles();
    resultats.replaceChildren(...chercherFeutres(feutres, champ.value)
      .map((f) => ligneFeutre(f, indisponibles.has(f.code), memoire, surChangement, avecBoite)));
  });
  return el('div', { class: 'recherche' },
    el('label', { for: champ.id, class: 'etiquette-recherche', texte: 'Chercher un feutre' }), champ, resultats);
}
