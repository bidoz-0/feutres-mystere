// Grille des capuchons d'une boîte. Le doigt posé montre une loupe (code lisible) ;
// on peut glisser pour viser un autre capuchon, et c'est en relâchant qu'on bascule « ne marche plus ».
import { el, pastille } from '../ui/elements.js';
import { delaiCascade, encreSur } from './presentation.js';

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEPART_CASCADE = 90; // ms : la cascade démarre pendant que la boîte s'agrandit

function capuchon(f, k, ecran, horsUsage, cascade) {
  if (!f) {
    const vide = el('span', { class: 'capuchon vide', 'aria-hidden': 'true' });
    if (cascade) vide.style.animationDelay = `${DEPART_CASCADE + delaiCascade(k, ecran)}ms`;
    return vide;
  }
  const morceaux = f.code.split(/[-\s]/);
  const disque = el('span', { class: `disque ${encreSur(f.hex)}` },
    el('span', { class: morceaux.length > 1 ? 'code deux-lignes' : 'code' },
      ...morceaux.map((m) => el('span', { texte: m }))));
  disque.style.setProperty('--c', f.hex);
  const b = el('button', { type: 'button', class: 'capuchon', 'data-code': f.code,
    'aria-pressed': String(horsUsage), 'aria-label': `${f.code} ne marche plus` }, disque);
  if (cascade) b.style.animationDelay = `${DEPART_CASCADE + delaiCascade(k, ecran)}ms`;
  return b;
}

function rebond(disque) {
  if (reduit()) return;
  const ressort = getComputedStyle(disque).getPropertyValue('--ressort-vif').trim() || 'ease-out';
  disque.getAnimations().forEach((a) => a.cancel());
  try {
    disque.animate([{ transform: 'scale(0.78)' }, { transform: 'scale(1)' }], { duration: 640, easing: ressort });
  } catch { /* navigateur sans linear() : pas de rebond */ }
}

// La loupe se place au-dessus du capuchon visé, ou à côté s'il n'y a pas la place (rangée du haut).
function creerLoupe(grille) {
  const dessin = el('span', { class: 'loupe-disque' });
  const code = el('strong');
  const nom = el('small');
  const etat = el('em', { class: 'etiquette alerte', texte: 'ne marche plus' });
  const corps = el('span', { class: 'loupe-corps' }, dessin, el('span', { class: 'texte' }, code, nom, etat));
  const loupe = el('div', { class: 'loupe', 'aria-hidden': 'true' }, corps);
  return {
    loupe,
    montrer(b, f) {
      dessin.replaceChildren(pastille(f.hex, f.code));
      code.textContent = f.code;
      nom.textContent = f.nom !== f.code ? f.nom : '';
      nom.hidden = f.nom === f.code;
      etat.hidden = b.getAttribute('aria-pressed') !== 'true';
      const visible = loupe.classList.contains('visible');
      // positions dans la grille ; la zone (parent positionné) borne la loupe
      const l = corps.offsetWidth, h = corps.offsetHeight, marge = 10;
      const gx = grille.offsetLeft, gy = grille.offsetTop, zone = grille.offsetParent;
      const borner = (v, min, max) => Math.min(Math.max(v, min), max);
      let x, y, sens;
      if (b.offsetTop + gy >= h + marge) {
        x = borner(b.offsetLeft + b.offsetWidth / 2, l / 2 - gx, (zone?.clientWidth ?? 0) - gx - l / 2);
        y = b.offsetTop;
        sens = 'dessus';
      } else {
        sens = b.offsetLeft + gx >= l + marge ? 'gauche' : 'droite';
        x = sens === 'gauche' ? b.offsetLeft : b.offsetLeft + b.offsetWidth;
        y = Math.max(b.offsetTop + b.offsetHeight / 2, h / 2 - gy);
      }
      loupe.dataset.sens = sens;
      loupe.style.transform = `translate(${x}px, ${y}px)`;
      if (!visible) {
        loupe.getBoundingClientRect(); // place la loupe avant de l'afficher : elle ne glisse pas depuis l'ancien capuchon
        loupe.classList.add('visible');
      }
    },
    cacher() { loupe.classList.remove('visible'); },
  };
}

export function grilleBoite({ emplacements, ecran, memoire, cascade, surChangement }) {
  const parCode = new Map(emplacements.filter(Boolean).map((f) => [f.code, f]));
  const indisponibles = memoire.lireIndisponibles();
  const grille = el('div', { class: cascade && !reduit() ? 'grille-boite cascade' : 'grille-boite',
    role: 'group', 'aria-label': 'Feutres de la boîte' },
    ...ecran.ordre.map((i, k) => capuchon(emplacements[i], k, ecran, indisponibles.has(emplacements[i]?.code), cascade)));
  grille.style.setProperty('--colonnes', ecran.colonnes);
  grille.style.setProperty('--lignes', ecran.lignes);
  const { loupe, montrer, cacher } = creerLoupe(grille);
  grille.append(loupe);

  const basculer = (b) => {
    const horsUsage = b.getAttribute('aria-pressed') !== 'true';
    memoire.marquerIndisponible(b.dataset.code, horsUsage);
    b.setAttribute('aria-pressed', String(horsUsage));
    rebond(b.firstChild);
    if (horsUsage) navigator.vibrate?.(10);
    surChangement();
  };

  let pointeur = null, vise = null;
  const viser = (b) => {
    if (b === vise) return;
    vise?.classList.remove('vise');
    vise = b;
    if (!b) { cacher(); return; }
    b.classList.add('vise');
    montrer(b, parCode.get(b.dataset.code));
  };
  const sous = (e) => {
    const b = document.elementFromPoint(e.clientX, e.clientY)?.closest('button.capuchon');
    return b && grille.contains(b) ? b : null;
  };
  grille.addEventListener('pointerdown', (e) => {
    if (pointeur !== null || !e.isPrimary || e.button !== 0) return;
    pointeur = e.pointerId;
    grille.setPointerCapture(e.pointerId);
    viser(sous(e));
  });
  grille.addEventListener('pointermove', (e) => { if (e.pointerId === pointeur) viser(sous(e)); });
  grille.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointeur) return;
    const b = vise;
    pointeur = null;
    viser(null);
    if (b) basculer(b);
  });
  const annuler = (e) => { if (e.pointerId === pointeur) { pointeur = null; viser(null); } };
  grille.addEventListener('pointercancel', annuler);
  grille.addEventListener('lostpointercapture', annuler);
  // Clavier (Entrée / Espace) : un clic sans pointeur
  grille.addEventListener('click', (e) => {
    const b = e.detail === 0 && e.target.closest('button.capuchon');
    if (b) basculer(b);
  });
  grille.addEventListener('contextmenu', (e) => e.preventDefault());
  return grille;
}
