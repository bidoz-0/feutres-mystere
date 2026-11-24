// View Transitions des boîtes. Sans l'API (ou si elle échoue), le changement se fait sans animation.
let pret = null;

export function transition(maj) {
  if (!document.startViewTransition) { maj(); return null; }
  return document.startViewTransition(maj);
}

// Change de route ; la promesse se résout quand la nouvelle vue appelle vueAffichee() (800 ms au plus).
export const versRoute = (changer) => new Promise((resoudre) => {
  pret = resoudre;
  setTimeout(resoudre, 800);
  changer();
});

export function vueAffichee() {
  pret?.();
  pret = null;
}
