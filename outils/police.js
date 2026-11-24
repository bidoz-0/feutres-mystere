// Lecture d'une police TrueType embarquée (sous-ensemble d'un PDF) : contours des glyphes, en unités d'em (1 = corps de la police).
export function lirePoliceTrueType(b) {
  const tab = {};
  for (let i = 0; i < b.readUInt16BE(4); i++) { const o = 12 + 16 * i; tab[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8); }
  if (!tab.glyf || !tab.loca) return null; // police OpenType/CFF : contours non lus
  const u16 = (p) => b.readUInt16BE(p), i16 = (p) => b.readInt16BE(p);
  const upem = u16(tab.head + 18), longLoca = i16(tab.head + 50) === 1;
  const loca = (g) => tab.glyf + (longLoca ? b.readUInt32BE(tab.loca + 4 * g) : 2 * u16(tab.loca + 2 * g));
  const nbH = tab.hhea ? u16(tab.hhea + 34) : 0;
  const avance = (g) => (nbH ? u16(tab.hmtx + 4 * Math.min(g, nbH - 1)) / upem : 0);

  // sous-tables cmap : [{ format, off }]
  const subs = [];
  if (tab.cmap) for (let i = 0; i < u16(tab.cmap + 2); i++) {
    const plat = u16(tab.cmap + 4 + 8 * i), enc = u16(tab.cmap + 6 + 8 * i), off = tab.cmap + b.readUInt32BE(tab.cmap + 8 + 8 * i);
    subs.push({ plat, enc, format: u16(off), off });
  }
  function cherche({ format, off }, c) {
    if (format === 0) return c < 256 ? b[off + 6 + c] : 0;
    if (format === 6) { const d = c - u16(off + 6); return d >= 0 && d < u16(off + 8) ? u16(off + 10 + 2 * d) : 0; }
    if (format === 12) {
      for (let i = 0; i < b.readUInt32BE(off + 12); i++) {
        const g = off + 16 + 12 * i, d = c - b.readUInt32BE(g);
        if (d >= 0 && c <= b.readUInt32BE(g + 4)) return b.readUInt32BE(g + 8) + d;
      }
      return 0;
    }
    if (format !== 4) return 0;
    const n = u16(off + 6) / 2, fins = off + 14, debuts = fins + 2 * n + 2, deltas = debuts + 2 * n, plages = deltas + 2 * n;
    for (let i = 0; i < n; i++) {
      if (u16(fins + 2 * i) < c || u16(debuts + 2 * i) > c) continue;
      const ro = u16(plages + 2 * i);
      if (!ro) return (c + i16(deltas + 2 * i)) & 0xffff;
      const g = u16(plages + 2 * i + ro + 2 * (c - u16(debuts + 2 * i)));
      return g ? (g + i16(deltas + 2 * i)) & 0xffff : 0;
    }
    return 0;
  }
  // police « symbolique » : le code peut être stocké tel quel ou en 0xF000 + code
  const gidDe = (code) => {
    for (const s of subs) for (const c of [code, 0xf000 + code]) { const g = cherche(s, c); if (g) return g; }
    return 0;
  };

  function contours(g) {
    const d = loca(g);
    if (d === loca(g + 1)) return [];
    const nc = i16(d);
    if (nc < 0) { // glyphe composite : assemblage de glyphes avec translation / échelle
      const out = [];
      let p = d + 10, flags;
      do {
        flags = u16(p);
        const gi = u16(p + 2);
        p += 4;
        let dx, dy;
        if (flags & 1) { dx = i16(p); dy = i16(p + 2); p += 4; } else { dx = b.readInt8(p); dy = b.readInt8(p + 1); p += 2; }
        if (!(flags & 2)) throw new Error('Glyphe composite placé par points : non géré');
        let a = 1, bb = 0, c = 0, dd = 1;
        if (flags & 8) { a = dd = i16(p) / 16384; p += 2; }
        else if (flags & 0x40) { a = i16(p) / 16384; dd = i16(p + 2) / 16384; p += 4; }
        else if (flags & 0x80) { a = i16(p) / 16384; bb = i16(p + 2) / 16384; c = i16(p + 4) / 16384; dd = i16(p + 6) / 16384; p += 8; }
        for (const k of contours(gi)) out.push(k.map((q) => ({ x: a * q.x + c * q.y + dx, y: bb * q.x + dd * q.y + dy, on: q.on })));
      } while (flags & 0x20);
      return out;
    }
    const fins = [];
    let p = d + 10;
    for (let i = 0; i < nc; i++) fins.push(u16(p + 2 * i));
    p += 2 * nc;
    p += 2 + u16(p);
    const n = fins[nc - 1] + 1, fl = [];
    while (fl.length < n) { if (p >= b.length) throw new Error('Glyphe TrueType tronqué (drapeaux hors du fichier)'); const f = b[p++]; fl.push(f); if (f & 8) for (let r = b[p++]; r > 0; r--) fl.push(f); }
    const coord = (court, meme, positif) => {
      let v = 0;
      return fl.map((f) => {
        if (f & court) { const x = b[p++]; v += f & positif ? x : -x; } else if (!(f & meme)) { v += i16(p); p += 2; }
        return v;
      });
    };
    const xs = coord(2, 16, 16), ys = coord(4, 32, 32);
    return fins.map((fin, i) => {
      const pts = [];
      for (let k = i ? fins[i - 1] + 1 : 0; k <= fin; k++) pts.push({ x: xs[k], y: ys[k], on: !!(fl[k] & 1) });
      return pts;
    });
  }

  // Un contour (points sur la courbe ou de contrôle) → opérations m / l / c (courbes quadratiques converties en cubiques).
  function versTrace(pts) {
    const milieu = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, on: true });
    const n = pts.length;
    const depart = pts[0].on ? pts[0] : pts[n - 1].on ? pts[n - 1] : milieu(pts[0], pts[n - 1]);
    const suite = pts[0].on ? pts.slice(1) : pts[n - 1].on ? pts.slice(0, n - 1) : pts;
    let cur = depart, ctrl = null;
    const ops = [['m', cur.x, cur.y]];
    const quad = (c, to) => { ops.push(['c', cur.x + 2 / 3 * (c.x - cur.x), cur.y + 2 / 3 * (c.y - cur.y), to.x + 2 / 3 * (c.x - to.x), to.y + 2 / 3 * (c.y - to.y), to.x, to.y]); cur = to; };
    for (const q of [...suite, depart]) {
      if (q.on) { if (ctrl) quad(ctrl, q); else { ops.push(['l', q.x, q.y]); cur = q; } ctrl = null; }
      else { if (ctrl) quad(ctrl, milieu(ctrl, q)); ctrl = q; }
    }
    ops.push(['h']);
    return ops;
  }

  return {
    // { trace (unités d'em), avance (en em) } ; trace vide pour un glyphe sans contour (espace)
    glyphe(code, direct = false) {
      const g = direct ? code : gidDe(code);
      return { trace: contours(g).flatMap((k) => k.length ? versTrace(k).map(([op, ...v]) => [op, ...v.map((x) => x / upem)]) : []), avance: avance(g) };
    },
  };
}
