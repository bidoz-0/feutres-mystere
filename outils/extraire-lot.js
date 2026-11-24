// CLI : node outils/extraire-lot.js [--ecrire] [--apercu]
// Analyse tous les livres de livres-a-extraire.js (à blanc par défaut), sans s'arrêter au premier échec,
// et affiche un tableau récapitulatif. --ecrire : écrit les livres sans aucun bloquant. --apercu : sources/glyphes.html des inconnus.
import { LIVRES } from './livres-a-extraire.js';
import { analyserLivre, bloquants, ecrireLivre } from './extraire-livre.js';
import { ecrireApercu } from './apercu-glyphes.js';

const ecrire = process.argv.includes('--ecrire'), apercu = process.argv.includes('--apercu');
const lignes = [], inconnus = new Map(); // signature → { glyphe, nb, livres }
for (const l of LIVRES) {
  const ligne = { id: l.id };
  try {
    const { livre, resume } = analyserLivre(l);
    const stop = bloquants(resume);
    Object.assign(ligne, { ok: !stop.length, coloriages: resume.nbColoriages, pages: resume.nbPagesPdf, inconnus: resume.inconnus.length, ignorees: resume.pagesIgnorees.map((p) => p.page).join(',') || 0, fusions: resume.fusions.length });
    if (stop.length) ligne.erreur = resume.pagesIgnorees[0]?.raison ?? stop.join(' ; ');
    for (const u of resume.inconnus) {
      const e = inconnus.get(u.signature) || { glyphe: u.glyphe, nb: 0, livres: [] };
      e.nb += u.nb; e.livres.push(l.id); inconnus.set(u.signature, e);
    }
    if (ecrire && !stop.length) { ecrireLivre(livre); ligne.ecrit = true; }
  } catch (err) { Object.assign(ligne, { ok: false, erreur: err.message }); }
  lignes.push(ligne);
}
console.table(lignes.map((r) => ({ livre: r.id, OK: r.ok ? 'OK' : 'NON', coloriages: r.coloriages ?? '-', pages: r.pages ?? '-', 'symboles inconnus': r.inconnus ?? '-', 'pages ignorées': r.ignorees ?? '-', fusions: r.fusions ?? '-', erreur: r.erreur ?? '', ...(ecrire ? { écrit: r.ecrit ? 'oui' : 'non' } : {}) })));
console.log(`${inconnus.size} symboles inconnus distincts sur tout le lot.`);
if (apercu) {
  ecrireApercu([...inconnus].map(([signature, e]) => ({ signature, glyphe: e.glyphe, nb: e.nb, note: e.livres.join(' ') })));
  console.log('→ sources/glyphes.html');
}
if (!ecrire) console.log('À blanc : rien n\'a été écrit (--ecrire pour écrire).');
