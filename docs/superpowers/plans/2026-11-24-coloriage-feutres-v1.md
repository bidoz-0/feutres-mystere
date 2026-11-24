# Feutres Mystère V1 – Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** page web mobile qui, pour un coloriage du livre Princesses Disney tome 2, propose le feutre (Languo 240 / GuangNa 168) le plus proche pour chaque symbole, avec réglage de marque, alternatives et saisie manuelle.

**Architecture :** site statique (HTML + CSS + modules JS) sans build. Les données (feutres, nuanciers) sont des fichiers JSON générés une fois par des outils Node/navigateur à partir de `sources/`. La logique (couleurs, correspondance, mémoire) est en modules purs testés avec `node --test` ; les écrans ne font qu'afficher et appeler cette logique.

**Tech Stack :** HTML, CSS, JavaScript (modules ES), Node.js ≥ 20 (serveur local, scripts, `node --test`). Aucune dépendance npm.

**Spec :** `docs/superpowers/specs/2026-11-24-coloriage-feutres-design.md`

## Global Constraints
- Aucune dépendance npm, aucun build : `index.html` s'ouvre via `node outils/serveur.js`.
- Mobile d'abord (portrait, ~375 px de large), textes de l'interface en français.
- Toutes les données sont locales (`data/`) ; aucun appel réseau vers un site externe.
- `sources/` (images vendeurs, PDF de l'auteur) n'entre jamais dans git.
- Correction connue : sur l'image GuangNa, le second « 797 » (3e ligne, 2e case) est **787 straw yellow**.
- Format feutre : `{ marque: "languo" | "guangna", code: string, nom: string, hex: "#rrggbb" }` ; Languo : `nom` = `code`.
- Choix mémorisé par clé livre + n° coloriage + symbole ; valeur `{ code }` (feutre connu) ou `{ texte }` (saisie libre).
- Un fichier = un rôle, ~300 lignes max ; `app/main.js` ne contient aucune logique.

## Review Focus
1. **Case blanche ou très claire dans le PDF** (couleur ≈ fond de page) : elle doit rester une case du nuancier, pas être ignorée → test dans Task 4.
2. **Deux formes collées de même couleur** (doublon observé sur une ligne) : une seule case → test dans Task 4.
3. **Saisie manuelle en minuscules / avec espaces** (`" ry10 "`, `"gb 401"`, `"605"`) : doit retrouver le feutre → test dans Task 5.
4. **localStorage vide, corrompu ou indisponible** (navigation privée) : l'appli marche, sans mémoire → test dans Task 6.
5. **Réglage à fond d'un côté** : l'autre marque reste proposée si aucune couleur proche n'existe dans la marque favorite (malus, pas exclusion) → test dans Task 5.

---

## Structure des fichiers
```
index.html                       page unique, charge app/main.js
app/main.js                      lance le routeur, rien d'autre
app/style.css
app/navigation/routeur.js        lit le hash (#/, #/livre/<id>, #/livre/<id>/<n>) et affiche la bonne vue
app/bibliotheque/vue-bibliotheque.js
app/coloriages/vue-coloriages.js
app/nuancier/vue-nuancier.js     écran nuancier (liste, réglage, panneau d'alternatives)
app/nuancier/proposer.js         logique : propositions, alternatives, doublons, recherche par code
app/couleurs/couleur.js          hex → Lab, ΔE2000
app/memoire/memoire.js           localStorage (choix, préférence)
app/donnees/charger.js           fetch des JSON
data/feutres.json                408 feutres
data/livres/index.json           [{ id, titre }]
data/livres/princesses-t2.json   { id, titre, coloriages: [{ numero, cases: [{ symbole, hex }] }] }
outils/serveur.js                serveur statique local (http natif)
outils/grille.js                 détection des cases dans une image (pur, testable)
outils/extraire-feutres.html     page outil : image → feutres JSON (utilise grille.js)
outils/codes-languo.txt, outils/codes-guangna.txt   codes/noms transcrits, ordre de lecture
outils/pdf.js                    lecture des cases colorées d'un PDF vectoriel (pur, testable)
outils/symboles.js               séquence des symboles
outils/extraire-livre.js         CLI : PDF → data/livres/<id>.json
tests/*.test.js
```

---

### Task 1 : Socle (serveur, page, routeur)

**Files :** Create `package.json`, `outils/serveur.js`, `index.html`, `app/main.js`, `app/style.css`, `app/navigation/routeur.js`, `tests/routeur.test.js`

**Interfaces :**
- Produces : `lireRoute(hash: string) → { ecran: "bibliotheque" } | { ecran: "coloriages", livreId } | { ecran: "nuancier", livreId, numero: number }` ; `demarrerRouteur(racine: HTMLElement, vues: { bibliotheque, coloriages, nuancier })` où chaque vue est `(racine, params) → void | Promise`.

- [ ] **Step 1 : test** `tests/routeur.test.js`
```js
assert.deepEqual(lireRoute(''), { ecran: 'bibliotheque' });
assert.deepEqual(lireRoute('#/'), { ecran: 'bibliotheque' });
assert.deepEqual(lireRoute('#/livre/princesses-t2'), { ecran: 'coloriages', livreId: 'princesses-t2' });
assert.deepEqual(lireRoute('#/livre/princesses-t2/7'), { ecran: 'nuancier', livreId: 'princesses-t2', numero: 7 });
assert.deepEqual(lireRoute('#/nimporte'), { ecran: 'bibliotheque' });
```
- [ ] **Step 2 :** `npm test` → FAIL (module absent).
- [ ] **Step 3 :** `package.json` : `"type": "module"`, scripts `"start": "node outils/serveur.js"`, `"test": "node --test"` (sans argument : Node trouve seul les `*.test.js`). `outils/serveur.js` : `http` + `fs`, sert le dossier racine sur le port 8080 (ou `PORT`), types MIME html/js/css/json/webp, refuse les chemins contenant `..` ou un segment commençant par `.` (`.git`). `routeur.js` : `lireRoute` + `demarrerRouteur` (écoute `hashchange`). `index.html` : `<meta charset="utf-8">` (symboles `◊ Δ Σ`), `<meta viewport>`, `<main id="app">`, `<script type="module" src="app/main.js">`.
- [ ] **Step 4 :** `npm test` → PASS ; `npm start` puis ouvrir http://localhost:8080 → page sans erreur console.
- [ ] **Step 5 : commit** `feat: socle de l'appli (serveur local, routeur)`

### Task 2 : Couleurs (Lab, ΔE2000)

**Files :** Create `app/couleurs/couleur.js`, `tests/couleur.test.js`

**Interfaces :** Produces `hexVersLab(hex: string) → [L, a, b]` (sRGB D65) ; `deltaE(lab1, lab2) → number` (CIEDE2000).

- [ ] **Step 1 : tests**
```js
// valeurs de référence Sharma et al. (2005)
assert.ok(Math.abs(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-3);
assert.ok(Math.abs(deltaE([50, 2.5, 0], [73, 25, -18]) - 27.1492) < 1e-3);
assert.equal(deltaE([50, 0, 0], [50, 0, 0]), 0);
const [L, a, b] = hexVersLab('#ffffff'); assert.ok(Math.abs(L - 100) < 0.01 && Math.abs(a) < 0.01 && Math.abs(b) < 0.01);
assert.ok(Math.abs(hexVersLab('#ff0000')[0] - 53.24) < 0.05);
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 :** implémenter (formule CIEDE2000 standard, kL = kC = kH = 1).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: conversion Lab et distance CIEDE2000`

### Task 3 : Données des feutres

**Files :** Create `outils/grille.js`, `outils/extraire-feutres.html`, `outils/codes-languo.txt`, `outils/codes-guangna.txt`, `data/feutres.json`, `tests/grille.test.js`, `tests/feutres.test.js`

**Interfaces :**
- Consumes : images `sources/languo-240-amazon.webp` (grille 20 × 12, codes écrits dans les cases), `sources/guangna-168-amazon.webp` (14 × 12, numéro sous chaque case).
- Produces : `trouverCases(img: { width, height, data: Uint8ClampedArray }, fond: [r,g,b]) → [{ x, y, w, h }]` triées en ordre de lecture (ligne par ligne, gauche → droite) ; `couleurCase(img, cellule) → "#rrggbb"` (médiane des pixels d'une bande verticale à 15 % du bord gauche de la case, pour éviter le texte) ; `data/feutres.json` au format Global Constraints.

- [ ] **Step 1 : test** `tests/grille.test.js` : image synthétique 120×80 fond blanc avec 3 rectangles pleins de 25×25 px (2 sur la 1re ligne, 1 sur la 2e, couleurs connues) → `trouverCases` renvoie 3 cases dans l'ordre de lecture, `couleurCase` renvoie les hex exacts.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter `grille.js` (pixels ≠ fond à tolérance 12 → composantes connexes ou balayage ligne/colonne ; ignorer les zones < 20 px de côté).
- [ ] **Step 4 :** transcrire les codes dans `codes-languo.txt` (240 lignes, ordre de lecture de l'image Amazon : `GB-401`, `GB-403`, `PU-302`…) et `codes-guangna.txt` (168 lignes `code;nom`, ordre de l'image Amazon : `809;hazy green`, `737;bluish green`…, noms lus sur `sources/guangna-168-dos-boite.jpg`, 3e ligne 2e case = `787;straw yellow`). Vérifier les codes Languo contre `sources/languo-240-boite.jpg`.
- [ ] **Step 5 :** `extraire-feutres.html` : charge les deux images dans un canvas, applique `trouverCases`/`couleurCase`, associe aux codes (erreur visible si le nombre de cases ≠ nombre de codes), affiche un aperçu (case + code) et le JSON à copier dans `data/feutres.json`. Ouvrir via `npm start` → http://localhost:8080/outils/extraire-feutres.html.
- [ ] **Step 6 : test** `tests/feutres.test.js` sur `data/feutres.json` :
```js
assert.equal(feutres.length, 408);
assert.equal(feutres.filter(f => f.marque === 'languo').length, 240);
assert.equal(new Set(feutres.map(f => f.code)).size, 408);
assert.ok(feutres.every(f => /^#[0-9a-f]{6}$/.test(f.hex)));
assert.equal(feutres.find(f => f.code === '787').nom, 'straw yellow');
assert.equal(feutres.find(f => f.code === '611').nom, 'black');
```
- [ ] **Step 7 :** `npm test` → PASS ; contrôle visuel de l'aperçu (10 cases au hasard comparées à l'image).
- [ ] **Step 8 : commit** `feat: données des 408 feutres`

### Task 4 : Données du livre Princesses tome 2

**Files :** Create `outils/pdf.js`, `outils/symboles.js`, `outils/extraire-livre.js`, `data/livres/index.json`, `data/livres/princesses-t2.json`, `tests/pdf.test.js`, `tests/livre.test.js`

**Interfaces :**
- Consumes : `sources/pdfs/Nuancier_Princesses_Disney_Tome_2-1.pdf` (page 1 = texte d'intro ; pages suivantes vectorielles, flux FlateDecode, couleurs via `r g b sc`, cases = formes remplies de 20 pt de haut, une ligne de cases = un coloriage, « classé dans l'ordre »).
- Produces : `lireFormes(contenu: string) → [{ x, y, w, h, hex }]` (formes remplies `f`/`f*`, boîte englobante des points `m l c re`) ; `grouperEnLignes(formes) → [[{ x, hex }]]` (garde h ≈ 20, groupe par y arrondi, de haut en bas, tri par x, fusionne deux formes consécutives de même couleur qui se chevauchent ou se touchent) ; `SYMBOLES: string[]` ; CLI `node outils/extraire-livre.js <pdf> <id> "<titre>"` qui écrit `data/livres/<id>.json` et ajoute l'entrée dans `data/livres/index.json`.

- [ ] **Step 1 : vérifier la séquence des symboles** : ouvrir le PDF (page 2) dans un lecteur PDF, noter les symboles d'une ligne longue et le numéro de chaque ligne ; écrire `SYMBOLES` dans `outils/symboles.js` (hypothèse à confirmer : `1 2 3 4 5 6 7 8 9 0 a b c d e f h k m n p q r t u v x y z ◊ Δ Σ ¥ ≈ φ ¶`). Si l'ordre n'est pas fixe d'une ligne à l'autre : s'arrêter et le signaler (transcription manuelle nécessaire).
- [ ] **Step 2 : tests** `tests/pdf.test.js` :
```js
const c = '0.5 0.5 0.5 sc 10 100 m 30 100 l 30 120 l 10 120 l h f 1 0 0 sc 40 100 20 20 re f';
assert.deepEqual(lireFormes(c).map(f => f.hex), ['#808080', '#ff0000']);
// doublon collé de même couleur → une seule case
const d = [{ x: 0, y: 100, w: 14, h: 20, hex: '#9caad8' }, { x: 14, y: 100, w: 14, h: 20, hex: '#9caad8' }, { x: 30, y: 100, w: 14, h: 20, hex: '#bce4fa' }];
assert.equal(grouperEnLignes(d)[0].length, 2);
// case blanche conservée
assert.equal(grouperEnLignes([{ x: 0, y: 50, w: 14, h: 20, hex: '#ffffff' }])[0].length, 1);
// glyphes ignorés (h ≠ 20)
assert.equal(grouperEnLignes([{ x: 0, y: 50, w: 6, h: 9, hex: '#000000' }]).length, 0);
```
- [ ] **Step 3 :** FAIL. **Step 4 :** implémenter `pdf.js` (le découpage du PDF en objets/flux avec `zlib.inflateSync` est dans `extraire-livre.js`), puis la CLI. Attention : le fond de page est un rectangle blanc 595×842 (h ≠ 20, donc ignoré) ; vérifier qu'aucune case de fond gris de cadre ne passe le filtre. Le PDF utilise des blocs `q … Q` ; si un opérateur `cm` (changement de repère) apparaît dans les pages de nuancier, l'appliquer aux points (pile de matrices avec `q`/`Q`). La CLI affiche, par coloriage, le nombre de cases et chaque fusion de doublon, et s'arrête si une ligne a plus de cases que `SYMBOLES`.
- [ ] **Step 5 :** `node outils/extraire-livre.js sources/pdfs/Nuancier_Princesses_Disney_Tome_2-1.pdf princesses-t2 "Princesses Disney – Tome 2"`.
- [ ] **Step 6 : test** `tests/livre.test.js` sur le JSON généré : 20 coloriages numérotés 1 à 20 ; chaque coloriage a entre 10 et 40 cases ; symboles uniques dans un coloriage ; hex valides ; `index.json` contient `{ id: 'princesses-t2', titre: 'Princesses Disney – Tome 2' }`.
- [ ] **Step 7 :** `npm test` → PASS ; comparer à l'œil 2 coloriages (couleurs + symboles) avec le PDF.
- [ ] **Step 8 : commit** `feat: nuancier du livre Princesses tome 2`

### Task 5 : Correspondance feutres

**Files :** Create `app/nuancier/proposer.js`, `tests/proposer.test.js`

**Interfaces :**
- Consumes : `hexVersLab`, `deltaE` (Task 2) ; feutres (Task 3).
- Produces :
  - `plusProches(hex, feutres, preference: number /* -1 = Languo … +1 = GuangNa */, n = 5) → [{ feutre, distance }]` ; score = ΔE + malus, malus = `MALUS * max(0, preference)` pour Languo et `MALUS * max(0, -preference)` pour GuangNa, `MALUS = 15`.
  - `proposerNuancier(coloriage, feutres, preference, choix: { [symbole]: { code } | { texte } }) → [{ symbole, hex, feutre | null, texte | null, modifie: boolean }]` (le choix mémorisé gagne sur la proposition).
  - `doublons(lignes) → { [symbole]: string[] }` (symboles partageant le même `feutre.code`).
  - `trouverFeutre(saisie, feutres) → feutre | null` (insensible à la casse, ignore espaces et tirets : `" ry10 "` → `RY-10`).

- [ ] **Step 1 : tests** (`vrais` = `data/feutres.json` ; `f` = petite liste de feutres factices, `BLEU_GUANGNA` = code du bleu factice : languo `#ff0000`, guangna `#fe0000`, guangna `#0000ff`) :
```js
assert.equal(plusProches('#ff0000', f, -1, 1)[0].feutre.marque, 'languo');
assert.equal(plusProches('#ff0000', f, 1, 1)[0].feutre.marque, 'guangna');
assert.equal(plusProches('#0000ff', f, -1, 1)[0].feutre.code, BLEU_GUANGNA); // malus, pas exclusion
assert.equal(plusProches('#ff0000', f, 0, 5).length, 3);
assert.equal(trouverFeutre(' ry10 ', vrais).code, 'RY-10');
assert.equal(trouverFeutre('gb 401', vrais).code, 'GB-401');
assert.equal(trouverFeutre('605', vrais).code, '605');
assert.equal(trouverFeutre('posca rouge', vrais), null);
// choix mémorisé prioritaire, saisie libre conservée
const l = proposerNuancier({ cases: [{ symbole: 'a', hex: '#ff0000' }] }, f, 0, { a: { texte: 'posca rouge' } });
assert.deepEqual([l[0].feutre, l[0].texte, l[0].modifie], [null, 'posca rouge', true]);
assert.deepEqual(doublons([{ symbole: '1', feutre: { code: 'X' } }, { symbole: '2', feutre: { code: 'X' } }]), { 1: ['2'], 2: ['1'] });
```
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (pré-calculer le Lab de chaque feutre une fois). **Step 4 :** PASS.
- [ ] **Step 5 : commit** `feat: correspondance couleur → feutre`

### Task 6 : Mémoire

**Files :** Create `app/memoire/memoire.js`, `tests/memoire.test.js`

**Interfaces :** Produces `creerMemoire(stockage)` (sans argument : `localStorage` lu dans un `try`, car l'accès lui-même peut lever `SecurityError` en navigation privée) → `{ lireChoix(livreId, numero) → objet, enregistrerChoix(livreId, numero, symbole, choix | null), lirePreference() → number, enregistrerPreference(p) }`. Clé unique `feutres-mystere:v1` contenant `{ preference, choix: { "<livreId>/<numero>": { [symbole]: choix } } }` ; `null` efface le choix (retour à la proposition).

- [ ] **Step 1 : tests** avec un faux stockage `{ getItem, setItem }` : aller-retour d'un choix ; `null` efface ; préférence par défaut `0` ; JSON corrompu (`'{oups'`) → valeurs par défaut sans exception ; `creerMemoire(undefined)` et un stockage dont `setItem` lève → fonctionne en mémoire vive.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS.
- [ ] **Step 5 : commit** `feat: mémorisation des choix et du réglage`

### Task 7 : Écrans

**Files :** Create `app/donnees/charger.js`, `app/bibliotheque/vue-bibliotheque.js`, `app/coloriages/vue-coloriages.js`, `app/nuancier/vue-nuancier.js` ; Modify `app/main.js`, `app/style.css`

**Interfaces :**
- Consumes : `demarrerRouteur` (Task 1), `proposerNuancier`, `plusProches`, `doublons`, `trouverFeutre` (Task 5), `creerMemoire` (Task 6).
- Produces : `chargerFeutres() → Promise<feutre[]>`, `chargerIndexLivres() → Promise<{id,titre}[]>`, `chargerLivre(id) → Promise<livre>` (mis en cache) ; les trois vues au format `(racine, params)`.

- [ ] **Step 1 :** bibliothèque = liste des livres (`index.json`) → `#/livre/<id>`. Coloriages = grille de boutons 1…20 → `#/livre/<id>/<n>`, bouton retour.
- [ ] **Step 2 :** nuancier = curseur `<input type="range" min="-1" max="1" step="0.25">` libellé « Languo ◀ ▶ GuangNa » (mémorisé) ; une ligne par symbole : symbole, pastille couleur du livre, pastille couleur du feutre, code + nom (+ marque), marqueur « modifié », avertissement « même feutre que 3, k » si doublon. Toucher une ligne ouvre un panneau : 5 alternatives (`plusProches`) avec pastilles et ΔE arrondi, champ « autre référence » (`trouverFeutre`, sinon texte libre), bouton « revenir à la proposition » (`enregistrerChoix(..., null)`).
- [ ] **Step 3 :** accessibilité : les lignes et alternatives sont des `<button>`, contraste du texte sur fond, pastilles avec `aria-label` (« couleur du livre », « couleur du feutre »), cibles ≥ 44 px.
- [ ] **Step 4 : vérification** : `npm start`, navigateur en taille mobile (375×812) : parcours complet bibliothèque → coloriage 1 → changer le feutre de « a » → recharger la page → le choix est toujours là ; déplacer le curseur → les propositions changent de marque ; saisir `ry10` → reconnu ; saisir `posca rouge` → gardé en texte ; console sans erreur. `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: écrans bibliothèque, coloriages et nuancier`

### Task 8 : Mise en ligne

**Files :** Modify `README.md`

- [ ] **Step 1 :** pousser sur GitHub, activer GitHub Pages (branche `main`, dossier racine). Le repo doit être public pour Pages gratuit : vérifier avant que `sources/` n'y est pas (`git ls-files sources` → vide).
- [ ] **Step 2 : vérification** : ouvrir l'URL Pages sur un téléphone, refaire le parcours de la Task 7 Step 4.
- [ ] **Step 3 :** ajouter l'URL dans `README.md`, commit `docs: lien de l'appli en ligne`.
