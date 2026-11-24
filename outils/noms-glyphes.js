// Nom de glyphe standard (Adobe Glyph List, sous-ensemble sûr) → caractère Unicode ; null si le nom n'est pas reconnu.
// Reconnu : lettres seules (a, Z), chiffres (zero…nine), lettres grecques (alpha, Psi…), uniXXXX / uXXXX.
const CHIFFRES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const GRECQUES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
const grec = new Map();
GRECQUES.forEach((n, i) => { // le sigma final (U+03C2) occupe la place avant sigma ; U+03A2 n'existe pas
  grec.set(n, String.fromCodePoint(0x391 + i + (i >= 17 ? 1 : 0)));
  grec.set(n.toLowerCase(), String.fromCodePoint(0x3b1 + i + (i >= 17 ? 1 : 0)));
});

export function nomVersCar(nom) {
  if (/^[A-Za-z]$/.test(nom)) return nom;
  if (CHIFFRES.includes(nom)) return String(CHIFFRES.indexOf(nom));
  if (grec.has(nom)) return grec.get(nom);
  const u = nom.match(/^uni([0-9A-F]{4})$/) || nom.match(/^u([0-9A-F]{4,6})$/);
  return u ? String.fromCodePoint(parseInt(u[1], 16)) : null;
}

// Caractère fiable : visible et assigné (pas vide, espace, contrôle, largeur nulle, surrogate, zone privée, U+FFFD), sinon null.
export const fiable = (c) => (c && c.trim() && !/[\p{C}\p{Z}\u200B-\u200D\u2060\uFEFF\uFFFD]/u.test(c) ? c : null);
