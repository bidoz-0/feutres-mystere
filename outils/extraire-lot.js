// CLI : node outils/extraire-lot.js [--ecrire] [--apercu]
// Analyse tous les livres de livres-a-extraire.js (à blanc par défaut), sans s'arrêter au premier échec,
// et affiche un tableau récapitulatif. --ecrire : écrit les livres sans aucun bloquant. --apercu : sources/glyphes.html des inconnus.
import { LIVRES } from './livres-a-extraire.js';
import { analyserLivre, bloquants, ecrireLivre } from './extraire-livre.js';
import { ecrireApercu } from './apercu-glyphes.js';

const ecrire = process.argv.includes('--ecrire'), apercu = process.argv.includes('--apercu');
const lignes = [];
const inconnus = new Map(); // signature → { glyphe, nb, livres, libelle } : un même symbole inconnu vu dans 5 livres = 1 entrée
const divergences = [];
const note = (cle, u, livre, libelle, raison) => {
  const e = inconnus.get(cle) || { signature: u.signature, glyphe: u.glyphe, nb: 0, livres: [], libelle, raison };
  e.nb += u.nb ?? 1; e.livres.push(livre); inconnus.set(cle, e);
};
for (const l of LIVRES) {
  const ligne = { id: l.id };
  try {
    const { livre, resume } = analyserLivre(l);
    const stop = bloquants(resume);
    Object.assign(ligne, { ok: !stop.length, coloriages: resume.nbColoriages, pages: resume.nbPagesPdf, table: resume.parTable, police: resume.parPolice, inconnus: resume.inconnus.length, conflits: resume.conflits.length, libelles: resume.libellesInconnus.length, rapproches: resume.rapproches.length, ignorees: resume.pagesIgnorees.map((p) => p.page).join(',') || 0, fusions: resume.fusions.length });
    if (stop.length) ligne.erreur = stop.join(' ; ') + (resume.pagesIgnorees[0] ? ` [${resume.pagesIgnorees[0].raison}]` : '');
    for (const u of resume.inconnus) note('S' + u.signature, u, l.id, false);
    for (const u of resume.conflits) note('C' + u.signature, u, l.id, false, 'CONFLIT : ' + u.raison);
    for (const d of resume.divergences) divergences.push(`${l.id} : table « ${d.table} », police « ${d.police} »`);
    for (const u of resume.libellesInconnus) note('L' + u.signature, u, l.id, true);
    if (ecrire && !stop.length) { ecrireLivre(livre); ligne.ecrit = true; }
  } catch (err) { Object.assign(ligne, { ok: false, erreur: err.message }); }
  lignes.push(ligne);
}
console.table(lignes.map((r) => ({
  livre: r.id, OK: r.ok ? 'OK' : 'NON', coloriages: r.coloriages ?? '-', pages: r.pages ?? '-',
  'par table': r.table ?? '-', 'par police': r.police ?? '-', 'symboles inconnus': r.inconnus ?? '-', conflits: r.conflits ?? '-', 'libellés inconnus': r.libelles ?? '-', rapprochés: r.rapproches ?? '-',
  'pages ignorées': r.ignorees ?? '-', fusions: r.fusions ?? '-', erreur: r.erreur ?? '', ...(ecrire ? { écrit: r.ecrit ? 'oui' : 'non' } : {}),
})));
const nbL = [...inconnus.values()].filter((e) => e.libelle).length, nbC = [...inconnus.values()].filter((e) => e.raison).length;
console.log(`${inconnus.size - nbL - nbC} symboles inconnus distincts, ${nbC} en conflit et ${nbL} glyphes de libellé inconnus distincts sur tout le lot.`);
for (const d of divergences) console.log('DIVERGENCE ' + d);
for (const e of inconnus.values()) if (e.raison) console.log(`CONFLIT (${e.livres.join(' ')}) : ${e.raison}`);
if (apercu) {
  ecrireApercu([...inconnus].map(([, e]) => ({ signature: e.signature, glyphe: e.glyphe, nb: e.nb, note: (e.libelle ? 'LIBELLÉ : ' : e.raison ? 'CONFLIT : ' : '') + e.livres.join(' ') })));
  console.log('→ sources/glyphes.html');
}
if (!ecrire) console.log('À blanc : rien n\'a été écrit (--ecrire pour écrire).');
