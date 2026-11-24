// Avancement d'un livre : pages finies / coloriages (100 % si le livre est marqué fini).
export function avancement(nbColoriages, nbFinies, livreFini) {
  const finies = livreFini ? nbColoriages : Math.min(nbFinies, nbColoriages);
  const pourcent = nbColoriages ? Math.round((finies * 100) / nbColoriages) : 0;
  return { finies, total: nbColoriages, pourcent: livreFini ? 100 : pourcent };
}
