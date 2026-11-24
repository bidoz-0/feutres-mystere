// Structure d'un fichier PDF : pages (contenu + polices + espaces de couleur), avec les objets compressés (ObjStm).
import zlib from 'node:zlib';
import { lirePoliceTrueType } from './police.js';
import { lirePoliceCff, nomAscii } from './police-cff.js';
import { nomVersCar, fiable } from './noms-glyphes.js';

const refs = (txt) => [...txt.matchAll(/(\d+) 0 R/g)].map((m) => +m[1]);
const hexVersTexte = (h) => Buffer.from(h, 'hex').swap16().toString('utf16le'); // UTF-16BE → texte

export function lireDocument(buffer) {
  const objets = new Map();
  for (const m of buffer.toString('latin1').matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) objets.set(+m[1], m[2]);
  const flux = (o) => {
    let d = o.indexOf('stream') + 6;
    if (o[d] === '\r') d++;
    if (o[d] === '\n') d++;
    const brut = Buffer.from(o.slice(d, o.lastIndexOf('endstream')), 'latin1');
    return /FlateDecode/.test(o) ? zlib.inflateSync(brut) : brut;
  };
  for (const [, o] of [...objets]) if (/\/Type\s*\/ObjStm\b/.test(o)) {
    const txt = flux(o).toString('latin1'), n = +o.match(/\/N\s+(\d+)/)[1], first = +o.match(/\/First\s+(\d+)/)[1];
    const e = txt.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) objets.set(e[2 * i], txt.slice(first + e[2 * i + 1], i + 1 < n ? first + e[2 * i + 3] : undefined));
  }
  const pages = (num) => {
    const o = objets.get(num);
    return /\/Type\s*\/Pages\b/.test(o) ? refs(o.match(/\/Kids\s*\[([^\]]*)\]/)[1]).flatMap(pages) : [num];
  };
  const racine = [...objets].find(([, o]) => /\/Type\s*\/Pages\b/.test(o) && !/\/Parent/.test(o))?.[0];
  if (racine === undefined) throw new Error('Arbre des pages introuvable');

  const dict = (txt, cle) => { // dictionnaire /Cle << … >> en ligne ou référencé
    const m = txt.match(new RegExp('/' + cle + '\\s*(?:(\\d+) 0 R|<<((?:[^>]|>(?!>))*)>>)'));
    return m ? (m[2] ?? objets.get(+m[1])) : '';
  };
  const ressources = (num) => { // /Resources de la page, héritées de ses parents
    for (let o = objets.get(num); o; o = objets.get(+(o.match(/\/Parent\s+(\d+) 0 R/)?.[1]))) {
      const r = o.match(/\/Resources\s*(\d+) 0 R/);
      if (r) return objets.get(+r[1]);
      if (/\/Resources\s*<</.test(o)) return o;
    }
    return '';
  };
  // Type d'un espace de couleur ; un Separation à fonction de type 2 (C0, C1, N) devient { type, c0, c1, n } pour calculer sa couleur.
  const typeEspace = (v) => {
    if (v.startsWith('/')) return v.slice(1);
    const txt = v.startsWith('[') ? v : objets.get(+v.match(/\d+/)[0]);
    const type = txt.match(/\/(\w+)/)[1];
    const fn = /\/C0\s*\[/.test(txt) ? txt : objets.get(refs(txt).at(-1)) ?? '';
    const c0 = fn.match(/\/C0\s*\[([^\]]*)\]/), c1 = fn.match(/\/C1\s*\[([^\]]*)\]/);
    if (type !== 'Separation' || !c0 || !c1) return type;
    const nombres = (m) => m[1].trim().split(/\s+/).map(Number);
    return { type, c0: nombres(c0), c1: nombres(c1), n: +(fn.match(/\/N\s+([\d.]+)/)?.[1] ?? 1) };
  };

  const cachePolices = new Map();
  function police(num) {
    if (cachePolices.has(num)) return cachePolices.get(num);
    const o = objets.get(num), type0 = /\/Subtype\s*\/Type0/.test(o);
    let desc = o;
    if (type0) {
      desc = objets.get(refs(o.match(/\/DescendantFonts\s*(\[[^\]]*\]|\d+ 0 R)/)[1])[0]);
      if (!/\/Subtype/.test(desc)) desc = objets.get(refs(desc)[0]);
    }
    const fd = objets.get(+desc.match(/\/FontDescriptor\s+(\d+) 0 R/)?.[1]) ?? ''; // absent : police standard, texte seul
    const f2 = fd.match(/\/FontFile2\s+(\d+) 0 R/);
    const tu = o.match(/\/ToUnicode\s+(\d+) 0 R/);
    const unicode = new Map();
    if (tu) {
      const t = flux(objets.get(+tu[1])).toString('latin1');
      for (const [, bloc] of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const [, c, u] of bloc.matchAll(/<(\w+)>\s*<(\w+)>/g)) unicode.set(parseInt(c, 16), hexVersTexte(u));
      for (const [, bloc] of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const [, a, z, u] of bloc.matchAll(/<(\w+)>\s*<(\w+)>\s*<(\w+)>/g)) {
        for (let c = parseInt(a, 16); c <= parseInt(z, 16); c++) unicode.set(c, hexVersTexte((parseInt(u, 16) + c - parseInt(a, 16)).toString(16).padStart(u.length, '0')));
      }
    }
    if (type0 && /\/CIDToGIDMap\s*\d+ 0 R/.test(desc)) throw new Error('CIDToGIDMap en flux : non géré');
    // noms de glyphes de l'encodage du PDF (/Differences)
    const ref = o.match(/\/Encoding\s*(\d+) 0 R/);
    const enc = ref ? objets.get(+ref[1]) : o;
    const diff = new Map();
    let code = 0;
    for (const m of (enc.match(/\/Differences\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/(\d+)|\/([^\s/]+)/g)) { if (m[1]) code = +m[1]; else diff.set(code++, m[2]); }
    const nommé = /\/Encoding\s*\/(Win|Mac|Standard)/.test(o) || diff.size;
    const f3 = fd.match(/\/FontFile3\s+(\d+) 0 R/);
    let ttf = f2 ? lirePoliceTrueType(flux(objets.get(+f2[1]))) : null;
    if (!ttf && f3 && !type0) { // Type1C : le code passe par le nom de glyphe de l'encodage du PDF (Differences), sinon par celui de la police
      const cff = lirePoliceCff(flux(objets.get(+f3[1])));
      if (cff) ttf = { glyphe: (c) => cff.glyphe(cff.gidDe(c, diff.get(c) ?? (nommé ? nomAscii(c) : null))) };
    }
    const p = {
      octets: type0 ? 2 : 1,
      // null si la police n'est pas TrueType (texte non dessinable)
      glyphe: ttf && ((code) => ttf.glyphe(code, type0)),
      // vrai caractère du code, seulement si le PDF le dit (ToUnicode, ou nom de glyphe standard) ; sinon null
      caractere: (c) => fiable(unicode.get(c) ?? (diff.has(c) ? nomVersCar(diff.get(c)) : nommé && nomAscii(c) ? nomVersCar(nomAscii(c)) : null)),
      texte: (codes) => codes.map((c) => unicode.get(c) ?? String.fromCharCode(c)).join(''),
    };
    cachePolices.set(num, p);
    return p;
  }

  return pages(racine).map((num) => {
    const o = objets.get(num), res = ressources(num);
    const polices = {};
    for (const m of dict(res, 'Font').matchAll(/\/([^\s/]+)\s+(\d+) 0 R/g)) polices[m[1]] = () => police(+m[2]);
    const espaces = {};
    for (const m of dict(res, 'ColorSpace').matchAll(/\/([^\s/]+)\s*(\[[^\]]*\]|\d+ 0 R|\/\w+)/g)) espaces[m[1]] = typeEspace(m[2]);
    const contenus = o.match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/)?.[1];
    const contenu = refs(contenus ?? '').map((c) => flux(objets.get(c)).toString('latin1')).join('\n');
    return { contenu, polices, espaces };
  });
}
