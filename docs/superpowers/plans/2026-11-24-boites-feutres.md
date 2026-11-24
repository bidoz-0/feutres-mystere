# Boîtes de feutres : plan de réalisation

> **Pour les agents :** chaque tâche est faite par un agent codeur (modèle Opus), puis relue par un agent relecteur avant le commit. Les cases `- [ ]` servent au suivi.

**But :** marquer une page finie sans code couleur, ajouter un menu « Mes boîtes » animé (feutres hors d'usage, vue paysage, liste), puis reconstruire la disposition réelle d'une boîte à partir d'une photo et allumer les feutres à prendre pour un dessin.

**Architecture :**
- Même structure que l'appli actuelle : écrans `vue-*.js` en DOM, logique pure testable avec `node --test`, mémoire dans `localStorage` via `app/memoire/memoire.js`.
- Deux nouveaux dossiers par fonctionnalité : `app/boites/` (menu, vue d'une boîte, disposition) et `app/photo/` (redressement, échantillonnage, devinette, lecture des codes, écran photo).

**Technique :**
- HTML, CSS et JS en modules ES, sans build.
- API View Transitions, CSS `linear()`, Fullscreen et Screen Orientation (Pixel, Chrome).
- Tesseract.js, chargé depuis un CDN uniquement dans la partie 3, et seulement si l'essai de la tâche 7 le justifie.

**Design :** `docs/superpowers/specs/2026-11-24-boites-feutres-design.md`. Les agents lisent le design et ce plan.

## Contraintes globales

- Pas de npm ni de build. Les tests se lancent avec `npm test` (`node --test`).
- Un fichier = un rôle, au plus ~300 lignes. `app/main.js` ne contient aucune logique.
- `localStorage` : on garde la clé `feutres-mystere:v1` et on reste compatible avec l'état existant `{preference, choix, pagesFinies, livresFinis}`. Les nouveaux champs sont `indisponibles: { "<code>": true }` et `dispositions: { "<marque>": { emplacements: (string|null)[] } }`.
- Les feutres sont identifiés par `code` seul : aucun code n'existe dans les deux boîtes. Les codes lus sont normalisés comme dans `trouverFeutre` (majuscules, sans espace ni tiret).
- Grilles : `languo` = 20 rangées × 12 colonnes, `guangna` = 7 rangées × 24 colonnes.
- Texte affiché, mot pour mot : « Code couleur inconnu », « ne marche plus », « Mes boîtes », « Préparer mes feutres », « pas trouvé dans la boîte ».
- Animation : on n'anime que `transform` et `opacity`. Avec `prefers-reduced-motion`, un fondu court remplace tout. Les cibles tactiles font au moins 44 px.
- Rien n'est envoyé sur internet : la photo reste dans le téléphone.

## Points à surveiller (non couverts par les tests de base)

1. **Ancien état `localStorage`** sans `indisponibles` ni `dispositions` : l'appli démarre et tout est disponible. → test dans la tâche 2.
2. **Un feutre choisi puis marqué « ne marche plus »** : le choix n'est pas modifié, la ligne affiche « ne marche plus ». → test dans la tâche 3.
3. **Tous les feutres d'une boîte hors d'usage** : le nuancier propose l'autre boîte, et ne plante pas si aucun feutre n'est disponible (propose `null`). → test dans la tâche 3.
4. **Photo dont les 4 coins sont mal placés ou inversés** : le redressement ne doit pas planter ; il renvoie des emplacements, même faux. → test dans la tâche 8.
5. **Devinette avec plus d'emplacements que de feutres restants**, ou des codes lus en double : chaque feutre n'est placé qu'une fois, et le surplus reste `null`. → test dans la tâche 9.

---

## Partie 1 : page finie sans code couleur

### Tâche 1 : bouton « Fini, je n'ai pas noté les feutres »

**Fichiers :** modifier `app/nuancier/proposer.js` et `app/nuancier/vue-nuancier.js`. Tester dans `tests/proposer.test.js`.

**Interfaces :**
- Utilise : `completerChoix(livreId, numero, nouveaux)` et `marquerPageFinie(...)` de la mémoire.
- Fournit : `choixInconnus(coloriage, choix) → { [symbole]: { texte: 'Code couleur inconnu' } }`, uniquement pour les symboles sans choix.

- [ ] Test `choixInconnus : ne remplit que les symboles sans choix`. Avec un coloriage de 3 cases (`a`, `b`, `c`) et `choix = { b: { code: 'RY-07' } }`, le résultat vaut `{ a: { texte: 'Code couleur inconnu' }, c: { texte: 'Code couleur inconnu' } }`.
- [ ] Lancer `npm test` : le test échoue.
- [ ] Écrire `choixInconnus` dans `proposer.js`.
- [ ] Dans le nuancier, quand la page n'est pas bloquée, ajouter un bouton secondaire « Fini, je n'ai pas noté les feutres » sous « Page finie ». Il appelle `completerChoix(…, choixInconnus(…))`, puis `marquerPageFinie(…, true)`, puis `afficher()`. Il ne passe pas par `choixFiges`.
- [ ] Lancer `npm test` : tout passe. Vérifier dans le navigateur : les lignes affichent « Code couleur inconnu », et la page est bloquée.
- [ ] Relecture, puis commit « Permet de finir une page sans code couleur ».

---

## Partie 2 : menu « Mes boîtes »

### Tâche 2 : feutres hors d'usage dans la mémoire

**Fichiers :** modifier `app/memoire/memoire.js`. Tester dans `tests/memoire.test.js`.

**Fournit :**
- `estIndisponible(code) → boolean`
- `marquerIndisponible(code, bool)`
- `lireIndisponibles() → Set<string>`

- [ ] Test : un aller-retour (marquer, relire, démarquer) avec la persistance via un faux stockage. Test : l'ancien état `{preference, choix}` donne `lireIndisponibles().size === 0`. Test : les entrées autres que `true` sont ignorées à la lecture.
- [ ] Lancer `npm test` : les tests échouent. Écrire le code en réutilisant `vrais()`. Relancer : tout passe.
- [ ] Commit (après la relecture groupée de fin de partie).

### Tâche 3 : le nuancier ignore les feutres hors d'usage

**Fichiers :** modifier `app/nuancier/proposer.js` et `app/nuancier/vue-nuancier.js`. Tester dans `tests/proposer.test.js`.

**Fournit :** `disponibles(feutres, indisponibles: Set) → feutres[]`.

- [ ] Test `disponibles retire les codes indisponibles`.
- [ ] Test `proposerNuancier avec une boîte entièrement indisponible propose l'autre boîte`.
- [ ] Test `proposerNuancier avec aucun feutre disponible donne feutre: null`.
- [ ] Test `un choix déjà fait sur un feutre indisponible est gardé`. Ici, `proposerNuancier` reçoit la liste complète pour retrouver les choix, et la liste filtrée pour proposer. Changer la signature en `proposerNuancier(coloriage, feutres, preference, choix, proposables = feutres)` ; seul `proposables` sert à `plusProches`.
- [ ] Dans le nuancier, filtrer pour `proposables`, `proposerParBoite` et `choixFiges`. Une ligne dont le feutre est indisponible affiche l'étiquette « ne marche plus » (style d'alerte rouge).
- [ ] Lancer `npm test` : tout passe. Vérifier dans le navigateur en marquant un feutre à la main dans `localStorage`.

### Tâche 4 : routes et données des boîtes

**Fichiers :**
- Modifier `app/navigation/routeur.js` et `app/main.js`.
- Créer `app/boites/disposition.js`.
- Tester dans `tests/routeur.test.js` et `tests/disposition.test.js`.

**Fournit :**
- Routes :
  - `#/boites` donne `{ ecran: 'boites' }` ;
  - `#/boites/<marque>` donne `{ ecran: 'boite', marque }` ;
  - `#/boites/<marque>/<livreId>/<numero>` donne `{ ecran: 'boite', marque, livreId, numero }`. C'est le mode « Préparer mes feutres », utilisé à la tâche 12.
- `GRILLES = { languo: { rangees: 20, colonnes: 12 }, guangna: { rangees: 7, colonnes: 24 } }`.
- `disposition(marque, feutres, enregistree?) → (feutre|null)[]` de longueur `rangees × colonnes`. Sans disposition enregistrée, elle suit l'ordre de `feutres.json` pour cette marque. Avec une disposition enregistrée, elle mappe les codes vers les feutres, et un code inconnu donne `null`.

- [ ] Écrire les tests des 3 routes, qui échouent. Écrire `lireRoute`, puis relancer les tests.
- [ ] Tests `disposition` :
  - longueur 240 et 168 ;
  - ordre par défaut ;
  - disposition enregistrée avec un code inconnu, qui donne `null`.
  Les écrire, vérifier qu'ils échouent, écrire le code, relancer.

### Tâche 5 : écrans « Mes boîtes » et vue d'une boîte (animation soignée)

**Fichiers :**
- Créer `app/boites/vue-boites.js`, `app/boites/vue-boite.js`, `app/boites/boites.css` (lié dans `index.html`).
- Modifier `app/bibliotheque/vue-bibliotheque.js` : lien « Mes boîtes » dans l'en-tête.

**Interfaces :** utilise `GRILLES` et `disposition` (tâche 4), ainsi que `marquerIndisponible` et `lireIndisponibles` (tâche 2).

**Écran « Mes boîtes »**
- Deux grandes cartes, une par boîte.
- Chaque carte montre une mini-grille de ses couleurs, le nom de la boîte et « N ne marchent plus ».

**Vue d'une boîte**
- Toucher une carte ouvre la vue de la boîte. La carte s'agrandit avec une transition d'élément partagé : `document.startViewTransition` et `view-transition-name` posé sur la carte et sur le conteneur de la grille.
- À l'ouverture, `document.documentElement.requestFullscreen()` puis `screen.orientation.lock('landscape')`, chacun dans un `try/catch`. Si le verrouillage échoue, on tourne le conteneur de 90° en CSS quand l'écran est en portrait.
- La grille contient `rangees × colonnes` capuchons. Chacun est un disque de la couleur du feutre, avec son code en petit.
- Apparition en cascade : chaque capuchon a un délai qui dépend de sa diagonale, `calc(var(--i) * 4ms)`, plafonné à 300 ms en tout.
- Toucher un capuchon bascule « ne marche plus » :
  - un feutre hors d'usage a un contour rouge, une barre en diagonale et une opacité de 0,45 ;
  - au basculement, un rebond en `transform: scale`, sur un ressort `linear()`.
- Bouton « Liste » : une liste simple, triée par code, avec pastille, code, nom et une case « ne marche plus », plus un filtre « seulement ceux qui ne marchent plus ». On bascule entre grille et liste avec une View Transition.
- Croix ou bouton retour : on sort du plein écran (`exitFullscreen`, `screen.orientation.unlock()`), puis on revient à `#/boites`.

**Préférences et vérification**
- Respecter `prefers-reduced-motion` : pas de cascade, pas de rebond, la View Transition devient un fondu de 150 ms.
- Charger les skills de design du setup avant d'écrire le CSS : apple-design, emil-design-eng, animation-performance, impeccable.
- Vérifier dans le navigateur au format téléphone, en portrait et en paysage. Regarder aussi la performance : aucune animation sur `width`, `height` ou `top`.
- Lancer `npm test`, faire relire la partie 2, puis faire le commit « Ajoute le menu Mes boîtes et les feutres hors d'usage ». Ensuite, PR et demande d'accord pour la mise en ligne.

---

## Partie 3 : la boîte prise en photo

### Tâche 7 : essai de lecture des codes (à faire en premier, en parallèle des parties 1 et 2)

**Fichiers :** créer `outils/essai-ocr.html` (outil local, hors appli). Les photos d'essai sont copiées dans `sources/photos-boites/`, qui est hors git.

**But :** mesurer si la lecture des codes vaut le coup.

**Méthode :**
1. Charger Tesseract.js depuis jsDelivr. Limiter les caractères lus à `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-`.
2. Pour chaque photo, placer à la main la grille avec les 4 coins. On peut coder les coins en dur pour l'essai.
3. Découper chaque capuchon, essayer les 4 rotations, et garder la lecture qui donne un code existant de la bonne boîte.

**Résultat attendu :** un tableau par boîte, avec trois chiffres :
- les codes lus et justes ;
- les codes lus mais faux ;
- les codes non lus ;
plus le temps total.

**Décision :**
- La tâche 10 n'est faite que si le taux de lectures justes atteint au moins 30 % et le taux de lectures fausses reste sous 5 %, dans un temps de 60 s maximum.
- Sinon, on garde la couleur seule, et on le dit à l'utilisateur.

### Tâche 8 : redresser la photo et échantillonner les capuchons

**Fichiers :** créer `app/photo/redresser.js`. Tester dans `tests/redresser.test.js`.

**Fournit :**
- `homographie(coins: [{x,y}×4] dans l'ordre haut-gauche, haut-droite, bas-droite, bas-gauche) → (u, v) => {x, y}`. Ici, `u` et `v` vont de 0 à 1 dans le rectangle de la boîte.
- `centres(grille: {rangees, colonnes}, projeter) → {x, y}[]` : le centre de chaque emplacement, ligne par ligne.
- `couleurMoyenne(imageData: {width, height, data}, x, y, rayon) → '#rrggbb'` : la moyenne sur un disque, en ignorant les pixels presque blancs (luminosité > 0,93), qui correspondent aux reflets et au corps blanc. Si tout est ignoré, elle renvoie la moyenne brute.

**Tests :**
- Avec des coins rectangulaires, `homographie` donne une transformation affine exacte : on vérifie les coins et le centre.
- Avec un trapèze, le centre projeté reste à l'intérieur du trapèze.
- Avec des coins dégénérés (tous identiques), elle ne lève pas d'erreur et renvoie des points finis ou `NaN` gérés par `centres`.
- `couleurMoyenne` sur une image synthétique 10×10 rouge avec un reflet blanc donne `#ff0000`.

Les étapes sont les mêmes : test qui échoue, code, test qui passe.

### Tâche 9 : deviner la disposition

**Fichiers :** créer `app/photo/deviner.js`. Tester dans `tests/deviner.test.js`.

**Fournit :** `devinerDisposition(emplacements: {hex, code?: string|null}[], feutresBoite) → { codes: (string|null)[], sures: boolean[] }`.

**Méthode :**
1. D'abord les codes lus qui correspondent à un feutre de la boîte, après normalisation. Chacun est attribué une seule fois, au premier emplacement qui le lit, et il est sûr.
2. Ensuite, attribution gloutonne par couleur sur le reste : on trie toutes les paires (emplacement, feutre) par `deltaE` croissant et on attribue si les deux sont libres. Une attribution est sûre si son `deltaE` est inférieur à 6 et que le second feutre le plus proche est au moins 3 plus loin.

**Tests :**
- les codes lus ont la priorité ;
- un code lu en double n'est placé qu'une fois ;
- avec plus d'emplacements que de feutres, le surplus vaut `null` ;
- avec des couleurs exactes, la disposition est parfaite.

### Tâche 10 : lecture des codes (seulement si la tâche 7 valide)

**Fichiers :** créer `app/photo/lire-codes.js`.

**Fournit :** `lireCodes(canvas, centres, rayon, codesBoite: Set) → Promise<(string|null)[]>`.
- Tesseract est importé dynamiquement depuis le CDN, avec les réglages retenus à la tâche 7.
- Seuls les emplacements dont la devinette par couleur n'est pas sûre sont lus.
- En cas d'échec réseau, la fonction renvoie que des `null`, sans erreur.

### Tâche 11 : écran photo et correction

**Fichiers :**
- Créer `app/photo/vue-photo.js`.
- Modifier `app/memoire/memoire.js` pour ajouter `lireDisposition(marque) → string[]|null` et `enregistrerDisposition(marque, codes)`, avec leurs tests.
- Route `#/boites/<marque>/photo`, qui donne `{ ecran: 'photo', marque }`, avec son test.
- Bouton « Photographier ma boîte » dans la vue d'une boîte.

**Déroulé :**
1. `<input type="file" accept="image/*" capture="environment">`.
2. La photo est affichée dans un canvas, réduite à 2000 px de large au maximum.
3. Quatre poignées sont déplaçables (Pointer Events, `setPointerCapture`). La grille est dessinée par-dessus en temps réel.
4. Bouton « Analyser » : échantillonnage (tâche 8), puis devinette (tâche 9), puis lecture des codes si elle existe (tâche 10).
5. On affiche la boîte reconstruite. Les emplacements peu sûrs sont entourés en orange.
6. Toucher un emplacement ouvre un panneau qui propose les 5 feutres de la boîte les plus proches de la couleur lue, plus un champ code. Si un code est déjà placé ailleurs, les deux emplacements sont échangés.
7. Bouton « Enregistrer » : `enregistrerDisposition`. La vue d'une boîte (tâche 4) utilise alors la disposition enregistrée.

**Vérification :** tester dans le navigateur avec les deux vraies photos de `sources/photos-boites/`.

### Tâche 12 : « Préparer mes feutres »

**Fichiers :** modifier `app/nuancier/vue-nuancier.js` et `app/boites/vue-boite.js`.

**Dans le nuancier :** un bouton « Préparer mes feutres » mène à `#/boites/<marque>/<livreId>/<numero>`, en prenant la marque majoritaire de la page. Si la page utilise des feutres des deux boîtes, la vue montre un sélecteur à deux onglets.

**Dans la vue d'une boîte, en mode préparation :**
- les feutres de la page sont allumés : contour épais, symbole du coloriage posé dessus, léger halo ;
- les autres feutres sont atténués à une opacité de 0,25 ;
- les feutres à prendre qui ne marchent plus restent en rouge, avec un avertissement ;
- les « Code couleur inconnu » et les saisies libres sont ignorés ;
- les feutres absents de la disposition sont listés sous la grille, sous « pas trouvé dans la boîte ».

**Fin :** relecture de la partie 3, commit, PR, puis demande d'accord pour la mise en ligne.

---

## Exécution

L'utilisateur demande d'utiliser des agents Opus.
- La tâche 7 (essai de lecture) part tout de suite en parallèle, car elle ne touche pas l'appli.
- Les tâches 1 à 5 se font dans l'ordre, par un agent codeur Opus. Une relecture a lieu avant chaque commit. La partie 1, puis la partie 2, sont mises en ligne après l'accord de l'utilisateur.
- Les tâches 8 à 12 viennent ensuite. La tâche 10 dépend du résultat de la tâche 7.
