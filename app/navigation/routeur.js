export function lireRoute(hash) {
  const [, section, livreId, n] = /^#\/(livre)\/([^/]+)(?:\/(\d+))?$/.exec(hash) ?? [];
  if (!section) return { ecran: 'bibliotheque' };
  if (n === undefined) return { ecran: 'coloriages', livreId };
  return { ecran: 'nuancier', livreId, numero: Number(n) };
}

export function demarrerRouteur(racine, vues) {
  const afficher = () => {
    const route = lireRoute(location.hash);
    racine.replaceChildren();
    return vues[route.ecran](racine, route);
  };
  addEventListener('hashchange', afficher);
  return afficher();
}
