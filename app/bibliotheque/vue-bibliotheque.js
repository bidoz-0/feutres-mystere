import { chargerIndexLivres, chargerLivre } from '../donnees/charger.js';
import { creerMemoire } from '../memoire/memoire.js';
import { el, entete, erreur } from '../ui/elements.js';
import { couleursMosaique } from './mosaique.js';
import { avancement } from './avancement.js';

function visuel(l, livre) {
  const mosaique = el('span', { class: 'mosaique', 'aria-hidden': 'true' },
    ...(livre ? couleursMosaique(livre, 16) : []).map((hex) => {
      const p = el('span');
      p.style.background = hex;
      return p;
    }));
  if (!l.couverture) return mosaique;
  // couverture relative à data/ ; si elle manque ou échoue, on garde la mosaïque
  const img = el('img', { class: 'couverture', src: new URL(`../../data/${l.couverture}`, import.meta.url).href,
    alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(mosaique));
  return img;
}

function carre(l, livre, memoire) {
  const fini = memoire.estLivreFini(l.id);
  const av = livre && avancement(livre.coloriages.length, memoire.nbPagesFinies(l.id), fini);
  return el('a', { class: 'carre', href: `#/livre/${l.id}` }, visuel(l, livre),
    el('span', { class: 'carre-titre', texte: l.titre }),
    fini ? el('span', { class: 'badge-fini', texte: 'Fini ✓' }) : null,
    av && el('small', { texte: `${av.finies} / ${av.total} pages · ${av.pourcent} %` }),
    av && el('progress', { class: 'avancement', max: av.total, value: av.finies,
      'aria-label': `Avancement de ${l.titre}` }));
}

export async function vueBibliotheque(racine, _, estActuelle) {
  const tete = entete('Mes coloriages mystère');
  tete.append(el('a', { class: 'lien-boites', href: '#/boites' }, 'Mes boîtes'));
  racine.append(tete);
  try {
    const livres = await chargerIndexLivres();
    // un livre illisible reste affiché (titre seul)
    const details = await Promise.all(livres.map((l) => chargerLivre(l.id).catch(() => null)));
    if (!estActuelle()) return;
    const memoire = creerMemoire();
    // livres finis en fin de liste (tri stable : l'ordre d'origine est gardé)
    const ordre = livres.map((l, i) => i).sort((a, b) =>
      memoire.estLivreFini(livres[a].id) - memoire.estLivreFini(livres[b].id));
    racine.append(el('ul', { class: 'bibliotheque' },
      ...ordre.map((i) => el('li', {}, carre(livres[i], details[i], memoire)))));
  } catch {
    if (estActuelle()) erreur(racine, 'Impossible de charger la liste des livres.');
  }
}
