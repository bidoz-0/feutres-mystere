// Numéros de coloriage écrits en texte à gauche de la page (x < 40), parfois sur plusieurs lignes (« 01 / & / 02 »).
// Renvoie [{ y (ligne du haut), libelle }], libellé normalisé comme « 1 & 2 » (sans zéros de tête).
export function libellesTexte(textes) {
  const t = textes.filter((e) => e.x < 40 && /^[\d\s&]+$/.test(e.texte) && e.texte.trim());
  // les annotations (« 1 », « contour »…) sont dans une autre police : on garde celle du texte le plus à gauche
  const police = t.filter((e) => /\d/.test(e.texte)).sort((a, b) => a.x - b.x)[0]?.police;
  const groupes = [];
  for (const e of t.filter((e) => e.police === police).sort((a, b) => b.y - a.y)) { // tri stable : l'ordre du flux départage une même ligne
    const g = groupes.at(-1);
    if (g && g.dernierY - e.y <= 20) { g.lignes.push(e); g.dernierY = e.y; } else groupes.push({ lignes: [e], dernierY: e.y });
  }
  return groupes.filter(({ lignes }) => lignes.some((e) => /\d/.test(e.texte))).map(({ lignes }) => {
    const parLigne = [];
    for (const e of lignes) {
      const l = parLigne.at(-1);
      if (l && Math.abs(l.y - e.y) < 2) l.texte += e.texte.trim(); else parLigne.push({ y: e.y, texte: e.texte.trim() });
    }
    return { y: lignes[0].y, libelle: parLigne.map((l) => l.texte).join(' ').replace(/\b0+(?=\d)/g, '') };
  });
}
