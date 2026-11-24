// Vue provisoire, remplacée en Task 7.
export function vueNuancier(racine, { livreId, numero }) {
  const h = document.createElement('h1');
  h.textContent = `Nuancier ${livreId} n°${numero}`;
  racine.append(h);
}
