import { chargerFeutres, chargerLivre } from '../donnees/charger.js';
import { creerMemoire, versChoix } from '../memoire/memoire.js';
import { proposerNuancier, choixFiges, proposerParBoite, doublons, trouverFeutre } from './proposer.js';
import { el, entete, erreur, duo, pastille, dessinSymbole } from '../ui/elements.js';

const MARQUES = { languo: 'Languo', guangna: 'GuangNa' };
// Préférence mémorisée : -1 = Languo, 0 = peu importe, 1 = GuangNa.
const CHOIX_MARQUE = [[-1, MARQUES.languo], [0, 'Peu importe'], [1, MARQUES.guangna]];

export async function vueNuancier(racine, { livreId, numero }, estActuelle) {
  const retour = `#/livre/${livreId}`;
  let feutres, livre;
  try {
    [feutres, livre] = await Promise.all([chargerFeutres(), chargerLivre(livreId)]);
  } catch {
    if (!estActuelle()) return;
    racine.append(entete('Page', retour));
    return erreur(racine, 'Impossible de charger les données.');
  }
  if (!estActuelle()) return;
  const coloriage = livre.coloriages.find((c) => c.numero === numero);
  if (!coloriage) {
    racine.append(entete(`Page ${numero}`, retour));
    // 2e page d'une double page (« 1 & 2 » est enregistré sous le numéro 1)
    const double = livre.coloriages.find((c) => c.numero === numero - 1 && c.libelle.endsWith(` & ${numero}`));
    if (!double) return erreur(racine, `La page ${numero} n'existe pas.`);
    return racine.append(el('p', {}, `La page ${numero} fait partie des pages `,
      el('a', { href: `${retour}/${double.numero}`, texte: double.libelle }), '.'));
  }
  racine.append(entete(`${coloriage.libelle.includes(' & ') ? 'Pages' : 'Page'} ${coloriage.libelle}`, retour));

  const memoire = creerMemoire();
  let preference = versChoix(memoire.lirePreference());

  const liste = el('ul', { class: 'lignes' });
  const panneau = el('dialog', { class: 'panneau', 'aria-labelledby': 'panneau-titre' });
  const reglage = el('fieldset', { class: 'reglage' },
    el('legend', { texte: 'Boîte préférée' }),
    el('div', { class: 'options' }, ...CHOIX_MARQUE.map(([valeur, nom]) => {
      const radio = el('input', { type: 'radio', name: 'marque', value: valeur,
        checked: valeur === preference ? '' : null });
      radio.addEventListener('change', () => {
        preference = valeur;
        memoire.enregistrerPreference(valeur);
        afficher();
      });
      return el('label', { class: 'option' }, radio, el('span', { texte: nom }));
    })));
  const bandeau = el('p', { class: 'bandeau', role: 'status' });
  const boutonPage = el('button', { type: 'button', class: 'secondaire action-livre' });
  boutonPage.addEventListener('click', () => {
    const finir = !memoire.estPageFinie(livreId, numero);
    if (finir) figer();
    memoire.marquerPageFinie(livreId, numero, finir);
    afficher();
  });
  racine.append(bandeau, reglage, liste, boutonPage, panneau);
  // Toucher le fond grisé ferme le panneau.
  panneau.addEventListener('click', (e) => { if (e.target === panneau) panneau.close(); });

  function figer() {
    memoire.completerChoix(livreId, numero, choixFiges(coloriage, feutres, preference, memoire.lireChoix(livreId, numero)));
  }

  function enregistrer(ligne, choix) {
    memoire.enregistrerChoix(livreId, numero, ligne.symbole, choix);
    panneau.close();
    afficher();
  }

  function ouvrir(ligne) {
    const groupes = proposerParBoite(ligne.hex, feutres, preference, 3);
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
      el('div', { class: 'poignee', 'aria-hidden': 'true' }),
      el('h2', { id: 'panneau-titre' },
        el('span', { class: 'cellule-symbole' }, dessinSymbole(livre, ligne.symbole)),
        pastille(ligne.hex, 'couleur du livre'),
        el('span', { texte: 'Quel feutre ?' })),
      ...groupes.map(({ marque, feutres: proches }) => el('section', { class: 'boite' },
        el('h3', { texte: MARQUES[marque] }),
        el('ul', { class: 'alternatives' }, ...proches.map(({ feutre, distance }) => {
          const actuel = ligne.feutre?.code === feutre.code;
          const b = el('button', { type: 'button', 'aria-current': actuel ? 'true' : null },
            duo(ligne.hex, feutre.hex),
            el('span', { class: 'texte' }, el('strong', { texte: feutre.code }),
              feutre.nom !== feutre.code ? el('small', { texte: feutre.nom }) : null),
            actuel ? el('em', { class: 'etiquette', texte: 'choisi' }) : null,
            el('span', { class: 'delta', 'aria-label': `écart de couleur ${Math.round(distance)}` },
              el('small', { texte: 'écart' }), String(Math.round(distance))));
          b.addEventListener('click', () => enregistrer(ligne, { code: feutre.code }));
          return el('li', {}, b);
        })))),
      formulaire, el('div', { class: 'actions' }, revenir, fermer));
    panneau.showModal();
  }

  function afficher() {
    const livreFini = memoire.estLivreFini(livreId);
    const bloquee = memoire.estPageBloquee(livreId, numero);
    bandeau.hidden = !bloquee;
    reglage.disabled = bloquee;
    bandeau.textContent = livreFini ? 'Livre fini : feutres bloqués. Reprends le livre (depuis la liste des pages) pour modifier.'
      : 'Page finie : feutres bloqués';
    boutonPage.disabled = livreFini;
    boutonPage.textContent = livreFini ? 'Livre fini : reprends le livre pour modifier cette page'
      : memoire.estPageFinie(livreId, numero) ? 'Reprendre la page' : 'Page finie';
    const l = proposerNuancier(coloriage, feutres, preference, memoire.lireChoix(livreId, numero));
    const dbl = doublons(l);
    liste.replaceChildren(...l.map((ligne) => {
      const f = ligne.feutre;
      const nom = f ? (f.nom !== f.code ? `${f.code} · ${f.nom}` : f.code) : ligne.texte;
      const b = el(bloquee ? 'div' : 'button', bloquee ? { class: 'ligne bloquee' } : { type: 'button', class: 'ligne' },
        el('span', { class: 'cellule-symbole' }, dessinSymbole(livre, ligne.symbole)),
        duo(ligne.hex, f?.hex),
        el('span', { class: 'texte' },
          el('strong', { texte: nom }),
          el('small', { texte: f ? MARQUES[f.marque] : 'saisie libre' }),
          ligne.modifie && !bloquee ? el('em', { class: 'etiquette', texte: 'modifié' }) : null,
          dbl[ligne.symbole]
            ? el('span', { class: 'doublon' }, 'même feutre que ',
              ...dbl[ligne.symbole].flatMap((s, i) => [i ? ', ' : '', dessinSymbole(livre, s)]))
            : null));
      if (!bloquee) b.addEventListener('click', () => ouvrir(ligne));
      return el('li', {}, b);
    }));
  }

  if (memoire.estPageBloquee(livreId, numero)) figer(); // rattrapage des pages validées avant le correctif
  afficher();
}
