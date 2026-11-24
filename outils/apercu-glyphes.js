// CLI : écrit sources/glyphes.html, une grille des glyphes distincts du livre (pour remplir table-glyphes.js).
// ecrireApercu est aussi utilisée par extraire-lot.js (inconnus de tous les livres).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireColoriages } from './extraire-livre.js';
import { attribuerIds } from './glyphes.js';
import { TABLE_GLYPHES } from './table-glyphes.js';

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// tuiles : [{ signature, glyphe (formes), nb, note? }] → sources/glyphes.html ; renvoie les ids (signature → gNN).
export function ecrireApercu(tuiles) {
  const ids = attribuerIds(tuiles.map((t) => t.signature));
  const tuile = ({ signature, glyphe, nb, note }) => {
    const x0 = Math.min(...glyphe.map((f) => f.x)), y1 = Math.max(...glyphe.map((f) => f.y + f.h));
    const d = glyphe.flatMap((f) => f.trace.map(([op, ...n]) => op === 'h' ? 'Z' : op.toUpperCase() + n.map((v, i) => (i % 2 ? y1 - v : v - x0).toFixed(2)).join(' '))).join(' ');
    const c = TABLE_GLYPHES[signature];
    return `<div><svg viewBox="-3 -3 20 20" width="90" height="90" style="background:#ddd"><path d="${d}" fill="#000"/></svg><br><b>${ids.get(signature)}</b> × ${nb}<br>${c ? `= <big>${esc(c)}</big>` : '?'}${note ? `<br><small>${esc(note)}</small>` : ''}</div>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>Glyphes</title><style>body{font:14px sans-serif}main{display:flex;flex-wrap:wrap;gap:8px}main div{text-align:center;width:100px}</style><h1>${tuiles.length} glyphes distincts</h1><main>${tuiles.map(tuile).join('')}</main>`;
  fs.writeFileSync(new URL('../sources/glyphes.html', import.meta.url), html);
  return ids;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const coloriages = lireColoriages(fs.readFileSync(process.argv[2] || 'sources/pdfs/Nuancier_Princesses_Disney_Tome_2-1.pdf'));
  const nb = new Map(), exemple = new Map();
  for (const k of coloriages.flatMap((c) => c.cases)) { nb.set(k.signature, (nb.get(k.signature) || 0) + 1); exemple.set(k.signature, exemple.get(k.signature) || k.glyphe); }
  const tuiles = [...nb].map(([signature, n]) => ({ signature, glyphe: exemple.get(signature), nb: n }));
  ecrireApercu(tuiles);
  console.log(`${tuiles.length} signatures distinctes, ${tuiles.filter((t) => !TABLE_GLYPHES[t.signature]).length} sans caractère → sources/glyphes.html`);
}
