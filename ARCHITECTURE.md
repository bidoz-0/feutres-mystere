# Architecture

## Les briques
```
 PRÉPARATION (une fois, sur le PC)              APPLI (sur le téléphone)
 sources/ images Amazon ─► outils/extraire-feutres.html ─► data/feutres.json ─┐
 sources/pdfs/*.pdf     ─► outils/extraire-livre.js     ─► data/livres/*.json ┤
                                                                              ▼
                     index.html ─► app/main.js ─► navigation/routeur.js
                                                   ├─ bibliotheque/   (liste des livres)
                                                   ├─ coloriages/     (1…20 d'un livre)
                                                   └─ nuancier/       (symbole → feutre)
                                                        ├─ proposer.js ─► couleurs/couleur.js
                                                        └─ memoire/memoire.js ─► localStorage
```

## Où sont les données
- **Feutres** (408, code + nom + couleur) : `data/feutres.json`, généré une fois.
- **Nuanciers des livres** (symbole + couleur par coloriage) : `data/livres/<id>.json` + `data/livres/index.json`.
- **Choix de l'utilisatrice** (feutres changés, réglage de marque) : `localStorage` du téléphone, clé `feutres-mystere:v1`.
- **Sources brutes** (images, PDF) : `sources/`, hors git.

## Qui parle à qui
- Les écrans (`vue-*.js`) chargent les JSON via `app/donnees/charger.js`, appellent la logique (`proposer.js`, `memoire.js`) et affichent. Ils ne calculent rien eux-mêmes.
- `proposer.js` ne connaît ni le DOM ni le stockage : il prend des données, rend des résultats (testable avec `node --test`).
- Aucun appel réseau externe : tout est servi avec la page.

## Choix techniques
- **Page web statique** : rien à installer pour elle, hébergement gratuit sur GitHub Pages.
- **JavaScript sans framework ni build** : le plus simple pour 3 écrans, rien à compiler.
- **JSON au lieu d'une base de données** : les données ne changent que quand on ajoute un livre.
- **localStorage** : une seule utilisatrice, un seul téléphone, pas besoin de serveur ni de compte.
- **CIEDE2000 (espace Lab)** : mesure la différence de couleur comme l'œil la perçoit.
- **Node.js pour les outils et tests** : déjà installé, `node --test` évite toute dépendance.
