// Vue provisoire, remplacée en Task 7.
export function vueColoriages(racine, { livreId }) {
  const h = document.createElement('h1');
  h.textContent = `Coloriages de ${livreId}`;
  racine.append(h);
}
