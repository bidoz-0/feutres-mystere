// Petits éléments d'interface partagés par les trois écrans (aucune logique métier).
export function el(tag, props = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'texte') e.textContent = v;
    else e.setAttribute(k, v);
  }
  e.append(...enfants.filter((x) => x !== null && x !== undefined && x !== false));
  return e;
}

const SVG = 'http://www.w3.org/2000/svg';

// Vrai dessin du symbole (glyphe du PDF) ; à défaut, le caractère en texte.
export function dessinSymbole(livre, symbole) {
  // « c (2) » = 2e « c » du coloriage (champ `base`) : glyphe de la base + suffixe en texte
  const [, base, suffixe] = !livre.glyphes?.[symbole] ? /^(.+) (\(\d+\))$/.exec(symbole) ?? [] : [];
  if (base && livre.glyphes?.[base]) {
    return el('span', { class: 'symbole-suffixe', role: 'img', 'aria-label': symbole },
      dessinSymbole(livre, base), ` ${suffixe}`);
  }
  const g = livre.glyphes?.[symbole];
  if (!g) return el('span', { class: 'symbole', texte: symbole });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${g.l} ${g.h}`);
  svg.setAttribute('class', 'symbole');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', symbole);
  svg.style.aspectRatio = `${g.l} / ${g.h}`;
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', g.d);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

// Pastille de couleur ; hex absent = pastille hachurée.
export function pastille(hex, label) {
  const p = el('span', { class: hex ? 'pastille' : 'pastille vide', role: 'img', 'aria-label': hex ? label : 'aucun feutre' });
  if (hex) p.style.background = hex;
  return p;
}

// Couleur du livre et couleur du feutre côte à côte, pour comparer d'un coup d'œil.
export function duo(hexLivre, hexFeutre) {
  return el('span', { class: 'duo' },
    pastille(hexLivre, 'couleur du livre'), pastille(hexFeutre, 'couleur du feutre'));
}

function flecheRetour() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', 'M15 5l-7 7 7 7');
  svg.append(path);
  return svg;
}

export function entete(titre, retour) {
  const lien = retour ? el('a', { class: 'retour', href: retour, 'aria-label': 'Retour' }) : null;
  lien?.append(flecheRetour());
  return el('header', { class: 'entete' }, lien, el('h1', { texte: titre }));
}

export const erreur = (racine, message) =>
  racine.append(el('p', { class: 'erreur', role: 'alert', texte: message }));
