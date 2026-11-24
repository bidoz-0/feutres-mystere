// CLI : node outils/extraire-livre.js <pdf> <id> "<titre>" → data/livres/<id>.json + index.json
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { lireFormes, grouperEnLignes } from './pdf.js';
import { glyphesDeCase, signatureGlyphe, attribuerIds, regrouper, cheminGlyphe, glyphesDeLibelle } from './glyphes.js';
import { TABLE_GLYPHES } from './table-glyphes.js';
import { TABLE_LIBELLES } from './table-libelles.js';

// Contenu texte de chaque page, dans l'ordre de l'arbre des pages (/Kids).
export function lirePages(buffer) {
  const s = buffer.toString('latin1');
  const objets = new Map();
  for (const m of s.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) objets.set(+m[1], m[2]);
  const refs = (txt) => [...txt.matchAll(/(\d+) 0 R/g)].map((m) => +m[1]);
  const pages = (num) => {
    const o = objets.get(num);
    return /\/Type\s*\/Pages\b/.test(o) ? refs(o.match(/\/Kids\s*\[([^\]]*)\]/)[1]).flatMap(pages) : [num];
  };
  const racine = [...objets].find(([, o]) => /\/Type\s*\/Pages\b/.test(o) && !/\/Parent/.test(o))[0];
  return pages(racine).map((p) => {
    const contenus = objets.get(p).match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/)[1];
    return refs(contenus).map((c) => {
      const o = objets.get(c);
      let d = o.indexOf('stream') + 6;
      if (o[d] === '\r') d++;
      if (o[d] === '\n') d++;
      const brut = Buffer.from(o.slice(d, o.lastIndexOf('endstream')), 'latin1');
      return (/FlateDecode/.test(o) ? zlib.inflateSync(brut) : brut).toString('latin1');
    }).join('\n');
  });
}

// Coloriages avec, pour chaque case, sa couleur, la signature de son glyphe et ses formes (pour l'aperçu).
export function lireColoriages(buffer) {
  const coloriages = [];
  lirePages(buffer).forEach((contenu, i) => {
    let formes;
    try { formes = lireFormes(contenu); } catch (err) { console.log(`  page ${i + 1} ignorée : ${err.message}`); return; }
    const lignes = grouperEnLignes(formes, (y, hex, x) =>
      console.log(`  page ${i + 1}, y=${y} : doublon fusionné ${hex} en x=${x.toFixed(1)}`));
    // un filet gris (h=1, pleine largeur) sépare deux coloriages ; une ligne de cases de plus = retour à la ligne
    const filets = formes.filter((f) => f.h < 2 && f.w > 500).map((f) => f.y);
    const blocs = [];
    for (const ligne of lignes) {
      const n = filets.filter((y) => y > ligne.y).length;
      if (blocs.at(-1)?.n === n) blocs.at(-1).lignes.push(ligne);
      else blocs.push({ n, lignes: [ligne] });
    }
    for (const { lignes: ls } of blocs) {
      const cases = ls.flat().map((c) => {
        const glyphe = glyphesDeCase(c, formes);
        if (!glyphe.length) throw new Error(`Page ${i + 1}, x=${c.x.toFixed(1)}, y=${c.y.toFixed(1)} : case sans glyphe`);
        return { hex: c.hex, signature: signatureGlyphe(glyphe), glyphe };
      });
      // libellé = forme grise à gauche (x < 50) à la hauteur du bloc
      const bas = Math.min(...ls.map((l) => l.y)) - 8, haut = Math.max(...ls.map((l) => l.y)) + 28;
      const labels = formes.filter((f) => f.x < 50 && f.h > 1.5 && f.h < 60 && f.y >= bas && f.y + f.h <= haut);
      if (labels.length !== 1) throw new Error(`Page ${i + 1}, y=${ls[0].y} : ${labels.length} libellés trouvés (1 attendu)`);
      const lignesLibelle = [];
      for (const g of glyphesDeLibelle(labels[0])) {
        const l = lignesLibelle.find((x) => Math.abs(x.y - g.y) < 2) || lignesLibelle[lignesLibelle.push({ y: g.y, sigs: [] }) - 1];
        l.sigs.push(g.signature);
      }
      coloriages.push({ numero: coloriages.length + 1, page: i + 1, cases, libelleSignatures: lignesLibelle.map((l) => l.sigs) });
    }
  });
  const rep = regrouper(coloriages.flatMap((c) => c.cases.map((k) => k.signature)));
  for (const c of coloriages) for (const k of c.cases) k.signature = rep.get(k.signature);
  const repL = regrouper(coloriages.flatMap((c) => c.libelleSignatures.flat()));
  for (const c of coloriages) c.libelleSignatures = c.libelleSignatures.map((l) => l.map((s) => repL.get(s)));
  return coloriages;
}

