import { chargerFeutres, chargerLivre } from '../donnees/charger.js';
import { creerMemoire } from '../memoire/memoire.js';
import { proposerNuancier, plusProches, doublons, trouverFeutre } from './proposer.js';
import { el, entete, erreur, pastille, dessinSymbole } from '../ui/elements.js';

const MARQUES = { languo: 'Languo', guangna: 'GuangNa' };

export async function vueNuancier(racine, { livreId, numero }, estActuelle) {
  racine.append(entete(`Coloriage ${numero}`, `#/livre/${livreId}`));
  let feutres, livre;
  try {
    [feutres, livre] = await Promise.all([chargerFeutres(), chargerLivre(livreId)]);
  } catch {
    return estActuelle() && erreur(racine, 'Impossible de charger les données.');
  }
  if (!estActuelle()) return;
  const coloriage = livre.coloriages.find((c) => c.numero === numero);
  if (!coloriage) return erreur(racine, `Le coloriage ${numero} n'existe pas.`);

  const memoire = creerMemoire();
  const lignes = (pref) =>
    proposerNuancier(coloriage, feutres, pref, memoire.lireChoix(livreId, numero));

  const liste = el('ul', { class: 'lignes' });
  const panneau = el('dialog', { class: 'panneau', 'aria-labelledby': 'panneau-titre' });
  const curseur = el('input', { id: 'curseur', type: 'range', min: -1, max: 1, step: 0.25,
    value: memoire.lirePreference() });
  racine.append(
    el('div', { class: 'reglage' },
      el('label', { for: 'curseur', texte: 'Languo ◀ ▶ GuangNa' }), curseur),
    liste, panneau);

  function enregistrer(ligne, choix) {
    memoire.enregistrerChoix(livreId, numero, ligne.symbole, choix);
    panneau.close();
    afficher();
  }

  function ouvrir(ligne) {
    const alternatives = plusProches(ligne.hex, feutres, memoire.lirePreference(), 5);
    const saisie = el('input', { id: 'autre', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      placeholder: 'ex. RY10 ou nom libre' });
    const formulaire = el('form', { class: 'autre' },
      el('label', { for: 'autre', texte: 'Autre référence' }),
      el('div', { class: 'champ' }, saisie, el('button', { type: 'submit', texte: 'Valider' })));
    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const texte = saisie.value.trim();
      if (!texte) return;
      const f = trouverFeutre(texte, feutres);
      enregistrer(ligne, f ? { code: f.code } : { texte });
    });
    const revenir = el('button', { type: 'button', class: 'secondaire', texte: 'Revenir à la proposition' });
    revenir.disabled = !ligne.modifie;
    revenir.addEventListener('click', () => enregistrer(ligne, null));
    const fermer = el('button', { type: 'button', class: 'secondaire', texte: 'Fermer' });
    fermer.addEventListener('click', () => panneau.close());

    panneau.replaceChildren(
      el('h2', { id: 'panneau-titre' }, 'Symbole ', dessinSymbole(livre, ligne.symbole),
        pastille(ligne.hex, 'couleur du livre')),
      el('ul', { class: 'alternatives' }, ...alternatives.map(({ feutre, distance }) => {
        const actuel = ligne.feutre?.code === feutre.code;
        const b = el('button', { type: 'button', 'aria-current': actuel ? 'true' : null },
          pastille(feutre.hex, 'couleur du feutre'),
          el('span', { class: 'texte' }, el('strong', { texte: feutre.code }),
            el('small', { texte: `${MARQUES[feutre.marque]}${feutre.nom !== feutre.code ? ` · ${feutre.nom}` : ''}` })),
          actuel ? el('em', { class: 'modifie', texte: 'actuel' }) : null,
          el('span', { class: 'delta', texte: `ΔE ${Math.round(distance)}` }));
        b.addEventListener('click', () => enregistrer(ligne, { code: feutre.code }));
        return el('li', {}, b);
      })),
      formulaire, el('div', { class: 'actions' }, revenir, fermer));
    panneau.showModal();
  }

  function afficher() {
    const l = lignes(Number(curseur.value));
    const dbl = doublons(l);
    liste.replaceChildren(...l.map((ligne) => {
      const f = ligne.feutre;
      const nom = f ? (f.nom !== f.code ? `${f.code} · ${f.nom}` : f.code) : ligne.texte;
      const b = el('button', { type: 'button', class: 'ligne' },
        el('span', { class: 'cellule-symbole' }, dessinSymbole(livre, ligne.symbole)),
        pastille(ligne.hex, 'couleur du livre'),
        pastille(f?.hex, 'couleur du feutre'),
        el('span', { class: 'texte' },
          el('strong', { texte: nom }),
          el('small', { texte: f ? MARQUES[f.marque] : 'saisie libre' }),
          ligne.modifie ? el('em', { class: 'modifie', texte: 'modifié' }) : null,
          dbl[ligne.symbole]
            ? el('span', { class: 'doublon' }, 'même feutre que ',
              ...dbl[ligne.symbole].flatMap((s, i) => [i ? ', ' : '', dessinSymbole(livre, s)]))
            : null));
      b.addEventListener('click', () => ouvrir(ligne));
      return el('li', {}, b);
    }));
  }

  curseur.addEventListener('input', () => { memoire.enregistrerPreference(Number(curseur.value)); afficher(); });
  afficher();
}
