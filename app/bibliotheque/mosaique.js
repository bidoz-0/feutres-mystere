// Choisit n couleurs distinctes réparties sur tout le livre (pas seulement les premières pages).
export function couleursMosaique(livre, n) {
  const uniques = [...new Set((livre.coloriages ?? []).flatMap((c) => c.cases.map((x) => x.hex)).filter(Boolean))];
  if (uniques.length <= n) return uniques;
  return Array.from({ length: n }, (_, i) => uniques[Math.floor((i * uniques.length) / n)]);
}
