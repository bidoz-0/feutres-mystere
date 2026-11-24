// Livres de l'utilisatrice, à extraire avec extraire-lot.js (`pages` = dernier numéro imprimé, quand on le connaît).
// Les autres PDF de sources/pdfs/ passent aussi l'outil (testé le 2026-11-24) : les rajouter ici si elle les achète.
const D = 'sources/pdfs/';
export const LIVRES = [
  { pdf: D + 'Nuancier_Princesses_Disney_Tome_2-1.pdf', id: 'princesses-t2', titre: 'Princesses Disney – Tome 2', pages: 100 },
  { pdf: D + 'Nuancier-couleurs-disney-grands-classiques-tome11_OK.pdf', id: 'grands-classiques-t11', titre: 'Disney Grands Classiques – Tome 11', pages: 100 },
];
