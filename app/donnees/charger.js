// Lecture des JSON du dossier data/ (chemins relatifs à index.html), mis en cache.
const cache = new Map();

function lire(chemin) {
  if (!cache.has(chemin)) {
    const p = fetch(chemin).then((r) => {
      if (!r.ok) throw new Error(`${chemin} : ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(chemin)); // une erreur n'est pas mémorisée
    cache.set(chemin, p);
  }
  return cache.get(chemin);
}

export const chargerFeutres = () => lire('data/feutres.json');
export const chargerIndexLivres = () => lire('data/livres/index.json');
export const chargerLivre = (id) => lire(`data/livres/${encodeURIComponent(id)}.json`);
