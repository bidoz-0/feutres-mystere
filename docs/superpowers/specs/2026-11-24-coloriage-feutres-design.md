# Design : appli « quel feutre pour mon coloriage mystère »

Date : 2026-11-24 — statut : validé par l'utilisateur.

## Intention
La copine de l'utilisateur fait des coloriages mystères Hachette (Disney, Winx…, illustrés en grande partie par Jérémy Mariez). Chaque coloriage a sa propre palette : une liste de symboles (`1 2 3 … 0 a b c … Δ Σ`) avec une couleur chacun. Elle possède 408 feutres acryliques (Languo 240 + GuangNa 168) et perd beaucoup de temps à choisir, pour chaque symbole, le feutre le plus proche. L'appli fait ce choix à sa place.

**Réussite** : elle ouvre l'appli sur son téléphone, choisit le livre puis le coloriage, et a immédiatement la liste « symbole → feutre » ; elle peut ajuster un choix en deux touches.

## Objectifs (V1)
- Bibliothèque → livre → coloriage → nuancier proposé (symbole, couleur du livre, feutre proposé avec sa couleur, son code et son nom).
- Réglage de préférence entre les deux boîtes (Languo ◀──▶ GuangNa).
- Toucher un symbole : 5 feutres alternatifs proches, ou saisie d'une référence à la main. Le choix est mémorisé.
- Un seul livre en V1 : **Princesses Disney tome 2** (20 coloriages).

## Pas dans la V1
- Les 21 autres livres (même script, ajoutés un par un ensuite).
- Livres en favoris (utile seulement à partir de plusieurs livres).
- Menu statistiques (feutres les plus utilisés) : calculable plus tard depuis les choix déjà mémorisés en V1.
- Import d'un PDF ou d'une photo de nuancier depuis le téléphone.
- Synchronisation entre appareils, comptes.

## Anti-objectifs
- Une suggestion fausse sans qu'on puisse le voir : la couleur du livre et celle du feutre sont toujours affichées côte à côte.
- Dépendre d'un site externe à l'usage (Scribd, site de l'auteur) : toutes les données sont dans l'appli.
- Publier les PDF de l'auteur : seules les valeurs de couleur extraites vont dans le repo.

## Contraintes
- Utilisée sur téléphone (portrait), sans installation.
- Développeur débutant : stack la plus simple possible, rien à compiler.
- Gratuit à héberger.

## Approches envisagées
| Approche | Pour | Contre |
|---|---|---|
| **A. Page web statique (choisie)** | Rien à installer, hébergement gratuit (GitHub Pages), le navigateur suffit | Moins « appli du store » |
| B. Appli mobile native (Flutter / React Native) | Aspect appli classique | Outils lourds, publication iPhone payante, même résultat |
| C. Script Python sur PC | Le plus simple à coder | Elle ne peut pas l'utiliser seule : contraire au but |

Choix : A, validé par l'utilisateur.

## Décisions de conception
- **Code** : HTML + CSS + JavaScript (modules ES), sans framework ni build. Scripts d'extraction et tests en Node.js (`node --test`), rien à installer.
- **Données des feutres** : extraites une fois des deux images Amazon (grilles numériques propres : Languo 20×12, GuangNa 14×12), échantillonnage d'une bande verticale à 15 % du bord gauche de chaque case (pour éviter le texte). Codes transcrits depuis les images et vérifiés avec les photos des boîtes. Correction connue : sur l'image GuangNa, le second « 797 » (3e ligne, vert-jaune) est en réalité **787 straw yellow**. Noms GuangNa repris du dos de la boîte. Résultat : `data/feutres.json`.
- **Données des livres** : les PDF officiels de jeremymariez.free.fr sont vectoriels ; les cases de couleur sont des formes de 20 pt de haut avec leur couleur exacte, regroupées par ligne (une ligne = un coloriage). Le script en sort `data/livres/<livre>.json`. Les PDF restent hors du repo.
- **Correspondance des couleurs** : distance perceptuelle (CIELAB, CIEDE2000) entre couleur du livre et couleur du feutre. Le réglage de préférence applique un malus à la boîte non favorisée.
- **Mémoire** : choix modifiés et réglage stockés dans le `localStorage` du téléphone.

## Sources (dans le projet, hors git)
`sources/` contient : `languo-240-amazon.webp`, `guangna-168-amazon.webp` (grilles de couleurs), `languo-240-boite.jpg`, `guangna-168-dos-boite.jpg` (photos pour vérifier codes et noms), et `sources/pdfs/` les 22 nuanciers PDF de l'auteur (dont `Nuancier_Princesses_Disney_Tome_2-1.pdf`). Ce dossier est dans `.gitignore` (droits des images et PDF).

## Précisions après relecture (choix de Claude, à corriger si besoin)
- **Choix mémorisé par coloriage** : clé = livre + n° de coloriage + symbole. Changer le feutre du symbole « a » du coloriage 7 ne touche pas les autres coloriages. Les futures stats compteront ces choix (et les propositions acceptées).
- **Deux symboles peuvent avoir le même feutre** (correspondance simple, symbole par symbole). L'appli affiche un petit avertissement « même feutre que le symbole X » pour qu'elle puisse en changer si elle veut distinguer les zones.
- **Format d'un feutre** : `{ marque: "languo" | "guangna", code, nom, hex }`. Languo n'a pas de nom de couleur : on affiche le code (`RY-10`). GuangNa : `605 red`. Les codes ne se chevauchent pas (Languo = lettres-tiret-chiffres, GuangNa = 3 chiffres).
- **Saisie à la main** : un champ texte ; si le code correspond à un feutre connu, il est reconnu (marque et couleur affichées), sinon le texte est gardé tel quel (« autre feutre »), sans couleur.

## Laissé au builder
- Formule exacte de ΔE et forme du malus de préférence.
- Mise en page précise des écrans (mobile d'abord, lisible, cases de couleur grandes).
- Vérification de l'ordre des symboles et du numéro de chaque coloriage dans le PDF (hypothèse : séquence fixe `1…9 0 a b c d e f h k m n p q r t u v x y z ◊ Δ Σ …`, vue sur le nuancier Winx) : à confirmer visuellement avant d'écrire les données ; si l'ordre n'est pas fixe, les symboles seront transcrits à la main.
- Gestion des cases en double dans le PDF (deux formes de même couleur côte à côte observées sur une ligne).
