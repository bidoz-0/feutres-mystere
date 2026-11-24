// Plein écran et paysage verrouillé quand le téléphone le permet (Android) ;
// sinon boites.css tourne la vue de 90° tant que l'écran est en portrait.
let actif = false;

// Une View Transition est annulée si l'écran change de taille : on attend que la rotation soit finie.
function attendreStable(max = 600) {
  return new Promise((resoudre) => {
    let calme = setTimeout(fin, 150);
    const plafond = setTimeout(fin, max);
    function relancer() { clearTimeout(calme); calme = setTimeout(fin, 120); }
    function fin() {
      clearTimeout(calme); clearTimeout(plafond);
      removeEventListener('resize', relancer);
      resoudre();
    }
    addEventListener('resize', relancer);
  });
}

export async function entrerPaysage() {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    actif = true;
  } catch { return; } // refusé (iPhone, iframe…) : repli CSS
  try { await screen.orientation.lock('landscape'); } catch { /* repli CSS */ }
  await attendreStable();
}

// Grille en paysage, liste en portrait (le plein écran est gardé) ; sans verrouillage possible, rien à faire ici.
export async function orienter(sens) {
  if (!actif) return;
  try { await screen.orientation.lock(sens); } catch { return; }
  await attendreStable();
}

export async function sortirPaysage() {
  try { screen.orientation.unlock(); } catch { /* rien à déverrouiller */ }
  if (!actif) return;
  actif = false;
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* déjà sorti */ }
  }
  await attendreStable();
}
