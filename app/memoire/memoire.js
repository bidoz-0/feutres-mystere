// Mémorise choix et préférence dans le localStorage ; si indisponible, tout reste en mémoire vive.
const CLE = 'feutres-mystere:v1';
const objet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function creerMemoire(stockage) {
  if (stockage === undefined) {
    try { stockage = globalThis.localStorage; } catch { stockage = null; }
  }
  let etat = { preference: 0, choix: {} };
  try {
    const lu = JSON.parse(stockage?.getItem(CLE));
    if (objet(lu)) {
      if (typeof lu.preference === 'number') etat.preference = lu.preference;
      if (objet(lu.choix)) etat.choix = lu.choix;
    }
  } catch { /* absent ou corrompu : valeurs par défaut */ }

  const sauver = () => {
    try { stockage?.setItem(CLE, JSON.stringify(etat)); } catch { /* garde la mémoire vive */ }
  };

  return {
    lireChoix(livreId, numero) {
      const page = etat.choix[`${livreId}/${numero}`];
      return objet(page) ? structuredClone(page) : {};
    },
    enregistrerChoix(livreId, numero, symbole, choix) {
      const cle = `${livreId}/${numero}`;
      const page = objet(etat.choix[cle]) ? etat.choix[cle] : (etat.choix[cle] = {});
      if (choix === null) {
        delete page[symbole];
        if (!Object.keys(page).length) delete etat.choix[cle];
      } else page[symbole] = structuredClone(choix);
      sauver();
    },
    lirePreference: () => etat.preference,
    enregistrerPreference(p) { etat.preference = p; sauver(); },
  };
}
