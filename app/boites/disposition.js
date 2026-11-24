// Disposition des feutres dans une boîte. Pur calcul.
export const GRILLES = { languo: { rangees: 20, colonnes: 12 }, guangna: { rangees: 7, colonnes: 24 } };

// Un emplacement par case de la grille : feutre ou null.
export function disposition(marque, feutres, enregistree) {
  const { rangees, colonnes } = GRILLES[marque];
  const boite = feutres.filter((f) => f.marque === marque);
  const liste = enregistree
    ? enregistree.emplacements.map((code) => boite.find((f) => f.code === code) ?? null)
    : boite;
  return Array.from({ length: rangees * colonnes }, (_, i) => liste[i] ?? null);
}
