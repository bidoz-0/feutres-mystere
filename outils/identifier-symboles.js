// Donne un symbole (caractère) à chaque dessin du livre : d'abord la table (table-glyphes.js, exacte ou à ≤ 0,15 près),
// sinon le caractère donné par la police du PDF (ToUnicode ou nom de glyphe standard, voir pdf-fichier.js).
// Pas de devinette : sans l'un ni l'autre le dessin reste inconnu ; un doute (conflit) bloque le dessin concerné.
import { regrouper } from './glyphes.js';

// coloriages : [{ numero, libelle, cases: [{ signature, glyphe, car }] }] → résultat décrit en bas
export function identifierSymboles(coloriages, table) {
  const sigs = new Map(); // signature → { cars, sansCar, nb, glyphe }
  for (const c of coloriages) for (const k of c.cases) {
    const e = sigs.get(k.signature) ?? { cars: new Set(), sansCar: false, nb: 0, glyphe: k.glyphe };
    if (k.car) e.cars.add(k.car); else e.sansCar = true;
    e.nb++;
    sigs.set(k.signature, e);
  }
  const cles = Object.keys(table);
  const symboles = new Map(), police = new Set(), conflits = [], divergences = [], rapproches = [];
  const dessin = (signature) => ({ signature, glyphe: sigs.get(signature).glyphe, nb: sigs.get(signature).nb });
  for (const [signature, e] of sigs) {
    const deTable = table[signature] ?? table[regrouper([...cles, signature]).get(signature)];
    if (deTable && !table[signature]) rapproches.push({ signature, symbole: deTable });
    const cars = [...e.cars], deLaPolice = cars.length === 1 && !e.sansCar ? cars[0] : null;
    if (cars.length > 1) { conflits.push({ ...dessin(signature), raison: `la police donne plusieurs caractères pour un même dessin : ${cars.join(' ')}` }); continue; }
    if (deTable && cars.length === 1 && deTable !== cars[0]) divergences.push({ signature, table: deTable, police: cars[0] });
    if (deTable) symboles.set(signature, deTable);
    else if (deLaPolice) { symboles.set(signature, deLaPolice); police.add(signature); }
  }
  // un même caractère venu de la police pour des dessins différents : variantes admises seulement s'ils ne sont jamais dans le même coloriage
  const parCar = new Map();
  for (const [s, car] of symboles) parCar.set(car, [...(parCar.get(car) ?? []), s]);
  for (const [car, liste] of parCar) {
    if (liste.length < 2 || !liste.some((s) => police.has(s))) continue;
    const ensemble = coloriages.filter((c) => new Set(c.cases.map((k) => k.signature).filter((s) => liste.includes(s))).size > 1);
    if (!ensemble.length) continue;
    for (const s of liste) { symboles.delete(s); police.delete(s); conflits.push({ ...dessin(s), raison: `même caractère « ${car} » pour des dessins différents dans un même coloriage (n° ${ensemble.map((c) => c.libelle).join(', ')})` }); }
  }
  const dejaConflit = new Set(conflits.map((c) => c.signature));
  const inconnus = [...sigs.keys()].filter((s) => !symboles.has(s) && !dejaConflit.has(s)).map(dessin);
  return { symboles, parTable: symboles.size - police.size, parPolice: police.size, inconnus, conflits, divergences, rapproches };
}
