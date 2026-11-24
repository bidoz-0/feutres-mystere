// Lecture d'une police CFF (Type1C) embarquée : contours des glyphes (charstrings Type 2), en unités d'em.
// Non gérés : polices CID (ROS), glyphes composés « seac ». Renvoie null pour une police CID.
const CHIFFRES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// Nom Adobe d'un code ASCII lettre ou chiffre (le seul cas utile ici), sinon null.
export const nomAscii = (code) => /[0-9]/.test(String.fromCharCode(code)) ? CHIFFRES[code - 48] : /[A-Za-z]/.test(String.fromCharCode(code)) ? String.fromCharCode(code) : null;
// Chaînes standard CFF connues (SID → nom) : chiffres 17-26, A-Z 34-59, a-z 66-91.
const nomStandard = (sid) => sid >= 17 && sid <= 26 ? CHIFFRES[sid - 17] : sid >= 34 && sid <= 59 ? String.fromCharCode(65 + sid - 34) : sid >= 66 && sid <= 91 ? String.fromCharCode(97 + sid - 66) : null;

export function lirePoliceCff(b) {
  const u16 = (p) => b.readUInt16BE(p);
  const index = (p) => { // INDEX : { items: [[début, fin]], fin }
    const n = u16(p);
    if (!n) return { items: [], fin: p + 2 };
    const sz = b[p + 2], off = (i) => { let v = 0; for (let k = 0; k < sz; k++) v = v * 256 + b[p + 3 + i * sz + k]; return v; };
    const base = p + 3 + (n + 1) * sz - 1;
    return { items: Array.from({ length: n }, (_, i) => [base + off(i), base + off(i + 1)]), fin: base + off(n) };
  };
  const dict = (d, f) => { // DICT : { opérateur: [opérandes] }
    const out = {};
    let st = [];
    for (let p = d; p < f;) {
      const c = b[p++];
      if (c <= 21) { const op = c === 12 ? 1200 + b[p++] : c; out[op] = st; st = []; }
      else if (c === 28) { st.push(b.readInt16BE(p)); p += 2; }
      else if (c === 29) { st.push(b.readInt32BE(p)); p += 4; }
      else if (c === 30) { let s = ''; for (let fin = false; !fin;) { if (p >= b.length) throw new Error('DICT CFF tronqué (nombre réel sans fin)'); const v = b[p++]; for (const nb of [v >> 4, v & 15]) { if (nb === 15) { fin = true; break; } s += nb < 10 ? nb : nb === 10 ? '.' : nb === 11 ? 'E' : nb === 12 ? 'E-' : nb === 14 ? '-' : ''; } } st.push(+s); }
      else if (c >= 32 && c <= 246) st.push(c - 139);
      else if (c >= 247 && c <= 250) st.push((c - 247) * 256 + b[p++] + 108);
      else st.push(-(c - 251) * 256 - b[p++] - 108);
    }
    return out;
  };
  const noms = index(b[2]), tops = index(noms.fin), chaines = index(tops.fin), gsubrs = index(chaines.fin);
  const top = dict(...tops.items[0]);
  if (top[1230]) return null; // police CID
  const chars = index(top[17][0]);
  const priv = top[18] ? dict(top[18][1], top[18][1] + top[18][0]) : {};
  const subrs = priv[19] ? index(top[18][1] + priv[19][0]) : { items: [] };
  const [defW, nomW] = [priv[20]?.[0] ?? 0, priv[21]?.[0] ?? 0];

  // charset : gid → SID ; encodage intégré : code → gid
  const sids = [0];
  if (top[15]?.[0] > 2) {
    let p = top[15][0];
    const fmt = b[p++];
    if (fmt === 0) while (sids.length < chars.items.length) { sids.push(u16(p)); p += 2; }
    else while (sids.length < chars.items.length) {
      const [premier, restants] = [u16(p), fmt === 1 ? b[p + 2] : u16(p + 2)];
      p += fmt === 1 ? 3 : 4;
      for (let k = 0; k <= restants; k++) sids.push(premier + k);
    }
  }
  const integre = new Map();
  if (top[16]?.[0] > 1) {
    let p = top[16][0];
    const fmt = b[p++] & 127;
    if (fmt === 0) for (let i = 0, n = b[p++]; i < n; i++) integre.set(b[p++], i + 1);
    else for (let i = 0, g = 1, n = b[p++]; i < n; i++) { const [premier, restants] = [b[p++], b[p++]]; for (let k = 0; k <= restants; k++) integre.set(premier + k, g++); }
  }
  const nomDe = (sid) => sid < 391 ? nomStandard(sid) : (chaines.items[sid - 391] ? b.toString('latin1', ...chaines.items[sid - 391]) : null);
  const gidParNom = new Map(sids.flatMap((sid, g) => { const n = nomDe(sid); return n === null ? [] : [[n, g]]; })); // pas de clé null

  const biais = (n) => n < 1240 ? 107 : n < 33900 ? 1131 : 32768;
  function glyphe(gid) {
    const trace = [];
    let st = [], x = 0, y = 0, nStems = 0, largeur = null, ouvert = false, fini = false;
    const ferme = () => { if (ouvert) trace.push(['h']); ouvert = false; };
    const bouge = (dx, dy) => { ferme(); x += dx; y += dy; trace.push(['m', x, y]); ouvert = true; };
    const ligne = (dx, dy) => { x += dx; y += dy; trace.push(['l', x, y]); };
    const courbe = (a, bb, c, d, e, f) => {
      const [x1, y1, x2, y2] = [x + a, y + bb, x + a + c, y + bb + d];
      x = x2 + e; y = y2 + f; trace.push(['c', x1, y1, x2, y2, x, y]);
    };
    const prend = (attendu) => { if (largeur === null) { largeur = st.length > attendu ? nomW + st.shift() : defW; } };
    function exec(d, f, profondeur) {
      for (let p = d; p < f && !fini;) {
        const c = b[p++];
        if (c >= 32 || c === 28) {
          if (c === 28) { st.push(b.readInt16BE(p)); p += 2; }
          else if (c <= 246) st.push(c - 139);
          else if (c <= 250) st.push((c - 247) * 256 + b[p++] + 108);
          else if (c <= 254) st.push(-(c - 251) * 256 - b[p++] - 108);
          else { st.push(b.readInt32BE(p) / 65536); p += 4; }
          continue;
        }
        if (c === 1 || c === 3 || c === 18 || c === 23) { prend(st.length - (st.length % 2)); nStems += st.length >> 1; st = []; }
        else if (c === 19 || c === 20) { prend(st.length - (st.length % 2)); nStems += st.length >> 1; st = []; p += Math.ceil(nStems / 8); }
        else if (c === 21) { prend(2); bouge(st[0], st[1]); st = []; }
        else if (c === 22) { prend(1); bouge(st[0], 0); st = []; }
        else if (c === 4) { prend(1); bouge(0, st[0]); st = []; }
        else if (c === 5) { for (let i = 0; i < st.length; i += 2) ligne(st[i], st[i + 1]); st = []; }
        else if (c === 6 || c === 7) { let h = c === 6; for (const v of st) { if (h) ligne(v, 0); else ligne(0, v); h = !h; } st = []; }
        else if (c === 8) { for (let i = 0; i < st.length; i += 6) courbe(...st.slice(i, i + 6)); st = []; }
        else if (c === 24) { let i = 0; for (; i + 6 <= st.length - 2; i += 6) courbe(...st.slice(i, i + 6)); ligne(st[i], st[i + 1]); st = []; }
        else if (c === 25) { let i = 0; for (; i + 2 <= st.length - 6; i += 2) ligne(st[i], st[i + 1]); courbe(...st.slice(i, i + 6)); st = []; }
        else if (c === 26) { let i = 0, dx = 0; if (st.length % 4) dx = st[i++]; for (; i < st.length; i += 4) { courbe(dx, st[i], st[i + 1], st[i + 2], 0, st[i + 3]); dx = 0; } st = []; }
        else if (c === 27) { let i = 0, dy = 0; if (st.length % 4) dy = st[i++]; for (; i < st.length; i += 4) { courbe(st[i], dy, st[i + 1], st[i + 2], st[i + 3], 0); dy = 0; } st = []; }
        else if (c === 30 || c === 31) {
          let h = c === 31, i = 0;
          for (; i + 4 <= st.length; i += 4) {
            const dernier = st.length - i === 5 ? st[i + 4] : 0;
            if (h) courbe(st[i], 0, st[i + 1], st[i + 2], dernier, st[i + 3]); else courbe(0, st[i], st[i + 1], st[i + 2], st[i + 3], dernier);
            h = !h;
          }
          st = [];
        }
        else if (c === 10 || c === 29) {
          const liste = c === 10 ? subrs : gsubrs, n = st.pop() + biais(liste.items.length);
          if (profondeur > 10 || !liste.items[n]) throw new Error('Sous-routine CFF introuvable');
          exec(...liste.items[n], profondeur + 1);
        }
        else if (c === 11) return;
        else if (c === 14) { prend(st.length === 5 || st.length === 1 ? st.length - 1 : 0); ferme(); fini = true; }
        else if (c === 12) {
          const o = b[p++];
          if (o === 35) { courbe(...st.slice(0, 6)); courbe(...st.slice(6, 12)); st = []; }
          else if (o === 34) { courbe(st[0], 0, st[1], st[2], st[3], 0); courbe(st[4], 0, st[5], -st[2], st[6], 0); st = []; }
          else if (o === 36) { courbe(st[0], st[1], st[2], st[3], st[4], 0); courbe(st[5], 0, st[6], st[7], st[8], -(st[1] + st[3] + st[7])); st = []; }
          else if (o === 37) {
            const dx = st[0] + st[2] + st[4] + st[6] + st[8], dy = st[1] + st[3] + st[5] + st[7] + st[9];
            courbe(...st.slice(0, 6));
            if (Math.abs(dx) > Math.abs(dy)) courbe(st[6], st[7], st[8], st[9], st[10], -dy); else courbe(st[6], st[7], st[8], st[9], -dx, st[10]);
            st = [];
          } else st = [];
        } else st = [];
      }
    }
    exec(...chars.items[gid], 0);
    ferme();
    return { trace: trace.map(([op, ...v]) => [op, ...v.map((n) => n / 1000)]), avance: (largeur ?? defW) / 1000 };
  }

  return {
    // code → gid : par nom de glyphe (encodage du PDF) puis par l'encodage intégré à la police
    gidDe: (code, nom) => (nom != null ? gidParNom.get(nom) : undefined) ?? integre.get(code) ?? 0,
    glyphe,
  };
}
