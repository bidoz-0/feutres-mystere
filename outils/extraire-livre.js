// CLI : node outils/extraire-livre.js <pdf> <id> "<titre>" [pages] [--a-blanc] → data/livres/<id>.json + index.json
// (--a-blanc : analyse et résumé, n'écrit rien). analyserLivre/ecrireLivre sont aussi utilisées par extraire-lot.js.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { lireFormes, grouperEnLignes } from './pdf.js';
import { glyphesDeCase, signatureGlyphe, attribuerIds, regrouper, cheminGlyphe, glyphesDeLibelle } from './glyphes.js';
import { TABLE_GLYPHES } from './table-glyphes.js';
import { CORRECTIONS } from './corrections.js';
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
  const racine = [...objets].find(([, o]) => /\/Type\s*\/Pages\b/.test(o) && !/\/Parent/.test(o))?.[0];
  if (racine === undefined) throw new Error('Arbre des pages introuvable (PDF à objets compressés : format non géré)');
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
// `rapport` reçoit les pages ignorées (analyse en échec) et les fusions de cases collées.
export function lireColoriages(buffer, rapport = { pagesIgnorees: [], fusions: [] }) {
  const coloriages = [];
  const contenus = lirePages(buffer);
  rapport.nbPages = contenus.length;
  contenus.forEach((contenu, i) => {
    let formes;
    try { formes = lireFormes(contenu); } catch (err) { rapport.pagesIgnorees.push({ page: i + 1, raison: err.message }); return; }
    const lignes = grouperEnLignes(formes, (y, hex, x) =>
      rapport.fusions.push({ page: i + 1, y, hex, x }));
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

// Remplace le symbole de la case `position` du coloriage `numero` ; le symbole doit exister dans `glyphes` (dessins du livre).
export function appliquerCorrections(coloriages, corrections, glyphes) {
  for (const { numero, position, symbole } of corrections) {
    const k = coloriages.find((c) => c.numero === numero)?.cases[position];
    if (!k) throw new Error(`Correction : pas de case ${position} dans le coloriage ${numero}`);
    if (!glyphes[symbole]) throw new Error(`Correction : pas de dessin pour le symbole « ${symbole} »`);
    console.log(`correction : coloriage ${numero}, case ${position} « ${k.symbole} » → « ${symbole} »`);
    k.symbole = symbole;
  }
}

// Analyse complète d'un livre, sans rien écrire ni quitter. Lève une erreur si le PDF est incohérent.
// Renvoie { livre, resume } ; livre vaut null tant qu'il reste des symboles inconnus.
export function analyserLivre({ pdf, id, titre, pages }) {
  const rapport = { pagesIgnorees: [], fusions: [] };
  const buffer = fs.readFileSync(pdf);
  let coloriages;
  try { coloriages = numeroter(lireColoriages(buffer, rapport), pages || undefined); }
  catch (err) {
    if (rapport.pagesIgnorees.length) err.message += ` (pages ignorées : ${rapport.pagesIgnorees.map((p) => p.page).join(', ')})`;
    throw err;
  }
  const signatures = coloriages.flatMap((c) => c.cases.map((k) => k.signature));
  const ids = attribuerIds(signatures);
  // une signature absente de la table mais à ≤ 0,15 d'une signature connue est le même symbole (voir regrouper)
  const cles = Object.keys(TABLE_GLYPHES);
  const symboleDe = (sig) => TABLE_GLYPHES[sig] ?? TABLE_GLYPHES[regrouper([...cles, sig]).get(sig)];
  const nb = new Map(), exemples = new Map();
  for (const c of coloriages) for (const k of c.cases) { nb.set(k.signature, (nb.get(k.signature) || 0) + 1); exemples.set(k.signature, k.glyphe); }
  const inconnus = [...ids.keys()].filter((s) => !symboleDe(s)).map((s) => ({ signature: s, glyphe: exemples.get(s), nb: nb.get(s) }));
  const resume = { id, nbColoriages: coloriages.length, nbPagesPdf: rapport.nbPages, pagesIgnorees: rapport.pagesIgnorees, fusions: rapport.fusions, inconnus, doublons: [] };
  if (inconnus.length) return { livre: null, resume };
  const glyphes = {};
  for (const c of coloriages) for (const k of c.cases) { k.symbole = symboleDe(k.signature); glyphes[k.symbole] ??= cheminGlyphe(k.glyphe); }
  appliquerCorrections(coloriages, CORRECTIONS[id] || [], glyphes);
  const sortie = coloriages.map((c) => {
    const vus = new Map();
    return { numero: c.numero, libelle: c.libelle, cases: c.cases.map((k) => {
      const base = k.symbole, n = (vus.get(base) || 0) + 1;
      vus.set(base, n);
      if (n === 1) return { symbole: base, hex: k.hex };
      resume.doublons.push(`coloriage « ${c.libelle} » : symbole « ${base} » en double, renommé « ${base} (${n}) »`);
      return { symbole: `${base} (${n})`, base, hex: k.hex };
    }) };
  });
  return { livre: { id, titre, glyphes, coloriages: sortie }, resume };
}

// Ce qui interdit d'écrire (à afficher tel quel). Une page ignorée peut cacher un coloriage : on refuse toujours,
// l'utilisateur tranche à la main (numeroter attrape déjà la plupart des trous, mais pas une page de fin).
export function bloquants({ inconnus, pagesIgnorees, nbColoriages }) {
  return [
    !nbColoriages && 'aucun coloriage trouvé',
    inconnus.length && `${inconnus.length} symboles inconnus (outils/table-glyphes.js)`,
    pagesIgnorees.length && `${pagesIgnorees.length} pages ignorées : ${pagesIgnorees.map((p) => p.page).join(', ')}`,
  ].filter(Boolean);
}

export function ecrireLivre(livre) {
  const dossier = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'livres');
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, `${livre.id}.json`), JSON.stringify(livre, null, 1) + '\n');
  const fIndex = path.join(dossier, 'index.json');
  const index = fs.existsSync(fIndex) ? JSON.parse(fs.readFileSync(fIndex, 'utf8')) : [];
  fs.writeFileSync(fIndex, JSON.stringify([...index.filter((l) => l.id !== livre.id), { id: livre.id, titre: livre.titre }], null, 1) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const aBlanc = args.includes('--a-blanc');
  const [pdf, id, titre, pages] = args.filter((a) => a !== '--a-blanc');
  if (!pdf || !id || !titre) throw new Error('Usage : node outils/extraire-livre.js <pdf> <id> "<titre>" [nombre de pages] [--a-blanc]');
  const { livre, resume } = analyserLivre({ pdf, id, titre, pages: Number(pages) || undefined });
  for (const d of resume.doublons) console.log(d);
  for (const f of resume.fusions) console.log(`  FUSION page ${f.page}, y=${f.y} : cases collées de même couleur ${f.hex} fusionnées en x=${f.x.toFixed(1)}`);
  for (const p of resume.pagesIgnorees) console.log(`  PAGE IGNORÉE ${p.page} : ${p.raison}`);
  console.log(`${resume.nbColoriages} coloriages, ${resume.nbPagesPdf} pages PDF, ${resume.inconnus.length} symboles inconnus, ${resume.pagesIgnorees.length} pages ignorées, ${resume.fusions.length} fusions`);
  const stop = bloquants(resume);
  if (stop.length) { console.error(`Rien n'a été écrit : ${stop.join(' ; ')}. Voir sources/glyphes.html (node outils/apercu-glyphes.js).`); process.exit(1); }
  if (aBlanc) console.log("À blanc : rien n'a été écrit.");
  else ecrireLivre(livre);
}