// Libellé imprimé (« 1 & 2 », « 3 ») → numero (premier numéro de page) ; vérifie que les numéros se suivent sans trou.
export function numeroter(coloriages, nombrePages) {
  const inconnus = new Set();
  for (const c of coloriages) {
    c.libelle = c.libelleSignatures.map((l) => l.map((s) => TABLE_LIBELLES[s] ?? (inconnus.add(s), '?')).join('')).join(' ');
  }
  if (inconnus.size) throw new Error(`${inconnus.size} glyphes de libellé inconnus (outils/table-libelles.js)`);
  let attendu = 1;
  for (const c of coloriages) {
    const m = c.libelle.match(/^(\d+)(?: & (\d+))?$/);
    if (!m) throw new Error(`Libellé illisible : « ${c.libelle} » (page PDF ${c.page})`);
    const [premier, dernier] = [+m[1], +(m[2] ?? m[1])];
    if (premier !== attendu || (m[2] && dernier !== premier + 1)) {
      throw new Error(`Libellé « ${c.libelle} » (page PDF ${c.page}) : ${attendu} attendu, trou ou doublon dans la numérotation`);
    }
    c.numero = premier;
    attendu = dernier + 1;
  }
  if (nombrePages && attendu - 1 !== nombrePages) throw new Error(`Dernier numéro imprimé : ${attendu - 1}, ${nombrePages} attendu`);
  return coloriages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pdf, id, titre, pages] = process.argv.slice(2);
  if (!pdf || !id || !titre) throw new Error('Usage : node outils/extraire-livre.js <pdf> <id> "<titre>" [nombre de pages]');
  const coloriages = numeroter(lireColoriages(fs.readFileSync(pdf)), Number(pages) || undefined);
  for (const c of coloriages) console.log(`coloriage « ${c.libelle} » : ${c.cases.length} cases`);
  const ids = attribuerIds(coloriages.flatMap((c) => c.cases.map((k) => k.signature)));
  const inconnus = [...ids].filter(([s]) => !TABLE_GLYPHES[s]).map(([, g]) => g);
  if (inconnus.length) {
    console.error(`${inconnus.length} glyphes sans caractère dans outils/table-glyphes.js : ${inconnus.join(' ')}\nRien n'a été écrit. Voir sources/glyphes.html (node outils/apercu-glyphes.js).`);
    process.exit(1);
  }
  const sortie = coloriages.map((c) => {
    const vus = new Map();
    return { numero: c.numero, libelle: c.libelle, cases: c.cases.map((k) => {
      const base = TABLE_GLYPHES[k.signature], n = (vus.get(base) || 0) + 1;
      vus.set(base, n);
      if (n === 1) return { symbole: base, hex: k.hex };
      console.log(`coloriage « ${c.libelle} » : symbole « ${base} » en double, renommé « ${base} (${n}) »`);
      return { symbole: `${base} (${n})`, base, hex: k.hex };
    }) };
  });
  const glyphes = {};
  for (const c of coloriages) for (const k of c.cases) glyphes[TABLE_GLYPHES[k.signature]] ??= cheminGlyphe(k.glyphe);
  const dossier = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'livres');
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, `${id}.json`), JSON.stringify({ id, titre, glyphes, coloriages: sortie }, null, 1) + '\n');
  const fIndex = path.join(dossier, 'index.json');
  const index = fs.existsSync(fIndex) ? JSON.parse(fs.readFileSync(fIndex, 'utf8')) : [];
  fs.writeFileSync(fIndex, JSON.stringify([...index.filter((l) => l.id !== id), { id, titre }], null, 1) + '\n');
}
