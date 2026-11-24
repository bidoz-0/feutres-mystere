// Ligne d'un feutre : pastille, code, nom (et boîte si demandée) et case « ne marche plus ».
import { el, pastille } from '../ui/elements.js';
import { NOMS } from './presentation.js';

export function ligneFeutre(f, horsUsage, memoire, surChangement, avecBoite = false) {
  const caseHs = el('input', { type: 'checkbox', checked: horsUsage });
  caseHs.addEventListener('change', () => {
    memoire.marquerIndisponible(f.code, caseHs.checked);
    surChangement();
  });
  const details = [f.nom !== f.code ? f.nom : null, avecBoite ? NOMS[f.marque] : null].filter(Boolean).join(' · ');
  return el('li', {}, el('label', { class: 'ligne-feutre' },
    pastille(f.hex, f.code),
    el('span', { class: 'texte' }, el('strong', { texte: f.code }), details ? el('small', { texte: details }) : null),
    el('span', { class: 'case-hs' }, caseHs, el('span', { texte: 'ne marche plus' }))));
}
