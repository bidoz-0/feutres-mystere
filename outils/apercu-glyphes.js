// CLI : écrit sources/glyphes.html, une grille des glyphes distincts du livre (pour remplir table-glyphes.js).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireColoriages } from './extraire-livre.js';
import { attribuerIds } from './glyphes.js';
import { TABLE_GLYPHES } from './table-glyphes.js';

const pdf = process.argv[2] || 'sources/Nuancier_Princesses_Disney_Tome_2-1.pdf';
const coloriages = lireColoriages(fs.readFileSync(fs.existsSync(pdf) ? pdf : 'sources/pdfs/Nuancier_Princesses_Disney_Tome_2-1.pdf'));
const cases = coloriages.flatMap((c) => c.cases);
const ids = attribuerIds(cases.map((k) => k.signature));
const nb = new Map(), exemple = new Map();
for (const k of cases) { nb.set(k.signature, (nb.get(k.signature) || 0) + 1); exemple.set(k.signature, exemple.get(k.signature) || k.glyphe); }

const tuile = ([sig, id]) => {
  const fs_ = exemple.get(sig);
  const x0 = Math.min(...fs_.map((f) => f.x)), y1 = Math.max(...fs_.map((f) => f.y + f.h));
  const d = fs_.flatMap((f) => f.trace.map(([op, ...n]) => op === 'h' ? 'Z' : op.toUpperCase() + n.map((v, i) => (i % 2 ? y1 - v : v - x0).toFixed(2)).join(' '))).join(' ');
  const c = TABLE_GLYPHES[sig];
  return `<div><svg viewBox="-3 -3 20 20" width="90" height="90" style="background:#ddd"><path d="${d}" fill="#000"/></svg><br><b>${id}</b> × ${nb.get(sig)}<br>${c ? `= <big>${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</big>` : '?'}</div>`;
};
const html = `<!doctype html><meta charset="utf-8"><title>Glyphes</title><style>body{font:14px sans-serif}main{display:flex;flex-wrap:wrap;gap:8px}main div{text-align:center;width:100px}</style><h1>${ids.size} glyphes distincts</h1><main>${[...ids].map(tuile).join('')}</main>`;
fs.writeFileSync(new URL('../sources/glyphes.html', import.meta.url), html);
console.log(`${ids.size} signatures distinctes, ${[...ids].filter(([s]) => !TABLE_GLYPHES[s]).length} sans caractère → sources/glyphes.html`);
