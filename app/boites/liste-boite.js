// Liste écrite d'une boîte : pastille, code, nom et case « ne marche plus », triée par code.
import { el, pastille } from '../ui/elements.js';
import { listeTriee } from './presentation.js';

function ligne(f, horsUsage, memoire, surChangement) {
  const caseHs = el('input', { type: 'checkbox', checked: horsUsage });
  caseHs.addEventListener('change', () => {
    memoire.marquerIndisponible(f.code, caseHs.checked);
    surChangement();
  });
  return el('li', {}, el('label', { class: 'ligne-feutre' },
    pastille(f.hex, f.code),
    el('span', { class: 'texte' }, el('strong', { texte: f.code }), f.nom !== f.code ? el('small', { texte: f.nom }) : null),
    el('span', { class: 'case-hs' }, caseHs, el('span', { texte: 'ne marche plus' }))));
}

export function listeBoite({ feutres, memoire, surChangement }) {
  const filtre = el('input', { type: 'checkbox' });
  const lignes = el('ul', { class: 'liste-boite' });
  const vide = el('p', { class: 'liste-vide', texte: 'Tous les feutres de cette boîte marchent.', hidden: true });
  // La liste n'est refaite qu'au changement de filtre : une case décochée ne fait pas disparaître sa ligne sous le doigt.
  const remplir = () => {
    const indisponibles = memoire.lireIndisponibles();
    const choisis = listeTriee(feutres, indisponibles, filtre.checked);
    lignes.replaceChildren(...choisis.map((f) => ligne(f, indisponibles.has(f.code), memoire, surChangement)));
    vide.hidden = choisis.length > 0;
  };
  filtre.addEventListener('change', remplir);
  remplir();
  return el('div', { class: 'vue-liste' },
    el('label', { class: 'filtre-hs' }, filtre, el('span', { texte: 'Seulement ceux qui ne marchent plus' })),
    lignes, vide);
}
