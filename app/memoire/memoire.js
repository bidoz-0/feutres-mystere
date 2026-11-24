// Mémorise choix, préférence et avancement dans le localStorage ; si indisponible, tout reste en mémoire vive.
const CLE = 'feutres-mystere:v1';
const objet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Ancien curseur (-1..1 par pas de 0,25) : un réglage léger compte comme « peu importe ».
export const versChoix = (p) => (Math.abs(p) < 0.5 ? 0 : Math.sign(p));
// ne garde que les entrées à true
const vrais = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v === true));

export function creerMemoire(stockage) {
  if (stockage === undefined) {
    try { stockage = globalThis.localStorage; } catch { stockage = null; }
  }
  let etat = { preference: 0, choix: {}, pagesFinies: {}, livresFinis: {} };
  try {
    const lu = JSON.parse(stockage?.getItem(CLE));
    if (objet(lu)) {
      if (typeof lu.preference === 'number') etat.preference = lu.preference;
      if (objet(lu.choix)) etat.choix = lu.choix;
      if (objet(lu.pagesFinies)) etat.pagesFinies = vrais(lu.pagesFinies);
      if (objet(lu.livresFinis)) etat.livresFinis = vrais(lu.livresFinis);
    }
  } catch { /* absent ou corrompu : valeurs par défaut */ }

  const sauver = () => {
    try { stockage?.setItem(CLE, JSON.stringify(etat)); } catch { /* garde la mémoire vive */ }
  };
  const marquer = (o, cle, bool) => { if (bool) o[cle] = true; else delete o[cle]; sauver(); };

  const api = {
    lireChoix(livreId, numero) {
      const page = etat.choix[`${livreId}/${numero}`];
      return objet(page) ? structuredClone(page) : {};
    },
    // Ne refuse jamais : c'est l'interface qui empêche de modifier une page bloquée.
    enregistrerChoix(livreId, numero, symbole, choix) {
      const cle = `${livreId}/${numero}`;
      const page = objet(etat.choix[cle]) ? etat.choix[cle] : (etat.choix[cle] = {});
      if (choix === null) {
        delete page[symbole];
        if (!Object.keys(page).length) delete etat.choix[cle];
      } else page[symbole] = structuredClone(choix);
      sauver();
    },
    // Ajoute les choix absents sans écraser les existants, en une seule sauvegarde.
    completerChoix(livreId, numero, nouveaux) {
      const cle = `${livreId}/${numero}`;
      const page = objet(etat.choix[cle]) ? etat.choix[cle] : {};
      const ajouts = Object.entries(nouveaux).filter(([s]) => !(s in page));
      if (!ajouts.length) return;
      etat.choix[cle] = page;
      for (const [s, c] of ajouts) page[s] = structuredClone(c);
      sauver();
    },
    lirePreference: () => etat.preference,
    enregistrerPreference(p) { etat.preference = p; sauver(); },
    estPageFinie: (livreId, numero) => etat.pagesFinies[`${livreId}/${numero}`] === true,
    marquerPageFinie: (livreId, numero, bool) => marquer(etat.pagesFinies, `${livreId}/${numero}`, bool),
    estLivreFini: (livreId) => etat.livresFinis[livreId] === true,
    marquerLivreFini: (livreId, bool) => marquer(etat.livresFinis, livreId, bool),
    nbPagesFinies: (livreId) => Object.keys(etat.pagesFinies).filter((k) => k.startsWith(`${livreId}/`)).length,
  };
  // Bloquée = page finie ou livre fini.
  api.estPageBloquee = (livreId, numero) => api.estLivreFini(livreId) || api.estPageFinie(livreId, numero);
  return api;
}
