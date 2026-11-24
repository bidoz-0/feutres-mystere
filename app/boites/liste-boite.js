// Liste écrite d'une boîte : pastille, code, nom et case « ne marche plus », triée par code.
import { el } from '../ui/elements.js';
import { listeTriee } from './presentation.js';
import { ligneFeutre } from './ligne-feutre.js';
import { champRecherche } from './recherche.js';

export function listeBoite({ feutres, memoire, surChangement }) {
  const filtre = el('input', { type: 'checkbox' });
  const lignes = el('ul', { class: 'liste-boite' });
  const vide = el('p', { class: 'liste-vide', texte: 'Tous les feutres de cette boîte marchent.', hidden: true });
  // La liste n'est refaite qu'au changement de filtre : une case décochée ne fait pas disparaître sa ligne sous le doigt.
  const remplir = () => {
    const indisponibles = memoire.lireIndisponibles();
    const choisis = listeTriee(feutres, indisponibles, filtre.checked);
    lignes.replaceChildren(...choisis.map((f) => ligneFeutre(f, indisponibles.has(f.code), memoire, surChangement)));
    vide.hidden = choisis.length > 0;
  };
  filtre.addEventListener('change', remplir);
  remplir();
  const recherche = champRecherche({ feutres, memoire, surChangement: () => { surChangement(); remplir(); } });
  return el('div', { class: 'vue-liste' }, recherche,
    el('label', { class: 'filtre-hs' }, filtre, el('span', { texte: 'Seulement ceux qui ne marchent plus' })),
    lignes, vide);
}
