export function lireRoute(hash) {
  const b = /^#\/boites(?:\/([^/]+)(?:\/([^/]+)\/(\d+))?)?$/.exec(hash);
  if (b) {
    const [, marque, livreId, n] = b;
    if (!marque) return { ecran: 'boites' };
    return livreId ? { ecran: 'boite', marque, livreId, numero: Number(n) } : { ecran: 'boite', marque };
  }
  const [, section, livreId, n] = /^#\/(livre)\/([^/]+)(?:\/(\d+))?$/.exec(hash) ?? [];
  if (!section) return { ecran: 'bibliotheque' };
  if (n === undefined) return { ecran: 'coloriages', livreId };
  return { ecran: 'nuancier', livreId, numero: Number(n) };
}

export function demarrerRouteur(racine, vues) {
  let courant = 0; // jeton : une vue asynchrone en retard ne doit plus toucher l'écran
  const afficher = () => {
    const route = lireRoute(location.hash);
    const jeton = ++courant;
    racine.replaceChildren();
    return vues[route.ecran](racine, route, () => jeton === courant);
  };
  addEventListener('hashchange', afficher);
  return afficher();
}
